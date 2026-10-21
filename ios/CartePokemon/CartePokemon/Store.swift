// Archivio dell'app: catalogo, storico prezzi, impostazioni, annulla, backup.
// I dati stanno in file JSON dentro l'app (Application Support); le chiavi API nel Portachiavi.

import Foundation
import Observation
import Security
import SwiftUI

struct Config: Codable {
    var model = "claude-haiku-4-5"
    var confirmEdges = false
    var enhance = true
    var provider = "gemini"
    var gmodel = ""
    var gmodels: [String] = []
    var gthink: Int?
    var condEstimate = true
    var priceSource = "cm"
    var condCoef: [String: Double]?
    var dexLang = "it"

    init() {}
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        model = (try? c.decodeIfPresent(String.self, forKey: .model)) ?? model
        confirmEdges = (try? c.decodeIfPresent(Bool.self, forKey: .confirmEdges)) ?? confirmEdges
        enhance = (try? c.decodeIfPresent(Bool.self, forKey: .enhance)) ?? enhance
        provider = (try? c.decodeIfPresent(String.self, forKey: .provider)) ?? provider
        gmodel = (try? c.decodeIfPresent(String.self, forKey: .gmodel)) ?? gmodel
        gmodels = (try? c.decodeIfPresent([String].self, forKey: .gmodels)) ?? gmodels
        gthink = try? c.decodeIfPresent(Int.self, forKey: .gthink)
        condEstimate = (try? c.decodeIfPresent(Bool.self, forKey: .condEstimate)) ?? condEstimate
        priceSource = (try? c.decodeIfPresent(String.self, forKey: .priceSource)) ?? priceSource
        condCoef = try? c.decodeIfPresent([String: Double].self, forKey: .condCoef)
        dexLang = (try? c.decodeIfPresent(String.self, forKey: .dexLang)) ?? dexLang
    }
}

struct FxState: Codable {
    var t: Double = 0
    var r: Double = 0
    var d: String = ""
}

enum Keychain {
    private static let service = "it.albumcarte.app.personale"
    static func get(_ account: String) -> String {
        let q: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var out: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let d = out as? Data else { return "" }
        return String(data: d, encoding: .utf8) ?? ""
    }
    static func set(_ account: String, _ value: String) {
        let base: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(base as CFDictionary)
        if value.isEmpty { return }
        var add = base
        add[kSecValueData as String] = Data(value.utf8)
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(add as CFDictionary, nil)
    }
}

struct Lossy<T: Decodable>: Decodable {
    var value: T?
    init(from decoder: Decoder) throws { value = try? T(from: decoder) }
}

struct BackupFile: Codable {
    var v: Int?
    var saved: String?
    var condCoef: [String: Double]?
    var hist: [String: [[Int]]]?
    var vhist: [[Int]]?
    var catalog: [Entry]
    var photos: [String: BackupPhoto]?   // solo app nativa: le mie foto (il web ignora la chiave)

    init(v: Int?, saved: String?, condCoef: [String: Double]?, hist: [String: [[Int]]]?, vhist: [[Int]]?, catalog: [Entry],
         photos: [String: BackupPhoto]? = nil) {
        self.v = v; self.saved = saved; self.condCoef = condCoef; self.hist = hist; self.vhist = vhist; self.catalog = catalog
        self.photos = photos
    }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        v = try? c.decodeIfPresent(Int.self, forKey: .v)
        saved = try? c.decodeIfPresent(String.self, forKey: .saved)
        condCoef = try? c.decodeIfPresent([String: Double].self, forKey: .condCoef)
        hist = try? c.decodeIfPresent([String: [[Int]]].self, forKey: .hist)
        vhist = try? c.decodeIfPresent([[Int]].self, forKey: .vhist)
        let lossy = try c.decode([Lossy<Entry>].self, forKey: .catalog)
        catalog = lossy.compactMap { $0.value }
        photos = try? c.decodeIfPresent([String: BackupPhoto].self, forKey: .photos)
    }
}

