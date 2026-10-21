# Ridisegno "Vetro olografico" dell'app nativa (20/10/2026), sulle schermate di prova approvate.
# La nativa aveva già barra in vetro, temi Notte blu/Perla, Collezione griglia/elenco, Progressi e Pokédex:
# qui si aggiunge quello che mancava.
#  - Scheda carta: carta grande al centro che si inclina seguendo il dito, con riflesso olografico che si sposta
#    (Holo arcobaleno, Reverse holo banda chiara), ferma con "Riduci movimento"; tocco senza trascinare = tutto schermo;
#    nome, set e prezzo grande sotto la carta; lingua a pillole come variante e condizione.
#  - Collezione: fascia Valore stimato / Carte / Diverse; interruttore griglia/elenco a due tasti, ricordato;
#    riflesso statico sulle miniature Holo e Reverse holo.
#  - Home: carte / diverse / set in una colonna a destra del valore; "Si sono mossi" con le prime 3 salite e scese.
D='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/'
def patch(name, pairs):
    p=D+name; s=open(p,encoding='utf-8').read()
    for old,new,*n in pairs:
        cnt=n[0] if n else 1
        assert s.count(old)==cnt,(name,old[:100],s.count(old))
        s=s.replace(old,new)
    open(p,'w',encoding='utf-8').write(s)
def replace_block(name, start, end, new):
    """Sostituisce il testo da start (compreso) a end (escluso); start ed end devono essere unici."""
    p=D+name; s=open(p,encoding='utf-8').read()
    assert s.count(start)==1,(name,start[:80],s.count(start)); assert s.count(end)==1,(name,end[:80],s.count(end))
    a=s.index(start); b=s.index(end); assert a<b
    s=s[:a]+new+s[b:]; open(p,'w',encoding='utf-8').write(s)

# ---------- Components: riflesso olografico e carta che si inclina ----------
COMP_ADD = '''

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
    @Environment(\\.accessibilityReduceMotion) private var reduceMotion
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
'''
p=D+'Components.swift'; s=open(p,encoding='utf-8').read()
assert 'struct TiltingCard' not in s and s.rstrip().endswith('func appDestinations() -> some View { modifier(AppDestinations()) }\n}')
open(p,'w',encoding='utf-8').write(s.rstrip('\n')+COMP_ADD)

