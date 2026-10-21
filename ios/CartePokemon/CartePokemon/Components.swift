// Elementi comuni: miniature, etichette, avvisi, grafico dei prezzi.

import SwiftUI
import Charts

// MARK: - Immagini

/// Indirizzo dell'immagine: nil se vuoto o non valido (AsyncImage con nil resta in caricamento per sempre).
func cardImageURL(_ s: String) -> URL? {
    let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !t.isEmpty, let u = URL(string: t), u.scheme != nil else { return nil }
    return u
}

/// Immagine di una carta dalla rete: rotellina solo mentre scarica; senza indirizzo o dopo due tentativi falliti
/// mostra un riquadro con le iniziali del nome e il numero.
struct RemoteCardImage: View {
    let url: String
    var name: String = ""
    var number: String = ""
    var fill = false
    @State private var attempt = 0

    static let maxAttempts = 2

    var body: some View {
        if url.hasPrefix(CardPhotos.scheme) {
            LocalPhotoImage(id: String(url.dropFirst(CardPhotos.scheme.count)), name: name, number: number, fill: fill)
        } else if let u = cardImageURL(url) {
            AsyncImage(url: u) { phase in
                switch phase {
                case .success(let img):
                    if fill { img.resizable().scaledToFill() } else { img.resizable().scaledToFit() }
                case .failure:
                    if attempt + 1 < Self.maxAttempts {
                        loading.task {
                            try? await Task.sleep(nanoseconds: 800_000_000)
                            attempt += 1
                        }
                    } else {
                        CardPlaceholder(name: name, number: number)
                    }
                default:
                    loading
                }
            }
            .id(attempt)
        } else {
            CardPlaceholder(name: name, number: number)
        }
    }

    private var loading: some View {
        ZStack { Theme.panelHi; ProgressView().controlSize(.small) }
    }
}

/// Riquadro per una carta senza immagine (come le iniziali dell'app web).
struct CardPlaceholder: View {
    var name: String = ""
    var number: String = ""
    var body: some View {
        ZStack {
            Theme.panelHi
            VStack(spacing: 2) {
                Text(name.isEmpty ? "?" : initials(name))
                    .font(.system(size: 34, weight: .heavy, design: .rounded))
                    .minimumScaleFactor(0.3).lineLimit(1)
                if !number.isEmpty {
                    Text(number).font(.caption2.weight(.semibold)).minimumScaleFactor(0.5).lineLimit(1)
                }
            }
            .foregroundStyle(.secondary)
            .padding(4)
        }
        .accessibilityLabel(name.isEmpty ? "Carta senza immagine" : name + ", senza immagine")
    }
}

/// C'è davvero un'immagine da ingrandire (foto mia presente su disco o indirizzo valido)?
func canZoomImage(_ u: String) -> Bool {
    if u.hasPrefix(CardPhotos.scheme) { return CardPhotos.exists(String(u.dropFirst(CardPhotos.scheme.count))) }
    return cardImageURL(u) != nil
}

/// Immagine della carta a tutto schermo: pizzico per ingrandire (fino a 5×), doppio tocco 1×/2,5×,
/// trascina per spostarla quando è ingrandita; a 1× trascinando in basso (o in alto) oltre 120 pt si chiude; tasto ✕.
/// Fondo sempre nero (come fotocamera ed editor dei bordi: si guarda un'immagine).
struct CardZoomView: View {
    let url: String
    var name: String = ""
    var number: String = ""
    let onClose: () -> Void

    @State private var scale: CGFloat = 1
    @State private var baseScale: CGFloat = 1
    @State private var offset: CGSize = .zero
    @State private var baseOffset: CGSize = .zero

    static let maxScale: CGFloat = 5
    static let doubleTapScale: CGFloat = 2.5
    static let closeDrag: CGFloat = 120

