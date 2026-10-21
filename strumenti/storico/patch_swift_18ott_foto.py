# 18/10/2026: carte senza immagine nella loro lingua -> anteprima con la mia foto (ritaglio, nuovo scatto, rimozione),
# ripiego inglese tenuto solo se manca la foto, foto incluse nel backup. Nuovo file CardPhotos.swift (cartella sincronizzata).
D='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/'
def patch(name, pairs):
    p=D+name; s=open(p,encoding='utf-8').read()
    for old,new,*n in pairs:
        cnt=n[0] if n else 1
        assert s.count(old)==cnt,(name,old[:100],s.count(old))
        s=s.replace(old,new)
    open(p,'w',encoding='utf-8').write(s)

patch('Models.swift',[
('''    var imgFrom: String?  // lingua da cui viene l'immagine presa come ripiego ("EN"); "" = cercata, nessuna trovata
''','''    var imgFrom: String?  // lingua da cui viene l'immagine presa come ripiego ("EN"); "" = cercata, nessuna trovata
    var photo: String?    // id della mia foto (CardPhotos), solo per carte senza immagine nella loro lingua
    var photoQuad: [Double]?  // bordi della foto, 8 numeri 0-1, per rifare il ritaglio
'''),
('''        self.imgFrom = c.lenientString(.imgFrom)
''','''        self.imgFrom = c.lenientString(.imgFrom)
        self.photo = c.lenientString(.photo)
        self.photoQuad = try? c.decodeIfPresent([Double].self, forKey: .photoQuad)
'''),
])

patch('Components.swift',[
('''    var body: some View {
        if let u = cardImageURL(url) {
            AsyncImage(url: u) { phase in''','''    var body: some View {
        if url.hasPrefix(CardPhotos.scheme) {
            LocalPhotoImage(id: String(url.dropFirst(CardPhotos.scheme.count)), name: name, number: number, fill: fill)
        } else if let u = cardImageURL(url) {
            AsyncImage(url: u) { phase in'''),
('''CardThumb(url: e.img, name: e.name, number: e.number)''','''CardThumb(url: previewURL(e), name: e.name, number: e.number)'''),
])
patch('AlbumView.swift',[
('''CardArt(url: e.img, name: e.name, number: e.number)''','''CardArt(url: previewURL(e), name: e.name, number: e.number)'''),
('''CardThumb(url: m.e.img, width: 38,''','''CardThumb(url: previewURL(m.e), width: 38,'''),
])
patch('HomeView.swift',[('''CardArt(url: e.img, name: e.name''','''CardArt(url: previewURL(e), name: e.name''')])
patch('DexViews.swift',[('''CardThumb(url: e.img, width: 96, radius: 8, name: e.name''','''CardThumb(url: previewURL(e), width: 96, radius: 8, name: e.name''')])

patch('EdgeEditView.swift',[
('''    let onDiscard: () -> Void
''','''    let onDiscard: () -> Void
    /// Testo del tasto a sinistra: "Scarta" in coda, "Annulla"/"Riscatta" dalla scheda della carta.
    let discardLabel: String
'''),
('''    init(photo: PendingPhoto, remaining: Int, onConfirm: @escaping ([CGPoint]) -> Void, onDiscard: @escaping () -> Void) {
        self.photo = photo
        self.remaining = remaining''','''    init(photo: PendingPhoto, remaining: Int, discardLabel: String = "Scarta", onConfirm: @escaping ([CGPoint]) -> Void, onDiscard: @escaping () -> Void) {
        self.photo = photo
        self.remaining = remaining
        self.discardLabel = discardLabel'''),
('''                Button("Scarta", role: .destructive) { onDiscard() }''','''                Button(discardLabel, role: discardLabel == "Scarta" ? .destructive : nil) { onDiscard() }'''),
])

patch('Imaging.swift',[
('''    var detected: Bool    // false = bordi non trovati, ritaglio centrale
}''','''    var detected: Bool    // false = bordi non trovati, ritaglio centrale
    var quad: [CGPoint]? = nil  // bordi usati, normalizzati (per rifare il ritaglio della mia foto)
}'''),
('''        var detected = false
        var card: CIImage
        let ci: [CGPoint]? = (quad != nil && quad!.count == 4) ? fromNormalized(quad!, in: src.extent) : detectCard(src)''','''        var detected = false
        var card: CIImage
        let ci: [CGPoint]? = (quad != nil && quad!.count == 4) ? fromNormalized(quad!, in: src.extent) : detectCard(src)
        let usedQuad: [CGPoint]? = ci.map { toNormalized($0, in: src.extent) }'''),
('''        return ScanImages(crop: crop, raw: raw, detected: detected)''','''        return ScanImages(crop: crop, raw: raw, detected: detected, quad: detected ? usedQuad : nil)'''),
])

