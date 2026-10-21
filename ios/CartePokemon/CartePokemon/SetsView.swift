// Scheda Progressi (ex Set, ridisegno ottobre 2026): avanzamento complessivo ad anello, filtri In corso / Completati /
// Tutti i set e, dentro ogni set, l'elenco completo con le carte che hai e quelle che mancano.

import SwiftUI

func setImageURL(_ base: String) -> URL? {
    if base.isEmpty { return nil }
    let ext = (base as NSString).pathExtension.lowercased()
    return URL(string: ["png", "webp", "jpg", "jpeg"].contains(ext) ? base : base + ".png")
}

struct SetLogo: View {
    let url: String
    let name: String
    var height: CGFloat = 40
    var body: some View {
        AsyncImage(url: setImageURL(url)) { phase in
            if case .success(let img) = phase {
                img.resizable().scaledToFit()
            } else {
                ZStack {
                    RoundedRectangle(cornerRadius: 8, style: .continuous).fill(.quaternary)
                    Text(initials(name)).font(.caption.weight(.bold)).foregroundStyle(.secondary)
                }
            }
        }
        .frame(width: height * 1.6, height: height)
    }
}

/// Rispetto a cosa si conta il progresso: solo i set iniziati, tutti i set contando le carte ufficiali, o tutti i set con le segrete.
enum SetScope: String, CaseIterable, Identifiable {
    case started = "Iniziati", official = "Ufficiali", all = "Tutti"
    var id: String { rawValue }
    var caption: String {
        switch self {
        case .started: return "carte nei set iniziati"
        case .official: return "carte ufficiali di tutti i set"
        case .all: return "carte di tutti i set, segrete incluse"
        }
    }
}

enum SetFilter: String, CaseIterable, Identifiable {
    case open = "In corso", done = "Completati", all = "Tutti i set"
    var id: String { rawValue }
}

/// Riepilogo complessivo dei set: carte possedute sul totale dei set con totale noto, set iniziati e completi.
struct SetsSummary {
    var have = 0
    var total = 0
    var started = 0
    var complete = 0
    var sets = 0   // set contati nel totale (nel confronto con tutti i set sono più degli iniziati)
    var pct: Double { total > 0 ? Double(have) / Double(total) * 100 : 0 }
}

extension AppStore {
    func isComplete(_ g: SetGroup) -> Bool {
        let t = totalOf(g)
        return t > 0 && g.nums.count >= t
    }

    /// Carte ufficiali del set (quelle col numero stampato sul totale, senza segrete).
    func officialOf(_ g: SetGroup) -> Int {
        if let m = metaOf(g), let o = m.official, o > 0 { return o }
        return g.official
    }

    /// Carte possedute con numero da 1 al totale ufficiale (le segrete e i numeri con lettere restano fuori).
    func officialHave(_ g: SetGroup, official: Int) -> Int {
        g.nums.filter { n in Int(n).map { $0 >= 1 && $0 <= official } ?? false }.count
    }

    /// `.started`: solo i set che hai. `.official` / `.all`: anche i set mai iniziati dell'elenco italiano di TCGdex
    /// (i set che hai in altre lingue contano comunque col loro totale).
    func setsSummary(scope: SetScope = .started) -> SetsSummary {
        var s = SetsSummary()
        var startedIT = Set<String>()
        for g in groupSets() {
            s.started += 1
            if g.td, g.lang == "it", let id = g.setId { startedIT.insert(id) }
            let t = scope == .official ? officialOf(g) : totalOf(g)
            guard t > 0 else { continue }
            let h = scope == .official ? officialHave(g, official: t) : min(g.nums.count, t)
            s.total += t
            s.have += h
            s.sets += 1
            if h >= t { s.complete += 1 }
        }
        if scope != .started, let it = tdMeta["it"] {
            for (id, m) in it where !startedIT.contains(id) {
                let t = scope == .official ? (m.official ?? 0) : (m.total ?? m.official ?? 0)
                if t > 0 { s.total += t; s.sets += 1 }
            }
        }
        return s
    }
}

struct SetsView: View {
    @Environment(AppStore.self) private var store
    @State private var query = ""
    @State private var filter: SetFilter = .open
    @AppStorage("setsScope") private var scopeRaw = SetScope.all.rawValue
    private var scope: SetScope { SetScope(rawValue: scopeRaw) ?? .all }

