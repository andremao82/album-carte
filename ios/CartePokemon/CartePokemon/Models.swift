// Modelli dati. Il formato JSON è lo stesso del backup dell'app web (backup-carte-AAAA-MM-GG.json),
// così il catalogo si può portare da una all'altra con "Ripristina da file".

import Foundation

let LANGS = ["IT", "EN", "JP", "Altro"]
let VARS = ["Normale", "Holo", "Reverse holo", "1st edition", "Altro"]
struct CondItem: Identifiable {
    let code: String
    let name: String
    var id: String { code }
    init(_ code: String, _ name: String) { self.code = code; self.name = name }
}
let CONDS: [CondItem] = [
    CondItem("MT", "Mint"), CondItem("NM", "Near Mint"), CondItem("EX", "Excellent"), CondItem("GD", "Good"),
    CondItem("LP", "Light Played"), CondItem("PL", "Played"), CondItem("PO", "Poor")
]
let COND_DEFAULT: [String: Double] = ["MT": 1, "NM": 1, "EX": 0.85, "GD": 0.7, "LP": 0.55, "PL": 0.4, "PO": 0.25]
let LANGMAP: [String: String] = ["it": "IT", "en": "EN", "ja": "JP"]
let LANG_NAMES: [String: String] = ["it": "Italiano", "en": "Inglese", "ja": "Giapponese"]
let DEX_MAX = 1025
struct GenItem: Identifiable {
    let roman: String
    let region: String
    let lo: Int
    let hi: Int
    var id: String { roman }
    init(_ roman: String, _ region: String, _ lo: Int, _ hi: Int) { self.roman = roman; self.region = region; self.lo = lo; self.hi = hi }
}
let GENS: [GenItem] = [
    GenItem("I", "Kanto", 1, 151), GenItem("II", "Johto", 152, 251), GenItem("III", "Hoenn", 252, 386),
    GenItem("IV", "Sinnoh", 387, 493), GenItem("V", "Unima", 494, 649), GenItem("VI", "Kalos", 650, 721),
    GenItem("VII", "Alola", 722, 809), GenItem("VIII", "Galar", 810, 905), GenItem("IX", "Paldea", 906, 1025)
]

// MARK: - Prezzi

struct TcgPrices: Codable, Hashable {
    var normal: Double?
    var holo: Double?
    var reverse: Double?
    var first: Double?
    var firstNormal: Double?
    var isEmpty: Bool { normal == nil && holo == nil && reverse == nil && first == nil && firstNormal == nil }
}

struct Variants: Codable, Hashable {
    var normal: Bool = false
    var holo: Bool = false
    var reverse: Bool = false
    var first: Bool = false

    init(normal: Bool = false, holo: Bool = false, reverse: Bool = false, first: Bool = false) {
        self.normal = normal; self.holo = holo; self.reverse = reverse; self.first = first
    }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        normal = (try? c.decodeIfPresent(Bool.self, forKey: .normal)) ?? false
        holo = (try? c.decodeIfPresent(Bool.self, forKey: .holo)) ?? false
        reverse = (try? c.decodeIfPresent(Bool.self, forKey: .reverse)) ?? false
        first = (try? c.decodeIfPresent(Bool.self, forKey: .first)) ?? false
    }
}

struct PriceData: Codable, Hashable {
    var normal: Double?
    var reverse: Double?
    var avg1: Double?
    var avg7: Double?
    var avg30: Double?
    var tcg: TcgPrices?
    var fx: Double?
    var vars: Variants?
}

struct PriceInfo {
    var v: Double
    var src: String      // "cm" oppure "tcg"
    var approx: Bool
}

// MARK: - Voce del catalogo