patch('ScanQueue.swift',[
('''    var edgesFound: Bool = true
}''','''    var edgesFound: Bool = true
    var quad: [Double]?   // bordi della foto (0-1), per tenerla come anteprima se la carta non ha immagine
}'''),
('''    private func rawURL(_ id: UUID) -> URL { Self.dir.appendingPathComponent(id.uuidString + ".raw.jpg") }''','''    private func rawURL(_ id: UUID) -> URL { Self.dir.appendingPathComponent(id.uuidString + ".raw.jpg") }
    private func origURL(_ id: UUID) -> URL { Self.dir.appendingPathComponent(id.uuidString + ".orig.jpg") }'''),
('''        for u in [metaURL(id), cropURL(id), rawURL(id)] { try? FileManager.default.removeItem(at: u) }''','''        for u in [metaURL(id), cropURL(id), rawURL(id), origURL(id)] { try? FileManager.default.removeItem(at: u) }'''),
('''        let res: ScanImages? = await Task.detached(priority: .userInitiated) { Imaging.process(photo, enhance: enhance, quad: quad) }.value
        guard let r = res else { store.toast("Foto non leggibile"); return }
        let id = UUID()
        try? r.crop.write(to: cropURL(id), options: .atomic)
        if let raw = r.raw { try? raw.write(to: rawURL(id), options: .atomic) }
        let j = ScanJob(id: id, created: nowMs(), state: .waiting, edgesFound: r.detected)''','''        let res: (img: ScanImages, orig: Data?)? = await Task.detached(priority: .userInitiated) { () -> (img: ScanImages, orig: Data?)? in
            guard let r = Imaging.process(photo, enhance: enhance, quad: quad) else { return nil }
            return (img: r, orig: CardPhotos.shrink(photo))
        }.value
        guard let made = res else { store.toast("Foto non leggibile"); return }
        let r = made.img
        let id = UUID()
        try? r.crop.write(to: cropURL(id), options: .atomic)
        if let raw = r.raw { try? raw.write(to: rawURL(id), options: .atomic) }
        if let o = made.orig { try? o.write(to: origURL(id), options: .atomic) }
        var j = ScanJob(id: id, created: nowMs(), state: .waiting, edgesFound: r.detected)
        j.quad = r.quad.map { CardPhotos.flatQuad($0) }'''),
('''        store.showUndo("Aggiunta: \\(c.name)")
        set(id) { $0.state = .added; $0.addedName = c.name; $0.cands = [] }''','''        keepPhoto(id, key: key, c)
        store.showUndo("Aggiunta: \\(c.name)")
        set(id) { $0.state = .added; $0.addedName = c.name; $0.cands = [] }'''),
('''        _ = store.addEntry(from: c, lang: langFor(c, rec), variant:''','''        let key = store.addEntry(from: c, lang: langFor(c, rec), variant:'''),
('''        _ = store.addEntry(from: c, lang: lang, variant: variant, cond: cond, qty: qty, pm: pm, condEst: ce)
        store.showUndo("Aggiunta: \\(c.name)")
        drop(id)''','''        let key = store.addEntry(from: c, lang: lang, variant: variant, cond: cond, qty: qty, pm: pm, condEst: ce)
        keepPhoto(id, key: key, c)
        store.showUndo("Aggiunta: \\(c.name)")
        drop(id)'''),
('''    func drop(_ id: UUID, onlyIfAdded: Bool = false) {''','''    /// Carta senza immagine nella sua lingua: la foto del lavoro diventa l'anteprima della voce (prima di cancellare i file).
    /// Per l'anteprima si usa la carta non migliorata, se c'è.
    func keepPhoto(_ id: UUID, key: String, _ c: Candidate) {
        guard AppStore.wantsOwnPhoto(c) else { return }
        let plain = (try? Data(contentsOf: rawURL(id))) ?? (try? Data(contentsOf: cropURL(id)))
        guard let crop = plain else { return }
        let orig = try? Data(contentsOf: origURL(id))
        store.attachPhoto(key: key, crop: crop, orig: orig, quad: CardPhotos.pointsQuad(job(id)?.quad))
    }

    func drop(_ id: UUID, onlyIfAdded: Bool = false) {'''),
])

patch('AddView.swift',[
('''    let onAdded: () -> Void

    @State private var name: String''','''    let onAdded: () -> Void
    /// Chiave della voce aggiunta e carta scelta (per tenere la foto di un lavoro della coda).
    var onAddedEntry: ((String, Candidate) -> Void)? = nil

    @State private var name: String'''),
('''    init(initialName: String, initialNum: String, initialTot: String, initialLang: String, onAdded: @escaping () -> Void) {''','''    init(initialName: String, initialNum: String, initialTot: String, initialLang: String,
         onAddedEntry: ((String, Candidate) -> Void)? = nil, onAdded: @escaping () -> Void) {
        self.onAddedEntry = onAddedEntry'''),
('''                    store.addEntry(from: c, lang: l, variant: v, cond: cd, qty: q, pm: pm)
                    store.showUndo("Aggiunta: \\(c.name)")
                    onAdded()''','''                    let k = store.addEntry(from: c, lang: l, variant: v, cond: cd, qty: q, pm: pm)
                    onAddedEntry?(k, c)
                    store.showUndo("Aggiunta: \\(c.name)")
                    onAdded()'''),
('''                                     initialLang: LANGMAP[r?.language ?? ""] ?? "IT") {
                    queue.drop(job.id)''','''                                     initialLang: LANGMAP[r?.language ?? ""] ?? "IT",
                                     onAddedEntry: { k, c in queue.keepPhoto(job.id, key: k, c) }) {
                    queue.drop(job.id)'''),
])

