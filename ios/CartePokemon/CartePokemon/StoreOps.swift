// Operazioni dell'archivio che usano la rete o raggruppano i dati: ricerca, lettura da foto, set, Pokédex, aggiornamento prezzi.

import Foundation

func cleanNum(_ n: String) -> String {
    let p = n.split(separator: "/", omittingEmptySubsequences: false).first.map(String.init) ?? ""
    let t = p.trimmingCharacters(in: .whitespaces)
    if !t.isEmpty && t.allSatisfy({ $0.isNumber }) { return normNum(t) }
    return t
}
func cleanName(_ s: String) -> String { s.replacingOccurrences(of: "\"", with: "").trimmingCharacters(in: .whitespaces) }

// varianti che esistono davvero per la carta (se il catalogo le indica)
func variantList(_ vars: Variants?, current: String? = nil) -> [String] {
    guard let v = vars else { return VARS }
    var out: [String] = []
    if v.normal { out.append("Normale") }
    if v.holo { out.append("Holo") }
    if v.reverse { out.append("Reverse holo") }
    if v.first { out.append("1st edition") }
    if out.isEmpty { return VARS }
    out.append("Altro")
    if let c = current, !out.contains(c) { out.insert(c, at: 0) }
    return out
}

struct SearchOutcome {
    var found: [Candidate] = []
    var source = ""
    var errors: [Error] = []
    var weak = false          // nessuna carta con nome e numero giusti: solo le più vicine
}

struct DexGroup {
    var n: Int
    var entries: [Entry] = []
    var qty = 0
    var value = 0.0
}

extension AppStore {
    // MARK: - Ricerca e lettura

    func searchCards(name: String, num: String, tot: String, lang: String, tdName: String? = nil) async -> SearchOutcome {
        var out = SearchOutcome()
        var weakTd: [Candidate] = []
        do {
            let r = try await TCGdex.searchRanked(name: tdName ?? name, num: num, tot: tot, lang: lang)
            if r.weak { weakTd = r.cards } else { out.found = r.cards; out.source = "TCGdex" }
        } catch { out.errors.append(error) }
        if out.found.isEmpty {
            do {
                let r = try await PTCG.searchRanked(name: name, num: num, tot: tot, key: tcgKey)
                // un risultato debole della Pokémon TCG API non scavalca uno debole di TCGdex (che ha le carte italiane)
                if !r.cards.isEmpty && (!r.weak || weakTd.isEmpty) { out.found = r.cards; out.source = "Pokémon TCG API"; out.weak = r.weak }
            } catch { out.errors.append(error) }
        }
        if out.found.isEmpty && !weakTd.isEmpty { out.found = weakTd; out.source = "TCGdex"; out.weak = true }
        return out
    }

    func recognize(crop: Data, raw rawIn: Data?) async throws -> Rec {
        let raw = cfg.condEstimate ? rawIn : nil
        if cfg.provider == "gemini" {
            let r = try await Recognizer.recognizeGemini(crop: crop, raw: raw, key: gkey, model: cfg.gmodel, think: cfg.gthink, cond: cfg.condEstimate, known: cfg.gmodels)
            noteGeminiUse()
            var c = cfg
            if let l = r.models, !l.isEmpty { c.gmodels = l }
            // con "Automatico" resta automatico; un modello scelto che non risponde viene sostituito da quello che ha funzionato
            if !c.gmodel.isEmpty && r.model != c.gmodel && !r.quotaSkipped { c.gmodel = r.model }
            c.gthink = r.think
            cfg = c
            saveConfig()
            return r.rec
        } else {
            let r = try await Recognizer.recognizeClaude(crop: crop, raw: raw, key: ckey, model: cfg.model, cond: cfg.condEstimate)
            noteClaudeUse(r.inTokens, r.outTokens)
            return r.rec
        }
    }

    // ricerca della carta dai dati letti (stessa logica della ricerca a mano)
    func lookupCandidates(_ rec: Rec) async throws -> [Candidate] {
        let lang = ["it": "it", "en": "en", "ja": "ja"][rec.language ?? ""] ?? "en"
        let num = cleanNum((rec.number ?? "").split(separator: "/").first.map(String.init) ?? "")
        let tot = (rec.printed_total ?? "").filter { $0.isNumber }
        let name = cleanName(rec.name_en ?? rec.name_printed ?? "")
        let tdName = (lang == "it" && !(rec.name_printed ?? "").isEmpty) ? cleanName(rec.name_printed ?? "") : name
        let o = await searchCards(name: name, num: num, tot: tot, lang: lang, tdName: tdName)
        if o.found.isEmpty && o.errors.count >= 2, let e = o.errors.last { throw e }
        return o.found
    }