    private var groups: [SetGroup] {
        var g = store.groupSets()
        switch filter {
        case .open: g = g.filter { !store.isComplete($0) }
        case .done: g = g.filter { store.isComplete($0) }
        case .all: break
        }
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        if !q.isEmpty { g = g.filter { $0.name.lowercased().contains(q) } }
        return g.sorted { $0.last > $1.last }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    ScreenHeader(title: "Progressi")
                    if store.catalog.isEmpty {
                        ContentUnavailableView("Nessun set", systemImage: "books.vertical",
                                               description: Text("I set compaiono quando aggiungi delle carte."))
                    } else {
                        summaryCard
                        SearchField(prompt: "Cerca un set", text: $query)
                        HStack(spacing: 8) {
                            ForEach(SetFilter.allCases) { f in
                                PillButton(text: f.rawValue, selected: filter == f) { filter = f }
                            }
                        }
                        let list = groups
                        if list.isEmpty {
                            Text(filter == .done ? "Nessun set completo, per ora." : "Nessun set trovato.")
                                .font(.subheadline).foregroundStyle(.secondary).padding(.top, 8)
                        }
                        LazyVStack(spacing: 8) {
                            ForEach(list) { g in
                                NavigationLink(value: SetRoute(key: g.key)) { SetProgressRow(g: g) }
                                    .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
            .tabBarSpace()
            .background(Theme.bg)
            .toolbar(.hidden, for: .navigationBar)
            .task { await store.loadMeta(["it", "en", "ja"]) }
            .appDestinations()
        }
    }

    private var summaryCard: some View {
        let s = store.setsSummary(scope: scope)
        let pct = setsPercent(s.pct)
        return VStack(spacing: 14) {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("\(s.have)").font(.system(size: 46, weight: .heavy, design: .rounded)).foregroundStyle(Theme.accent)
                    Text("/ \(s.total)").font(.system(size: 26, weight: .bold, design: .rounded)).foregroundStyle(.secondary)
                }
                .lineLimit(1).minimumScaleFactor(0.6)
                Text(scope.caption).font(.subheadline.weight(.medium))
                Text(setsLine(s, scope: scope)).font(.subheadline).foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
            ZStack {
                ProgressRing(value: s.pct / 100, size: 88, line: 10)
                Text(pct).font(.system(size: 18, weight: .heavy, design: .rounded)).minimumScaleFactor(0.6).lineLimit(1).frame(width: 60)
            }
        }
            HStack(spacing: 6) {
                ForEach(SetScope.allCases) { sc in
                    Button { scopeRaw = sc.rawValue } label: {
                        Text(sc.rawValue).font(.subheadline.weight(.semibold)).lineLimit(1)
                            .frame(maxWidth: .infinity).padding(.vertical, 8)
                            .foregroundStyle(scope == sc ? Color.black : Color.primary)
                            .background(scope == sc ? Theme.accentFill : Theme.panelHi, in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(scope == sc ? .isSelected : [])
                }
            }
        }
        .panel(padding: 18)
        .accessibilityElement(children: .combine)
    }
}

/// Seconda riga della scheda riepilogo: "2 set iniziati · 0 completi" oppure "2 iniziati su 96 set · 0 completi".
func setsLine(_ s: SetsSummary, scope: SetScope) -> String {
    let comp = "\(s.complete) \(s.complete == 1 ? "completo" : "completi")"
    if scope == .started { return "\(s.started) \(s.started == 1 ? "set iniziato" : "set iniziati") · \(comp)" }
    return "\(s.started) \(s.started == 1 ? "iniziato" : "iniziati") su \(max(s.sets, s.started)) set · \(comp)"
}

/// Riga di un set: logo, nome, possedute/totale, barra gialla, valore e carte mancanti.
struct SetProgressRow: View {
    @Environment(AppStore.self) private var store
    let g: SetGroup

    var body: some View {
        let total = store.totalOf(g)
        let have = g.nums.count
        HStack(spacing: 12) {
            SetLogo(url: store.metaOf(g)?.logo ?? "", name: g.name, height: 26)
                .frame(width: 44, height: 44)
                .background(Theme.panelHi, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(g.name).font(.subheadline.weight(.bold)).lineLimit(1)
                    if let l = g.lang { Text(l.uppercased()).font(.caption2.weight(.semibold)).foregroundStyle(.secondary) }
                    Spacer(minLength: 4)
                    Text(total > 0 ? "\(have) / \(total)" : "\(have)")
                        .font(.caption.weight(.semibold)).monospacedDigit()
                        .foregroundStyle(total > 0 && have >= total ? Theme.accent : .secondary)
                }
                ThinBar(value: total > 0 ? Double(have) / Double(total) : 0)
                Text(detail(total: total, have: have)).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
            }
        }
        .panel(padding: 12, radius: 16)
        .accessibilityElement(children: .combine)
    }

    private func detail(total: Int, have: Int) -> String {
        var p: [String] = []
        if g.value > 0 { p.append(eur(g.value)) }
        if total > 0 {
            let miss = max(0, total - have)
            p.append(miss == 0 ? "completo" : "mancano \(miss) \(miss == 1 ? "carta" : "carte")")
        } else {
            p.append("\(have) \(have == 1 ? "carta" : "carte"), totale non noto")
        }
        return p.joined(separator: " · ")
    }
}

struct SetDetailView: View {
    @Environment(AppStore.self) private var store
    let key: String
    @State private var detail: SetDetail?
    @State private var error: String?
    @State private var adding: SetCardSummary?
    @State private var loading = false