    static func clampScale(_ s: CGFloat) -> CGFloat { min(max(s, 1), maxScale) }
    static func shouldClose(scale: CGFloat, dragHeight: CGFloat) -> Bool { scale <= 1.01 && abs(dragHeight) > closeDrag }
    static func backdrop(scale: CGFloat, dragHeight: CGFloat) -> Double {
        scale > 1.01 ? 1 : max(0.35, 1 - Double(abs(dragHeight)) / 400)
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.black.opacity(Self.backdrop(scale: scale, dragHeight: offset.height)).ignoresSafeArea()
            RemoteCardImage(url: url, name: name, number: number)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .padding(16)
                .scaleEffect(scale)
                .offset(offset)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .contentShape(Rectangle())
                .onTapGesture(count: 2) { toggleZoom() }
                .gesture(magnify.simultaneously(with: drag))
                .accessibilityLabel(name.isEmpty ? "Immagine della carta" : "Immagine di \(name)")
            Button { onClose() } label: {
                Image(systemName: "xmark").font(.headline).foregroundStyle(.white).frame(width: 44, height: 44)
            }
            .buttonStyle(.glass)
            .padding(.trailing, 16)
            .padding(.top, 8)
            .accessibilityLabel("Chiudi")
        }
        .statusBarHidden()
        .environment(\.colorScheme, .dark)   // vetro scuro anche col tema Perla
    }

    private var magnify: some Gesture {
        MagnifyGesture()
            .onChanged { v in scale = Self.clampScale(baseScale * v.magnification) }
            .onEnded { _ in
                baseScale = scale
                if scale <= 1.01 { withAnimation(.spring) { reset() } }
            }
    }

    private var drag: some Gesture {
        DragGesture()
            .onChanged { v in
                if scale > 1.01 {
                    offset = CGSize(width: baseOffset.width + v.translation.width, height: baseOffset.height + v.translation.height)
                } else {
                    offset = CGSize(width: 0, height: v.translation.height)
                }
            }
            .onEnded { v in
                if Self.shouldClose(scale: scale, dragHeight: v.translation.height) { onClose(); return }
                if scale > 1.01 { baseOffset = offset } else { withAnimation(.spring) { offset = .zero } }
            }
    }

    private func toggleZoom() {
        withAnimation(.spring) {
            if scale > 1.01 { reset() } else { scale = Self.doubleTapScale; baseScale = scale }
        }
    }

    private func reset() {
        scale = 1; baseScale = 1; offset = .zero; baseOffset = .zero
    }
}

struct CardThumb: View {
    let url: String
    var width: CGFloat = 52
    var radius: CGFloat = 6
    var name: String = ""
    var number: String = ""

    var body: some View {
        RemoteCardImage(url: url, name: name, number: number)
            .frame(width: width, height: width * 88 / 63)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
    }
}

