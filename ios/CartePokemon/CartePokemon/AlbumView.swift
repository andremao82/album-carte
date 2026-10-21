// Scheda Collezione (ridisegno ottobre 2026): griglia o elenco delle carte con ricerca, pillole di filtro
// (lingua, set, doppioni, senza prezzo), ordinamento e selezione multipla. Il valore e il backup sono nella Home.

import SwiftUI
import Charts

struct ShareItem: Identifiable {
    let url: URL
    var id: URL { url }
}

struct ShareSheet: UIViewControllerRepresentable {
    let url: URL
    var onDone: (Bool) -> Void = { _ in }
    func makeUIViewController(context: Context) -> UIActivityViewController {
        let vc = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        vc.completionWithItemsHandler = { _, completed, _, _ in onDone(completed) }
        return vc
    }
    func updateUIViewController(_ vc: UIActivityViewController, context: Context) {}
}

enum AlbumSort: String, CaseIterable, Identifiable {
    case recent = "Più recenti", name = "Nome", value = "Valore", set = "Set"
    var id: String { rawValue }
}

enum AlbumLayout: String { case grid, list }

struct AlbumView: View {
    @Environment(AppStore.self) private var store
    @State private var query = ""
    @AppStorage("albumSort") private var sort: AlbumSort = .recent
    @State private var lang: String? = nil
    @State private var setKey: String? = nil
    @State private var dupOnly = false
    @State private var noPrice = false
    @AppStorage("albumLayout") private var layout: AlbumLayout = .grid
    @State private var editMode: EditMode = .inactive
    @State private var selection = Set<String>()
    @State private var showBulk = false
    @State private var confirmBulkDelete = false

    private var selecting: Bool { editMode == .active }
    private var anyFilter: Bool { lang != nil || setKey != nil || dupOnly || noPrice }

    private var list: [Entry] {
        var items = store.catalog
        if let l = lang { items = items.filter { $0.lang == l } }
        if let k = setKey { items = items.filter { store.groupKey($0) == k } }
        if dupOnly { items = items.filter { $0.qty > 1 } }
        if noPrice { items = items.filter { store.unit($0) == nil } }
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        if !q.isEmpty {
            items = items.filter { e in
                e.name.lowercased().contains(q) || e.setName.lowercased().contains(q) || e.number.lowercased() == q
                    || (e.ill ?? "").lowercased().contains(q) || (e.note ?? "").lowercased().contains(q)
            }
        }
        switch sort {
        case .recent: items.sort { $0.added > $1.added }
        case .name: items.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        case .value: items.sort { (store.unit($0) ?? -1) * Double($0.qty) > (store.unit($1) ?? -1) * Double($1.qty) }
        case .set: items.sort { ($0.setName, normNum($0.number)) < ($1.setName, normNum($1.number)) }
        }
        return items
    }

    private let cols = Array(repeating: GridItem(.flexible(), spacing: 10, alignment: .top), count: 3)