    func condEstimate(_ r: Rec?) -> CondEstimate? {
        guard let r = r, cfg.condEstimate, let cond = r.condition, !cond.isEmpty else { return nil }
        let code = cond.uppercased().trimmingCharacters(in: .whitespaces)
        if code == "MT" || !CONDS.contains(where: { $0.code == code }) { return nil }
        let cf = r.condition_confidence ?? 0.5
        if cf < 0.35 { return nil }
        return CondEstimate(code: code, notes: String((r.condition_notes ?? "").prefix(90)), cf: cf)
    }

    // aggiunta automatica solo se il risultato è uno, il numero coincide, il nome somiglia e la lettura è sicura
    func autoPick(_ rec: Rec?, _ cands: [Candidate]) -> Candidate? {
        guard let rec = rec, cands.count == 1 else { return nil }
        let c = cands[0]
        if let cf = rec.confidence, cf < 0.7 { return nil }
        guard let rn = rec.number, !rn.isEmpty, normNum(cleanNum(rn)) == normNum(c.number) else { return nil }
        func nz(_ s: String?) -> String { (s ?? "").lowercased().filter { $0.isLetter || $0.isNumber } }
        let a = nz(rec.name_printed), b = nz(c.name), en = nz(rec.name_en)
        if !a.isEmpty && !b.isEmpty && !(b.contains(a) || a.contains(b) || (!en.isEmpty && (b.contains(en) || en.contains(b)))) { return nil }
        return c
    }

    func defaultVariant(_ c: Candidate, hint: String? = nil) -> String {
        let vl = variantList(c.vars)
        if let h = hint, vl.contains(h) { return h }
        return vl.first ?? "Normale"
    }

    func variantFromHint(_ h: String?) -> String? {
        ["holo": "Holo", "reverse": "Reverse holo", "normal": "Normale"][h ?? ""]
    }

    // MARK: - Aggiornamento dei prezzi

    func refreshOne(_ key: String) async throws {
        guard let e = entry(key) else { return }
        await refreshFx()
        var c: Candidate?
        if e.src == "tcgdex" { c = try await TCGdex.card(lang: e.srcLang ?? "it", id: e.srcId ?? "") }
        else { c = try await PTCG.card(id: e.cardId, key: tcgKey) }
        guard let cand = c else { throw AppError("Carta non trovata nel catalogo prezzi") }
        guard pricesOf(cand) != nil else { throw AppError("Nessun prezzo disponibile per questa carta") }
        if let i = index(key) { applyPrices(i, cand); save() }
    }

    // ritorna il numero di carte non raggiungibili
    func refreshAllPrices(progress: @escaping (Int, Int) -> Void) async -> Int {
        if catalog.isEmpty { return 0 }
        await refreshFx()
        let ptcgIds = Array(Set(catalog.filter { $0.src != "tcgdex" }.map { $0.cardId }))
        let tdKeys = Array(Set(catalog.filter { $0.src == "tcgdex" }.map { ($0.srcLang ?? "it") + "/" + ($0.srcId ?? "") }))
        let totalN = ptcgIds.count + tdKeys.count
        var done = 0, failed = 0
        progress(0, totalN)
        var i = 0
        while i < ptcgIds.count {
            let chunk = Array(ptcgIds[i..<min(i + 25, ptcgIds.count)])
            i += 25
            do {
                let q = chunk.map { "id:\"\($0)\"" }.joined(separator: " OR ")
                let data = try await PTCG.get(q: q, extra: ["pageSize": "250", "select": PTCG.select], tries: 2, timeout: 15, key: tcgKey)
                var map: [String: Candidate] = [:]
                for d in data { let c = PTCG.candidate(d); map[c.id] = c }
                for j in catalog.indices where catalog[j].src != "tcgdex" {
                    if let c = map[catalog[j].cardId] { applyPrices(j, c) }
                }
            } catch { failed += chunk.count }
            done += chunk.count
            progress(done, totalN)
        }
        var k = 0
        while k < tdKeys.count {
            let batch = Array(tdKeys[k..<min(k + 6, tdKeys.count)])
            k += 6
            let results: [(String, Candidate?, Bool)] = await withTaskGroup(of: (String, Candidate?, Bool).self) { group in
                for key in batch {
                    group.addTask {
                        let (lang, id) = AppStore.splitKey(key)
                        do { let c = try await TCGdex.card(lang: lang, id: id); return (key, c, true) }
                        catch { return (key, nil, false) }
                    }
                }
                var out: [(String, Candidate?, Bool)] = []
                for await r in group { out.append(r) }
                return out
            }
            for (key, c, ok) in results {
                if !ok { failed += 1 }
                else if let c = c {
                    for j in catalog.indices where catalog[j].src == "tcgdex" && (catalog[j].srcLang ?? "it") + "/" + (catalog[j].srcId ?? "") == key {
                        applyPrices(j, c)
                    }
                }
                done += 1
            }
            progress(done, totalN)
        }
        save()
        return failed
    }

