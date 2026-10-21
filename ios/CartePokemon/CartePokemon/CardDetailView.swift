// Scheda di una carta (ridisegno ottobre 2026): carta grande che si inclina col dito con riflesso olografico (20/10),
// prezzo sotto la carta, lingua, varianti con il loro prezzo e condizione a pillole, quantità, prezzo mio,
// storico del prezzo con variazione, dettagli e note a pannelli.

import SwiftUI

struct CardDetailView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var currentKey: String
    @State private var manualText = ""
    @State private var noteText = ""
    @State private var refreshing = false
    @State private var pending: PendingEdit?
    @State private var confirmDelete = false
    @State private var loaded = false
    @State private var photoFlow: PhotoFlow?
    @State private var photoBusy = false
    @State private var zoom = false        // immagine a tutto schermo
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    enum PhotoFlow: Identifiable {
        case shoot
        case crop(PendingPhoto)
        var id: String {
            switch self {
            case .shoot: return "shoot"
            case .crop(let p): return p.id.uuidString
            }
        }
    }
    @FocusState private var priceFocus: Bool

    struct PendingEdit: Identifiable {
        let id = UUID()
        var lang: String?
        var variant: String?
        var cond: String?
        var existingQty: Int
    }

    init(key: String) {
        _currentKey = State(initialValue: key)
    }

    var body: some View {
        Group {
            if let e = store.entry(currentKey) {
                content(e)
            } else {
                ContentUnavailableView("Carta non trovata", systemImage: "questionmark.square.dashed")
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .alert("Esiste già una carta uguale", isPresented: Binding(get: { pending != nil }, set: { if !$0 { pending = nil } }), presenting: pending) { p in
            Button("Unisci le quantità") {
                if case .done(let nk) = store.applyEdit(key: currentKey, lang: p.lang, variant: p.variant, cond: p.cond, merge: true) { currentKey = nk }
            }
            Button("Annulla", role: .cancel) {}
        } message: { p in
            Text("Nel catalogo ne hai già \(p.existingQty). Vuoi sommare le quantità in un'unica voce?")
        }
        .confirmationDialog("Eliminare questa carta?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Elimina", role: .destructive) {
                store.pushUndo()
                let name = store.entry(currentKey)?.name ?? "Carta"
                store.delete(keys: [currentKey])
                store.showUndo("Eliminata: \(name)")
                dismiss()
            }
        }
        .onAppear {
            guard !loaded, let e = store.entry(currentKey) else { return }
            loaded = true
            noteText = e.note ?? ""
            manualText = e.priceManual.map { String(format: "%.2f", $0).replacingOccurrences(of: ".", with: ",") } ?? ""
        }
        .onDisappear { saveNote(); applyManual(silent: true) }
        .fullScreenCover(item: $photoFlow) { f in
            switch f {
            case .shoot:
                PhotoCaptureFlow { data, q in
                    photoFlow = nil
                    savePhoto(data, q, shrink: true)
                } onCancel: { photoFlow = nil }
            case .crop(let p):
                EdgeEditView(photo: p, remaining: 1, discardLabel: "Annulla") { q in
                    photoFlow = nil
                    savePhoto(p.data, q, shrink: false)
                } onDiscard: { photoFlow = nil }
            }
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Fine") { priceFocus = false }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button { Task { await refresh() } } label: { Label("Aggiorna il prezzo", systemImage: "arrow.clockwise") }
                        .disabled(refreshing)
                    if store.entry(currentKey)?.priceManual != nil {
                        Button { manualText = ""; store.update(currentKey) { $0.priceManual = nil } } label: {
                            Label("Torna al prezzo di mercato", systemImage: "chart.line.uptrend.xyaxis")
                        }
                    }
                    Button(role: .destructive) { confirmDelete = true } label: { Label("Elimina carta", systemImage: "trash") }
                } label: { Image(systemName: "ellipsis") }
                .accessibilityLabel("Altre azioni")
            }
        }
    }

    @ViewBuilder
    private func content(_ e: Entry) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                hero(e)
                langSection(e)
                variantSection(e)
                condSection(e)
                mineSection(e)
                historySection(e)
                detailsSection(e)
                noteSection
                Button(role: .destructive) { confirmDelete = true } label: {
                    Text("Elimina carta").frame(maxWidth: .infinity)
                }
                .buttonStyle(.glass)
                .tint(.red)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 20)
        }
        .tabBarSpace()
        .background(Theme.bg)
    }

    // MARK: - Testata

    private func imgNote(_ e: Entry) -> String? {
        let u = previewURL(e)
        if u.hasPrefix(CardPhotos.scheme) { return "La tua foto" }
        if e.imgFrom == "EN" && e.lang != "EN" && cardImageURL(u) != nil { return "Immagine della versione inglese" }
        return nil
    }

    // foto mia: solo per carte senza immagine ufficiale nella loro lingua
    private func photoMenu(_ e: Entry) -> some View {
        let has = CardPhotos.exists(e.photo)
        let own = showsOwnPhoto(e)
        return Menu {
            if has && own && cardImageURL(e.img) != nil {
                Button(webImageLabel(e), systemImage: "globe") { store.setPhotoPref(key: currentKey, "web") }
            }
            if has && !own {
                Button("Usa la mia foto", systemImage: "person.crop.square") { store.setPhotoPref(key: currentKey, "own") }
            }
            if CardPhotos.hasOriginal(e.photo) {
                Button("Ritaglia la foto", systemImage: "crop") { Task { await openCrop(e) } }
            }
            Button(has ? "Riscatta la foto" : "Scatta una foto", systemImage: "camera") { photoFlow = .shoot }
            if has {
                Button("Elimina la foto", systemImage: "trash", role: .destructive) { store.removePhoto(key: currentKey) }
            }
        } label: {
            HStack(spacing: 5) {
                if photoBusy { ProgressView().controlSize(.mini) } else { Image(systemName: "camera") }
                Text(has ? "Foto" : "Aggiungi foto")
            }
            .font(.caption.weight(.semibold))
            .frame(width: 128)
        }
        .buttonStyle(.glass)
        .controlSize(.small)
        .disabled(photoBusy)
    }

    private func openCrop(_ e: Entry) async {
        guard let id = e.photo, let data = try? Data(contentsOf: CardPhotos.origURL(id)) else { return }
        let prep: PreparedPhoto? = await Task.detached(priority: .userInitiated) { Imaging.prepare(data) }.value
        guard let p = prep, let pp = CardPhotos.editable(data, prepared: p, quad: CardPhotos.pointsQuad(e.photoQuad)) else {
            store.toast("Foto non leggibile")
            return
        }
        photoFlow = .crop(pp)
    }

    private func savePhoto(_ data: Data, _ q: [CGPoint], shrink: Bool) {
        let key = currentKey
        photoBusy = true
        Task {
            let ok = await store.replacePhoto(key: key, original: data, quad: q, shrink: shrink)
            photoBusy = false
            if !ok { store.toast("Foto non salvata") }
        }
    }

    private func hero(_ e: Entry) -> some View {
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
                    if e.qty > 1 { Text("×\(e.qty) = " + eur(u * Double(e.qty))).font(.caption.weight(.semibold)) }
                } else {
                    Text("Senza prezzo").font(.headline).foregroundStyle(.secondary)
                }
                Text(sourceLine(e, info)).font(.caption2).foregroundStyle(.secondary).multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func sourceLine(_ e: Entry, _ info: PriceInfo?) -> String {
        var p: [String] = []
        if e.priceManual != nil { p.append("Prezzo mio") }
        else if let i = info { p.append(i.src == "cm" ? "Cardmarket" : "TCGplayer" + (i.approx ? " circa" : "")) }
        p.append(shortVariant(e.variant))
        p.append(e.cond)
        return p.joined(separator: " · ")
    }

    private func label(_ s: String) -> some View {
        Text(s.uppercased()).font(.caption.weight(.bold)).foregroundStyle(.secondary).tracking(0.6)
    }

    // MARK: - Lingua a pillole (come variante e condizione)

    private func langSection(_ e: Entry) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                label("Lingua")
                Spacer()
                Text(langLong(e.lang)).font(.caption).foregroundStyle(.secondary)
            }
            HStack(spacing: 6) {
                ForEach(LANGS, id: \.self) { l in
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

    private func variantSection(_ e: Entry) -> some View {
        let vars = variantList(e.pr?.vars, current: e.variant)
        return VStack(alignment: .leading, spacing: 8) {
            label("Variante")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(vars, id: \.self) { v in
                        let p = store.priceInfo(e.pr, v)?.v
                        let sel = e.variant == v
                        Button { if !sel { edit(variant: v) } } label: {
                            HStack(spacing: 4) {
                                Text(shortVariant(v)).font(.subheadline.weight(.semibold))
                                if let p = p { Text(eur(p)).font(.caption).opacity(0.8) }
                            }
                            .padding(.horizontal, 12).padding(.vertical, 9)
                            .foregroundStyle(sel ? Color.black : Color.primary)
                            .background(sel ? Theme.accentFill : Color.clear, in: Capsule())
                            .contentShape(Capsule())
                        }
                        .buttonStyle(.plain)
                        .accessibilityAddTraits(sel ? .isSelected : [])
                    }
                }
                .padding(4)
            }
            .background(Theme.panel, in: Capsule())
        }
    }

    // MARK: - Condizione

    private func condSection(_ e: Entry) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                label("Condizione")
                Spacer()
                Text(CONDS.first { $0.code == e.cond }?.name ?? e.cond).font(.caption).foregroundStyle(.secondary)
            }
            HStack(spacing: 6) {
                ForEach(CONDS) { c in
                    let sel = e.cond == c.code
                    Button { if !sel { edit(cond: c.code) } } label: {
                        Text(c.code)
                            .font(.caption.weight(.bold))
                            .frame(maxWidth: .infinity, minHeight: 36)
                            .foregroundStyle(sel ? Color.black : Color.primary)
                            .background(sel ? Theme.accentFill : Theme.panel, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                            .contentShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(c.name)
                    .accessibilityAddTraits(sel ? .isSelected : [])
                }
            }
            if e.condEst == 1, let n = e.condNote, !n.isEmpty {
                Label("Stimata dalla foto: \(n)", systemImage: "sparkles").font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Il tuo esemplare: lingua, quantità, prezzo mio

    private func mineSection(_ e: Entry) -> some View {
        VStack(spacing: 0) {
            HStack {
                Text("Quantità")
                Spacer()
                Button { store.update(currentKey) { $0.qty = max(1, $0.qty - 1) } } label: { CircleIcon(systemName: "minus").scaleEffect(0.8) }
                    .buttonStyle(.plain).disabled(e.qty <= 1).accessibilityLabel("Una in meno")
                Text("\(e.qty)").font(.headline).monospacedDigit().frame(minWidth: 28)
                Button { store.update(currentKey) { $0.qty = min(999, $0.qty + 1) } } label: { CircleIcon(systemName: "plus").scaleEffect(0.8) }
                    .buttonStyle(.plain).accessibilityLabel("Una in più")
            }
            .padding(.vertical, 6)
            Divider()
            HStack {
                Text("Prezzo mio")
                Spacer()
                TextField("non impostato", text: $manualText)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 130)
                    .focused($priceFocus)
                    .onChange(of: priceFocus) { _, f in if !f { applyManual() } }
                Text("€").foregroundStyle(.secondary)
            }
            .padding(.vertical, 12)
            if let i = store.priceInfo(e.pr, e.variant) {
                Divider()
                HStack {
                    Text("Mercato (Near Mint)").foregroundStyle(.secondary)
                    Spacer()
                    Text(eur(i.v) + (i.approx ? " circa" : "")).monospacedDigit().foregroundStyle(.secondary)
                }
                .font(.subheadline)
                .padding(.vertical, 10)
            }
            if e.priceManual == nil, e.price != nil, e.cond != "NM" {
                HStack {
                    Text("Con la condizione \(e.cond)").foregroundStyle(.secondary)
                    Spacer()
                    Text(eur(store.unit(e))).monospacedDigit().foregroundStyle(.secondary)
                }
                .font(.subheadline)
                .padding(.bottom, 10)
            }
        }
        .padding(.horizontal, 14)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    // MARK: - Storico del prezzo

    private func historySection(_ e: Entry) -> some View {
        let pts = historyPoints(e)
        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Storico prezzo").font(.headline)
                Spacer()
                if pts.count >= 2, let a = pts.first, let b = pts.last {
                    let d = b.value - a.value
                    Text((d >= 0 ? "▲ " : "▼ ") + signedEur(d) + " in \(max(1, b.day - a.day)) gg")
                        .font(.caption.weight(.bold)).foregroundStyle(d >= 0 ? Theme.up : Theme.down)
                }
            }
            if pts.count >= 2 {
                AreaValueChart(points: pts)
            } else {
                Text("Lo storico si riempie con gli aggiornamenti dei prezzi.").font(.footnote).foregroundStyle(.secondary)
            }
            HStack {
                if let t = e.priceT { Text("Aggiornato il \(fmtDate(t))").font(.caption2).foregroundStyle(.secondary) }
                Spacer()
                Button {
                    Task { await refresh() }
                } label: {
                    HStack(spacing: 6) {
                        if refreshing { ProgressView().controlSize(.mini) }
                        Text(refreshing ? "Aggiorno…" : "Aggiorna il prezzo")
                    }
                    .font(.caption.weight(.semibold))
                }
                .disabled(refreshing)
            }
        }
        .panel()
    }

    // MARK: - Dettagli e note

    private func detailsSection(_ e: Entry) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            if let d = e.dex, !d.isEmpty {
                ForEach(Array(Set(d)).sorted(), id: \.self) { n in
                    NavigationLink(value: DexRoute(kind: "pokemon", n: n, name: store.dexName(n))) {
                        detailRow(store.dexName(n).isEmpty ? "Pokémon" : store.dexName(n), "#\(n)", link: true) { SpriteView(n: n, size: 30) }
                    }
                    .buttonStyle(.plain)
                    Divider()
                }
            }
            NavigationLink(value: SetRoute(key: store.groupKey(e))) {
                detailRow("Set", e.setName, link: true) { EmptyView() }
            }
            .buttonStyle(.plain)
            if let ill = e.ill, !ill.isEmpty {
                Divider()
                NavigationLink(value: DexRoute(kind: "art", name: ill)) { detailRow("Artista", ill, link: true) { EmptyView() } }
                    .buttonStyle(.plain)
            }
            if let c = e.cat, !c.isEmpty { Divider(); detailRow("Categoria", c == "Pokemon" ? "Pokémon" : c) { EmptyView() } }
            if let t = e.tt, !t.isEmpty { Divider(); detailRow("Tipo", t) { EmptyView() } }
            Divider()
            detailRow("Aggiunta il", fmtDate(e.added)) { EmptyView() }
        }
        .padding(.horizontal, 14)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private func detailRow<L: View>(_ title: String, _ value: String, link: Bool = false, @ViewBuilder lead: () -> L) -> some View {
        HStack(spacing: 10) {
            lead()
            Text(title)
            Spacer(minLength: 8)
            Text(value).foregroundStyle(.secondary).lineLimit(1)
            if link { Image(systemName: "chevron.right").font(.caption.weight(.semibold)).foregroundStyle(.tertiary) }
        }
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }

    private var noteSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            label("Note")
            TextField("Una nota su questa carta", text: $noteText, axis: .vertical)
                .lineLimit(1...5)
                .onSubmit { saveNote() }
                .panel(padding: 14, radius: 16)
        }
    }

    private func historyPoints(_ e: Entry) -> [PricePoint] {
        (store.hist[store.histKey(e)] ?? []).compactMap { q in q.count >= 2 ? PricePoint(day: q[0], value: Double(q[1]) / 100) : nil }
    }

    // MARK: - Azioni

    private func edit(lang: String? = nil, variant: String? = nil, cond: String? = nil) {
        switch store.applyEdit(key: currentKey, lang: lang, variant: variant, cond: cond) {
        case .done(let nk): currentKey = nk
        case .conflict(let q): pending = PendingEdit(lang: lang, variant: variant, cond: cond, existingQty: q)
        }
    }

    private func applyManual(silent: Bool = false) {
        guard let e = store.entry(currentKey) else { return }
        let t = manualText.trimmingCharacters(in: .whitespaces)
        if t.isEmpty {
            if e.priceManual != nil { store.update(currentKey) { $0.priceManual = nil } }
            return
        }
        if let v = parsePrice(t), v >= 0 {
            if e.priceManual != v {
                store.update(currentKey) { $0.priceManual = v }
                if !silent { store.toast("Prezzo salvato") }
            }
        } else if !silent {
            store.toast("Prezzo non valido")
        }
    }

    private func saveNote() {
        guard let e = store.entry(currentKey) else { return }
        let t = noteText.trimmingCharacters(in: .whitespacesAndNewlines)
        if t != (e.note ?? "") { store.update(currentKey) { $0.note = t.isEmpty ? nil : t } }
    }

    private func refresh() async {
        refreshing = true
        defer { refreshing = false }
        do {
            try await store.refreshOne(currentKey)
            store.toast("Prezzo aggiornato")
        } catch {
            store.toast(error.localizedDescription)
        }
    }
}