struct BackupInfo {
    var lb: Double
    var days: Int?
    var edits: Int
    var due: Bool
    var snoozed: Bool
}

struct DexTotCache: Codable {
    var t: Double
    var c: [String: Int]
}

@MainActor
@Observable
final class AppStore {
    var catalog: [Entry] = []
    var hist: [String: [[Int]]] = [:]
    var vhist: [[Int]] = []
    var cfg = Config()
    var fx = FxState()
    var gkey = ""
    var ckey = ""
    var tcgKey = ""
    var toastMessage: String?
    var undoMessage: String?
    var catalogProblem = false
    var lastBackup: Double = 0
    var bkEdits = 0
    var bkSnooze: Double = 0
    var geminiToday = 0
    var claudeTokensIn = 0
    var claudeTokensOut = 0

    // dati di Set e Pokédex
    var tdMeta: [String: [String: SetInfo]] = [:]
    var dexNames: [String]?
    var illNames: [String]?
    var dexTot: [String: DexTotCache] = [:]
    var dexFill = DexFill()
    @ObservationIgnored var imgFillRunning = false
    var dexVersion = 0   // sale quando cambiano i dati del Pokédex, per ridisegnare le schermate

    struct DexFill { var running = false; var done = 0; var total = 0 }

    @ObservationIgnored private var undoSnap: [Entry]?
    @ObservationIgnored private var undoTask: Task<Void, Never>?
    @ObservationIgnored private var toastTask: Task<Void, Never>?
    @ObservationIgnored private var saveTask: Task<Void, Never>?
    @ObservationIgnored private var histTask: Task<Void, Never>?
    @ObservationIgnored var dexTotTask: Task<Void, Never>?
    @ObservationIgnored private var histDirty = false
    @ObservationIgnored var listCache: [String: [SetCardSummary]] = [:]
    @ObservationIgnored var setCache: [String: SetDetail] = [:]
    @ObservationIgnored var dexTotToken = 0

    static let dir: URL = {
        let u = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }()
    static var catalogURL: URL { dir.appendingPathComponent("catalog.json") }
    static var bakURL: URL { dir.appendingPathComponent("catalog_bak.json") }
    static var histURL: URL { dir.appendingPathComponent("history.json") }

    init() {
        let ud = UserDefaults.standard
        if let d = ud.data(forKey: "cfg_v1"), let c = try? JSONDecoder().decode(Config.self, from: d) { cfg = c }
        if let d = ud.data(forKey: "fx_v1"), let f = try? JSONDecoder().decode(FxState.self, from: d) { fx = f }
        gkey = Keychain.get("gemini")
        ckey = Keychain.get("claude")
        tcgKey = Keychain.get("tcg")
        lastBackup = ud.double(forKey: "lastBackup")
        bkEdits = ud.integer(forKey: "bkEdits")
        bkSnooze = ud.double(forKey: "bkSnooze")
        let day = Self.todayString()
        if ud.string(forKey: "gemDay") == day { geminiToday = ud.integer(forKey: "gemN") }
        claudeTokensIn = ud.integer(forKey: "claudeIn")
        claudeTokensOut = ud.integer(forKey: "claudeOut")
        loadCatalog()
        loadHistory()
        if let d = DiskCache.read("dextot.json", maxAge: 400 * 86400), let t = try? JSONDecoder().decode([String: DexTotCache].self, from: d) { dexTot = t }
        if let d = DiskCache.read("dexnames.json", maxAge: 90 * 86400), let a = try? JSONDecoder().decode([String].self, from: d), a.count == DEX_MAX { dexNames = a }
        seedHist()
        pruneHist()
        if ud.object(forKey: "bkSig") == nil { ud.set(catalogSig(), forKey: "bkSig") }
    }

