// Chiamate di rete: TCGdex (carte e prezzi Cardmarket), Pokémon TCG API, Gemini e Claude (lettura da foto),
// cambio dollaro-euro e nomi dei Pokémon. Le risposte si leggono con JSONSerialization perché i cataloghi
// cambiano forma da carta a carta.

import Foundation

typealias JSON = [String: Any]

struct AppError: LocalizedError {
    var message: String
    var net = false
    var notFound = false
    var fatal = false
    var busy = false      // servizio sovraccarico (5xx): si prova un altro modello
    var rate = false      // limite di richieste (429): la coda aspetta
    var daily = false     // quota giornaliera finita: inutile aspettare un minuto, si cambia modello o ci si ferma
    var retryAfter: Double? = nil   // secondi suggeriti dal servizio
    var resumeAt: Date? = nil       // quando si azzera la quota giornaliera
    var errorDescription: String? { message }
    init(_ message: String, net: Bool = false, notFound: Bool = false, fatal: Bool = false, busy: Bool = false,
         rate: Bool = false, daily: Bool = false, retryAfter: Double? = nil, resumeAt: Date? = nil) {
        self.message = message; self.net = net; self.notFound = notFound; self.fatal = fatal; self.busy = busy
        self.rate = rate; self.daily = daily; self.retryAfter = retryAfter; self.resumeAt = resumeAt
    }
}

func httpSend(_ req: URLRequest) async throws -> (Data, Int) {
    let (d, r) = try await URLSession.shared.data(for: req)
    return (d, (r as? HTTPURLResponse)?.statusCode ?? 0)
}

// Gemini: ogni chiamata usa una sessione nuova, così non riusa un collegamento rimasto appeso
// (dopo fotocamera, cambio rete o app in pausa). Tempo massimo complessivo, non solo di attesa.
let GEMINI_TIMEOUT: TimeInterval = 45
let GEMINI_TRIES = 2
func freshSend(_ req: URLRequest, timeout: TimeInterval) async throws -> (Data, Int) {
    let c = URLSessionConfiguration.ephemeral
    c.timeoutIntervalForRequest = timeout
    c.timeoutIntervalForResource = timeout + 15
    c.waitsForConnectivity = false
    c.requestCachePolicy = .reloadIgnoringLocalCacheData
    let s = URLSession(configuration: c)
    defer { s.finishTasksAndInvalidate() }
    let (d, r) = try await s.data(for: req)
    return (d, (r as? HTTPURLResponse)?.statusCode ?? 0)
}

func netErr(_ e: Error?) -> AppError {
    let d = e?.localizedDescription ?? "errore di rete"
    return AppError("Connessione bloccata o assente (\(d)). Riprova; se continua, in Impostazioni usa \"Prova la connessione\" per capire quale collegamento fallisce.", net: true)
}

func jnum(_ v: Any?) -> Double? {
    guard let n = v as? NSNumber else { return nil }
    if CFGetTypeID(n) == CFBooleanGetTypeID() { return nil }
    let d = n.doubleValue
    return d.isFinite ? d : nil
}
func jpos(_ v: Any?) -> Double? {
    if let d = jnum(v), d > 0 { return d }
    return nil
}
func jstr(_ v: Any?) -> String {
    if let s = v as? String { return s }
    if let n = v as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID() { return n.stringValue }
    return ""
}
func jint(_ v: Any?) -> Int? {
    if let d = jnum(v) { return Int(d) }
    return nil
}
func parseJSON(_ d: Data) -> Any? { try? JSONSerialization.jsonObject(with: d, options: []) }

func urlEnc(_ s: String) -> String {
    var allowed = CharacterSet.alphanumerics
    allowed.insert(charactersIn: "-._~")
    return s.addingPercentEncoding(withAllowedCharacters: allowed) ?? s
}

func regexMatch(_ pattern: String, in s: String) -> [String]? {
    guard let re = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { return nil }
    let ns = s as NSString
    guard let m = re.firstMatch(in: s, options: [], range: NSRange(location: 0, length: ns.length)) else { return nil }
    var out: [String] = []
    for i in 0..<m.numberOfRanges {
        let r = m.range(at: i)
        out.append(r.location == NSNotFound ? "" : ns.substring(with: r))
    }
    return out
}
func regexTest(_ pattern: String, _ s: String) -> Bool { regexMatch(pattern, in: s) != nil }

