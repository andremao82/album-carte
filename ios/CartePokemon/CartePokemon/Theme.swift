// Aspetto comune del ridisegno (ottobre 2026): temi Notte blu (scuro) e Perla (chiaro), accento giallo,
// pillole per i filtri, intestazioni grandi e barra a schede in vetro con il tasto di scansione giallo al centro.

import SwiftUI

// MARK: - Colori

extension UIColor {
    convenience init(hex: UInt32, alpha: CGFloat = 1) {
        self.init(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
                  blue: CGFloat(hex & 0xFF) / 255, alpha: alpha)
    }
}

/// Colore che cambia col modo chiaro/scuro (valutato al disegno: segue subito l'aspetto scelto).
func themed(dark: UInt32, light: UInt32, darkAlpha: CGFloat = 1, lightAlpha: CGFloat = 1) -> Color {
    Color(uiColor: UIColor { t in
        t.userInterfaceStyle == .light ? UIColor(hex: light, alpha: lightAlpha) : UIColor(hex: dark, alpha: darkAlpha)
    })
}

/// Temi (18/10/2026): scuro = Notte blu (blu notte + giallo Pokémon), chiaro = Perla (grigio iOS, bianco, tasti gialli).
enum Theme {
    static let darkName = "Notte blu"
    static let lightName = "Perla"
    /// Accento per testi, icone e linee: giallo in Notte blu, quasi nero in Perla (il giallo sul bianco non si legge).
    static let accent = themed(dark: 0xFFCB05, light: 0x1C1C1E)
    /// Riempimento di tasti, pillole scelte, barre e anelli: giallo in entrambi i temi (testo sopra: nero).
    static let accentFill = Color(uiColor: UIColor(hex: 0xFFCB05))
    /// Velo giallo dietro voci selezionate e chip.
    static let accentSoft = themed(dark: 0xFFCB05, light: 0xFFCB05, darkAlpha: 0.14, lightAlpha: 0.32)
    /// Bordi evidenziati (carte possedute, scelta principale): oro più scuro sul bianco.
    static let accentLine = themed(dark: 0xFFCB05, light: 0xA67C00)
    static let bg = themed(dark: 0x0B1426, light: 0xF2F2F7)
    static let panel = themed(dark: 0x16233D, light: 0xFFFFFF)
    static let panelHi = themed(dark: 0x22324F, light: 0xE5E5EA)
    /// Salita e discesa dei prezzi, leggibili su entrambi i fondi.
    static let up = themed(dark: 0x4ADE80, light: 0x177A33)
    static let down = themed(dark: 0xFF6B62, light: 0xD70015)
    static let barHeight: CGFloat = 76
    /// Diametro del tasto giallo: uguale all'altezza delle voci, così sta dentro la barra.
    static let scanSize: CGFloat = 52
    /// Tinta della barra a schede nel tema scuro: colore di fondo a questa opacità (più alto = vetro più scuro).
    static let barDarkTint: Double = 0.6
    /// Fondo pieno e pannelli più chiari per i fogli (il vetro del foglio lasciava poco contrasto).
    static let sheetBg = themed(dark: 0x0E192E, light: 0xF2F2F7)
    static let sheetPanel = themed(dark: 0x1C2B48, light: 0xFFFFFF)
    static let sheetPanelHi = themed(dark: 0x2A3B5C, light: 0xE5E5EA)
    static let sheetText = themed(dark: 0xFFFFFF, light: 0x000000, darkAlpha: 0.74, lightAlpha: 0.70)
}

// MARK: - Aspetto (Impostazioni)

enum Appearance: String, CaseIterable, Identifiable {
    case auto, light, dark
    static let key = "appearance"
    var id: String { rawValue }
    var label: String {
        switch self {
        case .auto: return "Automatico"
        case .light: return "Chiaro"
        case .dark: return "Scuro"
        }
    }
    var style: UIUserInterfaceStyle {
        switch self {
        case .auto: return .unspecified
        case .light: return .light
        case .dark: return .dark
        }
    }
}

/// Applica l'aspetto a tutte le finestre (fogli compresi). Si usa UIKit e non preferredColorScheme(nil),
/// che in SwiftUI a volte non torna al tema del telefono dopo aver forzato chiaro o scuro.
@MainActor
func applyAppearance(_ raw: String) {
    let style = (Appearance(rawValue: raw) ?? .auto).style
    for case let scene as UIWindowScene in UIApplication.shared.connectedScenes {
        for w in scene.windows { w.overrideUserInterfaceStyle = style }
    }
}

