# 18/10/2026 (sera): ripristino della Home nativa persa per sovrascrittura del kit (assi del grafico, Carte di maggior
# valore, ordinamento ricordato), valore dei punti al tocco, spazio della barra dentro ogni pagina a scorrimento,
# selezione della barra in Liquid Glass.
D='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/'
def patch(f, pairs):
    p=D+f; s=open(p,encoding='utf-8').read()
    for old,new in pairs:
        assert s.count(old)==1,(f,old[:90],s.count(old))
        s=s.replace(old,new)
    open(p,'w',encoding='utf-8').write(s)

# ---------- Grafico: assi, punti e valore al tocco ----------
patch('HomeView.swift',[
('''struct AreaValueChart: View {
    let points: [PricePoint]
    var body: some View {
        Chart(points) { p in
            AreaMark(x: .value("Giorno", Date(timeIntervalSince1970: Double(p.day) * 86400)), y: .value("Valore", p.value))
                .interpolationMethod(.monotone)
                .foregroundStyle(LinearGradient(colors: [Theme.accent.opacity(0.35), Theme.accent.opacity(0.02)], startPoint: .top, endPoint: .bottom))
            LineMark(x: .value("Giorno", Date(timeIntervalSince1970: Double(p.day) * 86400)), y: .value("Valore", p.value))
                .interpolationMethod(.monotone)
                .foregroundStyle(Theme.accent)
                .lineStyle(StrokeStyle(lineWidth: 2.5))
        }
        .chartYScale(domain: .automatic(includesZero: false))
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .frame(height: 110)
    }
}''',
'''/// Grafico ad area con date in basso (al massimo 4), valori in euro a destra, punti visibili e,
/// toccando il grafico, data e valore del punto più vicino. Usato in Home, pagina Valore e Storico prezzo.
struct AreaValueChart: View {
    let points: [PricePoint]
    var height: CGFloat = 150
    @State private var selDate: Date?

    private func date(_ d: Int) -> Date { Date(timeIntervalSince1970: Double(d) * 86400) }
    private var ticks: [Date] { chartTickDays(points.map(\\.day)).map(date) }
    private var whole: Bool { chartWholeEuros(points.map(\\.value)) }
    private var selected: PricePoint? {
        guard let s = selDate else { return nil }
        return nearestPoint(points, day: Int((s.timeIntervalSince1970 / 86400).rounded()))
    }

    var body: some View {
        Chart {
            ForEach(points) { p in
                AreaMark(x: .value("Giorno", date(p.day)), y: .value("Valore", p.value))
                    .interpolationMethod(.monotone)
                    .foregroundStyle(LinearGradient(colors: [Theme.accent.opacity(0.35), Theme.accent.opacity(0.02)], startPoint: .top, endPoint: .bottom))
                LineMark(x: .value("Giorno", date(p.day)), y: .value("Valore", p.value))
                    .interpolationMethod(.monotone)
                    .foregroundStyle(Theme.accent)
                    .lineStyle(StrokeStyle(lineWidth: 2.5))
                PointMark(x: .value("Giorno", date(p.day)), y: .value("Valore", p.value))
                    .symbolSize(points.count > CHART_MAX_DOTS ? 0 : 28)
                    .foregroundStyle(Theme.accent)
            }
            if let s = selected {
                RuleMark(x: .value("Giorno", date(s.day)))
                    .foregroundStyle(Color.secondary.opacity(0.6))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 3]))
                    .annotation(position: .top, spacing: 2, overflowResolution: .init(x: .fit(to: .chart), y: .fit(to: .chart))) {
                        VStack(spacing: 1) {
                            Text(eur(s.value)).font(.caption.weight(.bold)).monospacedDigit()
                            Text(chartDayLabel(s.day)).font(.caption2).foregroundStyle(.secondary)
                        }
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(Theme.panelHi, in: RoundedRectangle(cornerRadius: 8))
                    }
                PointMark(x: .value("Giorno", date(s.day)), y: .value("Valore", s.value))
                    .symbolSize(90)
                    .foregroundStyle(Theme.accent)
            }
        }
        .chartYScale(domain: .automatic(includesZero: false))
        .chartXAxis {
            AxisMarks(values: ticks) { v in
                AxisValueLabel(anchor: v.index == 0 ? .topLeading : (v.index == v.count - 1 ? .topTrailing : .top)) {
                    if let d = v.as(Date.self) { Text(chartDayLabel(Int((d.timeIntervalSince1970 / 86400).rounded()))) }
                }
            }
        }
        .chartYAxis {
            AxisMarks(position: .trailing, values: .automatic(desiredCount: 3)) { v in
                AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [3, 3]))
                AxisValueLabel { if let d = v.as(Double.self) { Text(chartEuroLabel(d, whole: whole)) } }
            }
        }
        // Tocco (non trascinamento): mostra il punto più vicino senza bloccare lo scorrimento della pagina.
        .chartXSelection(value: $selDate)
        .chartGesture { proxy in
            SpatialTapGesture().onEnded { t in proxy.selectXValue(at: t.location.x) }
        }
        .onChange(of: points.count) { _, _ in selDate = nil }
        .frame(height: height)
        .accessibilityLabel("Grafico del valore")
        .accessibilityValue(points.last.map { "Ultimo valore \\(eur($0.value)) il \\(chartDayLabel($0.day))" } ?? "")
    }
}'''),
])

