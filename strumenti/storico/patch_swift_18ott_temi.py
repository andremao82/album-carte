# Temi Notte blu (scuro) e Perla (chiaro) con impostazione Aspetto: Automatico / Chiaro / Scuro. Solo app nativa.
D='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/'
F={}
def rd(f):
    if f not in F: F[f]=open(D+f,encoding='utf-8').read()
def rep(f,old,new,count=1):
    rd(f); c=F[f].count(old)
    assert c==count,(f,old[:90],c)
    F[f]=F[f].replace(old,new)

# --- Theme.swift: colori dinamici chiaro/scuro e aspetto
rep('Theme.swift','''enum Theme {
    static let accent = Color.yellow
    static let bg = Color.black
    static let panel = Color(uiColor: .secondarySystemBackground)
    static let panelHi = Color(uiColor: .tertiarySystemBackground)
''','''extension UIColor {
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
''')
rep('Theme.swift','''    static let sheetBg = Color(white: 0.08)
    static let sheetPanel = Color(white: 0.18)
    static let sheetPanelHi = Color(white: 0.28)
    static let sheetText = Color.white.opacity(0.74)
}
''','''    static let sheetBg = themed(dark: 0x0E192E, light: 0xF2F2F7)
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
''')
rep('Theme.swift','RoundedRectangle(cornerRadius: radius, style: .continuous).strokeBorder(Theme.accent, lineWidth: 1.5)','RoundedRectangle(cornerRadius: radius, style: .continuous).strokeBorder(Theme.accentLine, lineWidth: 1.5)')
rep('Theme.swift','.background(selected ? Theme.accent : Theme.panel, in: Capsule())','.background(selected ? Theme.accentFill : Theme.panel, in: Capsule())')
rep('Theme.swift','.background(active ? Theme.accent : Theme.panel, in: Circle())','.background(active ? Theme.accentFill : Theme.panel, in: Circle())')
rep('Theme.swift','Capsule().fill(Theme.accent).frame(','Capsule().fill(Theme.accentFill).frame(')
rep('Theme.swift','.stroke(Theme.accent, style: StrokeStyle(lineWidth: line, lineCap: .round))','.stroke(Theme.accentFill, style: StrokeStyle(lineWidth: line, lineCap: .round))')
rep('Theme.swift','.background(sel ? Theme.accent.opacity(0.14) : Color.clear, in: Capsule())','.background(sel ? Theme.accentSoft : Color.clear, in: Capsule())')
rep('Theme.swift','.glassEffect(.regular.tint(Theme.accent).interactive(), in: .circle)','.glassEffect(.regular.tint(Theme.accentFill).interactive(), in: .circle)')

# --- App: niente più scuro forzato, aspetto dalle impostazioni
rep('CartePokemonApp.swift','''                .preferredColorScheme(.dark)
                .tint(.yellow)
''','''                .tint(Theme.accent)
''')
rep('CartePokemonApp.swift','''    @State private var showSettings = false

    var body: some View {''','''    @State private var showSettings = false
    @AppStorage(Appearance.key) private var appearance = Appearance.auto.rawValue

    var body: some View {''')
rep('CartePokemonApp.swift','''        .task { await store.refreshFx() }
    }''','''        .task { await store.refreshFx() }
        .onAppear { applyAppearance(appearance) }
        .onChange(of: appearance) { _, a in applyAppearance(a) }
    }''')

# --- Impostazioni: sezione Aspetto in cima
rep('SettingsView.swift','''    @State private var message: String?
''','''    @State private var message: String?
    @AppStorage(Appearance.key) private var appearance = Appearance.auto.rawValue
''')
rep('SettingsView.swift','''            Form {
                readingSection''','''            Form {
                appearanceSection
                readingSection''')
rep('SettingsView.swift','''    private var readingSection: some View {''','''    private var appearanceSection: some View {
        Section {
            Picker("Aspetto", selection: $appearance) {
                ForEach(Appearance.allCases) { a in Text(a.label).tag(a.rawValue) }
            }
            .pickerStyle(.segmented)
        } header: {
            Text("Aspetto")
        } footer: {
            Text("Automatico segue il tema dell'iPhone. Scuro: \\(Theme.darkName) · Chiaro: \\(Theme.lightName).")
        }
    }

    private var readingSection: some View {''')