# ---------- Scheda carta ----------
HERO = '''    private func hero(_ e: Entry) -> some View {
        let info = store.priceInfo(e.pr, e.variant)
        let art = hiImg(previewURL(e))
        return VStack(spacing: 10) {
            ZStack {
                Circle().fill(Theme.accentSoft).frame(width: 220, height: 220).blur(radius: 50)
                    .accessibilityHidden(true)
                // tocco senza trascinare = tutto schermo (solo se c'è un'immagine); trascinando la carta si inclina
                TiltingCard(kind: holoKind(e.variant), radius: 10, tapEnabled: canZoomImage(art)) { zoom = true } content: {
                    CardArt(url: art, radius: 10, name: e.name, number: e.number)
                }
                .accessibilityLabel("Ingrandisci l'immagine")
                .frame(width: 230)
                .shadow(color: .black.opacity(0.45), radius: 18, y: 10)
                .fullScreenCover(isPresented: $zoom) {
                    CardZoomView(url: art, name: e.name, number: e.number) { zoom = false }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 8)
            if !reduceMotion {
                Text("Trascina il dito sulla carta per inclinarla").font(.caption).foregroundStyle(.secondary)
            }
            if let n = imgNote(e) { Text(n).font(.caption2).foregroundStyle(.secondary).multilineTextAlignment(.center) }
            photoMenu(e)   // sempre: si può scattare una foto e sceglierla al posto dell'immagine da internet
            VStack(spacing: 4) {
                Text(e.name).font(.title2.weight(.heavy)).multilineTextAlignment(.center).lineLimit(2).minimumScaleFactor(0.7)
                Text(setLine(e.setName, e.number, e.total)).font(.caption).foregroundStyle(.secondary)
                    .multilineTextAlignment(.center).lineLimit(2)
                if !e.rarity.isEmpty { Chip(e.rarity, tint: .purple) }
            }
            .padding(.top, 4)
            VStack(spacing: 4) {
                if let u = store.unit(e) {
                    Text(eur(u)).font(.system(size: 44, weight: .heavy, design: .rounded)).monospacedDigit()
                        .minimumScaleFactor(0.6).lineLimit(1)
                    if e.qty > 1 { Text("×\\(e.qty) = " + eur(u * Double(e.qty))).font(.caption.weight(.semibold)) }
                } else {
                    Text("Senza prezzo").font(.headline).foregroundStyle(.secondary)
                }
                Text(sourceLine(e, info)).font(.caption2).foregroundStyle(.secondary).multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
    }

'''
replace_block('CardDetailView.swift', '    private func hero(_ e: Entry) -> some View {', '    private func sourceLine(', HERO)
patch('CardDetailView.swift', [
('''    @State private var zoom = false        // immagine a tutto schermo
''', '''    @State private var zoom = false        // immagine a tutto schermo
    @Environment(\\.accessibilityReduceMotion) private var reduceMotion
'''),
('''                hero(e)
                variantSection(e)''', '''                hero(e)
                langSection(e)
                variantSection(e)'''),
('''    // MARK: - Variante con prezzo
''', '''    // MARK: - Lingua a pillole (come variante e condizione)

    private func langSection(_ e: Entry) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                label("Lingua")
                Spacer()
                Text(langLong(e.lang)).font(.caption).foregroundStyle(.secondary)
            }
            HStack(spacing: 6) {
                ForEach(LANGS, id: \\.self) { l in
                    let sel = e.lang == l
                    Button { if !sel { edit(lang: l) } } label: {
                        Text(l)
                            .font(.subheadline.weight(.bold))
                            .frame(maxWidth: .infinity, minHeight: 38)
                            .foregroundStyle(sel ? Color.black : Color.primary)
                            .background(sel ? Theme.accentFill : Theme.panel, in: Capsule())
                            .contentShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(langLong(l))
                    .accessibilityAddTraits(sel ? .isSelected : [])
                }
            }
        }
    }

    // MARK: - Variante con prezzo
'''),
# la lingua non è più una riga del pannello "Il tuo esemplare"
('''        VStack(spacing: 0) {
            HStack {
                Text("Lingua")
                Spacer()
                Menu {
                    Picker("Lingua", selection: Binding(get: { e.lang }, set: { edit(lang: $0) })) {
                        ForEach(LANGS, id: \\.self) { Text(langLong($0)).tag($0) }
                    }
                } label: {
                    HStack(spacing: 4) { Text(langLong(e.lang)); Image(systemName: "chevron.up.chevron.down").font(.caption2) }
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.vertical, 12)
            Divider()
            HStack {
                Text("Quantità")''', '''        VStack(spacing: 0) {
            HStack {
                Text("Quantità")'''),
('''// Scheda di una carta (ridisegno ottobre 2026): immagine e prezzo in testa, varianti con il loro prezzo,
// condizione a pillole, quantità, prezzo mio, storico del prezzo con variazione, dettagli e note a pannelli.''',
'''// Scheda di una carta (ridisegno ottobre 2026): carta grande che si inclina col dito con riflesso olografico (20/10),
// prezzo sotto la carta, lingua, varianti con il loro prezzo e condizione a pillole, quantità, prezzo mio,
// storico del prezzo con variazione, dettagli e note a pannelli.'''),
])

