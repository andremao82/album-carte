// Scheda Impostazioni: lettura delle foto, prezzi, backup e dati.

import SwiftUI
import UniformTypeIdentifiers

struct SettingsView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var gText = ""
    @State private var cText = ""
    @State private var tText = ""
    @State private var loadedKeys = false
    @State private var listing = false
    @State private var refreshing = false
    @State private var progress: (Int, Int) = (0, 0)
    @State private var shareItem: ShareItem?
    @State private var shareIsBackup = false
    @State private var importing = false
    @State private var confirmReset = false
    @State private var confirmHist = false
    @State private var confirmAuto = false
    @State private var testResult: [String] = []
    @State private var testing = false
    @State private var message: String?
    @AppStorage(Appearance.key) private var appearance = Appearance.auto.rawValue

    var body: some View {
        NavigationStack {
            Form {
                appearanceSection
                readingSection
                priceSection
                coefSection
                dataSection
                testSection
                Section {
                    LabeledContent("Versione", value: appVersion)
                } footer: {
                    Text("Album carte Pokémon · uso personale. I dati restano su questo iPhone; i prezzi arrivano da TCGdex e Pokémon TCG API.")
                }
            }
            .navigationTitle("Impostazioni")
            .toolbar {
                // si apre come foglio dalla Home (icona in alto a destra)
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Fine") { dismiss() }.fontWeight(.semibold)
                }
            }
            .onAppear {
                guard !loadedKeys else { return }
                loadedKeys = true
                gText = store.gkey; cText = store.ckey; tText = store.tcgKey
            }
            .sheet(item: $shareItem) { item in
                ShareSheet(url: item.url) { done in if done && shareIsBackup { store.markBackupDone() } }
                    .presentationDetents([.medium, .large])
            }
            .fileImporter(isPresented: $importing, allowedContentTypes: [.json, .plainText, .data]) { res in
                handleImport(res)
            }
            .alert("Svuotare il catalogo?", isPresented: $confirmReset) {
                Button("Svuota", role: .destructive) { store.resetCatalog() }
                Button("Annulla", role: .cancel) {}
            } message: { Text("Prima viene salvata una copia automatica, e per qualche secondo puoi annullare.") }
            .alert("Cancellare lo storico dei prezzi?", isPresented: $confirmHist) {
                Button("Cancella", role: .destructive) { store.deleteHistory(); store.toast("Storico cancellato") }
                Button("Annulla", role: .cancel) {}
            }
            .alert("Ripristinare la copia automatica?", isPresented: $confirmAuto) {
                Button("Ripristina", role: .destructive) {
                    if let n = store.restoreAutoCopy() { store.toast("Ripristinate \(n) voci") } else { store.toast("Copia non disponibile") }
                }
                Button("Annulla", role: .cancel) {}
            } message: {
                Text("Sostituisce il catalogo attuale con l'ultima copia" + (store.autoCopyDate.map { " del \(fmtDate($0.timeIntervalSince1970 * 1000))" } ?? "") + ".")
            }
        }
    }

    private var appVersion: String {
        let v = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
        let b = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1"
        return "\(v) (\(b))"
    }

    // MARK: Lettura

    private var appearanceSection: some View {
        Section {
            Picker("Aspetto", selection: $appearance) {
                ForEach(Appearance.allCases) { a in Text(a.label).tag(a.rawValue) }
            }
            .pickerStyle(.segmented)
        } header: {
            Text("Aspetto")
        } footer: {
            Text("Automatico segue il tema dell'iPhone. Scuro: \(Theme.darkName) · Chiaro: \(Theme.lightName).")
        }
    }

    private var readingSection: some View {
        Section {
            Picker("Servizio", selection: store.bind(\.provider)) {
                Text("Gemini (gratuito)").tag("gemini")
                Text("Claude").tag("claude")
            }
            if store.cfg.provider == "gemini" {
                SecureField("Chiave Gemini", text: $gText)
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
                    .onChange(of: gText) { _, v in store.setKeys(gemini: v.trimmingCharacters(in: .whitespacesAndNewlines), claude: nil, tcg: nil) }
                if !store.cfg.gmodels.isEmpty {
                    Picker("Modello", selection: store.bind(\.gmodel)) {
                        Text("Automatico" + (store.cfg.gmodels.first.map { " (\($0))" } ?? "")).tag("")
                        ForEach(store.cfg.gmodels, id: \.self) { Text($0).tag($0) }
                    }
                } else if !store.cfg.gmodel.isEmpty {
                    LabeledContent("Modello in uso", value: store.cfg.gmodel)
                }
                Button {
                    Task { await listModels() }
                } label: {
                    HStack { if listing { ProgressView().controlSize(.small) }; Text("Aggiorna l'elenco dei modelli") }
                }
                .disabled(listing || gText.isEmpty)
                LabeledContent("Letture di oggi", value: "\(store.geminiToday)")
            } else {
                SecureField("Chiave Claude", text: $cText)
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
                    .onChange(of: cText) { _, v in store.setKeys(gemini: nil, claude: v.trimmingCharacters(in: .whitespacesAndNewlines), tcg: nil) }
                Picker("Modello", selection: store.bind(\.model)) {
                    Text("Haiku 4.5 (economico)").tag("claude-haiku-4-5")
                    Text("Sonnet 4.5").tag("claude-sonnet-4-5")
                }
                LabeledContent("Token usati", value: "\(fmtN(store.claudeTokensIn)) in · \(fmtN(store.claudeTokensOut)) out")
            }
            Toggle("Conferma i bordi prima della lettura", isOn: store.bind(\.confirmEdges))
            Toggle("Migliora la foto prima della lettura", isOn: store.bind(\.enhance))
            Toggle("Stima la condizione dalla foto", isOn: store.bind(\.condEstimate))
        } header: {
            Text("Lettura delle foto")
        } footer: {
            Text("Le chiavi sono conservate nel Portachiavi di iPhone, non nel catalogo né nei backup.")
        }
    }

    // MARK: Prezzi

    private var priceSection: some View {
        Section {
            Picker("Fonte del prezzo", selection: Binding(get: { store.cfg.priceSource }, set: { v in
                var c = store.cfg; c.priceSource = v; store.cfg = c; store.saveConfig(); store.repriceAll()
            })) {
                Text("Cardmarket (euro)").tag("cm")
                Text("TCGplayer (dollari)").tag("tcg")
            }
            Button {
                Task { await refreshAll() }
            } label: {
                HStack {
                    if refreshing { ProgressView().controlSize(.small) }
                    Text(refreshing ? "Aggiorno \(progress.0) di \(progress.1)…" : "Aggiorna tutti i prezzi")
                }
            }
            .disabled(refreshing || store.catalog.isEmpty)
            if store.fx.r > 0 {
                LabeledContent("Cambio USD → EUR", value: String(format: "%.4f", store.fx.r).replacingOccurrences(of: ".", with: ",") + (store.fx.d.isEmpty ? "" : " (\(store.fx.d))"))
            }
            SecureField("Chiave Pokémon TCG API (facoltativa)", text: $tText)
                .textInputAutocapitalization(.never).autocorrectionDisabled()
                .onChange(of: tText) { _, v in store.setKeys(gemini: nil, claude: nil, tcg: v.trimmingCharacters(in: .whitespacesAndNewlines)) }
        } header: {
            Text("Prezzi")
        } footer: {
            if let m = message { Text(m) }
        }
    }

    private var coefSection: some View {
        Section {
            ForEach(CONDS) { c in
                Stepper(value: Binding(get: { Int((store.condCoef(c.code) * 100).rounded()) }, set: { v in
                    var c2 = store.cfg
                    var m = c2.condCoef ?? COND_DEFAULT
                    m[c.code] = Double(v) / 100
                    c2.condCoef = m
                    store.cfg = c2
                    store.saveConfig()
                }), in: 0...150, step: 5) {
                    HStack { Text(c.code + " · " + c.name); Spacer(); Text("\(Int((store.condCoef(c.code) * 100).rounded()))%").monospacedDigit().foregroundStyle(.secondary) }
                }
            }
            Button("Ripristina i valori standard") {
                var c = store.cfg; c.condCoef = nil; store.cfg = c; store.saveConfig()
            }
        } header: {
            Text("Quanto vale ogni condizione")
        } footer: {
            Text("Percentuale del prezzo Near Mint che applichi a una carta in quella condizione.")
        }
    }

    // MARK: Dati

    private var dataSection: some View {
        Section {
            let b = store.backupInfo()
            Text(store.backupText(b)).font(.footnote).foregroundStyle(.secondary)
            Button("Salva un backup") {
                if let u = store.backupFileURL() { shareIsBackup = true; shareItem = ShareItem(url: u) }
            }
            Button("Ripristina da un backup…") { importing = true }
            Button("Esporta in CSV") {
                if let u = store.csvFileURL() { shareIsBackup = false; shareItem = ShareItem(url: u) }
            }
            if store.autoCopyDate != nil { Button("Ripristina la copia automatica") { confirmAuto = true } }
            Button("Cancella lo storico dei prezzi", role: .destructive) { confirmHist = true }
            Button("Svuota il catalogo", role: .destructive) { confirmReset = true }
        } header: {
            Text("Dati")
        } footer: {
            Text("Il backup ha lo stesso formato della versione web: puoi caricare qui un backup fatto là, e viceversa.")
        }
    }

    // MARK: Connessione

    private var testSection: some View {
        Section {
            Button {
                Task { await runTest() }
            } label: {
                HStack { if testing { ProgressView().controlSize(.small) }; Text("Prova la connessione") }
            }
            .disabled(testing)
            ForEach(testResult, id: \.self) { Text($0).font(.footnote) }
        } footer: {
            Text("Controlla uno per uno i servizi usati dall'app, per capire quale non risponde.")
        }
    }

    // MARK: Azioni

    private func listModels() async {
        listing = true
        defer { listing = false }
        do {
            let list = try await Recognizer.listModels(key: gText)
            var c = store.cfg
            c.gmodels = list
            if !c.gmodel.isEmpty && !list.contains(c.gmodel) { c.gmodel = "" }
            store.cfg = c
            store.saveConfig()
            store.toast("\(list.count) modelli trovati")
        } catch { store.toast(error.localizedDescription) }
    }

    private func refreshAll() async {
        refreshing = true
        message = nil
        progress = (0, 0)
        let failed = await store.refreshAllPrices { d, t in progress = (d, t) }
        refreshing = false
        message = failed > 0 ? "\(failed) carte non raggiungibili: riprova più tardi." : "Prezzi aggiornati."
        store.toast(message ?? "")
    }

    private func handleImport(_ res: Result<URL, Error>) {
        guard case .success(let url) = res else { return }
        let ok = url.startAccessingSecurityScopedResource()
        defer { if ok { url.stopAccessingSecurityScopedResource() } }
        do {
            let d = try Data(contentsOf: url)
            let n = try store.restore(from: d)
            store.toast("Ripristinate \(n) voci")
        } catch {
            store.toast(error.localizedDescription)
        }
    }

    private func runTest() async {
        testing = true
        testResult = []
        defer { testing = false }
        let targets: [(String, String)] = [
            ("TCGdex", "https://api.tcgdex.net/v2/it/sets"),
            ("Pokémon TCG API", "https://api.pokemontcg.io/v2/sets?pageSize=1"),
            ("Cambio valute", "https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR"),
            ("Gemini", "https://generativelanguage.googleapis.com/"),
            ("Anthropic", "https://api.anthropic.com/"),
            ("Nomi dei Pokémon", "https://pokeapi.co/api/v2/pokemon-species/1")
        ]
        for (name, u) in targets {
            guard let url = URL(string: u) else { continue }
            var req = URLRequest(url: url)
            req.timeoutInterval = 10
            do {
                let (_, code) = try await httpSend(req)
                testResult.append("\(name): \(code > 0 ? "raggiungibile" : "nessuna risposta") (\(code))")
            } catch {
                testResult.append("\(name): non raggiungibile")
            }
        }
        await testGemini()
    }

    // come la prova del web: chiamate vere a Gemini con il modello in uso, con i secondi impiegati
    private func testGemini() async {
        let key = store.gkey
        guard !key.isEmpty else { testResult.append("Gemini: nessuna chiave salvata."); return }
        let model = Recognizer.preferredModel(store.cfg.gmodel, store.cfg.gmodels)
        testResult.append("Modello provato: \(model)")
        var parts: [(String, [JSON])] = [("Gemini, solo testo", [["text": "Rispondi solo: ok"]])]
        if let img = Imaging.tinyJPEG() {
            parts.append(("Gemini, immagine minuscola", [["inline_data": ["mime_type": "image/jpeg", "data": img.base64EncodedString()]], ["text": "Descrivi in una parola."]]))
        }
        for (label, p) in parts {
            guard let url = URL(string: "https://generativelanguage.googleapis.com/v1beta/models/" + urlEnc(model) + ":generateContent") else { continue }
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "content-type")
            req.setValue(key, forHTTPHeaderField: "x-goog-api-key")
            req.httpBody = try? JSONSerialization.data(withJSONObject: ["contents": [["role": "user", "parts": p]], "generationConfig": ["maxOutputTokens": 64]] as JSON)
            let t0 = Date()
            func sec() -> String { String(format: " (%.1f s)", Date().timeIntervalSince(t0)) }
            do {
                let (d, code) = try await freshSend(req, timeout: 30)
                let msg = (200...299).contains(code) ? "" : jstr(((parseJSON(d) as? JSON)?["error"] as? JSON)?["message"])
                testResult.append("\(label): HTTP \(code)\(sec())" + (msg.isEmpty ? "" : " - " + String(msg.prefix(160))))
            } catch {
                testResult.append("\(label): ERRORE \(error.localizedDescription)\(sec())")
            }
        }
    }
}
