# Modifiche mirate ai file Swift (ritocchi 18/10/2026): foglio Aggiungi, Progressi, testata Pokédex.
D='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/'
class F:
    def __init__(s,n): s.p=D+n; s.s=open(s.p,encoding='utf-8').read()
    def rep(s,old,new,count=1):
        assert s.s.count(old)==count,(s.p[-20:],old[:90],s.s.count(old)); s.s=s.s.replace(old,new)
    def save(s): open(s.p,'w',encoding='utf-8').write(s.s)

# ---- Theme: colori del foglio e pannello con tinta propria
t=F('Theme.swift')
t.rep("    static let barHeight: CGFloat = 76\n","    static let barHeight: CGFloat = 76\n    /// Fondo pieno e pannelli più chiari per i fogli (il vetro del foglio lasciava poco contrasto).\n    static let sheetBg = Color(white: 0.08)\n    static let sheetPanel = Color(white: 0.18)\n    static let sheetPanelHi = Color(white: 0.28)\n    static let sheetText = Color.white.opacity(0.74)\n")
t.rep("    var highlight = false\n    func body(content: Content) -> some View {","    var highlight = false\n    var fill: Color = Theme.panel\n    func body(content: Content) -> some View {")
t.rep(".background(Theme.panel, in: RoundedRectangle(cornerRadius: radius, style: .continuous))\n            .overlay {\n                if highlight {",".background(fill, in: RoundedRectangle(cornerRadius: radius, style: .continuous))\n            .overlay {\n                if highlight {")
t.rep("""    func panel(padding: CGFloat = 14, radius: CGFloat = 18, highlight: Bool = false) -> some View {
        modifier(PanelStyle(padding: padding, radius: radius, highlight: highlight))""","""    func panel(padding: CGFloat = 14, radius: CGFloat = 18, highlight: Bool = false, fill: Color = Theme.panel) -> some View {
        modifier(PanelStyle(padding: padding, radius: radius, highlight: highlight, fill: fill))""")
t.save()

# ---- App: l'altezza del foglio la decide AddView (si adatta al contenuto)
a=F('CartePokemonApp.swift')
a.rep("                .presentationDetents([.height(520), .large])\n","")
a.save()

# ---- AddView
v=F('AddView.swift')
v.rep("    @State private var importing = 0\n","    @State private var importing = 0\n    @State private var contentH: CGFloat = 380   // altezza del contenuto: il foglio si ferma lì, senza vuoto sotto\n")
v.rep("""                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("Aggiungi carte").font(.title2.weight(.heavy))""","""                VStack(alignment: .leading, spacing: 14) {
                    HStack {
                        Text("Aggiungi carte").font(.system(size: 30, weight: .heavy))""")
v.rep("""                    .padding(.top, 6)
                    if !store.hasRecognitionKey {""","""                    .padding(.top, 22)
                    .padding(.bottom, 10)
                    if !store.hasRecognitionKey {""")
v.rep("""                        .font(.caption2).foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 4)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
            .toolbar(.hidden, for: .navigationBar)""","""                        .font(.footnote).foregroundStyle(Theme.sheetText)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 6)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 28)
                .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { contentH = $0 }
            }
            .background(Theme.sheetBg)
            .toolbar(.hidden, for: .navigationBar)""")
v.rep("""        }
    }

    private var queueRow: some View {""","""        }
        .presentationDetents([.height(max(contentH + 30, 320)), .large])
        .presentationBackground(Theme.sheetBg)
        .preferredColorScheme(.dark)
    }

    private var queueRow: some View {""")
v.rep("""        .panel(padding: 12, radius: 16)
    }

    private func addFromLibrary""","""        .panel(padding: 12, radius: 16, fill: Theme.sheetPanel)
    }

    private func addFromLibrary""")
