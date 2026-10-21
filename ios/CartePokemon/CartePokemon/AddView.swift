// Pannello "Aggiungi carte" (ridisegno ottobre 2026): tre scelte (Scansione rapida, Da foto, Cerca e aggiungi),
// la coda delle foto da leggere con "Riprendi" e il servizio di riconoscimento in uso.

import SwiftUI
import PhotosUI

struct AddView: View {
    @Environment(AppStore.self) private var store
    @Environment(ScanQueue.self) private var queue
    @Environment(\.dismiss) private var dismiss
    @State private var showCamera = false
    @State private var showReview = false
    @State private var picks: [PhotosPickerItem] = []
    @State private var importing = 0
    @State private var contentH: CGFloat = 380   // altezza del contenuto: il foglio si ferma lì, senza vuoto sotto

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    HStack {
                        Text("Aggiungi carte").font(.system(size: 30, weight: .heavy))
                        Spacer()
                        Button { dismiss() } label: { CircleIcon(systemName: "xmark") }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Chiudi")
                    }
                    .padding(.top, 22)
                    .padding(.bottom, 10)
                    if !store.hasRecognitionKey {
                        Label("Per leggere le foto serve una chiave: la inserisci in Impostazioni.", systemImage: "key.fill")
                            .font(.footnote).foregroundStyle(.orange)
                    }
                    Button { showCamera = true } label: {
                        AddOptionRow(icon: "viewfinder", title: "Scansione rapida",
                                     text: "Fotocamera sempre aperta, una carta dopo l'altra", primary: true)
                    }
                    .buttonStyle(.plain)
                    PhotosPicker(selection: $picks, maxSelectionCount: 20, matching: .images) {
                        AddOptionRow(icon: "photo.on.rectangle", title: "Da foto",
                                     text: importing > 0 ? "Preparo \(importing) foto…" : "Scegli una o più foto dalla galleria")
                    }
                    .buttonStyle(.plain)
                    NavigationLink {
                        ManualSearchPage { dismiss() }
                    } label: {
                        AddOptionRow(icon: "magnifyingglass", title: "Cerca e aggiungi", text: "Per nome o numero, senza foto")
                    }
                    .buttonStyle(.plain)
                    if !queue.jobs.isEmpty { queueRow }
                    Text("Riconoscimento con \(store.cfg.provider == "gemini" ? "Gemini" : "Claude") · cambia in Impostazioni")
                        .font(.footnote).foregroundStyle(Theme.sheetText)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 6)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 28)
                .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { contentH = $0 }
            }
            .background(Theme.sheetBg)
            .toolbar(.hidden, for: .navigationBar)
            .onChange(of: picks) { _, items in
                guard !items.isEmpty else { return }
                let list = items
                picks = []
                Task { await addFromLibrary(list) }
            }
            .fullScreenCover(isPresented: $showCamera) {
                CameraScreen().environment(store).environment(queue)
            }
            .sheet(isPresented: $showReview) {
                ReviewListView().environment(store).environment(queue)
            }
            // bordi da confermare per le foto scelte da qui (con la fotocamera aperta ci pensa lei)
            .fullScreenCover(item: Binding(get: { showCamera ? nil : queue.pendingEdges.first }, set: { _ in })) { p in
                EdgeEditView(photo: p, remaining: queue.pendingEdges.count) { quad in
                    Task { await queue.acceptEdges(p.id, quad: quad) }
                } onDiscard: {
                    queue.discardEdges(p.id)
                }
                .id(p.id)
            }
        }
        .presentationDetents([.height(max(contentH + 30, 320)), .large])
        .presentationBackground(Theme.sheetBg)
    }

    private var queueRow: some View {
        HStack(spacing: 10) {
            if queue.activeCount > 0 { ProgressView().controlSize(.small) } else { Circle().fill(Theme.accentFill).frame(width: 8, height: 8) }
            Text(queue.summary).font(.subheadline).lineLimit(2)
            Spacer(minLength: 6)
            Button(queue.reviewCount > 0 ? "Controlla" : "Riprendi") { showReview = true }
                .font(.subheadline.weight(.bold))
                .padding(.horizontal, 12).padding(.vertical, 7)
                .foregroundStyle(.black)
                .background(Theme.accentFill, in: Capsule())
                .buttonStyle(.plain)
        }
        .panel(padding: 12, radius: 16, fill: Theme.sheetPanel)
    }

    private func addFromLibrary(_ items: [PhotosPickerItem]) async {
        importing = items.count
        defer { importing = 0 }
        for it in items {
            if let d = try? await it.loadTransferable(type: Data.self) {
                await queue.submit(photo: d)
            }
            importing = max(0, importing - 1)
        }
    }
}