struct SpriteView: View {
    let n: Int
    var size: CGFloat = 56
    var body: some View {
        AsyncImage(url: URL(string: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/\(n).png")) { phase in
            if case .success(let img) = phase {
                img.resizable().interpolation(.none).scaledToFit()
            } else {
                Color.clear
            }
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Etichette

struct Chip: View {
    let text: String
    var tint: Color = .secondary
    init(_ text: String, tint: Color = .secondary) { self.text = text; self.tint = tint }
    var body: some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 7).padding(.vertical, 3)
            .foregroundStyle(tint)
            .background(tint.opacity(0.15), in: Capsule())
    }
}

struct EntryRow: View {
    @Environment(AppStore.self) private var store
    let e: Entry

    var body: some View {
        HStack(spacing: 12) {
            CardThumb(url: previewURL(e), name: e.name, number: e.number)
            VStack(alignment: .leading, spacing: 4) {
                Text(e.name).font(.headline).lineLimit(1)
                Text(subtitle).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                HStack(spacing: 5) {
                    Chip(e.lang)
                    if e.variant != "Normale" { Chip(e.variant, tint: .orange) }
                    if e.cond != "NM" { Chip(e.cond, tint: .blue) }
                    if e.qty > 1 { Chip("×\(e.qty)", tint: .green) }
                }
            }
            Spacer(minLength: 4)
            VStack(alignment: .trailing, spacing: 3) {
                if let u = store.unit(e) {
                    Text(eur(u * Double(e.qty))).font(.headline).monospacedDigit()
                    if e.qty > 1 { Text(eur(u) + " cad.").font(.caption).foregroundStyle(.secondary) }
                    if let ch = store.changeInfo(e), abs(ch) >= 0.5 {
                        Text(signedPct(ch)).font(.caption.weight(.semibold)).foregroundStyle(ch >= 0 ? Theme.up : Theme.down)
                    }
                } else {
                    Text("—").foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 2)
    }

    private var subtitle: String {
        return setLine(e.setName, e.number, e.total)
    }
}

// MARK: - Avvisi

struct ToastOverlay: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        VStack(spacing: 8) {
            if let u = store.undoMessage {
                HStack(spacing: 14) {
                    Text(u).font(.subheadline).lineLimit(1)
                    Button("Annulla") { store.performUndo() }
                        .font(.subheadline.weight(.semibold))
                }
                .padding(.horizontal, 18).padding(.vertical, 12)
                .glassEffect(.regular, in: .capsule)
                .transition(.move(edge: .top).combined(with: .opacity))
            }
            if let t = store.toastMessage {
                Text(t).font(.subheadline)
                    .padding(.horizontal, 18).padding(.vertical, 12)
                    .glassEffect(.regular, in: .capsule)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.snappy, value: store.undoMessage)
        .animation(.snappy, value: store.toastMessage)
        .padding(.bottom, 8)
    }
}

// MARK: - Grafico

struct PricePoint: Identifiable {
    var id: Int { day }
    var day: Int
    var value: Double
}

// Etichette del grafico (stesse regole riprodotte in ios_chart_test.js).
let CHART_MAX_DOTS = 31
/// Giorni da mostrare sull'asse delle date: al massimo `n`, distribuiti, senza doppioni, primo e ultimo compresi.
func chartTickDays(_ days: [Int], max n: Int = 4) -> [Int] {
    let u = Array(Set(days)).sorted()
    if u.count <= n { return u }
    var out: [Int] = []
    for i in 0..<n {
        let d = u[Int((Double(i) * Double(u.count - 1) / Double(n - 1)).rounded())]
        if out.last != d { out.append(d) }
    }
    return out
}
private let chartDayFmt: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "it_IT")
    f.timeZone = TimeZone(identifier: "UTC")
    return f
}()
/// "12 ott"; con l'anno ("12 ott 25") se non è l'anno in corso.
func chartDayLabel(_ d: Int, today: Int = dayNow()) -> String {
    let dt = Date(timeIntervalSince1970: Double(d) * 86400)
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone(identifier: "UTC")!
    let other = cal.component(.year, from: dt) != cal.component(.year, from: Date(timeIntervalSince1970: Double(today) * 86400))
    chartDayFmt.dateFormat = other ? "d MMM yy" : "d MMM"
    return chartDayFmt.string(from: dt).replacingOccurrences(of: ".", with: "")
}
/// Valori senza decimali se l'escursione del grafico è di almeno 5 €.
func chartWholeEuros(_ vals: [Double]) -> Bool {
    guard let lo = vals.min(), let hi = vals.max() else { return false }
    return hi - lo >= 5
}
private let chartEurWhole: NumberFormatter = {
    let f = NumberFormatter()
    f.numberStyle = .currency
    f.currencyCode = "EUR"
    f.locale = Locale(identifier: "it_IT")
    f.maximumFractionDigits = 0
    return f
}()
func chartEuroLabel(_ v: Double, whole: Bool) -> String {
    whole ? (chartEurWhole.string(from: NSNumber(value: v.rounded())) ?? "\(Int(v.rounded())) €") : eur(v)
}
/// Prime `n` carte per prezzo di una copia; le carte senza prezzo sono escluse.
func topValueEntries(_ catalog: [Entry], unit: (Entry) -> Double?, n: Int = 12) -> [Entry] {
    var priced: [(entry: Entry, price: Double)] = []
    for e in catalog {
        if let u = unit(e) { priced.append((entry: e, price: u)) }
    }
    priced.sort { (a: (entry: Entry, price: Double), b: (entry: Entry, price: Double)) -> Bool in
        if a.price != b.price { return a.price > b.price }
        return a.entry.added > b.entry.added
    }
    return priced.prefix(n).map { (x: (entry: Entry, price: Double)) -> Entry in x.entry }
}
/// Punto del grafico più vicino al giorno toccato.
func nearestPoint(_ pts: [PricePoint], day: Int) -> PricePoint? {
    pts.min { abs($0.day - day) < abs($1.day - day) }
}

struct PriceChart: View {
    let points: [PricePoint]
    var body: some View {
        Chart(points) { p in
            LineMark(x: .value("Giorno", Date(timeIntervalSince1970: Double(p.day) * 86400)), y: .value("Prezzo", p.value))
                .interpolationMethod(.monotone)
                .foregroundStyle(Theme.accent)
            PointMark(x: .value("Giorno", Date(timeIntervalSince1970: Double(p.day) * 86400)), y: .value("Prezzo", p.value))
                .symbolSize(points.count > 20 ? 0 : 30)
                .foregroundStyle(Theme.accent)
        }
        .chartYScale(domain: .automatic(includesZero: false))
        .chartYAxis {
            AxisMarks { v in
                AxisGridLine()
                AxisValueLabel { if let d = v.as(Double.self) { Text(eur(d)) } }
            }
        }
        .frame(height: 160)
    }
}

// MARK: - Destinazioni di navigazione comuni

struct AppDestinations: ViewModifier {
    func body(content: Content) -> some View {
        content
            .navigationDestination(for: CardRoute.self) { CardDetailView(key: $0.key) }
            .navigationDestination(for: SetRoute.self) { SetDetailView(key: $0.key) }
            .navigationDestination(for: DexRoute.self) { DexDetailView(route: $0) }
    }
}

extension View {
    func appDestinations() -> some View { modifier(AppDestinations()) }
}

// MARK: - Riflessi olografici e carta che si inclina col dito (ridisegno "Vetro olografico", 20/10/2026)

enum HoloKind { case none, holo, reverse }

/// Holo = riflesso arcobaleno; Reverse holo = banda chiara più leggera; le altre varianti nessun riflesso.
func holoKind(_ variant: String) -> HoloKind {
    switch variant {
    case "Holo": return .holo
    case "Reverse holo": return .reverse
    default: return .none
    }
}

/// Punto toccato in 0-1 dentro la carta (fuori dalla carta resta sul bordo).
func tiltPoint(_ loc: CGPoint, in size: CGSize) -> CGPoint {
    guard size.width > 0, size.height > 0 else { return CGPoint(x: 0.5, y: 0.5) }
    return CGPoint(x: min(1, max(0, loc.x / size.width)), y: min(1, max(0, loc.y / size.height)))
}

/// Inclinazione in gradi per il punto toccato: al massimo 14° attorno all'asse verticale e 11° attorno all'orizzontale.
func tiltAngles(_ p: CGPoint?) -> (x: Double, y: Double) {
    guard let p = p else { return (x: 0, y: 0) }
    let ax: Double = (0.5 - Double(p.y)) * 22
    let ay: Double = (Double(p.x) - 0.5) * 28
    return (x: ax, y: ay)
}

/// Riflesso disegnato sopra l'immagine. at = punto toccato (0-1): il riflesso va dalla parte opposta.
/// Colori propri (non del tema): imitano la pellicola olografica e valgono in Notte blu e in Perla.
struct HoloSheen: View {
    let kind: HoloKind
    var at: CGPoint? = nil