patch('Components.swift',[
('''struct PriceChart: View {''',
'''// Etichette del grafico (stesse regole riprodotte in ios_chart_test.js).
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
    whole ? (chartEurWhole.string(from: NSNumber(value: v.rounded())) ?? "\\(Int(v.rounded())) €") : eur(v)
}
/// Punto del grafico più vicino al giorno toccato.
func nearestPoint(_ pts: [PricePoint], day: Int) -> PricePoint? {
    pts.min { abs($0.day - day) < abs($1.day - day) }
}

struct PriceChart: View {'''),
])

# ---------- Home: grafico fuori dal collegamento, Carte di maggior valore, ordinamento della Collezione ----------
patch('HomeView.swift',[
('''    @State private var days = 30
    @State private var shareItem: ShareItem?
''','''    @State private var days = 30
    @State private var shareItem: ShareItem?
    @AppStorage("albumSort") private var albumSort: AlbumSort = .recent
'''),
('''                        valueCard
                        recentSection
''','''                        valueCard
                        topValueSection
                        recentSection
'''),
('''                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
            .background(Theme.bg)''','''                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
            .tabBarSpace()
            .background(Theme.bg)'''),
('''            Text("Valore della collezione").font(.subheadline).foregroundStyle(.secondary)
''','''            HStack {
                Text("Valore della collezione").font(.subheadline).foregroundStyle(.secondary)
                Spacer()
                NavigationLink { ValueView() } label: {
                    HStack(spacing: 2) {
                        Text("Dettagli")
                        Image(systemName: "chevron.right").font(.caption2.weight(.bold))
                    }
                    .font(.subheadline.weight(.semibold)).foregroundStyle(Theme.accent)
                }
                .buttonStyle(.plain)
                .accessibilityHint("Apre l'andamento del valore")
            }
'''),
('''            NavigationLink { ValueView() } label: {
                Group {
                    if series.count >= 2 {
                        AreaValueChart(points: series)
                    } else {
                        Text("Il grafico si riempie con i giorni: serve almeno un secondo aggiornamento dei prezzi.")
                            .font(.footnote).foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, minHeight: 60, alignment: .leading)
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityHint("Apre l'andamento del valore")
''','''            // Il grafico non è più dentro un collegamento: il tocco mostra data e valore del punto.
            if series.count >= 2 {
                AreaValueChart(points: series)
            } else {
                Text("Il grafico si riempie con i giorni: serve almeno un secondo aggiornamento dei prezzi.")
                    .font(.footnote).foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 60, alignment: .leading)
            }
'''),
('''    // MARK: - Ultime aggiunte

    private var recentSection: some View {
        let items = Array(store.catalog.sorted { $0.added > $1.added }.prefix(12))
        return VStack(alignment: .leading, spacing: 10) {
            SectionTitle(text: "Ultime aggiunte", action: "Tutte") { tab = .collection }
            ScrollView(.horizontal, showsIndicators: false) {''','''    // MARK: - Carte di maggior valore (prezzo di una copia, senza le carte senza prezzo)

    @ViewBuilder
    private var topValueSection: some View {
        let items = topValueEntries(store.catalog, unit: { store.unit($0) })
        if !items.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                SectionTitle(text: "Carte di maggior valore", action: "Tutte") { albumSort = .value; tab = .collection }
                cardStrip(items)
            }
        }
    }

    // MARK: - Ultime aggiunte

    private var recentSection: some View {
        let items = Array(store.catalog.sorted { $0.added > $1.added }.prefix(12))
        return VStack(alignment: .leading, spacing: 10) {
            SectionTitle(text: "Ultime aggiunte", action: "Tutte") { albumSort = .recent; tab = .collection }
            cardStrip(items)
        }
    }

    private func cardStrip(_ items: [Entry]) -> some View {
            ScrollView(.horizontal, showsIndicators: false) {'''),
('''                        .buttonStyle(.plain)
                        .accessibilityLabel(e.name)
                    }
                }
            }
        }
    }
''','''                        .buttonStyle(.plain)
                        .accessibilityLabel(e.name)
                    }
                }
            }
    }
'''),
])
patch('Components.swift',[
('''/// Punto del grafico più vicino al giorno toccato.''','''/// Prime `n` carte per prezzo di una copia; le carte senza prezzo sono escluse.
func topValueEntries(_ catalog: [Entry], unit: (Entry) -> Double?, n: Int = 12) -> [Entry] {
    Array(catalog.compactMap { e in unit(e).map { (e, $0) } }
        .sorted { $0.1 != $1.1 ? $0.1 > $1.1 : $0.0.added > $1.0.added }
        .prefix(n).map { $0.0 })
}
/// Punto del grafico più vicino al giorno toccato.'''),
])