enum DiskCache {
    static var dir: URL {
        let u = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("carte", isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }
    static func read(_ name: String, maxAge: TimeInterval) -> Data? {
        let url = dir.appendingPathComponent(name)
        guard let attrs = try? FileManager.default.attributesOfItem(atPath: url.path),
              let m = attrs[.modificationDate] as? Date, Date().timeIntervalSince(m) < maxAge else { return nil }
        return try? Data(contentsOf: url)
    }
    static func write(_ name: String, _ data: Data) {
        try? data.write(to: dir.appendingPathComponent(name), options: .atomic)
    }
}

// MARK: - Categoria, prezzi TCGplayer

func normCat(_ s: String) -> String {
    let t = s.lowercased()
    if t.isEmpty { return "" }
    if regexTest("allenator|trainer|dresseur|entrenador|treinador", t) { return "Trainer" }
    if regexTest("energ", t) { return "Energy" }
    return "Pokemon"
}

// prezzi TCGplayer (dollari) per variante, da qualunque fonte che li dia con il nome della stampa
func mapTcgKeys(_ obj: JSON?, pick: (JSON) -> Double?) -> TcgPrices {
    var out = TcgPrices()
    guard let obj = obj else { return out }
    for (k, val) in obj {
        guard let row = val as? JSON, let v = pick(row) else { continue }
        let n = k.lowercased().filter { $0.isLetter || $0.isNumber }
        if n.contains("unlimited") { continue }
        if n.contains("reverse") { if out.reverse == nil { out.reverse = v } }
        else if n.contains("1st") || n.contains("first") {
            if n.contains("holo") { if out.first == nil { out.first = v } }
            else if out.firstNormal == nil { out.firstNormal = v }
        }
        else if n.contains("holo") { if out.holo == nil { out.holo = v } }
        else if n.contains("normal") { if out.normal == nil { out.normal = v } }
    }
    return out
}

// MARK: - TCGdex

enum TCGdex {
    static let base = "https://api.tcgdex.net/v2/"

    static func getData(_ path: String) async throws -> Data? {
        var last: Error?
        for _ in 0..<2 {
            guard let url = URL(string: base + path) else { throw AppError("Indirizzo non valido") }
            var req = URLRequest(url: url)
            req.timeoutInterval = 20
            do {
                let (d, r) = try await URLSession.shared.data(for: req)
                let code = (r as? HTTPURLResponse)?.statusCode ?? 0
                if code == 404 { return nil }
                if !(200...299).contains(code) { throw AppError("Catalogo carte (TCGdex): errore \(code)") }
                return d
            } catch { last = error }
        }
        if let u = last as? URLError, u.code == .timedOut { throw AppError("Il catalogo carte non risponde, riprova.") }
        if let a = last as? AppError { throw a }
        throw netErr(last)
    }

    static func getJSON(_ path: String) async throws -> Any? {
        guard let d = try await getData(path) else { return nil }
        return parseJSON(d)
    }

    static func setList(_ lang: String) async throws -> [SetInfo] {
        let name = "tdsets3_" + lang + ".json"
        if let d = DiskCache.read(name, maxAge: 7 * 86400),
           let arr = try? JSONDecoder().decode([SetInfo].self, from: d), !arr.isEmpty { return arr }
        guard let j = (try await getJSON(lang + "/sets")) as? [Any], !j.isEmpty else {
            throw AppError("Elenco dei set non disponibile")
        }
        var arr: [SetInfo] = []
        for x in j {
            guard let o = x as? JSON else { continue }
            let cc = o["cardCount"] as? JSON
            arr.append(SetInfo(id: jstr(o["id"]), name: jstr(o["name"]), official: jint(cc?["official"]), total: jint(cc?["total"]),
                               logo: jstr(o["logo"]), symbol: jstr(o["symbol"])))
        }
        if let d = try? JSONEncoder().encode(arr) { DiskCache.write(name, d) }
        return arr
    }

    static func candidate(_ c: JSON, lang: String) -> Candidate {
        let pricing = c["pricing"] as? JSON
        let pm = pricing?["cardmarket"] as? JSON
        let set = c["set"] as? JSON
        let cc = set?["cardCount"] as? JSON
        let rawId = jstr(c["id"])
        var dex: [Int] = []
        if let arr = c["dexId"] as? [Any] { dex = arr.compactMap { jint($0) } }
        let image = jstr(c["image"])
        var vars: Variants? = nil
        if let v = c["variants"] as? JSON {
            vars = Variants(normal: (v["normal"] as? Bool) ?? false, holo: (v["holo"] as? Bool) ?? false,
                            reverse: (v["reverse"] as? Bool) ?? false, first: (v["firstEdition"] as? Bool) ?? false)
        }
        var cm: CMPrices? = nil
        if let pm = pm {
            cm = CMPrices(trend: jnum(pm["trend"]), avg: jnum(pm["avg"]), reverseTrend: jnum(pm["trend-holo"]),
                          avg1: jnum(pm["avg1"]), avg7: jnum(pm["avg7"]), avg30: jnum(pm["avg30"]))
        }
        let tcg = mapTcgKeys(pricing?["tcgplayer"] as? JSON) { r in jpos(r["marketPrice"]) ?? jpos(r["midPrice"]) }
        let name = jstr(c["name"])
        return Candidate(id: "tcgdex:" + lang + ":" + rawId, src: "tcgdex", srcId: rawId, srcLang: lang,
                         setId: jstr(set?["id"]), dex: dex, cat: normCat(jstr(c["category"])), tt: jstr(c["trainerType"]),
                         ill: jstr(c["illustrator"]), name: name.isEmpty ? "?" : name, number: jstr(c["localId"]),
                         rarity: jstr(c["rarity"]), setName: jstr(set?["name"]), printedTotal: jstr(cc?["official"]),
                         imageSmall: image.isEmpty ? "" : image + "/low.webp", tcg: tcg, vars: vars, cm: cm)
    }

