# 18/10/2026: coda ferma su "In pausa per il limite del servizio" (429 di Gemini) all'infinito.
# Ora: si distingue limite al minuto (attesa col retryDelay di Google, conto alla rovescia) da quota
# giornaliera (si passa al modello successivo; se finita su tutti, la coda si ferma con messaggio e Riprendi).
D='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/'
def patch(name, pairs):
    p=D+name; s=open(p,encoding='utf-8').read()
    for old,new in pairs:
        assert s.count(old)==1,(name,old[:100],s.count(old))
        s=s.replace(old,new)
    open(p,'w',encoding='utf-8').write(s)

patch('API.swift',[
('''    var busy = false      // servizio sovraccarico (5xx): si prova un altro modello
    var errorDescription: String? { message }
    init(_ message: String, net: Bool = false, notFound: Bool = false, fatal: Bool = false, busy: Bool = false) {
        self.message = message; self.net = net; self.notFound = notFound; self.fatal = fatal; self.busy = busy
    }''','''    var busy = false      // servizio sovraccarico (5xx): si prova un altro modello
    var rate = false      // limite di richieste (429): la coda aspetta
    var daily = false     // quota giornaliera finita: inutile aspettare un minuto, si cambia modello o ci si ferma
    var retryAfter: Double? = nil   // secondi suggeriti dal servizio
    var resumeAt: Date? = nil       // quando si azzera la quota giornaliera
    var errorDescription: String? { message }
    init(_ message: String, net: Bool = false, notFound: Bool = false, fatal: Bool = false, busy: Bool = false,
         rate: Bool = false, daily: Bool = false, retryAfter: Double? = nil, resumeAt: Date? = nil) {
        self.message = message; self.net = net; self.notFound = notFound; self.fatal = fatal; self.busy = busy
        self.rate = rate; self.daily = daily; self.retryAfter = retryAfter; self.resumeAt = resumeAt
    }'''),
('''                if code == 429 { throw AppError("Limite gratuito di Gemini raggiunto: riprova tra poco o domani.") }''',
'''                if code == 429 {
                    let q = quotaInfo(j)
                    if q.daily { throw AppError("Quota giornaliera di Gemini finita per \\(model).", rate: true, daily: true, retryAfter: q.retry) }
                    throw AppError("Limite al minuto di Gemini (\\(model)).", rate: true, retryAfter: q.retry)
                }'''),
('''    struct GeminiResult {
        var rec: Rec
        var model: String
        var think: Int
        var models: [String]?
    }''','''    struct GeminiResult {
        var rec: Rec
        var model: String
        var think: Int
        var models: [String]?
        var quotaSkipped = false   // il modello scelto aveva finito la quota del giorno: non va sostituito per sempre
    }

    // Risposta 429 di Google: tipo di quota (QuotaFailure.violations[].quotaId con "PerDay") e attesa (RetryInfo.retryDelay "34s").
    // Se i dettagli mancano si guarda il testo del messaggio.
    static func quotaInfo(_ j: JSON?) -> (daily: Bool, retry: Double?) {
        let err = j?["error"] as? JSON
        let details = (err?["details"] as? [Any])?.compactMap { $0 as? JSON } ?? []
        var daily = false
        var retry: Double? = nil
        for d in details {
            let t = jstr(d["@type"])
            if t.hasSuffix("QuotaFailure") {
                let vs = (d["violations"] as? [Any])?.compactMap { $0 as? JSON } ?? []
                for v in vs where regexTest("per ?day", jstr(v["quotaId"]) + " " + jstr(v["quotaMetric"])) { daily = true }
            }
            if t.hasSuffix("RetryInfo"), let m = regexMatch("^([0-9]+(?:\\\\.[0-9]+)?)s$", in: jstr(d["retryDelay"])), m.count > 1 {
                retry = Double(m[1])
            }
        }
        let msg = jstr(err?["message"])
        if details.isEmpty && regexTest("per ?day|daily", msg) { daily = true }
        if retry == nil, let m = regexMatch("retry in ([0-9]+(?:\\\\.[0-9]+)?) ?s", in: msg), m.count > 1 { retry = Double(m[1]) }
        return (daily, retry)
    }

    // La quota giornaliera gratuita di Gemini si azzera a mezzanotte, ora del Pacifico.
    static func nextDailyReset(after d: Date) -> Date {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "America/Los_Angeles") ?? .current
        let start = cal.startOfDay(for: d)
        return cal.date(byAdding: .day, value: 1, to: start) ?? d.addingTimeInterval(86400)
    }

    // modelli con la quota del giorno finita (solo in memoria): non si richiamano fino all'azzeramento
    nonisolated(unsafe) static var dailyBlocked: [String: Date] = [:]
    static func clearDailyBlocks() { dailyBlocked = [:] }'''),
('''        var netError: AppError? = nil
        var busyError: AppError? = nil
        while !queue.isEmpty && tried.count < 6 {
            let m = queue.removeFirst()
            if tried.contains(m) { continue }
            tried.append(m)
            do {
                let startThink = (m == model) ? (think ?? 0) : 0
                let r = try await callGemini(model: m, crop: crop, raw: raw, key: key, thinkStart: startThink, cond: cond)
                return GeminiResult(rec: r.rec, model: m, think: r.think, models: listedModels)
            } catch let e as AppError {
                if !e.notFound && !e.net && !e.busy { throw e }
                if e.net && netError == nil { netError = e }
                if e.busy && busyError == nil { busyError = e }
                if queue.isEmpty && !listed {
                    listed = true
                    let l = (try? await listModels(key: key)) ?? []
                    if !l.isEmpty { listedModels = l }
                    queue.append(contentsOf: l.isEmpty ? ["gemini-3.6-flash", "gemini-3.5-flash"] : Array(l.prefix(4)))
                }
            }
        }
        if busyError != nil {''','''        var netError: AppError? = nil
        var busyError: AppError? = nil
        var dailyHit = false
        while !queue.isEmpty && tried.count < 6 {
            let m = queue.removeFirst()
            if tried.contains(m) { continue }
            tried.append(m)
            if let until = dailyBlocked[m], until > Date() {
                dailyHit = true      // quota del giorno già finita: non lo si richiama
            } else {
                do {
                    let startThink = (m == model) ? (think ?? 0) : 0
                    let r = try await callGemini(model: m, crop: crop, raw: raw, key: key, thinkStart: startThink, cond: cond)
                    return GeminiResult(rec: r.rec, model: m, think: r.think, models: listedModels, quotaSkipped: dailyHit)
                } catch let e as AppError {
                    // limite al minuto e altri errori veri: si ferma qui (la coda aspetta); quota del giorno: modello successivo
                    if !e.notFound && !e.net && !e.busy && !e.daily { throw e }
                    if e.net && netError == nil { netError = e }
                    if e.busy && busyError == nil { busyError = e }
                    if e.daily { dailyHit = true; dailyBlocked[m] = nextDailyReset(after: Date()) }
                }
            }
            if queue.isEmpty && !listed {
                listed = true
                let l = (try? await listModels(key: key)) ?? []
                if !l.isEmpty { listedModels = l }
                queue.append(contentsOf: l.isEmpty ? ["gemini-3.6-flash", "gemini-3.5-flash"] : Array(l.prefix(4)))
            }
        }
        if busyError == nil && dailyHit {
            let reset = nextDailyReset(after: Date())
            let f = DateFormatter()
            f.locale = Locale(identifier: "it_IT")
            f.dateFormat = "HH:mm"
            throw AppError("Quota giornaliera gratuita di Gemini finita su tutti i modelli provati (\\(tried.joined(separator: ", "))). Si azzera alle \\(f.string(from: reset)): tocca Riprendi da allora, oppure passa a Claude in Impostazioni.",
                           rate: true, daily: true, resumeAt: reset)
        }
        if busyError != nil {'''),
('''            if code == 429 { throw AppError("Troppe richieste, riprova tra poco.") }''',
'''            if code == 429 { throw AppError("Troppe richieste, riprova tra poco.", rate: true) }'''),
])