# ---------- Collezione ----------
patch('AlbumView.swift', [
('''    @State private var layout: AlbumLayout = .grid''', '''    @AppStorage("albumLayout") private var layout: AlbumLayout = .grid'''),
('''                    ScreenHeader(title: "Collezione", subtitle: subtitle) {''', '''                    ScreenHeader(title: "Collezione") {'''),
('''                    if store.catalogProblem {
                        Label("Il catalogo salvato era illeggibile: è stata ripristinata l'ultima copia automatica.", systemImage: "exclamationmark.triangle.fill")
                            .font(.footnote).foregroundStyle(.orange)
                    }''', '''                    if !store.catalog.isEmpty { statsStrip }
                    if store.catalogProblem {
                        Label("Il catalogo salvato era illeggibile: è stata ripristinata l'ultima copia automatica.", systemImage: "exclamationmark.triangle.fill")
                            .font(.footnote).foregroundStyle(.orange)
                    }'''),
('''                        Button {
                            withAnimation { layout = layout == .grid ? .list : .grid }
                        } label: { CircleIcon(systemName: layout == .grid ? "list.bullet" : "square.grid.3x3") }
                        .buttonStyle(.plain)
                        .accessibilityLabel(layout == .grid ? "Mostra come elenco" : "Mostra come griglia")''', '''                        layoutSwitch'''),
('''    private var subtitle: Text {
        let n = store.catalog.reduce(0) { $0 + $1.qty }
        let d = Set(store.catalog.map { $0.cardId }).count
        let v = store.homeStats().val
        return Text("\\(n) \\(n == 1 ? "carta" : "carte") · \\(d) diverse · \\(Text(eur(v)).bold().foregroundStyle(.primary))")
    }''', '''    // MARK: - Fascia dei valori: Valore stimato / Carte / Diverse

    private var statsStrip: some View {
        let s = store.homeStats()
        let d = Set(store.catalog.map { $0.cardId }).count
        return HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Valore stimato").font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                Text(eur(s.val)).font(.system(size: 24, weight: .heavy, design: .rounded)).monospacedDigit()
                    .foregroundStyle(Theme.accent).lineLimit(1).minimumScaleFactor(0.55)
                if s.miss > 0 { Text("\\(s.miss) senza prezzo").font(.caption2).foregroundStyle(.orange) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            statDivider
            statCell("Carte", "\\(s.n)")
            statDivider
            statCell("Diverse", "\\(d)")
        }
        .padding(.vertical, 12)
        .padding(.leading, 14)
        .background(alignment: .topLeading) {
            Circle().fill(Theme.accentSoft).frame(width: 170, height: 150).blur(radius: 36).offset(x: -40, y: -60)
        }
        .background(Theme.panel)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .accessibilityElement(children: .combine)
    }

    private var statDivider: some View {
        Rectangle().fill(Color.primary.opacity(0.08)).frame(width: 1, height: 44)
    }

    private func statCell(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.caption.weight(.semibold)).foregroundStyle(.secondary)
            Text(value).font(.system(size: 24, weight: .heavy, design: .rounded)).monospacedDigit()
                .lineLimit(1).minimumScaleFactor(0.6)
        }
        .frame(width: 74, alignment: .leading)
        .padding(.leading, 12)
    }

    // MARK: - Griglia o elenco: due tasti, scelta ricordata (albumLayout)

    private var layoutSwitch: some View {
        HStack(spacing: 2) {
            layoutButton(.grid, "square.grid.3x3", "Griglia")
            layoutButton(.list, "list.bullet", "Elenco")
        }
        .padding(3)
        .background(Theme.panel, in: Capsule())
    }

    private func layoutButton(_ l: AlbumLayout, _ icon: String, _ name: String) -> some View {
        let sel = layout == l
        return Button { withAnimation { layout = l } } label: {
            Image(systemName: icon).font(.subheadline.weight(.semibold))
                .frame(width: 38, height: 34)
                .foregroundStyle(sel ? Color.black : Color.primary)
                .background(sel ? Theme.accentFill : Color.clear, in: Capsule())
                .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(name)
        .accessibilityAddTraits(sel ? .isSelected : [])
    }'''),
('''            CardArt(url: previewURL(e), name: e.name, number: e.number)
                .overlay(alignment: .topTrailing) { if e.qty > 1 { QtyBadge(qty: e.qty) } }
                .overlay(alignment: .bottomTrailing) {
                    if selecting {''', '''            CardArt(url: previewURL(e), name: e.name, number: e.number)
                .overlay { HoloSheen(kind: holoKind(e.variant)) }   // riflesso statico su Holo e Reverse holo
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay(alignment: .topTrailing) { if e.qty > 1 { QtyBadge(qty: e.qty) } }
                .overlay(alignment: .bottomTrailing) {
                    if selecting {'''),
])

