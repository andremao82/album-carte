// Scheda Pokédex (ridisegno ottobre 2026): schede Pokémon / Allenatori / Energie / Artisti, numero grande con percentuale
// e barra, avviso per le carte non ancora collegate, pillole Tutte / Gen I–IX / Mancanti / Posseduti; griglia a pannelli.

import SwiftUI

enum DexMode: String, CaseIterable, Identifiable {
    case pokemon = "Pokémon", trainers = "Allenatori", energies = "Energie", artists = "Artisti"
    var id: String { rawValue }
}

enum DexOwnFilter { case all, missing, owned }

struct DexView: View {
    @Environment(AppStore.self) private var store
    @State private var mode: DexMode = .pokemon
    @State private var gen = 0
    @State private var own: DexOwnFilter = .all
    @State private var query = ""
    // percorso di navigazione: la griglia dei Pokémon apre il dettaglio con un pulsante, non con NavigationLink
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            List {
                Group {
                    header
                    if store.dexFill.running || store.pendingDex() > 0 { fillBanner }
                    if mode == .pokemon || mode == .artists {
                        HStack(spacing: 8) {
                            SearchField(prompt: mode == .pokemon ? "Nome o numero" : "Cerca", text: $query)
                            Menu {
                                Picker("Lingua dei totali", selection: store.bind(\.dexLang)) {
                                    ForEach(["it", "en", "ja"], id: \.self) { Text(LANG_NAMES[$0] ?? $0).tag($0) }
                                }
                            } label: { Pill(text: LANG_NAMES[store.cfg.dexLang] ?? store.cfg.dexLang, menu: true) }
                            .accessibilityLabel("Lingua dei totali")
                        }
                    }
                    if mode == .pokemon { pills }
                }
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))

                switch mode {
                case .pokemon: PokemonGrid(gen: gen, own: own, query: query) { path.append($0) }
                case .trainers: TrainerList()
                case .energies: EnergyList()
                case .artists: ArtistList(query: query)
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .tabBarSpace()
            .background(Theme.bg)
            .toolbar(.hidden, for: .navigationBar)
            .task {
                await store.loadDexNames()
                if store.pendingDex() > 0 { await store.backfillDex() }
                await store.ensureDexTotals(Array(store.dexIndex().keys))
                await loadGenTotals()
            }
            .onChange(of: store.cfg.dexLang) { _, _ in
                store.illNames = nil
                Task { await store.ensureDexTotals(Array(store.dexIndex().keys)); await loadGenTotals() }
            }
            .onChange(of: gen) { _, _ in Task { await loadGenTotals() } }
            .appDestinations()
        }
    }

    // totali dei Pokémon della generazione mostrata (anche quelli che non hai), per "0/18 carte"
    private func loadGenTotals() async {
        guard mode == .pokemon, GENS.indices.contains(gen) else { return }
        let g = GENS[gen]
        await store.ensureDexTotals(Array(g.lo...g.hi))
    }

    private var header: some View {
        let _ = store.dexVersion
        let st = heroStat
        return VStack(spacing: 14) {
            ScreenHeader(title: "Pokédex")
            HStack(spacing: 6) {
                ForEach(DexMode.allCases) { m in
                    Button { mode = m } label: {
                        Text(m.rawValue).font(.subheadline.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.8)
                            .frame(maxWidth: .infinity).padding(.vertical, 9)
                            .foregroundStyle(mode == m ? Color.black : Color.primary)
                            .background(mode == m ? Theme.accentFill : Theme.panel, in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(mode == m ? .isSelected : [])
                }
            }
            VStack(spacing: 6) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text("\(st.have)").font(.system(size: 56, weight: .heavy, design: .rounded)).foregroundStyle(Theme.accent)
                    if let t = st.total { Text("/ \(t)").font(.system(size: 32, weight: .bold, design: .rounded)).foregroundStyle(.secondary) }
                }
                .lineLimit(1).minimumScaleFactor(0.6)
                Text(st.label).font(.subheadline).foregroundStyle(.secondary)
                if let t = st.total, t > 0 {
                    Text(dexPercent(have: st.have, total: t))
                        .font(.subheadline.weight(.bold)).foregroundStyle(Theme.up)
                        .padding(.horizontal, 14).padding(.vertical, 6)
                        .background(Theme.up.opacity(0.16), in: Capsule())
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

    private var fillBanner: some View {
        HStack(spacing: 10) {
            if store.dexFill.running {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Leggo Pokémon, categoria e artista dalle tue carte…").font(.footnote)
                    ThinBar(value: Double(store.dexFill.done) / Double(max(store.dexFill.total, 1)))
                }
            } else {
                let n = store.pendingDex()
                Text("\(n) \(n == 1 ? "carta non ancora collegata" : "carte non ancora collegate") al Pokédex").font(.footnote)
                Spacer(minLength: 6)
                Button("Leggi ora") { Task { await store.backfillDex() } }
                    .font(.footnote.weight(.bold))
                    .padding(.horizontal, 12).padding(.vertical, 7)
                    .foregroundStyle(.black)
                    .background(Theme.accentFill, in: Capsule())
                    .buttonStyle(.plain)
            }
        }
        .panel(padding: 12, radius: 14, highlight: true)
    }

    private var pills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                PillButton(text: "Tutte", selected: gen < 0) { gen = -1 }
                ForEach(Array(GENS.enumerated()), id: \.offset) { i, g in
                    PillButton(text: "Gen \(g.roman)", selected: gen == i) { gen = i }
                }
                PillButton(text: "Mancanti", selected: own == .missing) { own = own == .missing ? .all : .missing }
                PillButton(text: "Posseduti", selected: own == .owned) { own = own == .owned ? .all : .owned }
            }
        }
        .scrollClipDisabled()
    }
}