    static func card(lang: String, id: String) async throws -> Candidate? {
        guard let d = try await getJSON(lang + "/cards/" + urlEnc(id)) as? JSON else { return nil }
        return candidate(d, lang: lang)
    }

    static func setDetail(lang: String, id: String) async throws -> SetDetail {
        guard let d = try await getJSON(lang + "/sets/" + urlEnc(id)) as? JSON, let cards = d["cards"] as? [Any] else {
            throw AppError("Set non trovato nel catalogo carte")
        }
        var out: [SetCardSummary] = []
        for x in cards {
            guard let o = x as? JSON else { continue }
            out.append(SetCardSummary(id: jstr(o["id"]), localId: jstr(o["localId"]), name: jstr(o["name"]), image: jstr(o["image"])))
        }
        var logo = jstr(d["logo"])
        if logo.isEmpty { logo = jstr(d["symbol"]) }
        return SetDetail(id: id, name: jstr(d["name"]), logo: logo, cards: out)
    }

    static func search(name: String, num: String, tot: String, lang: String?) async throws -> [Candidate] {
        try await searchRanked(name: name, num: num, tot: tot, lang: lang).cards
    }

    /// weak = nessuna carta con nome e numero giusti: sono solo le più vicine (stesso numero con altro nome,
    /// oppure stesso nome con altro numero). Chi chiama prova altre fonti prima di usarle.
    static func searchRanked(name: String, num: String, tot: String, lang: String?) async throws -> (cards: [Candidate], weak: Bool) {
        let lg = (lang ?? "").isEmpty ? "it" : lang!
        func strip(_ v: String) -> String { normNum(v) }
        func sameNum(_ lid: String) -> Bool { strip(lid) == strip(num) }
        func norm(_ s: String) -> String { s.lowercased().filter { $0.isLetter || $0.isNumber } }
        var ids: [String] = []
        var weakIds: [String] = []
        if !num.isEmpty && !tot.isEmpty {
            let sets = try await setList(lg)
            let cand = Array(sets.filter { String($0.official ?? -1) == tot }.prefix(12))
            let details: [Data?] = await withTaskGroup(of: (Int, Data?).self) { group in
                for (i, x) in cand.enumerated() {
                    let sid = x.id
                    group.addTask { (i, (try? await getData(lg + "/sets/" + urlEnc(sid))) ?? nil) }
                }
                var out = [Data?](repeating: nil, count: cand.count)
                for await (i, d) in group { out[i] = d }
                return out
            }
            var hits: [JSON] = []
            for d in details {
                guard let d = d, let sd = parseJSON(d) as? JSON, let cards = sd["cards"] as? [Any] else { continue }
                for x in cards {
                    if let o = x as? JSON, sameNum(jstr(o["localId"])) { hits.append(o); break }
                }
            }
            let nn = norm(name)
            let byName = name.isEmpty ? [] : hits.filter { h in
                let hn = norm(jstr(h["name"]))
                return !hn.isEmpty && (hn.contains(nn) || nn.contains(hn))
            }
            if name.isEmpty || !byName.isEmpty { ids = (name.isEmpty ? hits : byName).map { jstr($0["id"]) } }
            else { weakIds = hits.map { jstr($0["id"]) } }
        }
        if ids.isEmpty && !name.isEmpty {
            if let list = (try await getJSON(lg + "/cards?name=" + urlEnc(name))) as? [Any] {
                let l: [JSON] = list.compactMap { $0 as? JSON }
                let f: [JSON] = num.isEmpty ? l : l.filter { sameNum(jstr($0["localId"])) }
                if !f.isEmpty { ids = f.prefix(8).map { jstr($0["id"]) } }
                else if weakIds.isEmpty { weakIds = l.prefix(8).map { jstr($0["id"]) } }
            }
        }
        let weak = ids.isEmpty
        if weak { ids = weakIds }
        if ids.isEmpty { return ([], false) }
        let pick = Array(ids.prefix(8))
        let cards: [Data?] = await withTaskGroup(of: (Int, Data?).self) { group in
            for (i, id) in pick.enumerated() {
                group.addTask { (i, (try? await getData(lg + "/cards/" + urlEnc(id))) ?? nil) }
            }
            var out = [Data?](repeating: nil, count: pick.count)
            for await (i, d) in group { out[i] = d }
            return out
        }
        var result: [Candidate] = []
        for d in cards {
            if let d = d, let o = parseJSON(d) as? JSON { result.append(candidate(o, lang: lg)) }
        }
        return (result, weak)
    }