# --- Foglio Aggiungi: segue l'aspetto, testi non più bianchi fissi
rep('AddView.swift','''        .presentationBackground(Theme.sheetBg)
        .preferredColorScheme(.dark)
''','''        .presentationBackground(Theme.sheetBg)
''')
rep('AddView.swift','Circle().fill(Theme.accent).frame(width: 8, height: 8)','Circle().fill(Theme.accentFill).frame(width: 8, height: 8)')
rep('AddView.swift','''                .foregroundStyle(.black)
                .background(Theme.accent, in: Capsule())''','''                .foregroundStyle(.black)
                .background(Theme.accentFill, in: Capsule())''')
rep('AddView.swift','''.foregroundStyle(primary ? Color.black : Color.white)
                .background(primary ? Theme.accent : Theme.sheetPanelHi,''','''.foregroundStyle(primary ? Color.black : Color.primary)
                .background(primary ? Theme.accentFill : Theme.sheetPanelHi,''')
rep('AddView.swift','Text(title).font(.headline).foregroundStyle(.white)','Text(title).font(.headline).foregroundStyle(.primary)')
rep('AddView.swift','.foregroundStyle(Color.white.opacity(0.5))','.foregroundStyle(Color.primary.opacity(0.45))')
rep('AddView.swift','.fill(Theme.accent.opacity(0.14)).allowsHitTesting(false)','.fill(Theme.accentSoft).allowsHitTesting(false)')
rep('AddView.swift','.strokeBorder(Color.white.opacity(0.10), lineWidth: 1)','.strokeBorder(Color.primary.opacity(0.10), lineWidth: 1)')
rep('AddView.swift','case .added: return .green','case .added: return Theme.up')

# --- Pillole e tasti gialli nelle altre schede
rep('CardDetailView.swift','.background(sel ? Theme.accent : Color.clear, in: Capsule())','.background(sel ? Theme.accentFill : Color.clear, in: Capsule())')
rep('CardDetailView.swift','.background(sel ? Theme.accent : Theme.panel, in: RoundedRectangle(cornerRadius: 10','.background(sel ? Theme.accentFill : Theme.panel, in: RoundedRectangle(cornerRadius: 10')
rep('CardDetailView.swift','.foregroundStyle(d >= 0 ? .green : .red)','.foregroundStyle(d >= 0 ? Theme.up : Theme.down)')
rep('DexViews.swift','.background(mode == m ? Theme.accent : Theme.panel, in: Capsule())','.background(mode == m ? Theme.accentFill : Theme.panel, in: Capsule())')
rep('DexViews.swift','''                    .foregroundStyle(.black)
                    .background(Theme.accent, in: Capsule())''','''                    .foregroundStyle(.black)
                    .background(Theme.accentFill, in: Capsule())''')
rep('DexViews.swift','.strokeBorder(Theme.accent, lineWidth: 1.5)','.strokeBorder(Theme.accentLine, lineWidth: 1.5)')
rep('DexViews.swift','.foregroundStyle(Color.green)','.foregroundStyle(Theme.up)')
rep('DexViews.swift','.background(Color.green.opacity(0.16), in: Capsule())','.background(Theme.up.opacity(0.16), in: Capsule())')
rep('SetsView.swift','.background(scope == sc ? Theme.accent : Theme.panelHi, in: Capsule())','.background(scope == sc ? Theme.accentFill : Theme.panelHi, in: Capsule())')
rep('HomeView.swift','.background((b.due ? Color.orange : Theme.accent).opacity(0.15), in: Capsule())','.background(b.due ? Color.orange.opacity(0.15) : Theme.accentSoft, in: Capsule())')
rep('HomeView.swift','.foregroundStyle(p >= 0 ? .green : .red)','.foregroundStyle(p >= 0 ? Theme.up : Theme.down)')
rep('HomeView.swift','.foregroundStyle(m.d >= 0 ? .green : .red)','.foregroundStyle(m.d >= 0 ? Theme.up : Theme.down)')
rep('AlbumView.swift','.foregroundStyle(p >= 0 ? .green : .red)','.foregroundStyle(p >= 0 ? Theme.up : Theme.down)')
rep('AlbumView.swift','.foregroundStyle(mv.dTot >= 0 ? .green : .red)','.foregroundStyle(mv.dTot >= 0 ? Theme.up : Theme.down)')
rep('AlbumView.swift','.foregroundStyle(m.d >= 0 ? .green : .red)','.foregroundStyle(m.d >= 0 ? Theme.up : Theme.down)')
rep('Components.swift','.foregroundStyle(ch >= 0 ? .green : .red)','.foregroundStyle(ch >= 0 ? Theme.up : Theme.down)')

for f,s in F.items(): open(D+f,'w',encoding='utf-8').write(s)
print('ok', sorted(F))
