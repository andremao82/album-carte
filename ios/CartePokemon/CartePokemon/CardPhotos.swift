// Foto mie delle carte (18/10/2026). La coda di scansione la tiene da sola solo per le carte senza immagine ufficiale
// nella loro lingua; dalla scheda si può scattare su qualsiasi carta.
// Anteprima: se ho scelto (photoPref) vale la scelta: "own" = mia foto, "web" = immagine da internet (se manca, la foto).
// Automatico (nil): immagine ufficiale nella lingua della carta > mia foto > immagine inglese di ripiego > iniziali.
// Su disco (Application Support/photos): <id>.jpg = carta ritagliata e raddrizzata, <id>.orig.jpg = foto intera
// (lato lungo 2000 px) per poter rifare il ritaglio. Nella voce: photo (id) e photoQuad (bordi 0-1, 8 numeri).

import SwiftUI
import UIKit
import PhotosUI

enum CardPhotos {
    /// Prefisso degli indirizzi delle foto mie (mai percorsi assoluti: la cartella dell'app cambia a ogni aggiornamento).
    static let scheme = "photo:"
    static let origMaxSide: CGFloat = 2000

    static let dir: URL = {
        // stessa cartella di AppStore.dir, calcolata qui per non dipendere dal thread principale
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let u = base.appendingPathComponent("photos", isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }()

    static func cropURL(_ id: String) -> URL { dir.appendingPathComponent(id + ".jpg") }
    static func origURL(_ id: String) -> URL { dir.appendingPathComponent(id + ".orig.jpg") }

    /// Solo lettere, cifre e trattini: un id arrivato da un backup non deve poter uscire dalla cartella.
    static func validId(_ id: String?) -> Bool {
        guard let id = id, !id.isEmpty, id.count <= 64 else { return false }
        return id.allSatisfy { $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "-") }
    }

    static func exists(_ id: String?) -> Bool {
        guard validId(id), let id = id else { return false }
        return FileManager.default.fileExists(atPath: cropURL(id).path)
    }

    static func hasOriginal(_ id: String?) -> Bool {
        guard validId(id), let id = id else { return false }
        return FileManager.default.fileExists(atPath: origURL(id).path)
    }

    /// Foto intera ridotta per l'archivio.
    static func shrink(_ data: Data) -> Data? {
        guard let img = Imaging.load(data, maxSide: origMaxSide) else { return nil }
        return Imaging.jpeg(img, quality: 0.8)
    }

    /// Scrive una foto nuova (id nuovo: così l'anteprima in memoria non resta quella vecchia).
    static func write(crop: Data, orig: Data?, id: String = UUID().uuidString) -> String? {
        guard validId(id) else { return nil }
        do {
            try crop.write(to: cropURL(id), options: .atomic)
            if let o = orig { try o.write(to: origURL(id), options: .atomic) }
        } catch {
            remove(id)
            return nil
        }
        cache.removeObject(forKey: id as NSString)
        return id
    }

    static func remove(_ id: String?) {
        guard validId(id), let id = id else { return }
        for u in [cropURL(id), origURL(id)] { try? FileManager.default.removeItem(at: u) }
        cache.removeObject(forKey: id as NSString)
    }

    static func idOf(fileName: String) -> String { fileName.components(separatedBy: ".").first ?? fileName }

    /// Cancella i file che nessuna voce usa più (all'avvio: l'annulla non sopravvive al riavvio).
    static func prune(keep: Set<String>) {
        guard let files = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil) else { return }
        for f in files where !keep.contains(idOf(fileName: f.lastPathComponent)) {
            try? FileManager.default.removeItem(at: f)
        }
    }

    static let cache = NSCache<NSString, UIImage>()

    static func image(_ id: String) -> UIImage? {
        if let c = cache.object(forKey: id as NSString) { return c }
        guard validId(id), let img = UIImage(contentsOfFile: cropURL(id).path) else { return nil }
        cache.setObject(img, forKey: id as NSString)
        return img
    }

    // bordi in 8 numeri (alto-sx, alto-dx, basso-dx, basso-sx), coordinate 0-1
    static func flatQuad(_ q: [CGPoint]) -> [Double] { q.flatMap { [Double($0.x), Double($0.y)] } }
    static func pointsQuad(_ f: [Double]?) -> [CGPoint]? {
        guard let f = f, f.count == 8 else { return nil }
        var out: [CGPoint] = []
        var i = 0
        while i < 8 { out.append(CGPoint(x: f[i], y: f[i + 1])); i += 2 }
        return out
    }

    /// Foto pronta per l'editor dei bordi; quad = bordi salvati (se mancano, quelli trovati).
    static func editable(_ data: Data, prepared p: PreparedPhoto, quad: [CGPoint]?) -> PendingPhoto? {
        guard let ui = UIImage(data: p.preview) else { return nil }
        let q = (quad?.count == 4) ? quad! : p.quad
        return PendingPhoto(data: data, preview: ui, quad: q, detected: quad != nil || p.detected)
    }
}