    var body: some View {
        NavigationStack {
            let items = list
            VStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 12) {
                    ScreenHeader(title: "Collezione") {
                        if !store.catalog.isEmpty {
                            Button(selecting ? "Fine" : "Seleziona") {
                                withAnimation { editMode = selecting ? .inactive : .active }
                                selection = []
                            }
                            .font(.subheadline.weight(.semibold))
                            .padding(.horizontal, 14).padding(.vertical, 8)
                            .background(Theme.panel, in: Capsule())
                            .buttonStyle(.plain)
                        }
                    }
                    if !store.catalog.isEmpty { statsStrip }
                    if store.catalogProblem {
                        Label("Il catalogo salvato era illeggibile: è stata ripristinata l'ultima copia automatica.", systemImage: "exclamationmark.triangle.fill")
                            .font(.footnote).foregroundStyle(.orange)
                    }
                    HStack(spacing: 8) {
                        SearchField(prompt: "Nome, set o numero", text: $query)
                        Menu {
                            Picker("Ordina per", selection: $sort) {
                                ForEach(AlbumSort.allCases) { Text($0.rawValue).tag($0) }
                            }
                        } label: { CircleIcon(systemName: "arrow.up.arrow.down") }
                        .accessibilityLabel("Ordina")
                        layoutSwitch
                    }
                    filterPills
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 10)

                if store.catalog.isEmpty {
                    ContentUnavailableView("Nessuna carta", systemImage: "rectangle.stack.badge.plus",
                                           description: Text("Tocca il tasto giallo in basso per fotografare la prima."))
                        .frame(maxHeight: .infinity)
                } else if items.isEmpty {
                    ContentUnavailableView("Nessuna carta trovata", systemImage: "line.3.horizontal.decrease.circle",
                                           description: Text("Cambia la ricerca o i filtri."))
                        .frame(maxHeight: .infinity)
                } else if layout == .grid {
                    grid(items)
                } else {
                    listView(items)
                }
            }
            .background(Theme.bg)
            .toolbar(.hidden, for: .navigationBar)
            .environment(\.editMode, $editMode)
            .safeAreaInset(edge: .bottom) {
                if selecting { selectionBar }
            }
            .sheet(isPresented: $showBulk) {
                BulkEditSheet(keys: selection) {
                    selection = []
                    editMode = .inactive
                }
                .environment(store)
            }
            .confirmationDialog("Eliminare \(selection.count) \(selection.count == 1 ? "carta" : "carte") dal catalogo?", isPresented: $confirmBulkDelete, titleVisibility: .visible) {
                Button("Elimina", role: .destructive) {
                    let n = selection.count
                    store.pushUndo()
                    store.delete(keys: selection)
                    store.showUndo("\(n) \(n == 1 ? "carta eliminata" : "carte eliminate")")
                    selection = []
                    editMode = .inactive
                }
            }
            .appDestinations()
        }
    }

    // MARK: - Fascia dei valori: Valore stimato / Carte / Diverse

    private var statsStrip: some View {
        let s = store.homeStats()
        let d = Set(store.catalog.map { $0.cardId }).count
        return HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Valore stimato").font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                Text(eur(s.val)).font(.system(size: 24, weight: .heavy, design: .rounded)).monospacedDigit()
                    .foregroundStyle(Theme.accent).lineLimit(1).minimumScaleFactor(0.55)
                if s.miss > 0 { Text("\(s.miss) senza prezzo").font(.caption2).foregroundStyle(.orange) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            statDivider
            statCell("Carte", "\(s.n)")
            statDivider
            statCell("Diverse", "\(d)")
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
    }

    // MARK: - Pillole di filtro

    private var filterPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                PillButton(text: "Tutte", selected: !anyFilter) {
                    lang = nil; setKey = nil; dupOnly = false; noPrice = false
                }
                Menu {
                    Picker("Lingua", selection: $lang) {
                        Text("Tutte le lingue").tag(String?.none)
                        ForEach(LANGS, id: \.self) { Text(langLong($0)).tag(String?.some($0)) }
                    }
                } label: { Pill(text: lang.map { langLong($0) } ?? "Lingua", selected: lang != nil, menu: true) }
                Menu {
                    Picker("Set", selection: $setKey) {
                        Text("Tutti i set").tag(String?.none)
                        ForEach(store.groupSets().sorted { $0.name < $1.name }) { g in
                            Text(g.name + (g.lang.map { " · " + $0.uppercased() } ?? "")).tag(String?.some(g.key))
                        }
                    }
                } label: { Pill(text: setKey.map { store.setFromKey($0).name } ?? "Set", selected: setKey != nil, menu: true) }
                PillButton(text: "Doppioni", selected: dupOnly) { dupOnly.toggle() }
                PillButton(text: "Senza prezzo", selected: noPrice) { noPrice.toggle() }
            }
        }
        .scrollClipDisabled()
    }

    // MARK: - Griglia

    private func grid(_ items: [Entry]) -> some View {
        ScrollView {
            LazyVGrid(columns: cols, spacing: 14) {
                ForEach(items) { e in
                    if selecting {
                        Button {
                            if selection.contains(e.key) { selection.remove(e.key) } else { selection.insert(e.key) }
                        } label: { GridCell(e: e, selected: selection.contains(e.key), selecting: true) }
                        .buttonStyle(.plain)
                    } else {
                        NavigationLink(value: CardRoute(key: e.key)) { GridCell(e: e) }
                            .buttonStyle(.plain)
                            .contextMenu {
                                Button(role: .destructive) { remove(e) } label: { Label("Elimina", systemImage: "trash") }
                            }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 12)
            Text(headerText).font(.footnote).foregroundStyle(.secondary).padding(.bottom, 8)
        }
        .tabBarSpace()
    }

    // MARK: - Elenco (con selezione nativa)

    private func listView(_ items: [Entry]) -> some View {
        List(selection: $selection) {
            Section {
                ForEach(items) { e in
                    NavigationLink(value: CardRoute(key: e.key)) { EntryRow(e: e) }
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) { remove(e) } label: { Label("Elimina", systemImage: "trash") }
                        }
                }
            } header: {
                Text(headerText)
            }
        }
        .scrollContentBackground(.hidden)
        .tabBarSpace()
    }

    private var selectionBar: some View {
        GlassEffectContainer(spacing: 12) {
            HStack(spacing: 12) {
                Button(selection.count == list.count ? "Nessuna" : "Tutte") {
                    if selection.count == list.count { selection = [] } else { selection = Set(list.map { $0.key }) }
                }
                .buttonStyle(.glass)
                Text(selection.isEmpty ? "Seleziona le carte" : "\(selection.count) selezionate")
                    .font(.subheadline).frame(maxWidth: .infinity)
                Button("Modifica") { showBulk = true }
                    .buttonStyle(.glass)
                    .disabled(selection.isEmpty)
                Button("Elimina", role: .destructive) { confirmBulkDelete = true }
                    .buttonStyle(.glassProminent)
                    .tint(.red)
                    .disabled(selection.isEmpty)
            }
            .padding(.horizontal, 16)
        }
        .padding(.vertical, 8)
    }

    private var headerText: String {
        let n = list.count
        return n == store.catalog.count ? "\(n) \(n == 1 ? "voce" : "voci")" : "\(n) di \(store.catalog.count) voci"
    }

    private func remove(_ e: Entry) {
        store.pushUndo()
        store.delete(keys: [e.key])
        store.showUndo("Eliminata: \(e.name)")
    }
}

