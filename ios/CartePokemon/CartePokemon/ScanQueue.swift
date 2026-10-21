// Coda di lettura: ogni foto diventa un lavoro che viene letto (Gemini o Claude), cercato nel catalogo online
// e, se tutto torna, aggiunto da solo. Gli altri casi restano da controllare. I lavori sopravvivono alla chiusura dell'app.

import SwiftUI
import UIKit

enum JobState: String, Codable {
    case waiting, reading, searching, review, added, failed
}

struct ScanJob: Identifiable, Codable {
    var id: UUID
    var created: Double
    var state: JobState
    var message: String = ""
    var rec: Rec?
    var cands: [Candidate] = []
    var addedKey: String?
    var addedName: String?
    var edgesFound: Bool = true
    var quad: [Double]?   // bordi della foto (0-1), per tenerla come anteprima se la carta non ha immagine
}

struct PendingPhoto: Identifiable {
    let id = UUID()
    var data: Data
    var preview: UIImage
    var quad: [CGPoint]
    var detected: Bool
}

@MainActor
@Observable
final class ScanQueue {
    var jobs: [ScanJob] = []
    var pendingEdges: [PendingPhoto] = []
    var pauseUntil: Date?
    var pausedJob: UUID?          // la carta in attesa per il limite al minuto (conto alla rovescia nella riga)
    var stopReason: String?       // coda ferma: quota giornaliera finita (si riprende col tasto o dopo l'azzeramento)
    var stopUntil: Date?

    private unowned let store: AppStore
    @ObservationIgnored private var runner: Task<Void, Never>?
    @ObservationIgnored private var lastCall = Date.distantPast
    private let thumbs = NSCache<NSString, UIImage>()

    static let gap: TimeInterval = 4.5
    static let pauseSeconds: UInt64 = 65
    /// Attesa dopo un limite al minuto: quella suggerita dal servizio (+2 s), fra 5 s e 5 minuti; altrimenti 65 s.
    static func pauseFor(_ suggested: Double?) -> Double {
        guard let s = suggested, s.isFinite else { return Double(pauseSeconds) }
        return min(max(s + 2, 5), 300)
    }

