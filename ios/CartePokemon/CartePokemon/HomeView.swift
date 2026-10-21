// Scheda Home (riepilogo, ridisegno ottobre 2026): valore della collezione con grafico e periodo,
// ultime aggiunte, carte che si sono mosse di più, set in corso, promemoria di backup e Impostazioni.

import SwiftUI
import Charts

struct HomeView: View {
    @Environment(AppStore.self) private var store
    @Binding var tab: AppTab
    @Binding var showSettings: Bool
    @Binding var showAdd: Bool
    @State private var days = 30
    @State private var shareItem: ShareItem?
    @AppStorage("albumSort") private var albumSort: AlbumSort = .recent

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    ScreenHeader(title: "Album") {
                        HStack(spacing: 8) {
                            if !store.catalog.isEmpty { backupChip }
                            Button { showSettings = true } label: { CircleIcon(systemName: "slider.horizontal.3") }
                                .buttonStyle(.plain)
                                .accessibilityLabel("Impostazioni")
                        }
                    }
                    if store.catalog.isEmpty {
                        emptyState
                    } else {
                        if store.catalogProblem {
                            Label("Il catalogo salvato era illeggibile: è stata ripristinata l'ultima copia automatica.", systemImage: "exclamationmark.triangle.fill")
                                .font(.subheadline).foregroundStyle(.orange).panel()
                        }
                        let b = store.backupInfo()
                        if b.due && !b.snoozed { backupBanner(b) }
                        valueCard
                        topValueSection
                        recentSection
                        moversSection
                        setsSection
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
            .tabBarSpace()
            .background(Theme.bg)
            .toolbar(.hidden, for: .navigationBar)
            .sheet(item: $shareItem) { item in
                ShareSheet(url: item.url) { done in if done { store.markBackupDone() } }
                    .presentationDetents([.medium, .large])
            }
            .appDestinations()
        }
    }

    // MARK: - Intestazione

    private var backupChip: some View {
        let b = store.backupInfo()
        let text: String = {
            guard let d = b.days else { return "Nessun backup" }
            return d == 0 ? "Backup oggi" : "Backup \(d) gg fa"
        }()
        return Button {
            if let u = store.backupFileURL() { shareItem = ShareItem(url: u) }
        } label: {
            HStack(spacing: 6) {
                Circle().fill(b.due ? Color.orange : Theme.accent).frame(width: 7, height: 7)
                Text(text).font(.caption.weight(.semibold))
            }
            .padding(.horizontal, 12).padding(.vertical, 8)
            .foregroundStyle(b.due ? Color.orange : Theme.accent)
            .background(b.due ? Color.orange.opacity(0.15) : Theme.accentSoft, in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(text + ". Tocca per salvare un backup")
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "rectangle.stack.badge.plus").font(.system(size: 44)).foregroundStyle(Theme.accent)
            Text("Nessuna carta").font(.title3.weight(.bold))
            Text("Tocca il tasto giallo in basso per fotografare la prima, oppure ripristina un backup dalle Impostazioni.")
                .font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
            Button("Aggiungi la prima carta") { showAdd = true }
                .buttonStyle(.glassProminent)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    private func backupBanner(_ b: BackupInfo) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Fai un backup", systemImage: "externaldrive.badge.timemachine").font(.headline)
            Text(store.backupText(b)).font(.subheadline).foregroundStyle(.secondary)
            HStack {
                Button("Salva backup") {
                    if let u = store.backupFileURL() { shareItem = ShareItem(url: u) }
                }
                .buttonStyle(.glassProminent)
                Button("Più tardi") { store.snoozeBackup() }
                    .buttonStyle(.glass)
            }
        }
        .panel(highlight: true)
    }

    // MARK: - Valore della collezione

    private var series: [PricePoint] {
        let start = days > 0 ? dayNow() - days : Int.min
        return store.vhist.compactMap { q in
            q.count >= 2 && q[0] >= start ? PricePoint(day: q[0], value: Double(q[1]) / 100) : nil
        }
    }

    private var valueCard: some View {
        let s = store.homeStats()
        let mv = store.priceMovers(days: days)
        let pct: Double? = mv.bTot > 0 ? mv.dTot / mv.bTot * 100 : nil
        let distinct = Set(store.catalog.map { $0.cardId }).count
        let sets = store.groupSets().count
        return VStack(alignment: .leading, spacing: 10) {
            HStack {
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
            // valore a sinistra, carte / diverse / set in colonna a destra
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
                        Text("\(s.miss) \(s.miss == 1 ? "carta senza prezzo" : "carte senza prezzo")").font(.caption).foregroundStyle(.orange)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                VStack(alignment: .leading, spacing: 8) {
                    valueSideStat("\(s.n)", s.n == 1 ? "carta" : "carte", accent: true)
                    valueSideStat("\(distinct)", "diverse")
                    valueSideStat("\(sets)", "set")
                }
                .padding(.leading, 14)
                .frame(width: 92, alignment: .leading)
                .overlay(alignment: .leading) { Rectangle().fill(Color.primary.opacity(0.1)).frame(width: 1) }
                .accessibilityElement(children: .combine)
            }
            // Il grafico non è più dentro un collegamento: il tocco mostra data e valore del punto.
            if series.count >= 2 {
                AreaValueChart(points: series)
            } else {
                Text("Il grafico si riempie con i giorni: serve almeno un secondo aggiornamento dei prezzi.")
                    .font(.footnote).foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 60, alignment: .leading)
            }
            HStack(spacing: 8) {
                ForEach([(7, "7 gg"), (30, "30 gg"), (90, "90 gg"), (0, "Tutto")], id: \.0) { d in
                    PillButton(text: d.1, selected: days == d.0) { days = d.0 }
                        .frame(maxWidth: .infinity)
                }
            }
        }
        .panel(padding: 16)
    }

    private var periodText: String {
        days == 0 ? "l'inizio" : "\(days) giorni fa"
    }

    private func valueSideStat(_ value: String, _ name: String, accent: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(value).font(.system(size: 22, weight: .heavy, design: .rounded)).monospacedDigit()
                .foregroundStyle(accent ? Theme.accent : Color.primary).lineLimit(1).minimumScaleFactor(0.6)
            Text(name).font(.caption.weight(.semibold)).foregroundStyle(.secondary)
        }
    }

    // MARK: - Carte di maggior valore (prezzo di una copia, senza le carte senza prezzo)

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
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .top, spacing: 10) {
                    ForEach(items) { e in
                        NavigationLink(value: CardRoute(key: e.key)) {
                            VStack(alignment: .leading, spacing: 4) {
                                CardArt(url: previewURL(e), name: e.name, number: e.number).frame(width: 74)
                                    .overlay(alignment: .topTrailing) { if e.qty > 1 { QtyBadge(qty: e.qty) } }
                                Text(store.unit(e).map { eur($0) } ?? "—")
                                    .font(.caption.weight(.bold)).monospacedDigit()
                            }
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(e.name)
                    }
                }
            }
    }

    // MARK: - Si sono mossi

    @ViewBuilder
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
                ForEach(items, id: \.e.key) { m in
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

    // MARK: - Set in corso

    @ViewBuilder
    private var setsSection: some View {
        let groups = store.groupSets()
            .filter { g in let t = store.totalOf(g); return t == 0 || g.nums.count < t }
            .sorted { $0.last > $1.last }
        if !groups.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                SectionTitle(text: "Set in corso", action: "Tutti") { tab = .progress }
                VStack(spacing: 8) {
                    ForEach(groups.prefix(3)) { g in
                        NavigationLink(value: SetRoute(key: g.key)) { SetProgressRow(g: g) }
                            .buttonStyle(.plain)
                    }
                }
            }
            .task { _ = await store.loadMeta(["it", "en", "ja"]) }
        }
    }
}

// MARK: - Grafico ad area del valore

/// Grafico ad area con date in basso (al massimo 4), valori in euro a destra, punti visibili e,
/// toccando il grafico, data e valore del punto più vicino. Usato in Home, pagina Valore e Storico prezzo.
struct AreaValueChart: View {
    let points: [PricePoint]
    var height: CGFloat = 150
    @State private var selDate: Date?

    private func date(_ d: Int) -> Date { Date(timeIntervalSince1970: Double(d) * 86400) }
    private var ticks: [Date] { chartTickDays(points.map(\.day)).map(date) }
    private var whole: Bool { chartWholeEuros(points.map(\.value)) }
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
        .accessibilityValue(points.last.map { "Ultimo valore \(eur($0.value)) il \(chartDayLabel($0.day))" } ?? "")
    }
}