// MARK: - Pokémon

struct PokemonGrid: View {
    @Environment(AppStore.self) private var store
    let gen: Int
    let own: DexOwnFilter
    let query: String
    /// Apre il dettaglio. La griglia è una sola riga della List: con più NavigationLink nella stessa riga
    /// SwiftUI li attiva tutti al tocco (si apriva l'ultimo, Mew, e "indietro" scorreva fra i Pokémon).
    let open: (DexRoute) -> Void

    private let cols = Array(repeating: GridItem(.flexible(), spacing: 8, alignment: .top), count: 3)

    var body: some View {
        let _ = store.dexVersion
        let idx = store.dexIndex()
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        // con una ricerca si guardano tutte le generazioni, altrimenti solo quella scelta
        let gens = q.isEmpty ? (gen < 0 ? GENS : (GENS.indices.contains(gen) ? [GENS[gen]] : [])) : GENS
        ForEach(gens) { g in
            let nums = Array(g.lo...g.hi).filter { n in
                if own == .owned && idx[n] == nil { return false }
                if own == .missing && idx[n] != nil { return false }
                if q.isEmpty { return true }
                return String(n) == q || store.dexName(n).lowercased().contains(q)
            }
            if !nums.isEmpty || q.isEmpty {
                let have = Array(g.lo...g.hi).filter { idx[$0] != nil }.count
                Section {
                    if nums.isEmpty {
                        Text(own == .missing ? "Li hai tutti!" : "Nessun Pokémon qui, per ora.")
                            .font(.subheadline).foregroundStyle(.secondary)
                    }
                    LazyVGrid(columns: cols, spacing: 8) {
                        ForEach(nums, id: \.self) { n in
                            Button { open(DexRoute(kind: "pokemon", n: n, name: store.dexName(n))) } label: {
                                cell(n, idx[n]).foregroundStyle(.primary).contentShape(Rectangle()) // .borderless colorerebbe i testi di giallo
                            }
                            .buttonStyle(.borderless)
                        }
                    }
                } header: {
                    HStack {
                        Text("Generazione \(g.roman) · \(g.region)").font(.headline).foregroundStyle(.primary)
                        Spacer()
                        Text("\(have) / \(g.hi - g.lo + 1)").font(.caption).foregroundStyle(.secondary)
                    }
                    .textCase(nil)
                }
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
            }
        }
    }

    private func cell(_ n: Int, _ g: DexGroup?) -> some View {
        let owned = g != nil
        let count = g.map { store.ownedDistinct($0.entries) } ?? 0
        let tot = store.totalFor(n)
        return VStack(spacing: 3) {
            Text("#\(n)").font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
            SpriteView(n: n, size: 58)
                .saturation(owned ? 1 : 0)
                .opacity(owned ? 1 : 0.35)
            Text(store.dexName(n).isEmpty ? "—" : store.dexName(n))
                .font(.caption.weight(.bold)).lineLimit(1).minimumScaleFactor(0.7)
            Text(tot != nil ? "\(count)/\(tot!) carte" : "\(count) carte")
                .font(.caption2.weight(owned ? .bold : .regular))
                .foregroundStyle(owned ? Theme.accent : .secondary)
        }
        .padding(8)
        .frame(maxWidth: .infinity)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            if owned { RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Theme.accentLine, lineWidth: 1.5) }
        }
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Artisti

struct ArtistList: View {
    @Environment(AppStore.self) private var store
    let query: String

    struct Row: Identifiable { var name: String; var count: Int; var id: String { name } }