struct Entry: Codable, Identifiable, Hashable {
    var key: String
    var cardId: String
    var name: String
    var setName: String
    var number: String
    var total: String
    var img: String
    var lang: String
    var variant: String
    var cond: String
    var qty: Int
    var price: Double?
    var priceManual: Double?
    var pr: PriceData?
    var priceT: Double?
    var rarity: String
    var added: Double
    var src: String?
    var srcId: String?
    var srcLang: String?
    var setId: String?
    var dex: [Int]?       // nil = non ancora letto
    var cat: String?      // nil = non ancora letto; "" = letto ma sconosciuto
    var tt: String?
    var ill: String?
    var note: String?
    var condEst: Int?
    var condNote: String?
    var imgFrom: String?  // lingua da cui viene l'immagine presa come ripiego ("EN"); "" = cercata, nessuna trovata
    var photo: String?    // id della mia foto (CardPhotos)
    var photoQuad: [Double]?  // bordi della foto, 8 numeri 0-1, per rifare il ritaglio
    var photoPref: String?    // anteprima scelta: "own" = mia foto, "web" = immagine da internet, nil = automatico

    var id: String { key }

    static func makeKey(_ cardId: String, _ lang: String, _ variant: String, _ cond: String) -> String {
        [cardId, lang, variant, cond].joined(separator: "|")
    }

    init(key: String, cardId: String, name: String, setName: String, number: String, total: String, img: String,
         lang: String, variant: String, cond: String, qty: Int, price: Double?, priceManual: Double?, pr: PriceData?,
         priceT: Double?, rarity: String, added: Double) {
        self.key = key; self.cardId = cardId; self.name = name; self.setName = setName; self.number = number
        self.total = total; self.img = img; self.lang = lang; self.variant = variant; self.cond = cond; self.qty = qty
        self.price = price; self.priceManual = priceManual; self.pr = pr; self.priceT = priceT; self.rarity = rarity
        self.added = added
    }

    // Lettura tollerante: accetta numeri al posto di stringhe e campi mancanti (come normalizeEntry nell'app web).
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let cardId = c.lenientString(.cardId) ?? ""
        let name = c.lenientString(.name) ?? ""
        if cardId.isEmpty && name.isEmpty {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "voce vuota"))
        }
        self.cardId = cardId
        self.name = name.isEmpty ? "?" : name
        self.setName = c.lenientString(.setName) ?? ""
        self.number = c.lenientString(.number) ?? ""
        self.total = c.lenientString(.total) ?? ""
        self.img = c.lenientString(.img) ?? ""
        let l = c.lenientString(.lang) ?? ""
        self.lang = l.isEmpty ? "IT" : l
        let v = c.lenientString(.variant) ?? ""
        self.variant = v.isEmpty ? "Normale" : v
        let cd = c.lenientString(.cond) ?? ""
        self.cond = cd.isEmpty ? "NM" : cd
        let q = (try? c.decodeIfPresent(Int.self, forKey: .qty)) ?? Int((try? c.decodeIfPresent(Double.self, forKey: .qty)) ?? 1)
        self.qty = max(1, q)
        self.price = c.lenientDouble(.price)
        self.priceManual = c.lenientDouble(.priceManual)
        self.pr = try? c.decodeIfPresent(PriceData.self, forKey: .pr)
        self.priceT = c.lenientDouble(.priceT)
        self.rarity = c.lenientString(.rarity) ?? ""
        self.added = c.lenientDouble(.added) ?? Date().timeIntervalSince1970 * 1000
        let k = c.lenientString(.key) ?? ""
        self.key = k.isEmpty ? Entry.makeKey(cardId, self.lang, self.variant, self.cond) : k
        self.src = c.lenientString(.src)
        self.srcId = c.lenientString(.srcId)
        self.srcLang = c.lenientString(.srcLang)
        self.setId = c.lenientString(.setId)
        self.dex = try? c.decodeIfPresent([Int].self, forKey: .dex)
        self.cat = c.lenientString(.cat)
        self.tt = c.lenientString(.tt)
        self.ill = c.lenientString(.ill)
        self.note = c.lenientString(.note)
        self.condEst = try? c.decodeIfPresent(Int.self, forKey: .condEst)
        self.condNote = c.lenientString(.condNote)
        self.imgFrom = c.lenientString(.imgFrom)
        self.photo = c.lenientString(.photo)
        self.photoQuad = try? c.decodeIfPresent([Double].self, forKey: .photoQuad)
        let pp = c.lenientString(.photoPref)
        self.photoPref = (pp == "own" || pp == "web") ? pp : nil
    }
}