    static func dexNames() async throws -> [String] {
        let name = "dexnames.json"
        if let d = DiskCache.read(name, maxAge: 90 * 86400), let arr = try? JSONDecoder().decode([String].self, from: d), arr.count == DEX_MAX { return arr }
        guard let url = URL(string: "https://pokeapi.co/api/v2/pokemon-species?limit=2000") else { throw AppError("Indirizzo non valido") }
        var req = URLRequest(url: url)
        req.timeoutInterval = 20
        let (d, r) = try await URLSession.shared.data(for: req)
        guard (r as? HTTPURLResponse)?.statusCode == 200, let j = parseJSON(d) as? JSON, let res = j["results"] as? [Any] else {
            throw AppError("Nomi dei Pokémon non disponibili")
        }
        var arr = [String](repeating: "", count: DEX_MAX)
        for x in res {
            guard let o = x as? JSON else { continue }
            let u = jstr(o["url"]).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            guard let id = Int(u.split(separator: "/").last ?? ""), id >= 1, id <= DEX_MAX else { continue }
            let parts = jstr(o["name"]).split(separator: "-").map { String($0.prefix(1)).uppercased() + String($0.dropFirst()) }
            arr[id - 1] = parts.joined(separator: " ")
        }
        if let d = try? JSONEncoder().encode(arr) { DiskCache.write(name, d) }
        return arr
    }

    static func illustrators(lang: String) async throws -> [String] {
        let name = "illu_" + lang + ".json"
        if let d = DiskCache.read(name, maxAge: 30 * 86400), let arr = try? JSONDecoder().decode([String].self, from: d), !arr.isEmpty { return arr }
        guard let d = try await getJSON(lang + "/illustrators") as? [Any] else { throw AppError("Elenco degli artisti non disponibile") }
        let arr: [String] = d.compactMap { x in
            if let s = x as? String { return s }
            if let o = x as? JSON { let n = jstr(o["name"]); return n.isEmpty ? nil : n }
            return nil
        }
        if arr.isEmpty { throw AppError("Elenco degli artisti non disponibile") }
        if let e = try? JSONEncoder().encode(arr) { DiskCache.write(name, e) }
        return arr
    }

    // elenco completo delle carte di un Pokémon (kind "pokemon") o di un artista ("art")
    static func cardList(kind: String, lang: String, id: String) async throws -> [SetCardSummary] {
        let path = lang + (kind == "pokemon" ? "/dex-ids/" + id : "/illustrators/" + urlEnc(id))
        let d = try await getJSON(path)
        var arr: [Any] = []
        if let a = d as? [Any] { arr = a } else if let o = d as? JSON, let a = o["cards"] as? [Any] { arr = a }
        var out: [SetCardSummary] = []
        for x in arr {
            guard let o = x as? JSON else { continue }
            out.append(SetCardSummary(id: jstr(o["id"]), localId: jstr(o["localId"]), name: jstr(o["name"]), image: jstr(o["image"])))
        }
        return out
    }
}

// MARK: - Pokémon TCG API

enum PTCG {
    static func normExtra(_ c: JSON) -> (tcg: TcgPrices, dex: [Int], cat: String, tt: String, ill: String) {
        let cat = normCat(jstr(c["supertype"]))
        let tcgp = (c["tcgplayer"] as? JSON)?["prices"] as? JSON
        let tcg = mapTcgKeys(tcgp) { r in jpos(r["market"]) ?? jpos(r["mid"]) }
        var dex: [Int] = []
        if let a = c["nationalPokedexNumbers"] as? [Any] { dex = a.compactMap { jint($0) } }
        var tt = ""
        if cat == "Trainer", let st = c["subtypes"] as? [Any], let f = st.first { tt = jstr(f) }
        return (tcg, dex, cat, tt, jstr(c["artist"]))
    }

    static func candidate(_ c: JSON) -> Candidate {
        let ex = normExtra(c)
        let set = c["set"] as? JSON
        let p = (c["cardmarket"] as? JSON)?["prices"] as? JSON
        var cm: CMPrices? = nil
        if let p = p {
            cm = CMPrices(trend: jnum(p["trendPrice"]), avg: jnum(p["averageSellPrice"]), reverseTrend: jnum(p["reverseHoloTrend"]),
                          avg1: jnum(p["avg1"]), avg7: jnum(p["avg7"]), avg30: jnum(p["avg30"]))
        }
        let name = jstr(c["name"])
        return Candidate(id: jstr(c["id"]), src: "ptcg", srcId: "", srcLang: "", setId: "", dex: ex.dex, cat: ex.cat, tt: ex.tt, ill: ex.ill,
                         name: name.isEmpty ? "?" : name, number: jstr(c["number"]), rarity: jstr(c["rarity"]), setName: jstr(set?["name"]),
                         printedTotal: jstr(set?["printedTotal"]), imageSmall: jstr((c["images"] as? JSON)?["small"]),
                         tcg: ex.tcg, vars: nil, cm: cm)
    }