    nonisolated static func splitKey(_ k: String) -> (String, String) {
        guard let i = k.firstIndex(of: "/") else { return ("it", k) }
        return (String(k[..<i]), String(k[k.index(after: i)...]))
    }

    // MARK: - Set

    func setIdOf(_ e: Entry) -> String? {
        if let s = e.setId, !s.isEmpty { return s }
        if e.src == "tcgdex", let sid = e.srcId, !sid.isEmpty {
            if let r = sid.range(of: "-[^-]+$", options: .regularExpression) { return String(sid[..<r.lowerBound]) }
            return sid
        }
        return nil
    }

    func groupKey(_ e: Entry) -> String {
        if e.src == "tcgdex", let sid = setIdOf(e) { return "td|\(e.srcLang ?? "it")|\(sid)" }
        return "x|\(e.setName.isEmpty ? "?" : e.setName)|\(e.total)"
    }

    func groupSets() -> [SetGroup] {
        var m: [String: SetGroup] = [:]
        var order: [String] = []
        for e in catalog {
            let key = groupKey(e)
            if m[key] == nil {
                let p = key.components(separatedBy: "|")
                let td = p[0] == "td"
                m[key] = SetGroup(key: key, td: td, lang: td ? p[1] : nil, setId: td ? p[2] : nil, name: e.setName.isEmpty ? "Set" : e.setName,
                                  official: Int(e.total) ?? 0)
                order.append(key)
            }
            var g = m[key]!
            g.entries.append(e)
            g.qty += e.qty
            if let u = unit(e) { g.value += u * Double(e.qty) }
            g.nums.insert(normNum(e.number))
            g.last = max(g.last, e.added)
            m[key] = g
        }
        return order.compactMap { m[$0] }
    }

    func metaOf(_ g: SetGroup) -> SetInfo? {
        guard g.td, let l = g.lang, let id = g.setId else { return nil }
        return tdMeta[l]?[id]
    }

    func totalOf(_ g: SetGroup) -> Int {
        if let m = metaOf(g) { let t = m.total ?? m.official ?? 0; if t > 0 { return t } }
        return g.official
    }

    @discardableResult
    func loadMeta(_ langs: [String]) async -> Bool {
        var changed = false
        for l in langs where tdMeta[l] == nil {
            if let list = try? await TCGdex.setList(l) {
                var d: [String: SetInfo] = [:]
                for x in list { d[x.id] = x }
                tdMeta[l] = d
                changed = true
            }
        }
        return changed
    }

    func setFromKey(_ key: String) -> SetGroup {
        if let g = groupSets().first(where: { $0.key == key }) { return g }
        let p = key.components(separatedBy: "|")
        if p[0] == "td", p.count >= 3 {
            let m = tdMeta[p[1]]?[p[2]]
            return SetGroup(key: key, td: true, lang: p[1], setId: p[2], name: m?.name ?? p[2], official: m?.official ?? 0)
        }
        return SetGroup(key: key, td: false, lang: nil, setId: nil, name: p.count > 1 ? p[1] : "Set", official: p.count > 2 ? (Int(p[2]) ?? 0) : 0)
    }

    func getSetDetail(lang: String, id: String) async throws -> SetDetail {
        let k = lang + "|" + id
        if let c = setCache[k] { return c }
        let d = try await TCGdex.setDetail(lang: lang, id: id)
        setCache[k] = d
        return d
    }

    // aggiunge una carta (prima variante disponibile, Near Mint) partendo dal suo id TCGdex
    func addFromTCGdex(lang: String, cardId: String) async throws {
        guard let cand = try await TCGdex.card(lang: lang, id: cardId) else { throw AppError("Carta non trovata nel catalogo") }
        addEntry(from: cand, lang: LANGMAP[lang] ?? "IT", variant: defaultVariant(cand), cond: "NM", qty: 1, pm: nil)
    }