# ---------- Home ----------
patch('HomeView.swift', [
('''            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(eur(s.val)).font(.system(size: 42, weight: .heavy, design: .rounded)).monospacedDigit()
                    .minimumScaleFactor(0.6).lineLimit(1)
                if let p = pct, abs(p) >= 0.05 {
                    Text((p >= 0 ? "▲ " : "▼ ") + String(signedPct(p).dropFirst()))
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(p >= 0 ? Theme.up : Theme.down)
                }
            }
            Text("\\(s.n) \\(s.n == 1 ? "carta" : "carte") · \\(distinct) diverse · \\(sets) set" + (pct != nil ? " · prezzi rispetto a " + periodText : ""))
                .font(.caption).foregroundStyle(.secondary)
            if s.miss > 0 {
                Text("\\(s.miss) \\(s.miss == 1 ? "carta senza prezzo" : "carte senza prezzo")").font(.caption).foregroundStyle(.orange)
            }''', '''            // valore a sinistra, carte / diverse / set in colonna a destra
            HStack(alignment: .top, spacing: 14) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(eur(s.val)).font(.system(size: 42, weight: .heavy, design: .rounded)).monospacedDigit()
                        .minimumScaleFactor(0.5).lineLimit(1)
                    if let p = pct, abs(p) >= 0.05 {
                        Text((p >= 0 ? "▲ " : "▼ ") + String(signedPct(p).dropFirst()))
                            .font(.subheadline.weight(.bold))
                            .padding(.horizontal, 10).padding(.vertical, 5)
                            .foregroundStyle(p >= 0 ? Theme.up : Theme.down)
                            .background((p >= 0 ? Theme.up : Theme.down).opacity(0.15), in: Capsule())
                    }
                    if pct != nil {
                        Text("prezzi rispetto a " + periodText).font(.caption).foregroundStyle(.secondary)
                    }
                    if s.miss > 0 {
                        Text("\\(s.miss) \\(s.miss == 1 ? "carta senza prezzo" : "carte senza prezzo")").font(.caption).foregroundStyle(.orange)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                VStack(alignment: .leading, spacing: 8) {
                    valueSideStat("\\(s.n)", s.n == 1 ? "carta" : "carte", accent: true)
                    valueSideStat("\\(distinct)", "diverse")
                    valueSideStat("\\(sets)", "set")
                }
                .padding(.leading, 14)
                .frame(width: 92, alignment: .leading)
                .overlay(alignment: .leading) { Rectangle().fill(Color.primary.opacity(0.1)).frame(width: 1) }
                .accessibilityElement(children: .combine)
            }'''),
('''    private var periodText: String {
        days == 0 ? "l'inizio" : "\\(days) giorni fa"
    }
''', '''    private var periodText: String {
        days == 0 ? "l'inizio" : "\\(days) giorni fa"
    }

    private func valueSideStat(_ value: String, _ name: String, accent: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(value).font(.system(size: 22, weight: .heavy, design: .rounded)).monospacedDigit()
                .foregroundStyle(accent ? Theme.accent : Color.primary).lineLimit(1).minimumScaleFactor(0.6)
            Text(name).font(.caption.weight(.semibold)).foregroundStyle(.secondary)
        }
    }
'''),
])
replace_block('HomeView.swift', '''    @ViewBuilder
    private var moversSection: some View {''', '''    // MARK: - Set in corso''', '''    @ViewBuilder
    private var moversSection: some View {
        let rows = store.priceMovers(days: 30).rows
        let ups: [AppStore.Mover] = Array(rows.filter { $0.d > 0.004 }.sorted { $0.d > $1.d }.prefix(3))
        let downs: [AppStore.Mover] = Array(rows.filter { $0.d < -0.004 }.sorted { $0.d < $1.d }.prefix(3))
        if !ups.isEmpty || !downs.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                SectionTitle(text: "Si sono mossi (30 gg)")
                HStack(alignment: .top, spacing: 10) {
                    moverList("Salite", ups)
                    moverList("Scese", downs)
                }
            }
        }
    }

    /// Pannello con le prime 3 carte salite o scese: miniatura, nome, importo e percentuale su righe separate.
    private func moverList(_ title: String, _ items: [AppStore.Mover]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.subheadline.weight(.bold))
            if items.isEmpty {
                Text("Nessuna").font(.caption).foregroundStyle(.secondary)
            } else {
                ForEach(items, id: \\.e.key) { m in
                    NavigationLink(value: CardRoute(key: m.e.key)) { moverRow(m) }
                        .buttonStyle(.plain)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .panel(padding: 12, radius: 16)
    }

    private func moverRow(_ m: AppStore.Mover) -> some View {
        let tint: Color = m.d >= 0 ? Theme.up : Theme.down
        return HStack(spacing: 8) {
            CardThumb(url: previewURL(m.e), width: 30, radius: 4, name: m.e.name, number: m.e.number)
            VStack(alignment: .leading, spacing: 1) {
                Text(m.e.name).font(.caption.weight(.bold)).lineLimit(1)
                Text(signedEur(m.d)).font(.caption2.weight(.bold)).monospacedDigit().foregroundStyle(tint)
                Text(signedPct(m.pct)).font(.caption2).monospacedDigit().foregroundStyle(tint.opacity(0.85))
            }
            Spacer(minLength: 0)
        }
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }

''')
print('ok')