    static func get(q: String, extra: [String: String] = [:], tries: Int = 2, timeout: TimeInterval = 15, key: String) async throws -> [JSON] {
        var comps = URLComponents(string: "https://api.pokemontcg.io/v2/cards")!
        var items = [URLQueryItem(name: "q", value: q), URLQueryItem(name: "pageSize", value: "12")]
        for (k, v) in extra {
            items.removeAll { $0.name == k }
            items.append(URLQueryItem(name: k, value: v))
        }
        comps.queryItems = items
        guard let url = comps.url else { throw AppError("Indirizzo non valido") }
        var last: Error?
        for _ in 0..<max(1, tries) {
            var req = URLRequest(url: url)
            req.timeoutInterval = timeout
            if !key.isEmpty { req.setValue(key, forHTTPHeaderField: "X-Api-Key") }
            do {
                let (d, r) = try await URLSession.shared.data(for: req)
                let code = (r as? HTTPURLResponse)?.statusCode ?? 0
                if !(200...299).contains(code) { throw AppError("Errore dal catalogo carte (\(code))") }
                let j = parseJSON(d) as? JSON
                return (j?["data"] as? [Any])?.compactMap { $0 as? JSON } ?? []
            } catch { last = error }
        }
        if let u = last as? URLError, u.code == .timedOut { throw AppError("Il catalogo carte non risponde, riprova.") }
        if let a = last as? AppError { throw a }
        throw netErr(last)
    }

    static func search(name: String, num: String, tot: String, key: String) async throws -> [Candidate] {
        try await searchRanked(name: name, num: num, tot: tot, key: key).cards
    }

    /// Come TCGdex.searchRanked: con numero e totale si tengono le carte col nome giusto (30/165 è sia Venusaur
    /// di Expedition sia una carta di 151); le altre e la ricerca per solo nome sono risultati deboli.
    static func searchRanked(name: String, num: String, tot: String, key: String) async throws -> (cards: [Candidate], weak: Bool) {
        func norm(_ s: String) -> String { s.lowercased().filter { $0.isLetter || $0.isNumber } }
        let nn = norm(name)
        var weak: [Candidate] = []
        var queries: [String] = []
        if !num.isEmpty && !tot.isEmpty { queries.append("number:\"\(num)\" set.printedTotal:\(tot)") }
        if !name.isEmpty && !num.isEmpty { queries.append("name:\"\(name)\" number:\"\(num)\"") }
        if !name.isEmpty { queries.append("name:\"\(name)\"") }
        var lastErr: Error?
        var anyOk = false
        var fails = 0
        for q in queries {
            do {
                let f = try await get(q: q, tries: 1, timeout: 12, key: key)
                anyOk = true
                if f.isEmpty { continue }
                let cs: [Candidate] = f.map { candidate($0) }
                let byNumTot = q.contains("set.printedTotal:")
                let nameOnly = !q.contains("number:")
                if byNumTot && !nn.isEmpty {
                    let same: [Candidate] = cs.filter { c in
                        let cn = norm(c.name)
                        return !cn.isEmpty && (cn.contains(nn) || nn.contains(cn))
                    }
                    if !same.isEmpty { return (same, false) }
                    if weak.isEmpty { weak = cs }
                    continue
                }
                if nameOnly && !num.isEmpty {
                    if weak.isEmpty { weak = cs }
                    continue
                }
                return (cs, false)
            } catch {
                lastErr = error
                fails += 1
                if fails >= 2 { break }
            }
        }
        if !anyOk, let e = lastErr { throw e }
        return (weak, !weak.isEmpty)
    }

    static let select = "id,cardmarket,tcgplayer,nationalPokedexNumbers,supertype,artist,subtypes"
    static func card(id: String, key: String) async throws -> Candidate? {
        let r = try await get(q: "id:\"\(id)\"", extra: ["pageSize": "1", "select": select], tries: 2, timeout: 15, key: key)
        guard let f = r.first else { return nil }
        return candidate(f)
    }
}

// MARK: - Cambio dollaro-euro

enum FxAPI {
    static func fetch() async -> (rate: Double, date: String)? {
        guard let url = URL(string: "https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR") else { return nil }
        guard let (d, _) = try? await URLSession.shared.data(from: url),
              let j = parseJSON(d) as? JSON, let rates = j["rates"] as? JSON, let v = jnum(rates["EUR"]), v > 0 else { return nil }
        return (v, jstr(j["date"]))
    }
}

// MARK: - Lettura della carta da foto (Gemini o Claude)

enum Recognizer {
    static let prompt = "Sei un esperto di carte collezionabili Pokémon. Dall’immagine di UNA carta, già ritagliata e che può essere capovolta, restituisci SOLO un oggetto JSON, senza testo né markdown, con queste chiavi: " +
        "\"name_en\" (nome ufficiale in inglese della carta, tradotto se la carta è in italiano o giapponese, mantenendo suffissi come ex, V, VMAX, GX), " +
        "\"name_printed\" (nome come stampato), " +
        "\"number\" (numero di collezione, solo la parte prima della barra, come stampato, es. \"025\"), " +
        "\"printed_total\" (la parte dopo la barra, es. \"165\"; null se non presente), " +
        "\"language\" (it, en, ja oppure other), " +
        "\"variant_hint\" (normal, holo, reverse oppure unknown), " +
        "\"confidence\" (numero da 0 a 1). " +
        "Se un valore non è leggibile usa null: non inventare."