patch('Store.swift',[
('''    var catalog: [Entry]

    init(v: Int?, saved: String?, condCoef: [String: Double]?, hist: [String: [[Int]]]?, vhist: [[Int]]?, catalog: [Entry]) {
        self.v = v; self.saved = saved; self.condCoef = condCoef; self.hist = hist; self.vhist = vhist; self.catalog = catalog
    }''','''    var catalog: [Entry]
    var photos: [String: BackupPhoto]?   // solo app nativa: le mie foto (il web ignora la chiave)

    init(v: Int?, saved: String?, condCoef: [String: Double]?, hist: [String: [[Int]]]?, vhist: [[Int]]?, catalog: [Entry],
         photos: [String: BackupPhoto]? = nil) {
        self.v = v; self.saved = saved; self.condCoef = condCoef; self.hist = hist; self.vhist = vhist; self.catalog = catalog
        self.photos = photos
    }'''),
('''        let lossy = try c.decode([Lossy<Entry>].self, forKey: .catalog)
        catalog = lossy.compactMap { $0.value }
    }''','''        let lossy = try c.decode([Lossy<Entry>].self, forKey: .catalog)
        catalog = lossy.compactMap { $0.value }
        photos = try? c.decodeIfPresent([String: BackupPhoto].self, forKey: .photos)
    }'''),
('''                            hist: hist, vhist: vhist, catalog: catalog)''','''                            hist: hist, vhist: vhist, catalog: catalog, photos: ph.isEmpty ? nil : ph)'''),
('''        flushHist()
        let bf = BackupFile(v: 1,''','''        flushHist()
        let ph: [String: BackupPhoto] = backupPhotos()
        let bf = BackupFile(v: 1,'''),
('''        snapshotIfDue(true)
        catalog = bf.catalog
        if let cc = bf.condCoef''','''        snapshotIfDue(true)
        _ = restorePhotos(bf.photos)
        catalog = bf.catalog
        if let cc = bf.condCoef'''),
])

patch('CartePokemonApp.swift',[
('''        .task {
            await store.refreshFx()''','''        .task {
            store.prunePhotos()
            await store.refreshFx()'''),
])

patch('CardDetailView.swift',[
('''    @State private var loaded = false
''','''    @State private var loaded = false
    @State private var photoFlow: PhotoFlow?
    @State private var photoBusy = false

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
'''),
('''        .onDisappear { saveNote(); applyManual(silent: true) }''','''        .onDisappear { saveNote(); applyManual(silent: true) }
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
        }'''),
('''                if let n = imgNote(e) { Text(n).font(.caption2).foregroundStyle(.secondary).multilineTextAlignment(.center).frame(width: 128) }
            }''','''                if let n = imgNote(e) { Text(n).font(.caption2).foregroundStyle(.secondary).multilineTextAlignment(.center).frame(width: 128) }
                if !hasOfficialImage(e) { photoMenu(e) }
            }'''),
('''    private func imgNote(_ e: Entry) -> String? {
        if e.imgFrom == "EN" && e.lang != "EN" { return "Immagine della versione inglese" }
        return nil
    }''','''    private func imgNote(_ e: Entry) -> String? {
        let u = previewURL(e)
        if u.hasPrefix(CardPhotos.scheme) { return "La tua foto" }
        if e.imgFrom == "EN" && e.lang != "EN" && cardImageURL(u) != nil { return "Immagine della versione inglese" }
        return nil
    }

    // foto mia: solo per carte senza immagine ufficiale nella loro lingua
    private func photoMenu(_ e: Entry) -> some View {
        let has = CardPhotos.exists(e.photo)
        return Menu {
            if CardPhotos.hasOriginal(e.photo) {
                Button("Ritaglia la foto", systemImage: "crop") { Task { await openCrop(e) } }
            }
            Button(has ? "Riscatta la foto" : "Scatta una foto", systemImage: "camera") { photoFlow = .shoot }
            if has {
                Button("Rimuovi la foto", systemImage: "trash", role: .destructive) { store.removePhoto(key: currentKey) }
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
    }'''),
('''CardArt(url: hiImg(e.img), radius: 10, name: e.name, number: e.number)''','''CardArt(url: hiImg(previewURL(e)), radius: 10, name: e.name, number: e.number)'''),
])
print('ok')