/// La carta ha un'immagine ufficiale nella sua lingua (non il ripiego inglese).
func hasOfficialImage(_ e: Entry) -> Bool { cardImageURL(e.img) != nil && e.imgFrom != "EN" }

/// Indirizzo dell'anteprima di una voce, secondo l'ordine scritto in testa al file.
func previewURL(_ e: Entry) -> String {
    showsOwnPhoto(e) ? CardPhotos.scheme + (e.photo ?? "") : e.img
}

/// L'anteprima è la mia foto?
func showsOwnPhoto(_ e: Entry) -> Bool {
    guard CardPhotos.exists(e.photo) else { return false }
    let web = cardImageURL(e.img) != nil
    switch e.photoPref {
    case "own": return true
    case "web": return !web                  // scelta internet ma l'immagine non c'è: meglio la foto che le iniziali
    default: return !hasOfficialImage(e)     // automatico: l'ufficiale vince, la foto vince sul ripiego inglese
    }
}

/// Testo del tasto che torna all'immagine da internet tenendo la foto.
func webImageLabel(_ e: Entry) -> String {
    hasOfficialImage(e) ? "Usa l'immagine ufficiale" : "Usa l'immagine inglese"
}

/// Anteprima da una foto mia, caricata dal disco.
struct LocalPhotoImage: View {
    let id: String
    var name: String = ""
    var number: String = ""
    var fill = false
    var body: some View {
        if let img = CardPhotos.image(id) {
            if fill { Image(uiImage: img).resizable().scaledToFill() } else { Image(uiImage: img).resizable().scaledToFit() }
        } else {
            CardPlaceholder(name: name, number: number)
        }
    }
}

// MARK: - Archivio: foto delle voci

extension AppStore {
    /// La carta scelta non ha l'immagine nella sua lingua: conviene tenere la foto scattata.
    static func wantsOwnPhoto(_ c: Candidate) -> Bool { cardImageURL(c.imageSmall) == nil }

    /// Foto dalla coda: si mette solo se la voce non ha già un'immagine ufficiale o una foto.
    func attachPhoto(key: String, crop: Data, orig: Data?, quad: [CGPoint]?) {
        guard let i = catalog.firstIndex(where: { $0.key == key }) else { return }
        if hasOfficialImage(catalog[i]) || CardPhotos.exists(catalog[i].photo) { return }
        guard let id = CardPhotos.write(crop: crop, orig: orig) else { return }
        catalog[i].photo = id
        catalog[i].photoQuad = quad.map { CardPhotos.flatQuad($0) }
        save()
    }

    /// Nuovo scatto o nuovo ritaglio dalla scheda. shrink = false se l'originale è già quello salvato (niente ricompressioni).
    func replacePhoto(key: String, original: Data, quad: [CGPoint], shrink: Bool) async -> Bool {
        let made: (crop: Data, orig: Data)? = await Task.detached(priority: .userInitiated) { () -> (crop: Data, orig: Data)? in
            guard let s = Imaging.process(original, enhance: false, quad: quad) else { return nil }
            let o: Data? = shrink ? CardPhotos.shrink(original) : original
            guard let orig = o else { return nil }
            return (crop: s.crop, orig: orig)
        }.value
        guard let m = made, let i = catalog.firstIndex(where: { $0.key == key }) else { return false }
        guard let id = CardPhotos.write(crop: m.crop, orig: m.orig) else { return false }
        // il file vecchio resta fino al prossimo avvio (pulizia), così un annulla non perde la foto
        catalog[i].photo = id
        catalog[i].photoQuad = CardPhotos.flatQuad(quad)
        catalog[i].photoPref = "own"   // scattata o ritagliata apposta dalla scheda: la voglio vedere
        save()
        return true
    }

    /// Sceglie l'anteprima senza cancellare la foto: "own" o "web".
    func setPhotoPref(key: String, _ pref: String) {
        guard pref == "own" || pref == "web" else { return }
        update(key) { $0.photoPref = pref }
    }

    func removePhoto(key: String) {
        update(key) { $0.photo = nil; $0.photoQuad = nil; $0.photoPref = nil }
    }

    /// Id delle foto usate dal catalogo e dalla copia automatica (che si può ripristinare).
    func photoIdsInUse() -> Set<String> {
        var ids = Set(catalog.compactMap { $0.photo })
        if let d = try? Data(contentsOf: Self.bakURL), let arr = try? JSONDecoder().decode([Lossy<Entry>].self, from: d) {
            for e in arr.compactMap({ $0.value }) { if let p = e.photo { ids.insert(p) } }
        }
        return ids
    }

    func prunePhotos() { CardPhotos.prune(keep: photoIdsInUse()) }