    static let condPrompt = " Inoltre stima la condizione fisica della carta guardando bordi, angoli, superficie e centratura, aggiungendo le chiavi: " +
        "\"condition\" (una tra NM, EX, GD, LP, PL, PO, oppure null se dalla foto non è giudicabile; non usare mai MT), " +
        "\"condition_notes\" (al massimo 12 parole in italiano con i difetti visibili, oppure \"nessun difetto visibile\"), " +
        "\"condition_confidence\" (da 0 a 1). Scala: NM = praticamente nessun segno di usura; EX = usura minima (qualche puntino bianco su bordi o angoli); " +
        "GD = usura moderata (bianco diffuso sui bordi, piccoli graffi); LP = usura evidente; PL = usura forte (piegature leggere, bordi consumati); PO = gravemente danneggiata. " +
        "Sii prudente: se la foto è sfocata, ha riflessi o la carta è in una bustina, abbassa la confidenza o usa null. " +
        "Se c’è una seconda immagine è la stessa carta senza elaborazione: usala per giudicare la condizione."

    static func buildPrompt(cond: Bool) -> String { prompt + (cond ? condPrompt : "") }
    static func rawNote(_ raw: Bool) -> String {
        raw ? "Identifica la carta. Immagine 1: carta migliorata per leggere il testo. Immagine 2: la stessa carta non elaborata, da usare per la condizione."
            : "Identifica la carta."
    }

    static func parseRec(_ text: String) throws -> Rec {
        guard let a = text.firstIndex(of: "{"), let b = text.lastIndex(of: "}"), a < b,
              let d = String(text[a...b]).data(using: .utf8), let o = parseJSON(d) as? JSON else {
            throw AppError("Risposta non leggibile, riprova con un altro scatto.")
        }
        func s(_ k: String) -> String? { let v = jstr(o[k]); return v.isEmpty ? nil : v }
        return Rec(name_en: s("name_en"), name_printed: s("name_printed"), number: s("number"), printed_total: s("printed_total"),
                   language: s("language")?.lowercased(), variant_hint: s("variant_hint")?.lowercased(), confidence: jnum(o["confidence"]),
                   condition: s("condition"), condition_notes: s("condition_notes"), condition_confidence: jnum(o["condition_confidence"]))
    }

    // Gemini "ragiona" prima di rispondere: per leggere una carta non serve e rallenta. Si prova a ridurlo al minimo.
    static let think: [JSON?] = [["thinkingLevel": "minimal"], ["thinkingBudget": 0], nil]

    static func callGemini(model: String, crop: Data, raw: Data?, key: String, thinkStart: Int, cond: Bool) async throws -> (rec: Rec, think: Int) {
        var i = thinkStart
        while i < think.count {
            var gc: JSON = ["temperature": 0, "maxOutputTokens": 1024, "responseMimeType": "application/json"]
            if let t = think[i] { gc["thinkingConfig"] = t }
            var parts: [JSON] = [["inline_data": ["mime_type": "image/jpeg", "data": crop.base64EncodedString()]]]
            if let raw = raw { parts.append(["inline_data": ["mime_type": "image/jpeg", "data": raw.base64EncodedString()]]) }
            parts.append(["text": rawNote(raw != nil)])
            let body: JSON = [
                "systemInstruction": ["parts": [["text": buildPrompt(cond: cond)]]],
                "contents": [["role": "user", "parts": parts]],
                "generationConfig": gc
            ]
            guard let url = URL(string: "https://generativelanguage.googleapis.com/v1beta/models/" + urlEnc(model) + ":generateContent") else {
                throw AppError("Indirizzo non valido")
            }
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.timeoutInterval = GEMINI_TIMEOUT
            req.setValue("application/json", forHTTPHeaderField: "content-type")
            req.setValue(key, forHTTPHeaderField: "x-goog-api-key")
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
            var d = Data()
            var code = 0
            var attempt = 0
            while true {
                attempt += 1
                do { let r = try await freshSend(req, timeout: GEMINI_TIMEOUT); d = r.0; code = r.1; break }
                catch let e as URLError where e.code == .timedOut || e.code == .networkConnectionLost {
                    if attempt < GEMINI_TRIES { continue }
                    let kb = (req.httpBody?.count ?? 0) / 1024
                    throw AppError("Gemini non risponde (\(GEMINI_TRIES) tentativi da \(Int(GEMINI_TIMEOUT)) s, modello \(model), invio \(kb) KB): riprova, o usa \"Prova la connessione\" in Impostazioni.")
                }
                catch { throw netErr(error) }
            }
            let j = parseJSON(d) as? JSON
            if !(200...299).contains(code) {
                let msg = jstr((j?["error"] as? JSON)?["message"])
                if code == 400 && regexTest("think", msg) && i < think.count - 1 { i += 1; continue }
                if code == 400 && regexTest("api key", msg) { throw AppError("Chiave Gemini non valida.") }
                if code == 429 {
                    let q = quotaInfo(j)
                    if q.daily { throw AppError("Quota giornaliera di Gemini finita per \(model).", rate: true, daily: true, retryAfter: q.retry) }
                    throw AppError("Limite al minuto di Gemini (\(model)).", rate: true, retryAfter: q.retry)
                }
                if code == 404 { throw AppError("Modello Gemini non disponibile.", notFound: true) }
                if code >= 500 { throw AppError("Gemini momentaneamente sovraccarico (\(model)), riprova.", busy: true) }
                throw AppError("Errore da Gemini (\(code)). \(msg)")
            }
            let cand = ((j?["candidates"] as? [Any])?.first) as? JSON
            let ps = ((cand?["content"] as? JSON)?["parts"] as? [Any]) ?? []
            let text = ps.compactMap { ($0 as? JSON)?["text"] as? String }.joined()
            do { return (try parseRec(text), i) }
            catch {
                let why = jstr(cand?["finishReason"])
                throw AppError("Gemini non ha dato una risposta leggibile" + (!why.isEmpty && why != "STOP" ? " (motivo: \(why))" : "") + ": riprova, o con un altro scatto.")
            }
        }
        throw AppError("Gemini non ha dato una risposta leggibile: riprova.")
    }

