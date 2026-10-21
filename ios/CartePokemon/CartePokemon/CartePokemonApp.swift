// Album carte Pokémon, app nativa SwiftUI per iOS 26 con Liquid Glass.
// Ridisegno (ottobre 2026): quattro schede (Home, Collezione, Progressi, Pokédex) e barra a schede personalizzata
// in vetro (Liquid Glass) con il tasto giallo di scansione al centro, che apre il pannello "Aggiungi carte".

import SwiftUI

@main
struct CartePokemonApp: App {
    @State private var store: AppStore
    @State private var queue: ScanQueue
    @Environment(\.scenePhase) private var phase

    init() {
        let s = AppStore()
        _store = State(initialValue: s)
        _queue = State(initialValue: ScanQueue(store: s))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .environment(queue)
                .tint(Theme.accent)
        }
        .onChange(of: phase) { _, p in
            if p != .active { store.flushAll() }
        }
    }
}

struct RootView: View {
    @Environment(AppStore.self) private var store
    @Environment(ScanQueue.self) private var queue
    @State private var tab: AppTab = .home
    @State private var visited: Set<AppTab> = [.home]
    @State private var showAdd = false
    @State private var showSettings = false
    @AppStorage(Appearance.key) private var appearance = Appearance.auto.rawValue

    var body: some View {
        // Le schede restano vive (stato e scorrimento) ma ognuna si crea solo alla prima visita.
        ZStack {
            Theme.bg.ignoresSafeArea()
            ForEach(AppTab.allCases, id: \.self) { t in
                if visited.contains(t) {
                    // Lo spazio per la barra sta dentro ogni pagina a scorrimento (.tabBarSpace() su ScrollView/List):
                    // messo qui, fuori dal NavigationStack, non arrivava alla ScrollView e la barra copriva l'ultima voce.
                    screen(t)
                        .opacity(tab == t ? 1 : 0)
                        .allowsHitTesting(tab == t)
                        .accessibilityHidden(tab != t)
                }
            }
        }
        .overlay(alignment: .bottom) {
            GlassTabBar(tab: $tab, reviewCount: queue.reviewCount, busy: queue.activeCount > 0) { showAdd = true }
                .ignoresSafeArea(.keyboard, edges: .bottom)
        }
        .onChange(of: tab) { _, t in visited.insert(t) }
        .overlay(alignment: .top) { ToastOverlay().padding(.top, 6).allowsHitTesting(true) }
        .sheet(isPresented: $showAdd) {
            AddView()
                .environment(store).environment(queue)
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showSettings) {
            SettingsView().environment(store)
        }
        .task {
            store.prunePhotos()
            await store.refreshFx()
            await store.fillMissingImages()
        }
        .onAppear { applyAppearance(appearance) }
        .onChange(of: appearance) { _, a in applyAppearance(a) }
    }

    @ViewBuilder
    private func screen(_ t: AppTab) -> some View {
        switch t {
        case .home: HomeView(tab: $tab, showSettings: $showSettings, showAdd: $showAdd)
        case .collection: AlbumView()
        case .progress: SetsView()
        case .dex: DexView()
        }
    }
}