patch('StoreOps.swift',[
('''            if !c.gmodel.isEmpty && r.model != c.gmodel { c.gmodel = r.model }''',
'''            if !c.gmodel.isEmpty && r.model != c.gmodel && !r.quotaSkipped { c.gmodel = r.model }'''),
])

patch('ScanQueue.swift',[
('''    var pauseUntil: Date?
''','''    var pauseUntil: Date?
    var pausedJob: UUID?          // la carta in attesa per il limite al minuto (conto alla rovescia nella riga)
    var stopReason: String?       // coda ferma: quota giornaliera finita (si riprende col tasto o dopo l'azzeramento)
    var stopUntil: Date?
'''),
('''    static let pauseSeconds: UInt64 = 65
''','''    static let pauseSeconds: UInt64 = 65
    /// Attesa dopo un limite al minuto: quella suggerita dal servizio (+2 s), fra 5 s e 5 minuti; altrimenti 65 s.
    static func pauseFor(_ suggested: Double?) -> Double {
        guard let s = suggested, s.isFinite else { return Double(pauseSeconds) }
        return min(max(s + 2, 5), 300)
    }
'''),
('''    func kick() {
        guard runner == nil else { return }''','''    func kick() {
        if let u = stopUntil, Date() >= u { stopReason = nil; stopUntil = nil }
        guard runner == nil, stopReason == nil else { return }'''),
('''        while let next = jobs.first(where: { $0.state == .waiting }) {''','''        while stopReason == nil, let next = jobs.first(where: { $0.state == .waiting }) {'''),
('''    private func isRateLimit(_ e: Error) -> Bool {
        let m = (e as? AppError)?.message ?? ""
        return m.hasPrefix("Limite gratuito") || m.hasPrefix("Troppe richieste")
    }
''','''    /// Riprende la coda fermata per la quota giornaliera (anche dopo aver cambiato servizio o chiave).
    func resumeQueue() {
        stopReason = nil
        stopUntil = nil
        Recognizer.clearDailyBlocks()
        for j in jobs where j.state == .waiting && !j.message.isEmpty { set(j.id) { $0.message = "" } }
        kick()
    }
'''),
('''            if isRateLimit(error) {
                set(id) { $0.state = .waiting; $0.message = "In pausa per il limite del servizio, riprendo da solo." }
                pauseUntil = Date().addingTimeInterval(Double(Self.pauseSeconds))
                try? await Task.sleep(nanoseconds: Self.pauseSeconds * 1_000_000_000)
                pauseUntil = nil
            } else {''','''            if let ae = error as? AppError, ae.rate {
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
            } else {'''),
])