    struct GeminiResult {
        var rec: Rec
        var model: String
        var think: Int
        var models: [String]?
        var quotaSkipped = false   // il modello scelto aveva finito la quota del giorno: non va sostituito per sempre
    }

    // Risposta 429 di Google: tipo di quota (QuotaFailure.violations[].quotaId con "PerDay") e attesa (RetryInfo.retryDelay "34s").
    // Se i dettagli mancano si guarda il testo del messaggio.
    static func quotaInfo(_ j: JSON?) -> (daily: Bool, retry: Double?) {
        let err = j?["error"] as? JSON
        let details = (err?["details"] as? [Any])?.compactMap { $0 as? JSON } ?? []
        var daily = false
        var retry: Double? = nil
        for d in details {
            let t = jstr(d["@type"])
            if t.hasSuffix("QuotaFailure") {
                let vs = (d["violations"] as? [Any])?.compactMap { $0 as? JSON } ?? []
                for v in vs where regexTest("per ?day", jstr(v["quotaId"]) + " " + jstr(v["quotaMetric"])) { daily = true }
            }
            if t.hasSuffix("RetryInfo"), let m = regexMatch("^([0-9]+(?:\\.[0-9]+)?)s$", in: jstr(d["retryDelay"])), m.count > 1 {
                retry = Double(m[1])
            }
        }
        let msg = jstr(err?["message"])
        if details.isEmpty && regexTest("per ?day|daily", msg) { daily = true }
        if retry == nil, let m = regexMatch("retry in ([0-9]+(?:\\.[0-9]+)?) ?s", in: msg), m.count > 1 { retry = Double(m[1]) }
        return (daily, retry)
    }

    // La quota giornaliera gratuita di Gemini si azzera a mezzanotte, ora del Pacifico.
    static func nextDailyReset(after d: Date) -> Date {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "America/Los_Angeles") ?? .current
        let start = cal.startOfDay(for: d)
        return cal.date(byAdding: .day, value: 1, to: start) ?? d.addingTimeInterval(86400)
    }

    // modelli con la quota del giorno finita (solo in memoria): non si richiamano fino all'azzeramento
    nonisolated(unsafe) static var dailyBlocked: [String: Date] = [:]
    static func clearDailyBlocks() { dailyBlocked = [:] }

    // "Automatico": il primo modello concreto dell'elenco; l'alias gemini-flash-latest solo se l'elenco manca
    // (l'alias è spesso il più carico: 503 "high demand")
    static let alias = "gemini-flash-latest"
    static func preferredModel(_ model: String, _ known: [String]) -> String {
        !model.isEmpty ? model : (known.first ?? alias)
    }
    static func modelQueue(_ model: String, _ known: [String]) -> [String] {
        var q: [String] = []
        for m in [preferredModel(model, known)] + Array(known.prefix(4)) + [alias] where !q.contains(m) { q.append(m) }
        return q
    }

    static func recognizeGemini(crop: Data, raw: Data?, key: String, model: String, think: Int?, cond: Bool, known: [String] = []) async throws -> GeminiResult {
        var queue = modelQueue(model, known)
        var tried: [String] = []
        var listed = !known.isEmpty
        var listedModels: [String]? = nil
        var netError: AppError? = nil
        var busyError: AppError? = nil
        var dailyHit = false
        while !queue.isEmpty && tried.count < 6 {
            let m = queue.removeFirst()
            if tried.contains(m) { continue }
            tried.append(m)
            if let until = dailyBlocked[m], until > Date() {
                dailyHit = true      // quota del giorno già finita: non lo si richiama
            } else {
                do {
                    let startThink = (m == model) ? (think ?? 0) : 0
                    let r = try await callGemini(model: m, crop: crop, raw: raw, key: key, thinkStart: startThink, cond: cond)
                    return GeminiResult(rec: r.rec, model: m, think: r.think, models: listedModels, quotaSkipped: dailyHit)
                } catch let e as AppError {
                    // limite al minuto e altri errori veri: si ferma qui (la coda aspetta); quota del giorno: modello successivo
                    if !e.notFound && !e.net && !e.busy && !e.daily { throw e }
                    if e.net && netError == nil { netError = e }
                    if e.busy && busyError == nil { busyError = e }
                    if e.daily { dailyHit = true; dailyBlocked[m] = nextDailyReset(after: Date()) }
                }
            }
            if queue.isEmpty && !listed {
                listed = true
                let l = (try? await listModels(key: key)) ?? []
                if !l.isEmpty { listedModels = l }
                queue.append(contentsOf: l.isEmpty ? ["gemini-3.6-flash", "gemini-3.5-flash"] : Array(l.prefix(4)))
            }
        }
        if busyError == nil && dailyHit {
            let reset = nextDailyReset(after: Date())
            let f = DateFormatter()
            f.locale = Locale(identifier: "it_IT")
            f.dateFormat = "HH:mm"
            throw AppError("Quota giornaliera gratuita di Gemini finita su tutti i modelli provati (\(tried.joined(separator: ", "))). Si azzera alle \(f.string(from: reset)): tocca Riprendi da allora, oppure passa a Claude in Impostazioni.",
                           rate: true, daily: true, resumeAt: reset)
        }
        if busyError != nil { throw AppError("Gemini è sovraccarico su tutti i modelli provati (\(tried.joined(separator: ", "))): riprova tra qualche minuto.", busy: true) }
        if let n = netError { throw n }
        throw AppError("Nessun modello Gemini disponibile con questa chiave: controlla l’elenco in Impostazioni.")
    }