# ---------- Collezione: ordinamento ricordato, spazio per la barra; pagina Valore ----------
patch('AlbumView.swift',[
('''    @State private var sort: AlbumSort = .recent''','''    @AppStorage("albumSort") private var sort: AlbumSort = .recent'''),
('''            .padding(.horizontal, 16)
            .padding(.bottom, 12)
            Text(headerText).font(.footnote).foregroundStyle(.secondary).padding(.bottom, 8)
        }
    }''','''            .padding(.horizontal, 16)
            .padding(.bottom, 12)
            Text(headerText).font(.footnote).foregroundStyle(.secondary).padding(.bottom, 8)
        }
        .tabBarSpace()
    }'''),
('''            } header: {
                Text(headerText)
            }
        }
        .scrollContentBackground(.hidden)''','''            } header: {
                Text(headerText)
            }
        }
        .scrollContentBackground(.hidden)
        .tabBarSpace()'''),
('''    private var series: [PricePoint] {
        store.vhist.compactMap { q in q.count >= 2 ? PricePoint(day: q[0], value: Double(q[1]) / 100) : nil }
    }''','''    private var series: [PricePoint] {
        let start = days > 0 ? dayNow() - days : Int.min
        return store.vhist.compactMap { q in q.count >= 2 && q[0] >= start ? PricePoint(day: q[0], value: Double(q[1]) / 100) : nil }
    }'''),
('''                    PriceChart(points: series)''','''                    AreaValueChart(points: series, height: 200)'''),
('''        .navigationTitle("Valore")''','''        .tabBarSpace()
        .navigationTitle("Valore")'''),
])
patch('CartePokemonApp.swift',[
('''                    screen(t)
                        .tabBarSpace()
''','''                    // Lo spazio per la barra sta dentro ogni pagina a scorrimento (.tabBarSpace() su ScrollView/List):
                    // messo qui, fuori dal NavigationStack, non arrivava alla ScrollView e la barra copriva l'ultima voce.
                    screen(t)
'''),
])

# ---------- Spazio per la barra nelle altre pagine a scorrimento ----------
patch('CardDetailView.swift',[
('''            .padding(.horizontal, 16)
            .padding(.bottom, 20)
        }
        .background(Theme.bg)
    }''','''            .padding(.horizontal, 16)
            .padding(.bottom, 20)
        }
        .tabBarSpace()
        .background(Theme.bg)
    }'''),
])
patch('DexViews.swift',[
('''            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(Theme.bg)
            .toolbar(.hidden, for: .navigationBar)''','''            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .tabBarSpace()
            .background(Theme.bg)
            .toolbar(.hidden, for: .navigationBar)'''),
('''        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .task(id: store.cfg.dexLang) { await loadAll() }''','''        .tabBarSpace()
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .task(id: store.cfg.dexLang) { await loadAll() }'''),
])
patch('SetsView.swift',[
('''                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
            .background(Theme.bg)
            .toolbar(.hidden, for: .navigationBar)
            .task { await store.loadMeta(["it", "en", "ja"]) }''','''                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
            .tabBarSpace()
            .background(Theme.bg)
            .toolbar(.hidden, for: .navigationBar)
            .task { await store.loadMeta(["it", "en", "ja"]) }'''),
('''            .padding(.horizontal, 16)
        }
        .navigationTitle(g.name)''','''            .padding(.horizontal, 16)
        }
        .tabBarSpace()
        .navigationTitle(g.name)'''),
])

# ---------- Barra: selezione in Liquid Glass che scivola fra le voci ----------
patch('Theme.swift',[
('''    let onScan: () -> Void

    var body: some View {
        GlassEffectContainer(spacing: 14) {''','''    let onScan: () -> Void
    @Namespace private var glassNS

    var body: some View {
        // spacing piccolo: la goccia della voce scelta non si fonde col tasto giallo accanto.
        GlassEffectContainer(spacing: 4) {'''),
('''            .padding(.horizontal, 6).padding(.vertical, 6)
            .glassEffect(.regular, in: .capsule)
        }''','''            .padding(.horizontal, 6).padding(.vertical, 6)
            .glassEffect(.regular.interactive(), in: .capsule)
        }
        // animazione solo sulla barra (le schede cambiano di colpo, come prima)
        .animation(.bouncy(duration: 0.4, extraBounce: 0.1), value: tab)'''),
('''            .frame(maxWidth: .infinity, minHeight: Theme.scanSize)
            .background(sel ? Theme.accentSoft : Color.clear, in: Capsule())
            .contentShape(Capsule())''','''            .frame(maxWidth: .infinity, minHeight: Theme.scanSize)
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
            .contentShape(Capsule())'''),
])
print('ok')