extension KeyedDecodingContainer {
    func lenientString(_ key: Key) -> String? {
        if let s = try? decodeIfPresent(String.self, forKey: key) { return s }
        if let i = try? decodeIfPresent(Int.self, forKey: key) { return String(i) }
        if let d = try? decodeIfPresent(Double.self, forKey: key) {
            return d == d.rounded() ? String(Int(d)) : String(d)
        }
        return nil
    }
    func lenientDouble(_ key: Key) -> Double? {
        if let d = try? decodeIfPresent(Double.self, forKey: key) { return d.isFinite ? d : nil }
        if let s = try? decodeIfPresent(String.self, forKey: key), let d = Double(s) { return d }
        return nil
    }
}

// MARK: - Carta proposta dal catalogo online (TCGdex o Pokémon TCG API)

struct CMPrices: Codable, Hashable {
    var trend: Double?
    var avg: Double?
    var reverseTrend: Double?
    var avg1: Double?
    var avg7: Double?
    var avg30: Double?
}

struct Candidate: Identifiable, Hashable, Codable {
    var id: String            // "tcgdex:it:sv1-025" oppure id della Pokémon TCG API
    var src: String           // "tcgdex" | "ptcg"
    var srcId: String
    var srcLang: String
    var setId: String
    var dex: [Int]?
    var cat: String?
    var tt: String
    var ill: String
    var name: String
    var number: String
    var rarity: String
    var setName: String
    var printedTotal: String
    var imageSmall: String
    var tcg: TcgPrices
    var vars: Variants?
    var cm: CMPrices?

    // l'id "grezzo" della carta nel catalogo di origine, usato come cardId nel catalogo
    var cardId: String {
        if src == "tcgdex" { return id }
        return id
    }

    static func == (a: Candidate, b: Candidate) -> Bool { a.id == b.id }
    func hash(into h: inout Hasher) { h.combine(id) }
}

// MARK: - Lettura della carta da foto

struct Rec: Codable, Hashable {
    var name_en: String?
    var name_printed: String?
    var number: String?
    var printed_total: String?
    var language: String?
    var variant_hint: String?
    var confidence: Double?
    var condition: String?
    var condition_notes: String?
    var condition_confidence: Double?

    var isEmpty: Bool { (name_en ?? "").isEmpty && (number ?? "").isEmpty && (name_printed ?? "").isEmpty }
}

struct CondEstimate {
    var code: String
    var notes: String
    var cf: Double
}

// MARK: - Set, Pokédex

struct SetInfo: Codable, Hashable {
    var id: String
    var name: String
    var official: Int?
    var total: Int?
    var logo: String
    var symbol: String
}

struct SetGroup: Identifiable {
    var key: String
    var td: Bool
    var lang: String?
    var setId: String?
    var name: String
    var official: Int
    var nums: Set<String> = []
    var qty: Int = 0
    var value: Double = 0
    var last: Double = 0
    var entries: [Entry] = []
    var id: String { key }
}

struct SetCardSummary: Identifiable, Hashable {
    var id: String
    var localId: String
    var name: String
    var image: String
}

struct SetDetail {
    var id: String
    var name: String
    var logo: String
    var cards: [SetCardSummary]
}

// Rotte di navigazione
struct CardRoute: Hashable { var key: String }
struct SetRoute: Hashable { var key: String }
struct DexRoute: Hashable {
    var kind: String          // "pokemon" | "art" | "grp"
    var n: Int = 0
    var name: String = ""
    var cat: String = ""
    var grpKey: String = ""
}