/// Una delle tre scelte del pannello "Aggiungi carte".
struct AddOptionRow: View {
    let icon: String
    let title: String
    let text: String
    var primary = false

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.title3.weight(.semibold))
                .frame(width: 44, height: 44)
                .foregroundStyle(primary ? Color.black : Color.primary)
                .background(primary ? Theme.accentFill : Theme.sheetPanelHi, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.headline).foregroundStyle(.primary)
                Text(text).font(.subheadline).foregroundStyle(Theme.sheetText).lineLimit(2)
            }
            Spacer(minLength: 4)
            Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Color.primary.opacity(0.45))
        }
        .panel(padding: 14, radius: 18, highlight: primary, fill: Theme.sheetPanel)
        .overlay {
            if primary { RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Theme.accentSoft).allowsHitTesting(false) }
            else { RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Color.primary.opacity(0.10), lineWidth: 1).allowsHitTesting(false) }
        }
        .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}

/// "Cerca e aggiungi": la ricerca a mano in una pagina a sé.
struct ManualSearchPage: View {
    let onAdded: () -> Void
    var body: some View {
        Form {
            ManualSearchSections(initialName: "", initialNum: "", initialTot: "", initialLang: "IT", onAdded: onAdded)
        }
        .navigationTitle("Cerca e aggiungi")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Ricerca a mano

struct ManualSearchSections: View {
    @Environment(AppStore.self) private var store
    let onAdded: () -> Void
    /// Chiave della voce aggiunta e carta scelta (per tenere la foto di un lavoro della coda).
    var onAddedEntry: ((String, Candidate) -> Void)? = nil

    @State private var name: String
    @State private var num: String
    @State private var tot: String
    @State private var lang: String
    @State private var results: [Candidate] = []
    @State private var searching = false
    @State private var message: String?
    @State private var editing: Candidate?
    @State private var source = ""

    init(initialName: String, initialNum: String, initialTot: String, initialLang: String,
         onAddedEntry: ((String, Candidate) -> Void)? = nil, onAdded: @escaping () -> Void) {
        self.onAddedEntry = onAddedEntry
        _name = State(initialValue: initialName)
        _num = State(initialValue: initialNum)
        _tot = State(initialValue: initialTot)
        _lang = State(initialValue: initialLang)
        self.onAdded = onAdded
    }

    private let codes = ["IT": "it", "EN": "en", "JP": "ja"]

    var body: some View {
        Section("Cerca a mano") {
            TextField("Nome della carta", text: $name)
                .textInputAutocapitalization(.words)
                .submitLabel(.search)
                .onSubmit { Task { await search() } }
            HStack {
                TextField("Numero", text: $num).keyboardType(.numbersAndPunctuation)
                Divider()
                TextField("Totale del set (facoltativo)", text: $tot).keyboardType(.numberPad)
            }
            Picker("Lingua", selection: $lang) {
                Text("Italiano").tag("IT")
                Text("Inglese").tag("EN")
                Text("Giapponese").tag("JP")
            }
            Button {
                Task { await search() }
            } label: {
                HStack {
                    if searching { ProgressView().controlSize(.small) }
                    Text(searching ? "Cerco…" : "Cerca")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.glass)
            .disabled(searching || (name.trimmingCharacters(in: .whitespaces).isEmpty && num.trimmingCharacters(in: .whitespaces).isEmpty))
            .sheet(item: $editing) { c in
                CandidateEditor(cand: c, initialLang: LANGMAP[c.srcLang] ?? lang, initialVariant: nil, initialCond: "NM", note: nil) { l, v, cd, q, pm in
                    store.pushUndo()
                    let k = store.addEntry(from: c, lang: l, variant: v, cond: cd, qty: q, pm: pm)
                    onAddedEntry?(k, c)
                    store.showUndo("Aggiunta: \(c.name)")
                    onAdded()
                }
                .environment(store)
            }
        }
        if let m = message {
            Section { Text(m).font(.subheadline).foregroundStyle(.secondary) }
        }
        if !results.isEmpty {
            Section("Risultati" + (source.isEmpty ? "" : " · " + source)) {
                ForEach(results) { c in
                    Button { editing = c } label: { CandidateRow(c: c) }
                        .tint(.primary)
                }
            }
        }
    }

    private func search() async {
        let n = cleanName(name), nm = cleanNum(num)
        let t = tot.filter { $0.isNumber }
        if n.isEmpty && nm.isEmpty { return }
        searching = true
        message = nil
        results = []
        let o = await store.searchCards(name: n, num: nm, tot: t, lang: codes[lang] ?? "it")
        searching = false
        source = o.source
        results = o.found
        if o.weak && !o.found.isEmpty {
            message = "Nessuna carta con questo nome e questo numero: ecco le più vicine. Controlla nome, numero e totale."
        }
        if o.found.isEmpty {
            if let e = o.errors.first, o.errors.count >= 2 || (e as? AppError)?.net == true {
                message = e.localizedDescription
            } else {
                message = "Nessuna carta trovata. Prova con meno parole o senza il totale del set."
            }
        }
    }
}

struct CandidateRow: View {
    @Environment(AppStore.self) private var store
    let c: Candidate
    var body: some View {
        HStack(spacing: 12) {
            CardThumb(url: c.imageSmall, width: 46, name: c.name, number: c.number)
            VStack(alignment: .leading, spacing: 3) {
                Text(c.name).font(.headline).lineLimit(1)
                Text(setLine(c.setName, c.number, c.printedTotal))
                    .font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                HStack(spacing: 5) {
                    if !c.rarity.isEmpty { Chip(c.rarity, tint: .purple) }
                    if c.src == "tcgdex" { Chip(c.srcLang.uppercased()) }
                }
            }
            Spacer()
            if let p = store.priceFor(c, store.defaultVariant(c)) { Text(eur(p)).monospacedDigit().foregroundStyle(.secondary) }
        }
    }
}

// MARK: - Scelta di lingua, variante, condizione e quantità

struct CandidateEditor: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    let cand: Candidate
    let note: String?
    let onAdd: (String, String, String, Int, Double?) -> Void

    @State private var lang: String
    @State private var variant: String
    @State private var cond: String
    @State private var qty = 1
    @State private var manual = ""

    init(cand: Candidate, initialLang: String, initialVariant: String?, initialCond: String, note: String?,
         onAdd: @escaping (String, String, String, Int, Double?) -> Void) {
        self.cand = cand
        self.note = note
        self.onAdd = onAdd
        _lang = State(initialValue: initialLang)
        _variant = State(initialValue: initialVariant ?? "")
        _cond = State(initialValue: initialCond)
    }

    private var variants: [String] { variantList(cand.vars) }
    private var effectiveVariant: String { variant.isEmpty ? store.defaultVariant(cand) : variant }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: 14) {
                        CardThumb(url: hiImg(cand.imageSmall), width: 110, radius: 8, name: cand.name, number: cand.number)
                        VStack(alignment: .leading, spacing: 6) {
                            Text(cand.name).font(.title3.weight(.bold))
                            Text(cand.setName).font(.subheadline).foregroundStyle(.secondary)
                            Text(numLine(cand.number, cand.printedTotal)).font(.subheadline).foregroundStyle(.secondary)
                            if !cand.rarity.isEmpty { Chip(cand.rarity, tint: .purple) }
                        }
                    }
                }
                Section {
                    Picker("Lingua", selection: $lang) { ForEach(LANGS, id: \.self) { Text($0).tag($0) } }
                    Picker("Variante", selection: Binding(get: { effectiveVariant }, set: { variant = $0 })) {
                        ForEach(variants, id: \.self) { Text($0).tag($0) }
                    }
                    Picker("Condizione", selection: $cond) {
                        ForEach(CONDS) { Text($0.code + " · " + $0.name).tag($0.code) }
                    }
                    Stepper(value: $qty, in: 1...999) {
                        HStack { Text("Quantità"); Spacer(); Text("\(qty)").foregroundStyle(.secondary).monospacedDigit() }
                    }
                    if let n = note, !n.isEmpty {
                        Label("Condizione stimata dalla foto: \(n)", systemImage: "sparkles").font(.footnote).foregroundStyle(.secondary)
                    }
                }
                Section("Prezzo") {
                    if let p = store.priceFor(cand, effectiveVariant) {
                        LabeledContent("Mercato (Near Mint)") { Text(eur(p)).monospacedDigit() }
                        if cond != "NM" { LabeledContent("Con la condizione \(cond)") { Text(eur(p * store.condCoef(cond))).monospacedDigit() } }
                    } else {
                        Text("Nessun prezzo disponibile: puoi inserire il tuo.").font(.subheadline).foregroundStyle(.secondary)
                    }
                    HStack {
                        Text("Il tuo prezzo")
                        Spacer()
                        TextField("facoltativo", text: $manual).keyboardType(.decimalPad).multilineTextAlignment(.trailing).frame(maxWidth: 140)
                        Text("€").foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Aggiungi")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annulla") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Aggiungi") {
                        let pm = parsePrice(manual)
                        onAdd(lang, effectiveVariant, cond, qty, pm)
                        dismiss()
                    }
                    .buttonStyle(.glassProminent)
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Fine") { UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil) }
                }
            }
        }
        .presentationDetents([.large])
    }
}