    static func listModels(key: String) async throws -> [String] {
        guard let url = URL(string: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200") else { return [] }
        var req = URLRequest(url: url)
        req.timeoutInterval = 20
        req.setValue(key, forHTTPHeaderField: "x-goog-api-key")
        let d: Data
        let code: Int
        do { let r = try await httpSend(req); d = r.0; code = r.1 }
        catch { throw AppError("connessione assente o bloccata") }
        if !(200...299).contains(code) {
            let fatal = code == 400 || code == 401 || code == 403
            throw AppError(fatal ? "Chiave Gemini non valida o senza permessi." : "errore \(code)", fatal: fatal)
        }
        let all = ((parseJSON(d) as? JSON)?["models"] as? [Any])?.compactMap { $0 as? JSON } ?? []
        let badPattern = "image|tts|audio|live|embed|robot|computer|aqa|imagen|veo|lyria|vision|exp"
        func pick(_ arr: [JSON]) -> [String] {
            arr.map { jstr($0["name"]).replacingOccurrences(of: "models/", with: "") }
                .filter { regexTest("flash", $0) && !regexTest(badPattern, $0) && !regexTest("-\\d{3}$", $0) }
        }
        let gen = all.filter { (($0["supportedGenerationMethods"] as? [Any]) ?? []).contains { jstr($0) == "generateContent" } }
        var names = pick(gen)
        if names.isEmpty { names = pick(all) }
        func ver(_ n: String) -> Double { Double(regexMatch("gemini-(\\d+(?:\\.\\d+)?)", in: n)?[1] ?? "") ?? 0 }
        return names.sorted { a, b in
            let pa = regexTest("preview", a), pb = regexTest("preview", b)
            if pa != pb { return !pa }
            let va = ver(a), vb = ver(b)
            if va != vb { return va > vb }
            let la = regexTest("lite", a), lb = regexTest("lite", b)
            if la != lb { return !la }
            return a < b
        }
    }

    static func recognizeClaude(crop: Data, raw: Data?, key: String, model: String, cond: Bool) async throws -> (rec: Rec, inTokens: Int, outTokens: Int) {
        var content: [JSON] = [["type": "image", "source": ["type": "base64", "media_type": "image/jpeg", "data": crop.base64EncodedString()]]]
        if let raw = raw { content.append(["type": "image", "source": ["type": "base64", "media_type": "image/jpeg", "data": raw.base64EncodedString()]]) }
        content.append(["type": "text", "text": rawNote(raw != nil)])
        let body: JSON = ["model": model, "max_tokens": 400, "system": buildPrompt(cond: cond), "messages": [["role": "user", "content": content]]]
        guard let url = URL(string: "https://api.anthropic.com/v1/messages") else { throw AppError("Indirizzo non valido") }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 60
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.setValue(key, forHTTPHeaderField: "x-api-key")
        req.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let d: Data
        let code: Int
        do { let r = try await httpSend(req); d = r.0; code = r.1 }
        catch { throw netErr(error) }
        let j = parseJSON(d) as? JSON
        if !(200...299).contains(code) {
            let msg = jstr((j?["error"] as? JSON)?["message"])
            if code == 401 { throw AppError("Chiave API non valida o revocata.") }
            if regexTest("credit balance", msg) { throw AppError("Credito esaurito: ricarica dalla Console Anthropic.") }
            if code == 429 { throw AppError("Troppe richieste, riprova tra poco.", rate: true) }
            if code >= 500 { throw AppError("Servizio momentaneamente sovraccarico, riprova.") }
            throw AppError("Errore dal servizio (\(code)). \(msg)")
        }
        let u = j?["usage"] as? JSON
        let text = ((j?["content"] as? [Any]) ?? []).compactMap { b -> String? in
            guard let o = b as? JSON, jstr(o["type"]) == "text" else { return nil }
            return jstr(o["text"])
        }.joined()
        return (try parseRec(text), jint(u?["input_tokens"]) ?? 0, jint(u?["output_tokens"]) ?? 0)
    }
}