    private static let rainbow: [Color] = [
        Color.clear,
        Color(red: 1.0, green: 0.25, blue: 0.63).opacity(0.30),
        Color(red: 1.0, green: 0.84, blue: 0.0).opacity(0.32),
        Color(red: 0.16, green: 1.0, blue: 0.71).opacity(0.30),
        Color(red: 0.16, green: 0.67, blue: 1.0).opacity(0.32),
        Color(red: 0.67, green: 0.31, blue: 1.0).opacity(0.28),
        Color.clear
    ]
    private static let band: [Color] = [Color.clear, Color(red: 1, green: 1, blue: 1).opacity(0.32), Color.clear]

    var body: some View {
        let cx: CGFloat = at.map { 1 - $0.x } ?? 0.35
        let cy: CGFloat = at.map { 1 - $0.y } ?? 0.5
        let start = UnitPoint(x: cx - 0.6, y: cy - 0.6)
        let end = UnitPoint(x: cx + 0.6, y: cy + 0.6)
        switch kind {
        case .none:
            Color.clear.allowsHitTesting(false)
        case .holo:
            LinearGradient(colors: HoloSheen.rainbow, startPoint: start, endPoint: end)
                .blendMode(.colorDodge)
                .opacity(0.8)
                .allowsHitTesting(false)
        case .reverse:
            LinearGradient(colors: HoloSheen.band, startPoint: start, endPoint: end)
                .blendMode(.overlay)
                .allowsHitTesting(false)
        }
    }
}

/// Carta che si inclina seguendo il dito; il riflesso si sposta dalla parte opposta e torna a riposo lasciando.
/// Un tocco senza trascinare esegue onTap (se tapEnabled). Con "Riduci movimento" resta ferma; il tocco funziona.
/// Il trascinamento parte da fermo (minimumDistance 0): toccando la carta la pagina non scorre.
struct TiltingCard<Content: View>: View {
    let kind: HoloKind
    let radius: CGFloat
    let tapEnabled: Bool
    let onTap: () -> Void
    let content: () -> Content
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var point: CGPoint? = nil
    @State private var moved: CGFloat = 0
    @State private var size: CGSize = .zero