    /// Foto da mettere nel backup: ritaglio e originale in base64, per id.
    func backupPhotos() -> [String: BackupPhoto] {
        var out: [String: BackupPhoto] = [:]
        for e in catalog {
            guard let id = e.photo, out[id] == nil, CardPhotos.exists(id),
                  let crop = try? Data(contentsOf: CardPhotos.cropURL(id)) else { continue }
            let orig = try? Data(contentsOf: CardPhotos.origURL(id))
            out[id] = BackupPhoto(crop: crop.base64EncodedString(), orig: orig?.base64EncodedString())
        }
        return out
    }

    /// Ripristino: riscrive le foto con il loro id (le voci del backup le richiamano così).
    func restorePhotos(_ photos: [String: BackupPhoto]?) -> Int {
        guard let ph = photos else { return 0 }
        var n = 0
        for (id, p) in ph {
            guard CardPhotos.validId(id), let crop = Data(base64Encoded: p.crop) else { continue }
            let orig = p.orig.flatMap { Data(base64Encoded: $0) }
            if CardPhotos.write(crop: crop, orig: orig, id: id) != nil { n += 1 }
        }
        return n
    }
}

struct BackupPhoto: Codable {
    var crop: String
    var orig: String?
}

// MARK: - Scatto di una foto per una carta (fotocamera o galleria, poi bordi)

struct PhotoCaptureFlow: View {
    let onDone: (Data, [CGPoint]) -> Void
    let onCancel: () -> Void

    @State private var cam = CameraModel()
    @State private var ready = false
    @State private var denied = false
    @State private var busy = false
    @State private var pick: PhotosPickerItem?
    @State private var pending: PendingPhoto?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            if let p = pending {
                EdgeEditView(photo: p, remaining: 1, discardLabel: "Riscatta") { q in
                    onDone(p.data, q)
                } onDiscard: {
                    pending = nil
                }
                .id(p.id)
            } else {
                camera
            }
        }
        .task {
            let ok = await cam.start()
            ready = ok
            denied = !ok
        }
        .onDisappear { cam.stop() }
        .onChange(of: pick) { _, item in
            guard let it = item else { return }
            pick = nil
            Task {
                if let d = try? await it.loadTransferable(type: Data.self) { await prepare(d) }
            }
        }
        .statusBarHidden(true)
    }

    private var camera: some View {
        ZStack {
            if ready {
                CameraPreview(session: cam.session).ignoresSafeArea()
                GeometryReader { g in
                    let w = min(g.size.width - 64, (g.size.height - 280) * 63 / 88)
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .strokeBorder(.white.opacity(0.75), style: StrokeStyle(lineWidth: 2, dash: [10, 8]))
                        .frame(width: w, height: w * 88 / 63)
                        .position(x: g.size.width / 2, y: g.size.height / 2 - 10)
                }
                .allowsHitTesting(false)
            } else if denied {
                VStack(spacing: 12) {
                    Image(systemName: "camera.fill").font(.system(size: 40)).foregroundStyle(.secondary)
                    Text("Fotocamera non disponibile: scegli la foto dalla galleria.")
                        .font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
                }
                .padding(32)
            } else {
                ProgressView().tint(.white)
            }
            VStack {
                HStack {
                    Button { onCancel() } label: {
                        Image(systemName: "xmark").font(.title3.weight(.semibold)).frame(width: 44, height: 44)
                    }
                    .buttonStyle(.glass)
                    .buttonBorderShape(.circle)
                    .accessibilityLabel("Chiudi")
                    Spacer()
                }
                .padding(.top, 6)
                Spacer()
                Text("Inquadra la carta dentro la cornice").font(.footnote).foregroundStyle(.white.opacity(0.85))
                HStack {
                    PhotosPicker(selection: $pick, matching: .images) {
                        Image(systemName: "photo.on.rectangle").font(.title2).frame(width: 56, height: 56)
                    }
                    .buttonStyle(.glass)
                    .buttonBorderShape(.circle)
                    .accessibilityLabel("Scegli dalla galleria")
                    Spacer()
                    Button { Task { await shoot() } } label: {
                        ZStack {
                            Circle().strokeBorder(.white, lineWidth: 4).frame(width: 78, height: 78)
                            Circle().fill(.white).frame(width: 62, height: 62).opacity(busy ? 0.5 : 1)
                        }
                    }
                    .disabled(!ready || busy)
                    .accessibilityLabel("Scatta")
                    Spacer()
                    Color.clear.frame(width: 56, height: 56)
                }
                .padding(.bottom, 6)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 8)
        }
    }

    private func shoot() async {
        busy = true
        defer { busy = false }
        guard let d = await cam.capture() else { return }
        await prepare(d)
    }

    private func prepare(_ d: Data) async {
        let prep: PreparedPhoto? = await Task.detached(priority: .userInitiated) { Imaging.prepare(d) }.value
        guard let p = prep, let pp = CardPhotos.editable(d, prepared: p, quad: nil) else { return }
        pending = pp
    }
}
