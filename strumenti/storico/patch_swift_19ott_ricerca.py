# 19/10/2026: Venusaur 30/165 di Expedition (IT) non veniva riconosciuto: su TCGdex la ricerca per numero/totale
# trovava la carta 30 di un altro set da 165 (Scarlatto e Violetto 151) e la teneva anche con nome diverso;
# avendo un risultato, la Pokémon TCG API (che ha Expedition) non veniva mai interrogata.
# Ora i risultati con nome o numero diversi sono "deboli": la ricerca continua e si usano solo se non c'è di meglio.
D='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/'
def patch(name, pairs):
    p=D+name; s=open(p,encoding='utf-8').read()
    for old,new,*n in pairs:
        cnt=n[0] if n else 1
        assert s.count(old)==cnt,(name,old[:100],s.count(old))
        s=s.replace(old,new)
    open(p,'w',encoding='utf-8').write(s)

patch('API.swift',[
('''    static func search(name: String, num: String, tot: String, lang: String?) async throws -> [Candidate] {
        let lg = (lang ?? "").isEmpty ? "it" : lang!''',
'''    static func search(name: String, num: String, tot: String, lang: String?) async throws -> [Candidate] {
        try await searchRanked(name: name, num: num, tot: tot, lang: lang).cards
    }

    /// weak = nessuna carta con nome e numero giusti: sono solo le più vicine (stesso numero con altro nome,
    /// oppure stesso nome con altro numero). Chi chiama prova altre fonti prima di usarle.
    static func searchRanked(name: String, num: String, tot: String, lang: String?) async throws -> (cards: [Candidate], weak: Bool) {
        let lg = (lang ?? "").isEmpty ? "it" : lang!'''),
('''        var ids: [String] = []
        if !num.isEmpty && !tot.isEmpty {
            let sets = try await setList(lg)''',
'''        var ids: [String] = []
        var weakIds: [String] = []
        if !num.isEmpty && !tot.isEmpty {
            let sets = try await setList(lg)'''),
('''            ids = (byName.isEmpty ? hits : byName).map { jstr($0["id"]) }
        }''',
'''            if name.isEmpty || !byName.isEmpty { ids = (name.isEmpty ? hits : byName).map { jstr($0["id"]) } }
            else { weakIds = hits.map { jstr($0["id"]) } }
        }'''),
('''                var l: [JSON] = list.compactMap { $0 as? JSON }
                if !num.isEmpty {
                    let f = l.filter { sameNum(jstr($0["localId"])) }
                    if !f.isEmpty { l = f }
                }
                ids = l.prefix(8).map { jstr($0["id"]) }''',
'''                let l: [JSON] = list.compactMap { $0 as? JSON }
                let f: [JSON] = num.isEmpty ? l : l.filter { sameNum(jstr($0["localId"])) }
                if !f.isEmpty { ids = f.prefix(8).map { jstr($0["id"]) } }
                else if weakIds.isEmpty { weakIds = l.prefix(8).map { jstr($0["id"]) } }'''),
('''        if ids.isEmpty { return [] }
        let pick = Array(ids.prefix(8))''',
'''        let weak = ids.isEmpty
        if weak { ids = weakIds }
        if ids.isEmpty { return ([], false) }
        let pick = Array(ids.prefix(8))'''),
('''            if let d = d, let o = parseJSON(d) as? JSON { result.append(candidate(o, lang: lg)) }
        }
        return result
    }''',
'''            if let d = d, let o = parseJSON(d) as? JSON { result.append(candidate(o, lang: lg)) }
        }
        return (result, weak)
    }'''),
('''    static func search(name: String, num: String, tot: String, key: String) async throws -> [Candidate] {
        var queries: [String] = []''',
'''    static func search(name: String, num: String, tot: String, key: String) async throws -> [Candidate] {
        try await searchRanked(name: name, num: num, tot: tot, key: key).cards
    }

    /// Come TCGdex.searchRanked: con numero e totale si tengono le carte col nome giusto (30/165 è sia Venusaur
    /// di Expedition sia una carta di 151); le altre e la ricerca per solo nome sono risultati deboli.
    static func searchRanked(name: String, num: String, tot: String, key: String) async throws -> (cards: [Candidate], weak: Bool) {
        func norm(_ s: String) -> String { s.lowercased().filter { $0.isLetter || $0.isNumber } }
        let nn = norm(name)
        var weak: [Candidate] = []
        var queries: [String] = []'''),
('''                let f = try await get(q: q, tries: 1, timeout: 12, key: key)
                anyOk = true
                if !f.isEmpty { return f.map { candidate($0) } }''',
'''                let f = try await get(q: q, tries: 1, timeout: 12, key: key)
                anyOk = true
                if f.isEmpty { continue }
                let cs: [Candidate] = f.map { candidate($0) }
                let byNumTot = q.contains("set.printedTotal:")
                let nameOnly = !q.contains("number:")
                if byNumTot && !nn.isEmpty {
                    let same: [Candidate] = cs.filter { c in
                        let cn = norm(c.name)
                        return !cn.isEmpty && (cn.contains(nn) || nn.contains(cn))
                    }
                    if !same.isEmpty { return (same, false) }
                    if weak.isEmpty { weak = cs }
                    continue
                }
                if nameOnly && !num.isEmpty {
                    if weak.isEmpty { weak = cs }
                    continue
                }
                return (cs, false)'''),
('''        if !anyOk, let e = lastErr { throw e }
        return []
    }

    static let select''',
'''        if !anyOk, let e = lastErr { throw e }
        return (weak, !weak.isEmpty)
    }

    static let select'''),
])

patch('StoreOps.swift',[
('''    var source = ""
    var errors: [Error] = []
}''',
'''    var source = ""
    var errors: [Error] = []
    var weak = false          // nessuna carta con nome e numero giusti: solo le più vicine
}'''),
('''        var out = SearchOutcome()
        do {
            out.found = try await TCGdex.search(name: tdName ?? name, num: num, tot: tot, lang: lang)
            out.source = "TCGdex"
        } catch { out.errors.append(error) }
        if out.found.isEmpty {
            do {
                out.found = try await PTCG.search(name: name, num: num, tot: tot, key: tcgKey)
                out.source = "Pokémon TCG API"
            } catch { out.errors.append(error) }
        }
        return out''',
'''        var out = SearchOutcome()
        var weakTd: [Candidate] = []
        do {
            let r = try await TCGdex.searchRanked(name: tdName ?? name, num: num, tot: tot, lang: lang)
            if r.weak { weakTd = r.cards } else { out.found = r.cards; out.source = "TCGdex" }
        } catch { out.errors.append(error) }
        if out.found.isEmpty {
            do {
                let r = try await PTCG.searchRanked(name: name, num: num, tot: tot, key: tcgKey)
                // un risultato debole della Pokémon TCG API non scavalca uno debole di TCGdex (che ha le carte italiane)
                if !r.cards.isEmpty && (!r.weak || weakTd.isEmpty) { out.found = r.cards; out.source = "Pokémon TCG API"; out.weak = r.weak }
            } catch { out.errors.append(error) }
        }
        if out.found.isEmpty && !weakTd.isEmpty { out.found = weakTd; out.source = "TCGdex"; out.weak = true }
        return out'''),
])

patch('AddView.swift',[
('''        source = o.source
        results = o.found
        if o.found.isEmpty {''',
'''        source = o.source
        results = o.found
        if o.weak && !o.found.isEmpty {
            message = "Nessuna carta con questo nome e questo numero: ecco le più vicine. Controlla nome, numero e totale."
        }
        if o.found.isEmpty {'''),
])
print('ok')
