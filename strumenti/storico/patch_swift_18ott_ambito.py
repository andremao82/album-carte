# Contatore Progressi rispetto a tutti i set, con selettore Iniziati / Ufficiali / Tutti (18/10/2026).
exec(open('/home/claude/work/patch_swift.py').read().split('# ---- Theme')[0])
s=F('SetsView.swift')
s.rep("""struct SetsSummary {
    var have = 0
    var total = 0
    var started = 0
    var complete = 0
""","""struct SetsSummary {
    var have = 0
    var total = 0
    var started = 0
    var complete = 0
    var sets = 0   // set contati nel totale (nel confronto con tutti i set sono più degli iniziati)
""")
s.rep("""enum SetFilter: String, CaseIterable, Identifiable {""","""/// Rispetto a cosa si conta il progresso: solo i set iniziati, tutti i set contando le carte ufficiali, o tutti i set con le segrete.
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

enum SetFilter: String, CaseIterable, Identifiable {""")
s.rep("""    func setsSummary() -> SetsSummary {
        var s = SetsSummary()
        for g in groupSets() {
            s.started += 1
            let t = totalOf(g)
            if t > 0 {
                s.total += t
                s.have += min(g.nums.count, t)
                if g.nums.count >= t { s.complete += 1 }
            }
        }
        return s
    }""","""    /// Carte ufficiali del set (quelle col numero stampato sul totale, senza segrete).
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
    }""")
s.rep("    @State private var filter: SetFilter = .open\n","    @State private var filter: SetFilter = .open\n    @AppStorage(\"setsScope\") private var scopeRaw = SetScope.all.rawValue\n    private var scope: SetScope { SetScope(rawValue: scopeRaw) ?? .all }\n")
s.rep("""        let s = store.setsSummary()
        let pct = String(format: "%.1f", s.pct).replacingOccurrences(of: ".", with: ",") + "%"
        return HStack(spacing: 16) {""","""        let s = store.setsSummary(scope: scope)
        let pct = setsPercent(s.pct)
        return VStack(spacing: 14) {
        HStack(spacing: 16) {""")
s.rep("""                Text("carte nei set iniziati").font(.subheadline.weight(.medium))
                Text("\\(s.started) \\(s.started == 1 ? "set iniziato" : "set iniziati") · \\(s.complete) \\(s.complete == 1 ? "completo" : "completi")")
                    .font(.subheadline).foregroundStyle(.secondary)""","""                Text(scope.caption).font(.subheadline.weight(.medium))
                Text(setsLine(s, scope: scope)).font(.subheadline).foregroundStyle(.secondary)""")
s.rep("""                Text(pct).font(.system(size: 18, weight: .heavy, design: .rounded)).minimumScaleFactor(0.6).lineLimit(1).frame(width: 60)
            }
        }
        .panel(padding: 18)""","""                Text(pct).font(.system(size: 18, weight: .heavy, design: .rounded)).minimumScaleFactor(0.6).lineLimit(1).frame(width: 60)
            }
        }
            HStack(spacing: 6) {
                ForEach(SetScope.allCases) { sc in
                    Button { scopeRaw = sc.rawValue } label: {
                        Text(sc.rawValue).font(.subheadline.weight(.semibold)).lineLimit(1)
                            .frame(maxWidth: .infinity).padding(.vertical, 8)
                            .foregroundStyle(scope == sc ? Color.black : Color.primary)
                            .background(scope == sc ? Theme.accent : Theme.panelHi, in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(scope == sc ? .isSelected : [])
                }
            }
        }
        .panel(padding: 18)""")
s.rep("""/// Riga di un set: logo,""","""/// Seconda riga della scheda riepilogo: "2 set iniziati · 0 completi" oppure "2 iniziati su 96 set · 0 completi".
func setsLine(_ s: SetsSummary, scope: SetScope) -> String {
    let comp = "\\(s.complete) \\(s.complete == 1 ? "completo" : "completi")"
    if scope == .started { return "\\(s.started) \\(s.started == 1 ? "set iniziato" : "set iniziati") · \\(comp)" }
    return "\\(s.started) \\(s.started == 1 ? "iniziato" : "iniziati") su \\(max(s.sets, s.started)) set · \\(comp)"
}

/// Riga di un set: logo,""")
s.save()
m=F('Models.swift')
m.s=m.s.rstrip('\\n')+'''

/// Percentuale dei Progressi: una cifra decimale, due sotto l'1% (così "0,02%" non diventa "0,0%").
func setsPercent(_ p: Double) -> String {
    String(format: p > 0 && p < 1 ? "%.2f" : "%.1f", p).replacingOccurrences(of: ".", with: ",") + "%"
}
'''
m.save()
print('ok')