    static let dir: URL = {
        let u = AppStore.dir.appendingPathComponent("queue", isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }()

    init(store: AppStore) {
        self.store = store
        load()
        kick()
    }

    // MARK: - File dei lavori

    private func metaURL(_ id: UUID) -> URL { Self.dir.appendingPathComponent(id.uuidString + ".json") }
    private func cropURL(_ id: UUID) -> URL { Self.dir.appendingPathComponent(id.uuidString + ".crop.jpg") }
    private func rawURL(_ id: UUID) -> URL { Self.dir.appendingPathComponent(id.uuidString + ".raw.jpg") }
    private func origURL(_ id: UUID) -> URL { Self.dir.appendingPathComponent(id.uuidString + ".orig.jpg") }

    private func persist(_ j: ScanJob) {
        if let d = try? JSONEncoder().encode(j) { try? d.write(to: metaURL(j.id), options: .atomic) }
    }

    private func removeFiles(_ id: UUID) {
        for u in [metaURL(id), cropURL(id), rawURL(id), origURL(id)] { try? FileManager.default.removeItem(at: u) }
        thumbs.removeObject(forKey: id.uuidString as NSString)
    }

    private func load() {
        let fm = FileManager.default
        guard let files = try? fm.contentsOfDirectory(at: Self.dir, includingPropertiesForKeys: nil) else { return }
        var out: [ScanJob] = []
        for f in files where f.pathExtension == "json" {
            guard let d = try? Data(contentsOf: f), var j = try? JSONDecoder().decode(ScanJob.self, from: d) else { continue }
            if j.state == .added { removeFiles(j.id); continue }
            if j.state == .reading || j.state == .searching { j.state = .waiting }
            out.append(j)
        }
        jobs = out.sorted { $0.created < $1.created }
    }

    func thumb(_ id: UUID) -> UIImage? {
        if let c = thumbs.object(forKey: id.uuidString as NSString) { return c }
        guard let img = UIImage(contentsOfFile: cropURL(id).path) else { return nil }
        thumbs.setObject(img, forKey: id.uuidString as NSString)
        return img
    }

    // MARK: - Conteggi

    var activeCount: Int { jobs.filter { $0.state == .waiting || $0.state == .reading || $0.state == .searching }.count }
    var reviewCount: Int { jobs.filter { $0.state == .review || $0.state == .failed }.count }
    var addedCount: Int { jobs.filter { $0.state == .added }.count }

    var summary: String {
        var p: [String] = []
        if activeCount > 0 { p.append("\(activeCount) in lettura") }
        if reviewCount > 0 { p.append("\(reviewCount) da controllare") }
        if addedCount > 0 { p.append("\(addedCount) \(addedCount == 1 ? "aggiunta" : "aggiunte")") }
        return p.isEmpty ? "Coda vuota" : p.joined(separator: " · ")
    }

    // MARK: - Ingresso

    // ingresso di ogni foto: se i bordi vanno confermati (o non si trovano) passa dalla regolazione a mano
    func submit(photo: Data) async {
        let enhance = store.cfg.enhance
        let prep: PreparedPhoto? = await Task.detached(priority: .userInitiated) { Imaging.prepare(photo) }.value
        guard let p = prep, let ui = UIImage(data: p.preview) else { store.toast("Foto non leggibile"); return }
        if store.cfg.confirmEdges || !p.detected {
            pendingEdges.append(PendingPhoto(data: photo, preview: ui, quad: p.quad, detected: p.detected))
        } else {
            await enqueue(photo: photo, enhance: enhance, quad: p.quad)
        }
    }

    func acceptEdges(_ id: UUID, quad: [CGPoint]) async {
        guard let i = pendingEdges.firstIndex(where: { $0.id == id }) else { return }
        let p = pendingEdges.remove(at: i)
        await enqueue(photo: p.data, enhance: store.cfg.enhance, quad: quad)
    }

    func discardEdges(_ id: UUID) { pendingEdges.removeAll { $0.id == id } }

    func enqueue(photo: Data, enhance: Bool, quad: [CGPoint]? = nil) async {
        let res: (img: ScanImages, orig: Data?)? = await Task.detached(priority: .userInitiated) { () -> (img: ScanImages, orig: Data?)? in
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
        j.quad = r.quad.map { CardPhotos.flatQuad($0) }
        jobs.append(j)
        persist(j)
        kick()
    }

    private func set(_ id: UUID, _ f: (inout ScanJob) -> Void) {
        guard let i = jobs.firstIndex(where: { $0.id == id }) else { return }
        var j = jobs[i]
        f(&j)
        jobs[i] = j
        persist(j)
    }

    func job(_ id: UUID) -> ScanJob? { jobs.first { $0.id == id } }

    // MARK: - Esecuzione

    func kick() {
        if let u = stopUntil, Date() >= u { stopReason = nil; stopUntil = nil }
        guard runner == nil, stopReason == nil else { return }
        runner = Task { [weak self] in
            await self?.loop()
            self?.runner = nil
        }
    }

    private func loop() async {
        while stopReason == nil, let next = jobs.first(where: { $0.state == .waiting }) {
            if Task.isCancelled { return }
            await process(next.id)
        }
    }

    /// Riprende la coda fermata per la quota giornaliera (anche dopo aver cambiato servizio o chiave).
    func resumeQueue() {
        stopReason = nil
        stopUntil = nil
        Recognizer.clearDailyBlocks()
        for j in jobs where j.state == .waiting && !j.message.isEmpty { set(j.id) { $0.message = "" } }
        kick()
    }

    private func process(_ id: UUID) async {
        guard store.hasRecognitionKey else {
            set(id) { $0.state = .failed; $0.message = "Manca la chiave per la lettura: inseriscila in Impostazioni." }
            return
        }
        guard let crop = try? Data(contentsOf: cropURL(id)) else {
            set(id) { $0.state = .failed; $0.message = "Foto non più disponibile." }
            return
        }
        let raw = try? Data(contentsOf: rawURL(id))

        // un intervallo minimo fra le chiamate evita il limite gratuito di Gemini
        if store.cfg.provider == "gemini" {
            let wait = Self.gap - Date().timeIntervalSince(lastCall)
            if wait > 0 { try? await Task.sleep(nanoseconds: UInt64(wait * 1_000_000_000)) }
        }
        set(id) { $0.state = .reading; $0.message = "" }

        let rec: Rec
        do {
            rec = try await store.recognize(crop: crop, raw: raw)
            lastCall = Date()
        } catch {
            lastCall = Date()
            if let ae = error as? AppError, ae.rate {
                if ae.daily {
                    // inutile aspettare un minuto: la coda si ferma finché la quota non si azzera o si tocca Riprendi
                    set(id) { $0.state = .waiting; $0.message = "Ferma: quota giornaliera finita." }
                    stopUntil = ae.resumeAt
                    stopReason = ae.message
                    return
                }
                let secs = Self.pauseFor(ae.retryAfter)
                set(id) { $0.state = .waiting; $0.message = "" }
                pausedJob = id
                pauseUntil = Date().addingTimeInterval(secs)
                try? await Task.sleep(nanoseconds: UInt64(secs * 1_000_000_000))
                pauseUntil = nil
                pausedJob = nil
            } else {
                set(id) { $0.state = .failed; $0.message = error.localizedDescription }
            }
            return
        }
        if rec.isEmpty {
            set(id) { $0.state = .failed; $0.message = "Non riesco a leggere la carta: riprova con una foto più nitida." }
            return
        }

        set(id) { $0.state = .searching; $0.rec = rec }
        let cands: [Candidate]
        do { cands = try await store.lookupCandidates(rec) }
        catch {
            set(id) { $0.state = .failed; $0.message = error.localizedDescription }
            return
        }
        if cands.isEmpty {
            let nm = cleanName(rec.name_printed ?? rec.name_en ?? "")
            set(id) { $0.state = .failed; $0.message = "Nessuna carta trovata per «\(nm)». Prova la ricerca a mano." }
            return
        }
        if let pick = store.autoPick(rec, cands) {
            addAuto(id, pick, rec)
        } else {
            set(id) { $0.state = .review; $0.cands = cands }
        }
    }

    private func langFor(_ c: Candidate, _ rec: Rec?) -> String {
        LANGMAP[c.srcLang] ?? LANGMAP[rec?.language ?? ""] ?? "EN"
    }

    private func addAuto(_ id: UUID, _ c: Candidate, _ rec: Rec) {
        let ce = store.condEstimate(rec)
        store.pushUndo()
        let key = store.addEntry(from: c, lang: langFor(c, rec), variant: store.defaultVariant(c, hint: store.variantFromHint(rec.variant_hint)),
                           cond: ce?.code ?? "NM", qty: 1, pm: nil, condEst: ce)
        keepPhoto(id, key: key, c)
        store.showUndo("Aggiunta: \(c.name)")
        set(id) { $0.state = .added; $0.addedName = c.name; $0.cands = [] }
        // le carte aggiunte restano in elenco per un momento, poi spariscono
        Task { [weak self] in
            try? await Task.sleep(nanoseconds: 6_000_000_000)
            self?.drop(id, onlyIfAdded: true)
        }
    }

    // MARK: - Azioni dalla schermata di controllo

    func confirm(_ id: UUID, _ c: Candidate, lang: String, variant: String, cond: String, qty: Int, pm: Double?) {
        let ce = (cond == store.condEstimate(job(id)?.rec)?.code) ? store.condEstimate(job(id)?.rec) : nil
        store.pushUndo()
        let key = store.addEntry(from: c, lang: lang, variant: variant, cond: cond, qty: qty, pm: pm, condEst: ce)
        keepPhoto(id, key: key, c)
        store.showUndo("Aggiunta: \(c.name)")
        drop(id)
    }

    /// Carta senza immagine nella sua lingua: la foto del lavoro diventa l'anteprima della voce (prima di cancellare i file).
    /// Per l'anteprima si usa la carta non migliorata, se c'è.
    func keepPhoto(_ id: UUID, key: String, _ c: Candidate) {
        guard AppStore.wantsOwnPhoto(c) else { return }
        let plain = (try? Data(contentsOf: rawURL(id))) ?? (try? Data(contentsOf: cropURL(id)))
        guard let crop = plain else { return }
        let orig = try? Data(contentsOf: origURL(id))
        store.attachPhoto(key: key, crop: crop, orig: orig, quad: CardPhotos.pointsQuad(job(id)?.quad))
    }

    func drop(_ id: UUID, onlyIfAdded: Bool = false) {
        if onlyIfAdded, job(id)?.state != .added { return }
        jobs.removeAll { $0.id == id }
        removeFiles(id)
    }

    func retry(_ id: UUID) {
        set(id) { $0.state = .waiting; $0.message = ""; $0.cands = [] }
        if stopReason != nil { resumeQueue() } else { kick() }
    }

    func clearAdded() {
        for j in jobs where j.state == .added { drop(j.id) }
    }
}