    init(kind: HoloKind, radius: CGFloat = 10, tapEnabled: Bool = true, onTap: @escaping () -> Void, @ViewBuilder content: @escaping () -> Content) {
        self.kind = kind
        self.radius = radius
        self.tapEnabled = tapEnabled
        self.onTap = onTap
        self.content = content
    }

    var body: some View {
        let p: CGPoint? = reduceMotion ? nil : point
        let ang = tiltAngles(p)
        content()
            .overlay { HoloSheen(kind: kind, at: p) }
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .contentShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .onGeometryChange(for: CGSize.self) { $0.size } action: { size = $0 }
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { v in
                        moved = max(moved, hypot(v.translation.width, v.translation.height))
                        if !reduceMotion { point = tiltPoint(v.location, in: size) }
                    }
                    .onEnded { _ in
                        let wasTap = moved < 8
                        moved = 0
                        withAnimation(.spring(duration: 0.35)) { point = nil }
                        if wasTap && tapEnabled { onTap() }
                    }
            )
            .rotation3DEffect(.degrees(ang.y), axis: (x: 0, y: 1, z: 0), perspective: 0.5)
            .rotation3DEffect(.degrees(ang.x), axis: (x: 1, y: 0, z: 0), perspective: 0.5)
            .animation(.interactiveSpring(response: 0.25, dampingFraction: 0.8), value: point)
            .accessibilityElement(children: .ignore)
            .accessibilityAddTraits(tapEnabled ? .isButton : [])
            .accessibilityAction { if tapEnabled { onTap() } }
    }
}