// MARK: - Cella della griglia

struct GridCell: View {
    @Environment(AppStore.self) private var store
    let e: Entry
    var selected = false
    var selecting = false

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            CardArt(url: previewURL(e), name: e.name, number: e.number)
                .overlay { HoloSheen(kind: holoKind(e.variant)) }   // riflesso statico su Holo e Reverse holo
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay(alignment: .topTrailing) { if e.qty > 1 { QtyBadge(qty: e.qty) } }
                .overlay(alignment: .bottomTrailing) {
                    if selecting {
                        Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                            .font(.title2)
                            .foregroundStyle(selected ? Theme.accent : .white)
                            .shadow(radius: 3)
                            .padding(6)
                    }
                }
                .opacity(selecting && !selected ? 0.7 : 1)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(store.unit(e).map { eur($0) } ?? "— €")
                    .font(.footnote.weight(.bold)).monospacedDigit().lineLimit(1)
                Spacer(minLength: 2)
                Text(meta).font(.system(size: 9, weight: .semibold)).foregroundStyle(.secondary).lineLimit(1)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(e.name), \(store.unit(e).map { eur($0) } ?? "senza prezzo")")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private var meta: String {
        var p = [e.lang]
        if e.variant != "Normale" { p.append(shortVariant(e.variant)) } else { p.append(e.cond) }
        return p.joined(separator: " · ")
    }
}

// MARK: - Riquadro del valore

struct StatsCard: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let s = store.homeStats()
        NavigationLink {
            ValueView()
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                Text("Valore stimato").font(.subheadline).foregroundStyle(.secondary)
                Text(eur(s.val)).font(.system(size: 38, weight: .bold, design: .rounded)).monospacedDigit()
                HStack(spacing: 14) {
                    Label("\(s.n) \(s.n == 1 ? "carta" : "carte")", systemImage: "rectangle.stack")
                    if let p = s.pct {
                        Label(signedPct(p) + " in 30 gg", systemImage: p >= 0 ? "arrow.up.right" : "arrow.down.right")
                            .foregroundStyle(p >= 0 ? Theme.up : Theme.down)
                    }
                }
                .font(.subheadline)
                if s.miss > 0 {
                    Text("\(s.miss) \(s.miss == 1 ? "carta senza prezzo" : "carte senza prezzo")")
                        .font(.footnote).foregroundStyle(.orange)
                }
            }
            .padding(.vertical, 4)
        }
    }
}

// MARK: - Andamento del valore

struct ValueView: View {
    @Environment(AppStore.self) private var store
    @State private var days = 30

    private var series: [PricePoint] {
        let start = days > 0 ? dayNow() - days : Int.min
        return store.vhist.compactMap { q in q.count >= 2 && q[0] >= start ? PricePoint(day: q[0], value: Double(q[1]) / 100) : nil }
    }

    var body: some View {
        let mv = store.priceMovers(days: days)
        let rows = mv.rows.sorted { abs($0.d) > abs($1.d) }
        List {
            Section {
                Picker("Periodo", selection: $days) {
                    Text("7 giorni").tag(7)
                    Text("30 giorni").tag(30)
                    Text("90 giorni").tag(90)
                    Text("Tutto").tag(0)
                }
                .pickerStyle(.segmented)
                if series.count >= 2 {
                    AreaValueChart(points: series, height: 200)
                } else {
                    Text("Il grafico si riempie con i giorni: serve almeno un secondo aggiornamento dei prezzi.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            if !rows.isEmpty {
                Section {
                    HStack {
                        Text("Variazione totale")
                        Spacer()
                        Text(signedEur(mv.dTot)).foregroundStyle(mv.dTot >= 0 ? Theme.up : Theme.down).monospacedDigit()
                        if mv.bTot > 0 { Text("(" + signedPct(mv.dTot / mv.bTot * 100) + ")").foregroundStyle(.secondary) }
                    }
                }
                Section("Carte che sono cambiate di più") {
                    ForEach(rows.prefix(30), id: \.e.key) { m in
                        NavigationLink(value: CardRoute(key: m.e.key)) {
                            HStack {
                                CardThumb(url: previewURL(m.e), width: 38, name: m.e.name, number: m.e.number)
                                VStack(alignment: .leading) {
                                    Text(m.e.name).lineLimit(1)
                                    Text(signedPct(m.pct)).font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(signedEur(m.d)).foregroundStyle(m.d >= 0 ? Theme.up : Theme.down).monospacedDigit()
                            }
                        }
                    }
                }
            }
        }
        .tabBarSpace()
        .navigationTitle("Valore")
        .navigationBarTitleDisplayMode(.inline)
    }
}
