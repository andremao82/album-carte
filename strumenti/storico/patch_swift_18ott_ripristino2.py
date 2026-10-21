# 18/10/2026: Xcode "unable to type-check this expression in reasonable time" su topValueEntries.
# Riscritta in passi separati con tipi espliciti (stessa regola: prezzo di una copia, senza prezzo esclusi, max n).
p='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/Components.swift'
s=open(p,encoding='utf-8').read()
old='''    Array(catalog.compactMap { e in unit(e).map { (e, $0) } }
        .sorted { $0.1 != $1.1 ? $0.1 > $1.1 : $0.0.added > $1.0.added }
        .prefix(n).map { $0.0 })
}'''
new='''    var priced: [(entry: Entry, price: Double)] = []
    for e in catalog {
        if let u = unit(e) { priced.append((entry: e, price: u)) }
    }
    priced.sort { (a: (entry: Entry, price: Double), b: (entry: Entry, price: Double)) -> Bool in
        if a.price != b.price { return a.price > b.price }
        return a.entry.added > b.entry.added
    }
    return priced.prefix(n).map { (x: (entry: Entry, price: Double)) -> Entry in x.entry }
}'''
assert s.count(old)==1
open(p,'w',encoding='utf-8').write(s.replace(old,new)); print('ok')