v.rep("""                .foregroundStyle(primary ? Color.black : Color.primary)
                .background(primary ? Theme.accent : Theme.panelHi, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.headline)
                Text(text).font(.caption).foregroundStyle(.secondary).lineLimit(2)
            }
            Spacer(minLength: 4)
            Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(.tertiary)
        }
        .panel(padding: 14, radius: 18, highlight: primary)
        .overlay {
            if primary { RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Theme.accent.opacity(0.08)).allowsHitTesting(false) }
        }""","""                .foregroundStyle(primary ? Color.black : Color.white)
                .background(primary ? Theme.accent : Theme.sheetPanelHi, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.headline).foregroundStyle(.white)
                Text(text).font(.subheadline).foregroundStyle(Theme.sheetText).lineLimit(2)
            }
            Spacer(minLength: 4)
            Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Color.white.opacity(0.5))
        }
        .panel(padding: 14, radius: 18, highlight: primary, fill: Theme.sheetPanel)
        .overlay {
            if primary { RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Theme.accent.opacity(0.14)).allowsHitTesting(false) }
            else { RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Color.white.opacity(0.10), lineWidth: 1).allowsHitTesting(false) }
        }""")
v.save()

# ---- Progressi: numeri grandi
s=F('SetsView.swift')
s.rep("""        let s = store.setsSummary()
        return HStack(spacing: 16) {
            ProgressRing(value: s.pct / 100)
            VStack(alignment: .leading, spacing: 3) {
                Text(String(format: "%.1f", s.pct).replacingOccurrences(of: ".", with: ",") + "%")
                    .font(.system(size: 26, weight: .heavy, design: .rounded))
                Text("\\(s.have) / \\(s.total) carte nei tuoi set").font(.caption).foregroundStyle(.secondary)
                Text("\\(s.started) \\(s.started == 1 ? "set iniziato" : "set iniziati") · \\(s.complete) \\(s.complete == 1 ? "completo" : "completi")")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
        }
        .panel(padding: 16)""","""        let s = store.setsSummary()
        let pct = String(format: "%.1f", s.pct).replacingOccurrences(of: ".", with: ",") + "%"
        return HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("\\(s.have)").font(.system(size: 46, weight: .heavy, design: .rounded)).foregroundStyle(Theme.accent)
                    Text("/ \\(s.total)").font(.system(size: 26, weight: .bold, design: .rounded)).foregroundStyle(.secondary)
                }
                .lineLimit(1).minimumScaleFactor(0.6)
                Text("carte nei set iniziati").font(.subheadline.weight(.medium))
                Text("\\(s.started) \\(s.started == 1 ? "set iniziato" : "set iniziati") · \\(s.complete) \\(s.complete == 1 ? "completo" : "completi")")
                    .font(.subheadline).foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
            ZStack {
                ProgressRing(value: s.pct / 100, size: 88, line: 10)
                Text(pct).font(.system(size: 18, weight: .heavy, design: .rounded)).minimumScaleFactor(0.6).lineLimit(1).frame(width: 60)
            }
        }
        .panel(padding: 18)""")
s.save()

# ---- Pokédex
d=F('DexViews.swift')
d.rep("""// Scheda Pokédex (ridisegno ottobre 2026): avanzamento su 1025, avviso per le carte non ancora collegate,
// pillole per generazione, Mancanti/Posseduti, Artisti e Categorie; griglia a pannelli per i Pokémon.""","""// Scheda Pokédex (ridisegno ottobre 2026): schede Pokémon / Allenatori / Energie / Artisti, numero grande con percentuale
// e barra, avviso per le carte non ancora collegate, pillole Tutte / Gen I–IX / Mancanti / Posseduti; griglia a pannelli.""")
d.rep('    case pokemon = "Pokémon", artists = "Artisti", cats = "Categorie"','    case pokemon = "Pokémon", trainers = "Allenatori", energies = "Energie", artists = "Artisti"')
d.rep("""                    HStack(spacing: 8) {
                        SearchField(prompt: mode == .pokemon ? "Nome o numero" : "Cerca", text: $query)
                        Menu {
                            Picker("Lingua dei totali", selection: store.bind(\\.dexLang)) {
                                ForEach(["it", "en", "ja"], id: \\.self) { Text(LANG_NAMES[$0] ?? $0).tag($0) }
                            }
                        } label: { Pill(text: LANG_NAMES[store.cfg.dexLang] ?? store.cfg.dexLang, menu: true) }
                        .accessibilityLabel("Lingua dei totali")
                    }
                    pills
                }""","""                    if mode == .pokemon || mode == .artists {
                        HStack(spacing: 8) {
                            SearchField(prompt: mode == .pokemon ? "Nome o numero" : "Cerca", text: $query)
                            Menu {
                                Picker("Lingua dei totali", selection: store.bind(\\.dexLang)) {
                                    ForEach(["it", "en", "ja"], id: \\.self) { Text(LANG_NAMES[$0] ?? $0).tag($0) }
                                }
                            } label: { Pill(text: LANG_NAMES[store.cfg.dexLang] ?? store.cfg.dexLang, menu: true) }
                            .accessibilityLabel("Lingua dei totali")
                        }
                    }
                    if mode == .pokemon { pills }
                }""")