    // MARK: - Pokédex

    func dexName(_ n: Int) -> String {
        guard let a = dexNames, n >= 1, n <= a.count else { return "" }
        return a[n - 1]
    }

    func dexIndex() -> [Int: DexGroup] {
        var m: [Int: DexGroup] = [:]
        for e in catalog {
            guard let dex = e.dex else { continue }
            for n in Set(dex) where n >= 1 && n <= DEX_MAX {
                var d = m[n] ?? DexGroup(n: n)
                d.entries.append(e)
                d.qty += e.qty
                if let u = unit(e) { d.value += u * Double(e.qty) }
                m[n] = d
            }
        }
        return m
    }

    func ownedDistinct(_ list: [Entry]) -> Int { Set(list.map { $0.srcId ?? $0.cardId }).count }

    func loadDexNames() async {
        if dexNames != nil && dexNames?.count == DEX_MAX { return }
        if let a = try? await TCGdex.dexNames() { dexNames = a; dexVersion += 1 }
    }

    func loadIllustrators() async {
        if illNames != nil { return }
        if let a = try? await TCGdex.illustrators(lang: cfg.dexLang) { illNames = a; dexVersion += 1 }
    }

    func totalFor(_ n: Int) -> Int? {
        guard let c = dexTot[cfg.dexLang], nowMs() - c.t < 30 * 864e5 else { return nil }
        return c.c[String(n)]
    }