// MARK: - Pannello

struct PanelStyle: ViewModifier {
    var padding: CGFloat = 14
    var radius: CGFloat = 18
    var highlight = false
    var fill: Color = Theme.panel
    func body(content: Content) -> some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(fill, in: RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay {
                if highlight {
                    RoundedRectangle(cornerRadius: radius, style: .continuous).strokeBorder(Theme.accentLine, lineWidth: 1.5)
                }
            }
    }
}

extension View {
    func panel(padding: CGFloat = 14, radius: CGFloat = 18, highlight: Bool = false, fill: Color = Theme.panel) -> some View {
        modifier(PanelStyle(padding: padding, radius: radius, highlight: highlight, fill: fill))
    }
}

// MARK: - Intestazione grande delle schede

struct ScreenHeader<Trailing: View>: View {
    let title: String
    var subtitle: Text? = nil
    @ViewBuilder var trailing: () -> Trailing

    var body: some View {
        HStack(alignment: .center, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 32, weight: .heavy))
                if let s = subtitle { s.font(.footnote).foregroundStyle(.secondary) }
            }
            Spacer(minLength: 8)
            trailing()
        }
        .padding(.top, 8)
    }
}

extension ScreenHeader where Trailing == EmptyView {
    init(title: String, subtitle: Text? = nil) {
        self.title = title
        self.subtitle = subtitle
        self.trailing = { EmptyView() }
    }
}

struct SectionTitle: View {
    let text: String
    var action: String? = nil
    var onAction: (() -> Void)? = nil
    var body: some View {
        HStack {
            Text(text).font(.title3.weight(.bold))
            Spacer()
            if let a = action, let f = onAction {
                Button(a, action: f).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.accent)
            }
        }
    }
}

// MARK: - Pillole

struct Pill: View {
    let text: String
    var selected = false
    var menu = false
    var body: some View {
        HStack(spacing: 3) {
            Text(text).lineLimit(1)
            if menu { Image(systemName: "chevron.down").font(.caption2.weight(.bold)) }
        }
        .font(.subheadline.weight(.semibold))
        .padding(.horizontal, 14).padding(.vertical, 8)
        .foregroundStyle(selected ? Color.black : Color.primary)
        .background(selected ? Theme.accentFill : Theme.panel, in: Capsule())
        .contentShape(Capsule())
    }
}

struct PillButton: View {
    let text: String
    let selected: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) { Pill(text: text, selected: selected) }
            .buttonStyle(.plain)
            .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

// MARK: - Campo di ricerca a capsula

struct SearchField: View {
    let prompt: String
    @Binding var text: String
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
            TextField(prompt, text: $text)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .submitLabel(.search)
            if !text.isEmpty {
                Button { text = "" } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary) }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Cancella la ricerca")
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 11)
        .background(Theme.panel, in: Capsule())
    }
}

struct CircleIcon: View {
    let systemName: String
    var active = false
    var body: some View {
        Image(systemName: systemName)
            .font(.body.weight(.semibold))
            .frame(width: 42, height: 42)
            .foregroundStyle(active ? Color.black : Color.primary)
            .background(active ? Theme.accentFill : Theme.panel, in: Circle())
    }
}

// MARK: - Immagine della carta a larghezza libera

struct CardArt: View {
    let url: String
    var radius: CGFloat = 8
    var name: String = ""
    var number: String = ""
    var body: some View {
        Color.clear
            .aspectRatio(63.0 / 88.0, contentMode: .fit)
            .overlay {
                RemoteCardImage(url: url, name: name, number: number, fill: true)
            }
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
    }
}

struct QtyBadge: View {
    let qty: Int
    var body: some View {
        Text("×\(qty)")
            .font(.caption2.weight(.heavy))
            .padding(.horizontal, 6).padding(.vertical, 3)
            .foregroundStyle(.white)
            .background(.black.opacity(0.75), in: Capsule())
            .padding(5)
    }
}

/// Barra di avanzamento sottile gialla.
struct ThinBar: View {
    let value: Double   // 0...1
    var height: CGFloat = 4
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Theme.panelHi)
                Capsule().fill(Theme.accentFill).frame(width: max(value > 0 ? height : 0, g.size.width * min(max(value, 0), 1)))
            }
        }
        .frame(height: height)
    }
}