// Anteprime, formattazione
func eur(_ v: Double?) -> String {
    guard let v = v else { return "n.d." }
    return eurFormatter.string(from: NSNumber(value: v)) ?? String(format: "%.2f €", v)
}
private let eurFormatter: NumberFormatter = {
    let f = NumberFormatter()
    f.numberStyle = .currency
    f.currencyCode = "EUR"
    f.locale = Locale(identifier: "it_IT")
    return f
}()
func fmtN(_ v: Int) -> String {
    let f = NumberFormatter()
    f.numberStyle = .decimal
    f.locale = Locale(identifier: "it_IT")
    return f.string(from: NSNumber(value: v)) ?? String(v)
}
func fmtPct(_ p: Double) -> String {
    if p > 0 && p < 0.01 { return "<0,01" }
    if p > 0 && p < 0.1 { return String(format: "%.2f", p).replacingOccurrences(of: ".", with: ",") }
    if p > 0 && p < 10 { return String(format: "%.1f", p).replacingOccurrences(of: ".", with: ",") }
    return String(Int(p.rounded()))
}
func signedEur(_ v: Double) -> String { (v >= 0 ? "+" : "−") + eur(abs(v)) }
func signedPct(_ p: Double) -> String { (p >= 0 ? "+" : "−") + String(format: "%.1f", abs(p)).replacingOccurrences(of: ".", with: ",") + "%" }
func parsePrice(_ s: String) -> Double? {
    let t = s.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: ",", with: ".")
    guard !t.isEmpty, let d = Double(t), d.isFinite, d >= 0 else { return nil }
    return d
}
func normNum(_ v: String) -> String {
    var s = Substring(v)
    while s.count > 1, s.first == "0" { s = s.dropFirst() }
    return String(s)
}
/// Id di carta confrontabile fra le fonti: minuscolo, numeri senza zeri iniziali ("sv01-025" e "sv1-25" → "sv1-25").
func normCardId(_ s: String) -> String {
    var out = "", digits = ""
    func flush() {
        if digits.isEmpty { return }
        let t = digits.drop(while: { $0 == "0" })
        out += t.isEmpty ? "0" : String(t)
        digits = ""
    }
    for ch in s.lowercased() {
        if ch.isASCII && ch.isNumber { digits.append(ch) } else { flush(); out.append(ch) }
    }
    flush()
    return out
}

/// Id con cui una voce del catalogo si riconosce in un elenco di TCGdex (id TCGdex, oppure id della Pokémon TCG API).
func entryMatchIds(_ e: Entry) -> [String] {
    [e.srcId ?? "", e.cardId].filter { !$0.isEmpty }.map(normCardId)
}

func nowMs() -> Double { Date().timeIntervalSince1970 * 1000 }
func dayNow() -> Int { Int(Date().timeIntervalSince1970 / 86400) }
func fmtDay(_ d: Int) -> String {
    let dt = Date(timeIntervalSince1970: Double(d) * 86400)
    let f = DateFormatter()
    f.locale = Locale(identifier: "it_IT")
    let other = Calendar.current.component(.year, from: dt) != Calendar.current.component(.year, from: Date())
    f.dateFormat = other ? "dd/MM/yy" : "dd/MM"
    return f.string(from: dt)
}
func fmtDate(_ ms: Double?) -> String {
    guard let ms = ms, ms > 0 else { return "" }
    let f = DateFormatter()
    f.locale = Locale(identifier: "it_IT")
    f.dateStyle = .short
    f.timeStyle = .none
    return f.string(from: Date(timeIntervalSince1970: ms / 1000))
}
func initials(_ name: String) -> String {
    let words = name.components(separatedBy: CharacterSet.alphanumerics.inverted).filter { !$0.isEmpty }
    if words.count > 1 { return (String(words[0].prefix(1)) + String(words[1].prefix(1))).uppercased() }
    return String((words.first ?? "?").prefix(2)).uppercased()
}
func hiImg(_ u: String) -> String {
    if u.isEmpty { return "" }
    return u.replacingOccurrences(of: "/low.webp", with: "/high.webp")
}

// "25/165" oppure "25"
func numLine(_ number: String, _ total: String) -> String {
    if total.isEmpty { return number }
    return number + "/" + total
}

// "Nome del set · 25/165"
func setLine(_ setName: String, _ number: String, _ total: String) -> String {
    if number.isEmpty { return setName }
    return setName + " · " + numLine(number, total)
}

/// Percentuale per la testata del Pokédex: due decimali e virgola (1 su 1025 = "0,10%").
func dexPercent(have: Int, total: Int) -> String {
    guard total > 0 else { return "0,00%" }
    return String(format: "%.2f", Double(have) / Double(total) * 100).replacingOccurrences(of: ".", with: ",") + "%"
}


/// Percentuale dei Progressi: una cifra decimale, due sotto l'1% (così "0,02%" non diventa "0,0%").
func setsPercent(_ p: Double) -> String {
    String(format: p > 0 && p < 1 ? "%.2f" : "%.1f", p).replacingOccurrences(of: ".", with: ",") + "%"
}