// MARK: - Coda: carte da controllare

/// Intervallo per il conto alla rovescia: mai rovesciato (un ClosedRange con fine prima dell'inizio manda in crash).
func countdownRange(_ until: Date) -> ClosedRange<Date> {
    let now = Date()
    return now...max(now, until)
}

struct ReviewListView: View {
    @Environment(AppStore.self) private var store
    @Environment(ScanQueue.self) private var queue
    @Environment(\.dismiss) private var dismiss
    @State private var picking: ScanJob?
    @State private var manualFor: ScanJob?

    var body: some View {
        NavigationStack {
            List {
                if queue.jobs.isEmpty {
                    ContentUnavailableView("Coda vuota", systemImage: "tray", description: Text("Le carte fotografate compaiono qui mentre vengono lette."))
                        .listRowBackground(Color.clear)
                }
                if let why = queue.stopReason {
                    Section {
                        VStack(alignment: .leading, spacing: 10) {
                            Label(why, systemImage: "stop.circle")
                                .font(.subheadline).foregroundStyle(.orange)
                            Button("Riprendi", systemImage: "play.fill") { queue.resumeQueue() }
                                .buttonStyle(.glassProminent).controlSize(.small)
                        }
                    }
                } else if let until = queue.pauseUntil, until > Date() {
                    Section {
                        Label {
                            Text("Limite al minuto del servizio gratuito: riprendo da solo tra \(Text(timerInterval: countdownRange(until), countsDown: true)).")
                        } icon: { Image(systemName: "pause.circle") }
                            .font(.subheadline).foregroundStyle(.orange)
                    }
                }
                ForEach(queue.jobs) { j in
                    row(j)
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) { queue.drop(j.id) } label: { Label("Scarta", systemImage: "trash") }
                        }
                }
            }
            .navigationTitle("Coda")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if queue.addedCount > 0 { Button("Togli le aggiunte") { queue.clearAdded() } }
                }
                ToolbarItem(placement: .confirmationAction) { Button("Fine") { dismiss() } }
            }
            .sheet(item: $picking) { j in PickSheet(job: j).environment(store).environment(queue) }
            .sheet(item: $manualFor) { j in ManualForJob(job: j).environment(store).environment(queue) }
        }
    }

    @ViewBuilder
    private func row(_ j: ScanJob) -> some View {
        HStack(spacing: 12) {
            if let img = queue.thumb(j.id) {
                Image(uiImage: img).resizable().scaledToFit().frame(width: 46, height: 46 * 88 / 63).clipShape(RoundedRectangle(cornerRadius: 5))
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(title(j)).font(.headline).lineLimit(1)
                if queue.pausedJob == j.id, let until = queue.pauseUntil, until > Date() {
                    Text("In pausa, riprendo tra \(Text(timerInterval: countdownRange(until), countsDown: true))")
                        .font(.footnote).foregroundStyle(.secondary).monospacedDigit()
                } else {
                    Text(detail(j)).font(.footnote).foregroundStyle(color(j)).lineLimit(3)
                }
            }
            Spacer(minLength: 6)
            switch j.state {
            case .waiting where queue.stopReason != nil:
                Image(systemName: "pause.circle").foregroundStyle(.orange).font(.title3)
            case .waiting, .reading, .searching: ProgressView().controlSize(.small)
            case .review:
                Button("Scegli") { picking = j }.buttonStyle(.glassProminent).controlSize(.small)
            case .failed:
                Menu {
                    Button("Riprova", systemImage: "arrow.clockwise") { queue.retry(j.id) }
                    Button("Cerca a mano", systemImage: "magnifyingglass") { manualFor = j }
                    Button("Scarta", systemImage: "trash", role: .destructive) { queue.drop(j.id) }
                } label: { Image(systemName: "ellipsis.circle").font(.title3) }
            case .added:
                Image(systemName: "checkmark.circle.fill").foregroundStyle(.green).font(.title3)
            }
        }
        .padding(.vertical, 2)
    }

    private func title(_ j: ScanJob) -> String {
        if j.state == .added, let n = j.addedName { return n }
        let r = j.rec
        let n = r?.name_printed ?? r?.name_en ?? ""
        return n.isEmpty ? "Carta fotografata" : n
    }

    private func detail(_ j: ScanJob) -> String {
        switch j.state {
        case .waiting: return j.message.isEmpty ? "In attesa" : j.message
        case .reading: return "Leggo la carta…"
        case .searching: return "Cerco nel catalogo…"
        case .review: return "\(j.cands.count) possibili carte: scegli quella giusta."
        case .added: return "Aggiunta al catalogo."
        case .failed: return j.message
        }
    }

    private func color(_ j: ScanJob) -> Color {
        switch j.state {
        case .failed: return .red
        case .added: return Theme.up
        default: return .secondary
        }
    }
}