    static func todayString() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f.string(from: Date())
    }

    // MARK: - Caricamento e salvataggio

    private func loadCatalog() {
        guard let d = try? Data(contentsOf: Self.catalogURL) else { return }
        if let arr = try? JSONDecoder().decode([Lossy<Entry>].self, from: d) {
            catalog = arr.compactMap { $0.value }
        } else {
            // dati illeggibili: non si sovrascrivono, se ne tiene una copia
            try? d.write(to: Self.dir.appendingPathComponent("catalog_illeggibile.json"), options: .atomic)
            catalogProblem = true
        }
    }

    private struct HistFile: Codable {
        var v: Int = 1
        var hist: [String: [[Int]]] = [:]
        var vhist: [[Int]] = []
    }

    private func loadHistory() {
        guard let d = try? Data(contentsOf: Self.histURL), let h = try? JSONDecoder().decode(HistFile.self, from: d) else { return }
        hist = h.hist
        vhist = h.vhist
    }

    func writeCatalogNow() {
        saveTask?.cancel()
        guard !catalogProblem || !catalog.isEmpty else { return }
        if let d = try? JSONEncoder().encode(catalog) { try? d.write(to: Self.catalogURL, options: .atomic) }
    }

    func flushHist() {
        histTask?.cancel()
        guard histDirty else { return }
        histDirty = false
        if let d = try? JSONEncoder().encode(HistFile(v: 1, hist: hist, vhist: vhist)) { try? d.write(to: Self.histURL, options: .atomic) }
    }

    func flushAll() {
        writeCatalogNow()
        flushHist()
        if let d = try? JSONEncoder().encode(dexTot) { DiskCache.write("dextot.json", d) }
    }

    private func scheduleWrite() {
        saveTask?.cancel()
        saveTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 300_000_000)
            if Task.isCancelled { return }
            self?.writeCatalogNow()
        }
    }

    func scheduleHistSave() {
        histDirty = true
        histTask?.cancel()
        histTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 1_000_000_000)
            if Task.isCancelled { return }
            self?.flushHist()
        }
    }

    // copia automatica del catalogo (al massimo una al giorno, o su richiesta prima di operazioni rischiose)
    func snapshotIfDue(_ force: Bool) {
        if force { writeCatalogNow() }
        guard let d = try? Data(contentsOf: Self.catalogURL), d.count > 2 else { return }
        let last = UserDefaults.standard.double(forKey: "bakT")
        if force || last == 0 || nowMs() - last > 864e5 {
            try? d.write(to: Self.bakURL, options: .atomic)
            UserDefaults.standard.set(nowMs(), forKey: "bakT")
        }
    }

    func save() {
        snapshotIfDue(false)
        scheduleWrite()
        trackEdits()
        recordValue()
    }

    func saveConfig() {
        if let d = try? JSONEncoder().encode(cfg) { UserDefaults.standard.set(d, forKey: "cfg_v1") }
    }

    func bind<T>(_ kp: WritableKeyPath<Config, T>) -> Binding<T> {
        Binding(get: { self.cfg[keyPath: kp] }, set: { v in
            var c = self.cfg
            c[keyPath: kp] = v
            self.cfg = c
            self.saveConfig()
        })
    }

    func setKeys(gemini: String?, claude: String?, tcg: String?) {
        if let g = gemini { gkey = g; Keychain.set("gemini", g) }
        if let c = claude { ckey = c; Keychain.set("claude", c) }
        if let t = tcg { tcgKey = t; Keychain.set("tcg", t) }
    }

    var hasRecognitionKey: Bool { cfg.provider == "gemini" ? !gkey.isEmpty : !ckey.isEmpty }

    // MARK: - Avvisi e annulla

    func toast(_ m: String) {
        toastMessage = m
        toastTask?.cancel()
        toastTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 2_200_000_000)
            if Task.isCancelled { return }
            self?.toastMessage = nil
        }
    }

    func pushUndo() { undoSnap = catalog }
    func showUndo(_ msg: String) {
        undoMessage = msg
        undoTask?.cancel()
        undoTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 9_000_000_000)
            if Task.isCancelled { return }
            self?.undoMessage = nil
        }
    }
    func performUndo() {
        guard let s = undoSnap else { return }
        catalog = s
        undoSnap = nil
        save()
        undoMessage = nil
        toast("Annullato")
    }

    // MARK: - Voci

    func entry(_ key: String) -> Entry? { catalog.first { $0.key == key } }
    func index(_ key: String) -> Int? { catalog.firstIndex { $0.key == key } }

    func update(_ key: String, _ f: (inout Entry) -> Void) {
        guard let i = index(key) else { return }
        var e = catalog[i]
        f(&e)
        catalog[i] = e
        save()
    }

    func delete(keys: Set<String>) {
        catalog.removeAll { keys.contains($0.key) }
        save()
    }

    enum EditOutcome { case done(String); case conflict(Int) }

    // modifica lingua/variante/condizione: la voce cambia identità; se ne esiste già una uguale si può unire
    func applyEdit(key: String, lang: String? = nil, variant: String? = nil, cond: String? = nil, merge: Bool = false) -> EditOutcome {
        guard let i = index(key) else { return .done(key) }
        var e = catalog[i]
        let nl = lang ?? e.lang, nv = variant ?? e.variant, nc = cond ?? e.cond
        let nk = Entry.makeKey(e.cardId, nl, nv, nc)
        if nk != e.key, let j = catalog.firstIndex(where: { $0.key == nk }) {
            if !merge { return .conflict(catalog[j].qty) }
            catalog[j].qty += e.qty
            catalog.remove(at: i)
            save()
            return .done(nk)
        }
        e.lang = nl; e.variant = nv; e.cond = nc; e.key = nk
        if cond != nil { e.condEst = nil; e.condNote = nil }
        if variant != nil, let pr = e.pr, let v = priceNum(pr, e.variant) { e.price = v }
        catalog[i] = e
        save()
        return .done(nk)
    }

    @discardableResult
    func addEntry(from c: Candidate, lang: String, variant: String, cond: String, qty: Int, pm: Double?, condEst: CondEstimate? = nil) -> String {
        let key = Entry.makeKey(c.id, lang, variant, cond)
        if let i = catalog.firstIndex(where: { $0.key == key }) {
            catalog[i].qty += qty
            if let pm = pm { catalog[i].priceManual = pm }
            applyPrices(i, c)
        } else {
            var e = Entry(key: key, cardId: c.id, name: c.name, setName: c.setName, number: c.number, total: c.printedTotal,
                          img: c.imageSmall, lang: lang, variant: variant, cond: cond, qty: qty, price: priceFor(c, variant),
                          priceManual: pm, pr: pricesOf(c), priceT: nowMs(), rarity: c.rarity, added: nowMs())
            if c.src == "tcgdex" { e.src = c.src; e.srcId = c.srcId; e.srcLang = c.srcLang; e.setId = c.setId }
            if let d = c.dex { e.dex = d }
            if let cat = c.cat { e.cat = cat; e.tt = c.tt; e.ill = c.ill }
            if let ce = condEst { e.condEst = 1; e.condNote = ce.notes }
            catalog.append(e)
            recordPrice(e)
            if AppStore.needsImage(e) { Task { await self.fillMissingImages() } }
        }
        save()
        return key
    }

    func applyPrices(_ i: Int, _ c: Candidate) {
        var e = catalog[i]
        if let pr = pricesOf(c) { e.pr = pr }
        if let d = c.dex { e.dex = d }
        if let cat = c.cat { e.cat = cat; e.tt = c.tt; e.ill = c.ill }
        if let v = priceFor(c, e.variant) {
            e.price = v
            e.priceT = nowMs()
            catalog[i] = e
            recordPrice(e)
        } else {
            catalog[i] = e
        }
    }

    // MARK: - Prezzi

    func condCoef(_ c: String) -> Double {
        if let v = cfg.condCoef?[c], v.isFinite, v >= 0 { return v }
        return COND_DEFAULT[c] ?? 1
    }

    func unit(_ e: Entry) -> Double? {
        if let m = e.priceManual { return m }
        if let p = e.price { return p * condCoef(e.cond) }
        return nil
    }

    var fxRate: Double { fx.r > 0 ? fx.r : 0.9 }

    // prezzo di mercato (Near Mint) di una variante
    func priceInfo(_ pr: PriceData?, _ variant: String) -> PriceInfo? {
        guard let pr = pr else { return nil }
        let rate = pr.fx ?? fxRate
        let t = pr.tcg ?? TcgPrices()
        var tcgV: Double? = nil
        switch variant {
        case "Normale": tcgV = t.normal
        case "Holo": tcgV = t.holo ?? t.normal
        case "Reverse holo": tcgV = t.reverse
        case "1st edition": tcgV = t.first ?? t.firstNormal
        default: tcgV = nil
        }
        var cmV: Double? = pr.normal
        if variant == "Reverse holo" { cmV = pr.reverse } else if variant == "1st edition" { cmV = nil }
        let T: PriceInfo? = tcgV.map { PriceInfo(v: $0 * rate, src: "tcg", approx: false) }
        let C: PriceInfo? = cmV.map { PriceInfo(v: $0, src: "cm", approx: false) }
        if variant == "1st edition" {
            if let T = T { return T }
            if let n = pr.normal { return PriceInfo(v: n, src: "cm", approx: true) }
            return nil
        }
        let best: PriceInfo? = cfg.priceSource == "tcg" ? (T ?? C) : (C ?? T)
        if let b = best { return b }
        if let n = pr.normal, variant != "Normale" { return PriceInfo(v: n, src: "cm", approx: true) }
        return nil
    }

    func priceNum(_ pr: PriceData?, _ variant: String) -> Double? { priceInfo(pr, variant)?.v }

    func pricesOf(_ c: Candidate) -> PriceData? {
        let hasT = !c.tcg.isEmpty
        if c.cm == nil && !hasT { return nil }
        var out = PriceData()
        if let p = c.cm {
            out.normal = p.trend ?? p.avg
            out.reverse = p.reverseTrend
            out.avg1 = p.avg1; out.avg7 = p.avg7; out.avg30 = p.avg30
        }
        if hasT { out.tcg = c.tcg; out.fx = fxRate }
        if let v = c.vars { out.vars = v }
        return out
    }

    func priceFor(_ c: Candidate, _ variant: String) -> Double? { priceNum(pricesOf(c), variant) }

    func repriceAll() {
        var n = 0
        for i in catalog.indices {
            guard let pr = catalog[i].pr, let v = priceNum(pr, catalog[i].variant), v != catalog[i].price else { continue }
            catalog[i].price = v
            n += 1
        }
        save()
        toast("Prezzi ricalcolati su \(n)" + (n == 1 ? " carta" : " carte"))
    }

    func refreshFx() async {
        if fx.r > 0 && nowMs() - fx.t < 12 * 3_600_000 { return }
        if let r = await FxAPI.fetch() {
            fx = FxState(t: nowMs(), r: r.rate, d: r.date)
            if let d = try? JSONEncoder().encode(fx) { UserDefaults.standard.set(d, forKey: "fx_v1") }
        }
    }

    // MARK: - Statistiche

    func totalValue() -> (v: Double, n: Int, any: Bool) {
        var v = 0.0, n = 0, any = false
        for e in catalog {
            n += e.qty
            if let u = unit(e) { v += u * Double(e.qty); any = true }
        }
        return (v, n, any)
    }

    // variazione rispetto alla media Cardmarket a 30 giorni
    func changeInfo(_ e: Entry) -> Double? {
        guard let pr = e.pr, e.variant != "Reverse holo", e.variant != "1st edition" else { return nil }
        guard let cur = pr.normal ?? e.price, let base = pr.avg30, base > 0 else { return nil }
        return (cur - base) / base * 100
    }

    struct HomeStats { var n = 0; var val = 0.0; var miss = 0; var cov = 0; var pct: Double? }
    func homeStats() -> HomeStats {
        var s = HomeStats()
        var cur = 0.0, base = 0.0
        for e in catalog {
            s.n += e.qty
            if let u = unit(e) { s.val += u * Double(e.qty) } else { s.miss += e.qty }
            if let pr = e.pr, e.variant != "Reverse holo", e.variant != "1st edition", e.priceManual == nil, let a30 = pr.avg30, a30 > 0, let nrm = pr.normal {
                cur += nrm * Double(e.qty); base += a30 * Double(e.qty); s.cov += e.qty
            }
        }
        if base > 0 { s.pct = (cur - base) / base * 100 }
        return s
    }

    // MARK: - Storico dei prezzi

    func histKey(_ e: Entry) -> String {
        e.cardId + "|" + (e.variant == "Reverse holo" ? "r" : e.variant == "1st edition" ? "f" : "n")
    }

    func thinSeries(_ s: [[Int]], _ t: Int) -> [[Int]] {
        var out: [[Int]] = []
        var seen = Set<String>()
        var i = s.count - 1
        while i >= 0 {
            let age = t - s[i][0]
            if age <= 90 { out.append(s[i]) }
            else {
                let b = age <= 365 ? "w\(s[i][0] / 7)" : "m\(s[i][0] / 30)"
                if !seen.contains(b) { seen.insert(b); out.append(s[i]) }
            }
            i -= 1
        }
        out.reverse()
        if let f = s.first, out.first != f { out.insert(f, at: 0) }
        while out.count > 120 { out.remove(at: 1) }
        return out
    }

    func recordPrice(_ e: Entry, day: Int? = nil) {
        guard let p = e.price, !e.cardId.isEmpty else { return }
        let k = histKey(e), t = day ?? dayNow(), c = Int((p * 100).rounded())
        var s = hist[k] ?? []
        if let last = s.last {
            if last[0] == t { s[s.count - 1][1] = c }
            else if t > last[0] && (Double(abs(c - last[1])) >= max(10, Double(last[1]) * 0.03) || t - last[0] >= 14) { s.append([t, c]) }
            else { return }
        } else {
            s.append([t, c])
        }
        if s.count > 100 { s = thinSeries(s, dayNow()) }
        hist[k] = s
        scheduleHistSave()
    }

    func seedHist() {
        var ch = false
        for e in catalog {
            if let p = e.price, !e.cardId.isEmpty, let pt = e.priceT, hist[histKey(e)] == nil {
                hist[histKey(e)] = [[Int(pt / 864e5), Int((p * 100).rounded())]]
                ch = true
            }
        }
        if ch { scheduleHistSave() }
    }

    func pruneHist() {
        let keep = Set(catalog.map { histKey($0) })
        let t = dayNow()
        var ch = false
        for (k, s) in hist {
            let last = s.last?[0] ?? 0
            if !keep.contains(k) && t - last > 90 { hist[k] = nil; ch = true }
        }
        if ch { scheduleHistSave() }
    }

    func recordValue() {
        let tv = totalValue()
        if catalog.isEmpty || !tv.any { return }
        let t = dayNow(), c = Int((tv.v * 100).rounded())
        if let last = vhist.last {
            if last[0] == t {
                if last[1] == c && last[2] == tv.n { return }
                vhist[vhist.count - 1][1] = c
                vhist[vhist.count - 1][2] = tv.n
            } else if t > last[0] { vhist.append([t, c, tv.n]) }
            else { return }
        } else {
            vhist.append([t, c, tv.n])
        }
        if vhist.count > 100 { vhist = thinSeries(vhist, t) }
        scheduleHistSave()
    }

    struct Mover { var e: Entry; var d: Double; var pct: Double }
    // di quanto sono cambiati i prezzi nel periodo, carta per carta (il tuo prezzo manuale non conta)
    func priceMovers(days: Int) -> (rows: [Mover], dTot: Double, bTot: Double) {
        let t = dayNow()
        let start = days > 0 ? t - days : -1_000_000_000
        var rows: [Mover] = []
        var dTot = 0.0, bTot = 0.0
        for e in catalog {
            if e.priceManual != nil { continue }
            guard let price = e.price, let s = hist[histKey(e)], !s.isEmpty else { continue }
            var base: Int? = nil
            var baseDay = 0
            for q in s where q[0] <= start { base = q[1]; baseDay = q[0] }
            if base == nil { base = s[0][1]; baseDay = s[0][0] }
            if baseDay >= t { continue }
            guard let bb = base else { continue }
            let b = Double(bb) / 100
            if !(b > 0) { continue }
            let k = condCoef(e.cond)
            let d = (price - b) * k * Double(e.qty)
            rows.append(Mover(e: e, d: d, pct: (price - b) / b * 100))
            dTot += d
            bTot += b * k * Double(e.qty)
        }
        return (rows, dTot, bTot)
    }

    // MARK: - Backup

    func catalogSig() -> String {
        var h: Int32 = 5381
        let str = catalog.map { "\($0.key):\($0.qty):\($0.priceManual.map { String($0) } ?? ""):\($0.note ?? "")" }.joined(separator: "|")
        for u in str.utf16 { h = (h << 5) &+ h &+ Int32(u) }
        return "\(catalog.count).\(h)"
    }

    func trackEdits() {
        let ud = UserDefaults.standard
        let sig = catalogSig()
        guard let old = ud.string(forKey: "bkSig") else { ud.set(sig, forKey: "bkSig"); bkEdits = 0; ud.set(0, forKey: "bkEdits"); return }
        if old != sig {
            bkEdits += 1
            ud.set(sig, forKey: "bkSig")
            ud.set(bkEdits, forKey: "bkEdits")
        }
    }

    func backupInfo() -> BackupInfo {
        let days: Int? = lastBackup > 0 ? Int((nowMs() - lastBackup) / 864e5) : nil
        var due = false
        if !catalog.isEmpty {
            if let d = days { due = (d >= 3 && bkEdits > 0) || bkEdits >= 25 }
            else { due = catalog.count >= 10 }
        }
        return BackupInfo(lb: lastBackup, days: days, edits: bkEdits, due: due, snoozed: nowMs() < bkSnooze)
    }

    func backupText(_ i: BackupInfo) -> String {
        guard i.lb > 0, let days = i.days else { return "Non hai ancora fatto un backup." }
        let d = days == 0 ? "oggi" : days == 1 ? "ieri" : "\(days) giorni fa"
        let e = i.edits >= 100 ? "più di 99" : String(i.edits)
        return "Ultimo backup: \(d)" + (i.edits > 0 ? ", \(e)" + (i.edits == 1 ? " modifica" : " modifiche") + " da allora" : "") + "."
    }

    func snoozeBackup() {
        bkSnooze = nowMs() + 864e5
        UserDefaults.standard.set(bkSnooze, forKey: "bkSnooze")
    }

    func markBackupDone() {
        let ud = UserDefaults.standard
        lastBackup = nowMs()
        bkEdits = 0
        bkSnooze = 0
        ud.set(lastBackup, forKey: "lastBackup")
        ud.set(0, forKey: "bkEdits")
        ud.set(0.0, forKey: "bkSnooze")
        ud.set(catalogSig(), forKey: "bkSig")
    }

    func backupFileURL() -> URL? {
        flushHist()
        let ph: [String: BackupPhoto] = backupPhotos()
        let bf = BackupFile(v: 1, saved: ISO8601DateFormatter().string(from: Date()), condCoef: cfg.condCoef ?? COND_DEFAULT,
                            hist: hist, vhist: vhist, catalog: catalog, photos: ph.isEmpty ? nil : ph)
        let enc = JSONEncoder()
        enc.outputFormatting = [.sortedKeys]
        guard let d = try? enc.encode(bf) else { return nil }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("backup-carte-\(Self.todayString()).json")
        do { try d.write(to: url, options: .atomic) } catch { return nil }
        return url
    }

    func csvFileURL() -> URL? {
        func cell(_ v: String) -> String {
            if v.contains(";") || v.contains("\"") || v.contains("\n") { return "\"" + v.replacingOccurrences(of: "\"", with: "\"\"") + "\"" }
            return v
        }
        func n2(_ v: Double?) -> String { v.map { String(format: "%.2f", $0).replacingOccurrences(of: ".", with: ",") } ?? "" }
        let head = ["Nome", "Set", "Numero", "Totale set", "Lingua", "Variante", "Condizione", "Quantità", "Prezzo mercato EUR", "Prezzo tuo EUR", "Prezzo applicato EUR", "Valore riga EUR"]
        var lines = [head.joined(separator: ";")]
        for e in catalog {
            let u = unit(e)
            let row: [String] = [e.name, e.setName, e.number, e.total, e.lang, e.variant, e.cond, String(e.qty), n2(e.price), n2(e.priceManual),
                                 n2(u), u == nil ? "" : n2(u! * Double(e.qty))]
            lines.append(row.map(cell).joined(separator: ";"))
        }
        let text = "\u{FEFF}" + lines.joined(separator: "\r\n")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("catalogo-carte.csv")
        do { try text.write(to: url, atomically: true, encoding: .utf8) } catch { return nil }
        return url
    }

    // ripristino da file di backup (anche quello dell'app web)
    func restore(from data: Data) throws -> Int {
        guard let bf = try? JSONDecoder().decode(BackupFile.self, from: data) else { throw AppError("File di backup non valido") }
        snapshotIfDue(true)
        _ = restorePhotos(bf.photos)
        catalog = bf.catalog
        if let cc = bf.condCoef { var c = cfg; c.condCoef = cc; cfg = c; saveConfig() }
        if let h = bf.hist { hist = h; if let v = bf.vhist { vhist = v }; histDirty = true; flushHist() }
        writeCatalogNow()
        seedHist()
        save()
        return catalog.count
    }

    func restoreAutoCopy() -> Int? {
        guard let d = try? Data(contentsOf: Self.bakURL), let arr = try? JSONDecoder().decode([Lossy<Entry>].self, from: d) else { return nil }
        let list = arr.compactMap { $0.value }
        if list.isEmpty { return nil }
        snapshotIfDue(true)
        catalog = list
        save()
        return list.count
    }

    var autoCopyDate: Date? {
        let t = UserDefaults.standard.double(forKey: "bakT")
        return t > 0 ? Date(timeIntervalSince1970: t / 1000) : nil
    }

    func resetCatalog() {
        pushUndo()
        snapshotIfDue(true)
        catalog = []
        save()
        showUndo("Catalogo svuotato")
    }

    func deleteHistory() {
        hist = [:]
        vhist = []
        histDirty = true
        flushHist()
    }

    func noteGeminiUse() {
        let ud = UserDefaults.standard
        let day = Self.todayString()
        if ud.string(forKey: "gemDay") != day { ud.set(day, forKey: "gemDay"); geminiToday = 0 }
        geminiToday += 1
        ud.set(geminiToday, forKey: "gemN")
    }

    func noteClaudeUse(_ i: Int, _ o: Int) {
        claudeTokensIn += i
        claudeTokensOut += o
        UserDefaults.standard.set(claudeTokensIn, forKey: "claudeIn")
        UserDefaults.standard.set(claudeTokensOut, forKey: "claudeOut")
    }
}