/// Anello di avanzamento giallo.
struct ProgressRing: View {
    let value: Double
    var size: CGFloat = 54
    var line: CGFloat = 7
    var body: some View {
        ZStack {
            Circle().stroke(Theme.panelHi, lineWidth: line)
            Circle().trim(from: 0, to: min(max(value, 0), 1))
                .stroke(Theme.accentFill, style: StrokeStyle(lineWidth: line, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Barra a schede in vetro (Liquid Glass) con tasto di scansione al centro

enum AppTab: Hashable, CaseIterable { case home, collection, progress, dex }

struct GlassTabBar: View {
    @Binding var tab: AppTab
    var reviewCount: Int = 0
    var busy = false
    let onScan: () -> Void
    @Namespace private var glassNS
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        // spacing piccolo: la goccia della voce scelta non si fonde col tasto giallo accanto.
        GlassEffectContainer(spacing: 4) {
            HStack(spacing: 0) {
                item(.home, "Home", "house.fill")
                item(.collection, "Collezione", "rectangle.stack.fill")
                scanButton.frame(maxWidth: .infinity)
                item(.progress, "Progressi", "books.vertical.fill")
                item(.dex, "Pokédex", "square.grid.3x3.fill")
            }
            .padding(.horizontal, 6).padding(.vertical, 6)
            .glassEffect(capsuleGlass, in: .capsule)
        }
        // animazione solo sulla barra (le schede cambiano di colpo, come prima)
        .animation(.bouncy(duration: 0.4, extraBounce: 0.1), value: tab)
        .padding(.horizontal, 14)
        .padding(.bottom, 4)
    }

    /// Vetro della capsula: nel tema scuro tinto di blu notte (altrimenti sul fondo scuro sembra grigio chiaro).
    private var capsuleGlass: Glass {
        scheme == .dark ? .regular.tint(Theme.bg.opacity(Theme.barDarkTint)).interactive() : .regular.interactive()
    }

    private func item(_ t: AppTab, _ label: String, _ icon: String) -> some View {
        let sel = tab == t
        return Button {
            if tab != t { UISelectionFeedbackGenerator().selectionChanged() }
            tab = t
        } label: {
            VStack(spacing: 3) {
                Image(systemName: icon).font(.system(size: 18, weight: .semibold))
                Text(label).font(.system(size: 10, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.8)
            }
            .foregroundStyle(sel ? Theme.accent : Color.primary.opacity(0.85))
            .frame(maxWidth: .infinity, minHeight: Theme.scanSize)
            .background {
                // Voce scelta: goccia di vetro con lo stesso id in tutte le voci, così scivola e si deforma
                // da una voce all'altra (come la barra di sistema di iOS 26) invece di comparire di colpo.
                if sel {
                    Color.clear
                        .glassEffect(.regular.tint(Theme.accentSoft).interactive(), in: .capsule)
                        .glassEffectID("tab-selection", in: glassNS)
                        .padding(.horizontal, 2)
                }
            }
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityAddTraits(sel ? .isSelected : [])
    }

    private var scanButton: some View {
        Button(action: onScan) {
            ZStack {
                Image(systemName: "viewfinder").font(.system(size: 22, weight: .bold))
                if busy { ProgressView().controlSize(.mini).tint(.black).offset(y: 1) }
            }
            .foregroundStyle(.black)
            .frame(width: Theme.scanSize, height: Theme.scanSize)
            .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .glassEffect(.regular.tint(Theme.accentFill).interactive(), in: .circle)
        .overlay(alignment: .topTrailing) {
            if reviewCount > 0 {
                Text("\(reviewCount)")
                    .font(.caption2.weight(.bold))
                    .padding(.horizontal, 6).padding(.vertical, 2)
                    .foregroundStyle(.white)
                    .background(.orange, in: Capsule())
                    .offset(x: 4, y: -4)
            }
        }
        .accessibilityLabel("Aggiungi carte")
    }
}

/// Spazio in basso per la barra a schede personalizzata.
struct TabBarSpace: ViewModifier {
    func body(content: Content) -> some View {
        content.safeAreaInset(edge: .bottom, spacing: 0) { Color.clear.frame(height: Theme.barHeight) }
    }
}

extension View {
    func tabBarSpace() -> some View { modifier(TabBarSpace()) }
}

// MARK: - Testi brevi

func shortVariant(_ v: String) -> String {
    switch v {
    case "Reverse holo": return "Reverse"
    case "1st edition": return "1st ed."
    default: return v
    }
}

func langLong(_ l: String) -> String {
    switch l {
    case "IT": return "Italiano"
    case "EN": return "Inglese"
    case "JP": return "Giapponese"
    default: return l
    }
}