d.rep("""                case .pokemon: PokemonGrid(gen: gen, own: own, query: query)
                case .artists: ArtistList(query: query)
                case .cats: CategoryList()""","""                case .pokemon: PokemonGrid(gen: gen, own: own, query: query)
                case .trainers: TrainerList()
                case .energies: EnergyList()
                case .artists: ArtistList(query: query)""")
d.rep("""        let have = store.dexIndex().count
        let pct = String(format: "%.1f", Double(have) / Double(DEX_MAX) * 100).replacingOccurrences(of: ".", with: ",") + "%"
        return VStack(alignment: .leading, spacing: 8) {
            ScreenHeader(title: "Pokédex",
                         subtitle: Text("\\(Text("\\(have) / \\(DEX_MAX)").bold().foregroundStyle(.primary)) Pokémon raccolti · \\(pct)"))
            ThinBar(value: Double(have) / Double(DEX_MAX), height: 3)
        }
    }
""","""        let st = heroStat
        return VStack(spacing: 14) {
            ScreenHeader(title: "Pokédex")
            HStack(spacing: 6) {
                ForEach(DexMode.allCases) { m in
                    Button { mode = m } label: {
                        Text(m.rawValue).font(.subheadline.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.8)
                            .frame(maxWidth: .infinity).padding(.vertical, 9)
                            .foregroundStyle(mode == m ? Color.black : Color.primary)
                            .background(mode == m ? Theme.accent : Theme.panel, in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(mode == m ? .isSelected : [])
                }
            }
            VStack(spacing: 6) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text("\\(st.have)").font(.system(size: 56, weight: .heavy, design: .rounded)).foregroundStyle(Theme.accent)
                    if let t = st.total { Text("/ \\(t)").font(.system(size: 32, weight: .bold, design: .rounded)).foregroundStyle(.secondary) }
                }
                .lineLimit(1).minimumScaleFactor(0.6)
                Text(st.label).font(.subheadline).foregroundStyle(.secondary)
                if let t = st.total, t > 0 {
                    Text(dexPercent(have: st.have, total: t))
                        .font(.subheadline.weight(.bold)).foregroundStyle(Color.green)
                        .padding(.horizontal, 14).padding(.vertical, 6)
                        .background(Color.green.opacity(0.16), in: Capsule())
                        .padding(.top, 2)
                    ThinBar(value: Double(st.have) / Double(t), height: 8).padding(.top, 6)
                }
            }
            .frame(maxWidth: .infinity)
            .accessibilityElement(children: .combine)
        }
    }

    /// Numero grande della testata, secondo la scheda scelta (il totale c'è solo per i Pokémon).
    private var heroStat: (have: Int, total: Int?, label: String) {
        switch mode {
        case .pokemon: return (store.dexIndex().count, DEX_MAX, "Pokémon raccolti")
        case .trainers: return (store.catalog.filter { $0.cat == "Trainer" }.count, nil, "carte Allenatore")
        case .energies: return (store.catalog.filter { $0.cat == "Energy" }.count, nil, "carte Energia")
        case .artists: return (Set(store.catalog.compactMap { $0.ill }.filter { !$0.isEmpty }).count, nil, "artisti nelle tue carte")
        }
    }
""")
d.rep("""                ForEach(Array(GENS.enumerated()), id: \\.offset) { i, g in
                    PillButton(text: "Gen \\(g.roman)", selected: mode == .pokemon && gen == i) { mode = .pokemon; gen = i }
                }
                PillButton(text: "Mancanti", selected: mode == .pokemon && own == .missing) {
                    mode = .pokemon; own = own == .missing ? .all : .missing
                }
                PillButton(text: "Posseduti", selected: mode == .pokemon && own == .owned) {
                    mode = .pokemon; own = own == .owned ? .all : .owned
                }
                PillButton(text: "Artisti", selected: mode == .artists) { mode = .artists }
                PillButton(text: "Categorie", selected: mode == .cats) { mode = .cats }
""","""                PillButton(text: "Tutte", selected: gen < 0) { gen = -1 }
                ForEach(Array(GENS.enumerated()), id: \\.offset) { i, g in
                    PillButton(text: "Gen \\(g.roman)", selected: gen == i) { gen = i }
                }
                PillButton(text: "Mancanti", selected: own == .missing) { own = own == .missing ? .all : .missing }
                PillButton(text: "Posseduti", selected: own == .owned) { own = own == .owned ? .all : .owned }
""")
d.rep("let gens = q.isEmpty ? (GENS.indices.contains(gen) ? [GENS[gen]] : []) : GENS","let gens = q.isEmpty ? (gen < 0 ? GENS : (GENS.indices.contains(gen) ? [GENS[gen]] : [])) : GENS")
# Categorie -> Allenatori ed Energie
i=d.s.index("// MARK: - Categorie"); j=d.s.index("// MARK: - Dettaglio")
d.s=d.s[:i]+'''// MARK: - Allenatori ed Energie

struct TrainerList: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let all = store.catalog.filter { $0.cat == "Trainer" }
        Section("Allenatori") {
            NavigationLink(value: DexRoute(kind: "grp", cat: "Trainer", grpKey: "")) {
                HStack { Text("Tutti gli allenatori"); Spacer(); Text("\\(all.count)").foregroundStyle(.secondary) }
            }
        }
        let tts = Dictionary(grouping: all.filter { !($0.tt ?? "").isEmpty }, by: { $0.tt ?? "" })
        if !tts.isEmpty {
            Section("Per tipo") {
                ForEach(tts.keys.sorted(), id: \\.self) { t in
                    NavigationLink(value: DexRoute(kind: "grp", cat: "Trainer", grpKey: t)) {
                        HStack { Text(t); Spacer(); Text("\\(tts[t]?.count ?? 0)").foregroundStyle(.secondary) }
                    }
                }
            }
        }
        PendingNote()
    }
}

struct EnergyList: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let n = store.catalog.filter { $0.cat == "Energy" }.count
        Section("Energie") {
            NavigationLink(value: DexRoute(kind: "grp", cat: "Energy", grpKey: "")) {
                HStack { Text("Tutte le energie"); Spacer(); Text("\\(n)").foregroundStyle(.secondary) }
            }
        }
        PendingNote()
    }
}

/// Carte ancora senza categoria (non lette).
struct PendingNote: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        let pending = store.catalog.filter { $0.cat == nil }.count
        if pending > 0 {
            Section { Text("\\(pending) carte non ancora lette.").font(.footnote).foregroundStyle(.secondary) }
        }
    }
}

'''+d.s[j:]
d.rep("    @Environment(AppStore.self) private var store\n    @State private var mode: DexMode = .pokemon","    @Environment(AppStore.self) private var store\n    @State private var mode: DexMode = .pokemon",1)
d.save()

# percentuale con due decimali in una funzione globale (Models.swift), usata dalla testata
m=F('Models.swift')
m.s=m.s.rstrip('\n')+'''

/// Percentuale per la testata del Pokédex: due decimali e virgola (1 su 1025 = "0,10%").
func dexPercent(have: Int, total: Int) -> String {
    guard total > 0 else { return "0,00%" }
    return String(format: "%.2f", Double(have) / Double(total) * 100).replacingOccurrences(of: ".", with: ",") + "%"
}
'''
m.save()
print('ok')