    func setTotal(lang: String, n: Int, v: Int) {
        if var c = dexTot[lang], nowMs() - c.t < 30 * 864e5 {
            c.c[String(n)] = v
            dexTot[lang] = c
        } else {
            dexTot[lang] = DexTotCache(t: nowMs(), c: [String(n): v])
        }
        dexTotTask?.cancel()
        dexTotTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            if Task.isCancelled { return }
            if let s = self, let d = try? JSONEncoder().encode(s.dexTot) { DiskCache.write("dextot.json", d) }
        }
    }

    func loadCardList(kind: String, lang: String, id: String) async throws -> [SetCardSummary] {
        let k = kind + "|" + lang + "|" + id
        if let c = listCache[k] { return c }
        let cards = try await TCGdex.cardList(kind: kind, lang: lang, id: id)
        listCache[k] = cards
        if kind == "pokemon", let n = Int(id) { setTotal(lang: lang, n: n, v: cards.count) }
        return cards
    }

    // scarica i totali dei Pokémon mostrati (prima quelli che hai), quattro alla volta; si ferma se cambi schermata
    func ensureDexTotals(_ nums: [Int]) async {
        let lang = cfg.dexLang
        dexTotToken += 1
        let my = dexTotToken
        let idx = dexIndex()
        var todo = nums.filter { totalFor($0) == nil }
        todo.sort { (idx[$0] != nil ? 1 : 0) > (idx[$1] != nil ? 1 : 0) }
        todo = Array(todo.prefix(200))
        var i = 0
        while i < todo.count && my == dexTotToken {
            let batch = Array(todo[i..<min(i + 4, todo.count)])
            i += 4
            await withTaskGroup(of: Void.self) { group in
                for n in batch {
                    group.addTask { [weak self] in
                        _ = try? await self?.loadCardList(kind: "pokemon", lang: lang, id: String(n))
                    }
                }
            }
            dexVersion += 1
        }
    }

    /// Voci senza immagine da cercare: solo carte TCGdex mai cercate (imgFrom nil).
    static func needsImage(_ e: Entry) -> Bool {
        cardImageURL(e.img) == nil && e.imgFrom == nil && e.src == "tcgdex" && !(e.srcId ?? "").isEmpty
    }

    /// Lingue da provare per l'immagine: prima la lingua della carta (TCGdex può averla aggiunta), poi l'inglese.
    static func imageLangs(_ srcLang: String?) -> [String] {
        let l = (srcLang ?? "").lowercased()
        return l.isEmpty || l == "en" ? ["en"] : [l, "en"]
    }

    /// Cerca l'immagine delle carte che non ce l'hanno: stessa carta su TCGdex nella sua lingua, poi in inglese.
    /// Si salva il risultato (anche "nessuna": imgFrom = "") così non si ripete a ogni avvio; errori di rete = si riprova dopo.
    func fillMissingImages() async {
        if imgFillRunning { return }
        let need = catalog.filter { Self.needsImage($0) }
        if need.isEmpty { return }
        imgFillRunning = true
        defer { imgFillRunning = false }
        struct ImgGroup { var sid: String; var lang: String?; var keys: [String] }
        var groups: [String: ImgGroup] = [:]
        for e in need {
            let sid: String = e.srcId ?? ""
            let k: String = (e.srcLang ?? "") + "/" + sid
            var g: ImgGroup = groups[k] ?? ImgGroup(sid: sid, lang: e.srcLang, keys: [])
            g.keys.append(e.key)
            groups[k] = g
        }
        var changed = false
        for (_, g) in groups {
            var found: String? = nil
            var from = ""
            var failed = false
            for l in Self.imageLangs(g.lang) {
                do {
                    if let c = try await TCGdex.card(lang: l, id: g.sid), cardImageURL(c.imageSmall) != nil {
                        found = c.imageSmall; from = l.uppercased(); break
                    }
                } catch { failed = true; break }
            }
            if failed { continue }
            let ks = Set(g.keys)
            for j in catalog.indices where ks.contains(catalog[j].key) && Self.needsImage(catalog[j]) {
                if let f = found { catalog[j].img = f }
                catalog[j].imgFrom = found == nil ? "" : from
                changed = true
            }
        }
        if changed { save() }
    }

    func pendingDex() -> Int { catalog.filter { $0.dex == nil || $0.cat == nil || $0.ill == nil }.count }

    // legge dalle carte, una sola volta, Pokémon, categoria, tipo di Allenatore e artista
    func backfillDex() async {
        if dexFill.running { return }
        let need = catalog.filter { $0.dex == nil || $0.cat == nil || $0.ill == nil }
        if need.isEmpty { return }
        dexFill = DexFill(running: true, done: 0, total: need.count)
        var td: [String: [String]] = [:]
        var pt: [Entry] = []
        for e in need {
            if e.src == "tcgdex", let sid = e.srcId, !sid.isEmpty { td[(e.srcLang ?? "it") + "/" + sid, default: []].append(e.key) }
            else { pt.append(e) }
        }
        var lastSave = 0
        let keys = Array(td.keys)
        var i = 0
        while i < keys.count {
            let batch = Array(keys[i..<min(i + 6, keys.count)])
            i += 6
            let results: [(String, Candidate?, Bool)] = await withTaskGroup(of: (String, Candidate?, Bool).self) { group in
                for k in batch {
                    group.addTask {
                        let (lang, id) = AppStore.splitKey(k)
                        do { let c = try await TCGdex.card(lang: lang, id: id); return (k, c, true) }
                        catch { return (k, nil, false) }
                    }
                }
                var out: [(String, Candidate?, Bool)] = []
                for await r in group { out.append(r) }
                return out
            }
            for (k, c, ok) in results {
                let ks = Set(td[k] ?? [])
                if ok {
                    for j in catalog.indices where ks.contains(catalog[j].key) {
                        catalog[j].dex = c?.dex ?? []
                        catalog[j].cat = c?.cat ?? ""
                        catalog[j].tt = c?.tt ?? ""
                        catalog[j].ill = c?.ill ?? ""
                    }
                }
                dexFill.done += ks.count
            }
            if dexFill.done - lastSave >= 25 { lastSave = dexFill.done; save() }
        }
        let ids = Array(Set(pt.map { $0.cardId }))
        var p = 0
        while p < ids.count {
            let chunk = Array(ids[p..<min(p + 25, ids.count)])
            p += 25
            let part = pt.filter { chunk.contains($0.cardId) }
            do {
                let q = chunk.map { "id:\"\($0)\"" }.joined(separator: " OR ")
                let data = try await PTCG.get(q: q, extra: ["pageSize": "250", "select": "id,nationalPokedexNumbers,supertype,artist,subtypes"], tries: 2, timeout: 15, key: tcgKey)
                var map: [String: Candidate] = [:]
                for d in data { let c = PTCG.candidate(d); map[c.id] = c }
                for e in part {
                    guard let j = index(e.key) else { continue }
                    let c = map[e.cardId]
                    catalog[j].dex = c?.dex ?? []
                    catalog[j].cat = c?.cat ?? ""
                    catalog[j].tt = c?.tt ?? ""
                    catalog[j].ill = c?.ill ?? ""
                }
            } catch {}
            dexFill.done += part.count
        }
        dexFill.running = false
        save()
        dexVersion += 1
    }
}