patch('AddView.swift',[
('''                if queue.pauseUntil != nil {
                    Section {
                        Label("In pausa per il limite del servizio gratuito, riprendo da solo.", systemImage: "pause.circle")
                            .font(.subheadline).foregroundStyle(.orange)
                    }
                }''','''                if let why = queue.stopReason {
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
                            Text("Limite al minuto del servizio gratuito: riprendo da solo tra \\(Text(timerInterval: Date.now...until, countsDown: true)).")
                        } icon: { Image(systemName: "pause.circle") }
                            .font(.subheadline).foregroundStyle(.orange)
                    }
                }'''),
('''            switch j.state {
            case .waiting, .reading, .searching: ProgressView().controlSize(.small)''','''            switch j.state {
            case .waiting where queue.stopReason != nil:
                Image(systemName: "pause.circle").foregroundStyle(.orange).font(.title3)
            case .waiting, .reading, .searching: ProgressView().controlSize(.small)'''),
('''                Text(detail(j)).font(.footnote).foregroundStyle(color(j)).lineLimit(3)''','''                if queue.pausedJob == j.id, let until = queue.pauseUntil, until > Date() {
                    Text("In pausa, riprendo tra \\(Text(timerInterval: Date.now...until, countsDown: true))")
                        .font(.footnote).foregroundStyle(.secondary).monospacedDigit()
                } else {
                    Text(detail(j)).font(.footnote).foregroundStyle(color(j)).lineLimit(3)
                }'''),
])
print('ok')