    private var rows: [Row] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        var m: [String: Int] = [:]
        for e in store.catalog { if let i = e.ill, !i.isEmpty { m[i, default: 0] += 1 } }
        return m.map { Row(name: $0.key, count: $0.value) }
            .filter { q.isEmpty || $0.name.lowercased().contains(q) }
            .sorted { $0.count != $1.count ? $0.count > $1.count : $0.name < $1.name }
    }

    var body: some View {
        let rows = self.rows
        Section("\(rows.count) artisti") {
            if rows.isEmpty {
                Text("Gli artisti compaiono dopo la lettura dei dati delle carte.").font(.subheadline).foregroundStyle(.secondary)
            }
            ForEach(rows) { r in
                NavigationLink(value: DexRoute(kind: "art", name: r.name)) {
                    HStack { Image(systemName: "paintbrush.pointed.fill").foregroundStyle(.secondary); Text(r.name); Spacer(); Text("\(r.count)").foregroundStyle(.secondary) }
                }
            }
        }
    }
}

// MARK: - Allenatori ed Energie

struct TrainerList: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let all = store.catalog.filter { $0.cat == "Trainer" }
        Section("Allenatori") {
            NavigationLink(value: DexRoute(kind: "grp", cat: "Trainer", grpKey: "")) {
                HStack { Text("Tutti gli allenatori"); Spacer(); Text("\(all.count)").foregroundStyle(.secondary) }
            }
        }
        let tts = Dictionary(grouping: all.filter { !($0.tt ?? "").isEmpty }, by: { $0.tt ?? "" })
        if !tts.isEmpty {
            Section("Per tipo") {
                ForEach(tts.keys.sorted(), id: \.self) { t in
                    NavigationLink(value: DexRoute(kind: "grp", cat: "Trainer", grpKey: t)) {
                        HStack { Text(t); Spacer(); Text("\(tts[t]?.count ?? 0)").foregroundStyle(.secondary) }
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
                HStack { Text("Tutte le energie"); Spacer(); Text("\(n)").foregroundStyle(.secondary) }
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
            Section { Text("\(pending) carte non ancora lette.").font(.footnote).foregroundStyle(.secondary) }
        }
    }
}

// MARK: - Dettaglio

struct DexDetailView: View {
    @Environment(AppStore.self) private var store
    let route: DexRoute
    @State private var all: [SetCardSummary]?
    @State private var error: String?
    @State private var adding: SetCardSummary?
    @State private var openKey: String?   // carta posseduta toccata nella griglia

    private let cols = [GridItem(.adaptive(minimum: 96), spacing: 10)]

    private var owned: [Entry] {
        switch route.kind {
        case "pokemon": return store.catalog.filter { ($0.dex ?? []).contains(route.n) }
        case "art": return store.catalog.filter { $0.ill == route.name }
        default: return store.catalog.filter { $0.cat == route.cat && (route.grpKey.isEmpty || $0.tt == route.grpKey) }
        }
    }

    private var title: String {
        switch route.kind {
        case "pokemon": return route.name.isEmpty ? "Pokémon #\(route.n)" : route.name
        case "art": return route.name
        default: return route.grpKey.isEmpty ? (route.cat == "Pokemon" ? "Pokémon" : route.cat == "Trainer" ? "Allenatore" : "Energia") : route.grpKey
        }
    }

    var body: some View {
        let mine = owned
        List {
            if route.kind == "pokemon" {
                Section {
                    HStack { Spacer(); SpriteView(n: route.n, size: 120); Spacer() }
                }
                .listRowBackground(Color.clear)
            }
            Section("Le tue carte (\(mine.count))") {
                if mine.isEmpty { Text("Non hai ancora carte qui.").foregroundStyle(.secondary) }
                ForEach(mine) { e in
                    NavigationLink(value: CardRoute(key: e.key)) { EntryRow(e: e) }
                }
            }
            if route.kind != "grp" {
                Section {
                    if let list = all {
                        let mineById = ownedById(mine)
                        let others = notInList(mine, list)
                        let ordered = ownedFirst(list, mineById)
                        LazyVGrid(columns: cols, spacing: 12) {
                            // prima le tue carte che non esistono nell'elenco di questa lingua (es. set solo inglesi)
                            ForEach(others) { e in
                                Button { openKey = e.key } label: {
                                    VStack(spacing: 4) {
                                        CardThumb(url: previewURL(e), width: 96, radius: 8, name: e.name, number: e.number)
                                        Text(normNum(e.number) + " · " + e.lang).font(.caption2.weight(.bold)).foregroundStyle(Theme.accent)
                                    }
                                }
                                .buttonStyle(.borderless)
                            }
                            ForEach(ordered) { c in
                                let mineHere = mineById[normCardId(c.id)]
                                let isOwned = mineHere != nil
                                Button { if let e = mineHere { openKey = e.key } else { adding = c } } label: {
                                    VStack(spacing: 4) {
                                        CardThumb(url: gridImage(c, mineHere), width: 96, radius: 8,
                                                  name: mineHere?.name ?? "", number: mineHere?.number ?? "")
                                            .saturation(isOwned ? 1 : 0).opacity(isOwned ? 1 : 0.35)
                                        Text(c.localId).font(.caption2.weight(isOwned ? .bold : .regular))
                                            .foregroundStyle(isOwned ? Theme.accent : .secondary)
                                    }
                                }
                                .buttonStyle(.borderless) // ogni carta tocca solo se stessa (griglia in una riga della List)
                            }
                        }
                        if !others.isEmpty {
                            Text(others.count == 1 ? "La prima carta colorata è tua ma non esiste in \(LANG_NAMES[store.cfg.dexLang] ?? "questa lingua"): non conta nel totale."
                                 : "Le prime \(others.count) carte colorate sono tue ma non esistono in \(LANG_NAMES[store.cfg.dexLang] ?? "questa lingua"): non contano nel totale.")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                    } else if let e = error {
                        Text(e).font(.footnote).foregroundStyle(.secondary)
                    } else {
                        ProgressView().frame(maxWidth: .infinity)
                    }
                } header: {
                    Text(all.map { "Tutte le carte (\($0.count)), lingua: \(LANG_NAMES[store.cfg.dexLang] ?? "")" } ?? "Tutte le carte")
                }
            }
        }
        .tabBarSpace()
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .task(id: store.cfg.dexLang) { await loadAll() }
        .navigationDestination(item: $openKey) { CardDetailView(key: $0) }
        .alert("Aggiungere la carta?", isPresented: Binding(get: { adding != nil }, set: { if !$0 { adding = nil } }), presenting: adding) { c in
            Button("Aggiungi") { Task { await add(c) } }
            Button("Annulla", role: .cancel) {}
        } message: { c in
            Text("\(c.name) (\(c.localId)) verrà aggiunta in Near Mint.")
        }
    }

    /// Immagine di una carta della griglia: la mia foto se è la sua anteprima, poi quella dell'elenco; se manca (tipico delle carte IT su TCGdex)
    /// e la carta è tua, la stessa anteprima di "Le tue carte" (foto mia o immagine inglese); altrimenti "?".
    private func gridImage(_ c: SetCardSummary, _ mine: Entry?) -> String {
        if let e = mine, showsOwnPhoto(e) { return previewURL(e) }   // ho scelto la mia foto: anche qui
        if !c.image.isEmpty { return c.image + "/low.webp" }
        if let e = mine { return previewURL(e) }
        return ""
    }

    /// Le tue carte indicizzate per id normalizzato (vale sia l'id TCGdex sia quello della Pokémon TCG API).
    private func ownedById(_ mine: [Entry]) -> [String: Entry] {
        var m: [String: Entry] = [:]
        for e in mine { for k in entryMatchIds(e) where m[k] == nil { m[k] = e } }
        return m
    }

    /// Prima le carte dell'elenco che possiedi, poi le mancanti; dentro ciascun gruppo resta l'ordine di TCGdex.
    private func ownedFirst(_ list: [SetCardSummary], _ mineById: [String: Entry]) -> [SetCardSummary] {
        let have = list.filter { mineById[normCardId($0.id)] != nil }
        let miss = list.filter { mineById[normCardId($0.id)] == nil }
        return have + miss
    }

    /// Le tue carte che non corrispondono a nessuna carta dell'elenco (una per carta, senza doppioni di variante/condizione).
    private func notInList(_ mine: [Entry], _ list: [SetCardSummary]) -> [Entry] {
        let ids = Set(list.map { normCardId($0.id) })
        var seen = Set<String>()
        return mine.filter { e in
            let ks = entryMatchIds(e)
            if ks.contains(where: { ids.contains($0) }) { return false }
            return seen.insert(ks.first ?? e.key).inserted
        }
    }

    private func loadAll() async {
        guard route.kind != "grp" else { return }
        all = nil
        error = nil
        do {
            all = try await store.loadCardList(kind: route.kind, lang: store.cfg.dexLang, id: route.kind == "pokemon" ? String(route.n) : route.name)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func add(_ c: SetCardSummary) async {
        do {
            store.pushUndo()
            try await store.addFromTCGdex(lang: store.cfg.dexLang, cardId: c.id)
            store.showUndo("Aggiunta: \(c.name)")
        } catch {
            store.toast(error.localizedDescription)
        }
    }
}