struct PickSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(ScanQueue.self) private var queue
    @Environment(\.dismiss) private var dismiss
    let job: ScanJob
    @State private var editing: Candidate?

    private func readLine(_ r: Rec) -> String {
        let nome: String = r.name_printed ?? r.name_en ?? ""
        let num: String = numLine(r.number ?? "", r.printed_total ?? "")
        let parts: [String] = [nome, num]
        return parts.filter { !$0.isEmpty }.joined(separator: " · ")
    }

    var body: some View {
        NavigationStack {
            List {
                if let r = job.rec {
                    Section("Letto dalla foto") {
                        Text(readLine(r)).font(.subheadline)
                    }
                }
                Section("Quale carta è?") {
                    ForEach(job.cands) { c in
                        Button { editing = c } label: { CandidateRow(c: c) }.tint(.primary)
                    }
                }
            }
            .navigationTitle("Scegli la carta")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarLeading) { Button("Chiudi") { dismiss() } } }
            .sheet(item: $editing) { c in
                let ce = store.condEstimate(job.rec)
                CandidateEditor(cand: c, initialLang: LANGMAP[c.srcLang] ?? LANGMAP[job.rec?.language ?? ""] ?? "EN",
                                initialVariant: store.variantFromHint(job.rec?.variant_hint).flatMap { variantList(c.vars).contains($0) ? $0 : nil },
                                initialCond: ce?.code ?? "NM", note: ce?.notes) { l, v, cd, q, pm in
                    queue.confirm(job.id, c, lang: l, variant: v, cond: cd, qty: q, pm: pm)
                    dismiss()
                }
                .environment(store)
            }
        }
    }
}

struct ManualForJob: View {
    @Environment(AppStore.self) private var store
    @Environment(ScanQueue.self) private var queue
    @Environment(\.dismiss) private var dismiss
    let job: ScanJob

    var body: some View {
        NavigationStack {
            Form {
                let r = job.rec
                ManualSearchSections(initialName: r?.name_printed ?? r?.name_en ?? "",
                                     initialNum: cleanNum(r?.number ?? ""),
                                     initialTot: (r?.printed_total ?? "").filter { $0.isNumber },
                                     initialLang: LANGMAP[r?.language ?? ""] ?? "IT",
                                     onAddedEntry: { k, c in queue.keepPhoto(job.id, key: k, c) }) {
                    queue.drop(job.id)
                    dismiss()
                }
            }
            .navigationTitle("Cerca a mano")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarLeading) { Button("Chiudi") { dismiss() } } }
        }
    }
}