    private let cols = [GridItem(.adaptive(minimum: 96), spacing: 10)]

    var body: some View {
        let g = store.setFromKey(key)
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header(g)
                if g.td, let d = detail {
                    LazyVGrid(columns: cols, spacing: 12) {
                        ForEach(d.cards) { c in cell(c, g) }
                    }
                } else if g.td {
                    if let e = error {
                        ContentUnavailableView {
                            Label("Elenco non disponibile", systemImage: "wifi.slash")
                        } description: { Text(e) } actions: {
                            Button("Riprova") { Task { await load(g) } }.buttonStyle(.glass)
                        }
                    } else {
                        ProgressView().frame(maxWidth: .infinity).padding(.top, 40)
                    }
                } else {
                    VStack(spacing: 0) {
                        ForEach(g.entries) { e in
                            NavigationLink(value: CardRoute(key: e.key)) { EntryRow(e: e).padding(.vertical, 6) }
                                .buttonStyle(.plain)
                            Divider()
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .tabBarSpace()
        .navigationTitle(g.name)
        .navigationBarTitleDisplayMode(.inline)
        .task { await load(g) }
        .alert("Aggiungere la carta?", isPresented: Binding(get: { adding != nil }, set: { if !$0 { adding = nil } }), presenting: adding) { c in
            Button("Aggiungi") { Task { await add(c, g) } }
            Button("Annulla", role: .cancel) {}
        } message: { c in
            Text("\(c.name) (\(c.localId)) verrà aggiunta in Near Mint.")
        }
    }

    private func header(_ g: SetGroup) -> some View {
        let total = store.totalOf(g)
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                SetLogo(url: detail?.logo ?? store.metaOf(g)?.logo ?? "", name: g.name, height: 52)
                Spacer()
                VStack(alignment: .trailing) {
                    Text(total > 0 ? "\(g.nums.count) di \(total)" : "\(g.nums.count) carte").font(.title3.weight(.bold))
                    if g.value > 0 { Text(eur(g.value)).font(.subheadline).foregroundStyle(.secondary) }
                }
            }
            if total > 0 { ProgressView(value: Double(min(g.nums.count, total)), total: Double(total)) }
        }
        .padding(.top, 8)
    }

    @ViewBuilder
    private func cell(_ c: SetCardSummary, _ g: SetGroup) -> some View {
        let owned = g.entries.first { normNum($0.number) == normNum(c.localId) }
        let url = c.image.isEmpty ? "" : c.image + "/low.webp"
        if let o = owned {
            NavigationLink(value: CardRoute(key: o.key)) {
                VStack(spacing: 4) {
                    CardThumb(url: url, width: 96, radius: 8)
                    Text(c.localId).font(.caption2).foregroundStyle(.secondary)
                }
            }
            .buttonStyle(.plain)
        } else {
            Button { adding = c } label: {
                VStack(spacing: 4) {
                    CardThumb(url: url, width: 96, radius: 8).saturation(0).opacity(0.35)
                    Text(c.localId).font(.caption2).foregroundStyle(.secondary)
                }
            }
            .buttonStyle(.plain)
        }
    }

    private func load(_ g: SetGroup) async {
        guard g.td, let l = g.lang, let id = g.setId, detail == nil, !loading else { return }
        loading = true
        defer { loading = false }
        do {
            detail = try await store.getSetDetail(lang: l, id: id)
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func add(_ c: SetCardSummary, _ g: SetGroup) async {
        guard let l = g.lang else { return }
        do {
            store.pushUndo()
            try await store.addFromTCGdex(lang: l, cardId: c.id)
            store.showUndo("Aggiunta: \(c.name)")
        } catch {
            store.toast(error.localizedDescription)
        }
    }
}
