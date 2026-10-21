// Modifica di più carte insieme (selezione multipla nell'album).

import SwiftUI

enum BulkPrice {
    case keep
    case set(Double)
    case market
}

extension AppStore {
    // stessa logica del web: se la nuova combinazione esiste già, le quantità si sommano nel doppione
    func bulkEdit(keys: Set<String>, lang: String?, variant: String?, cond: String?, price: BulkPrice) -> (n: Int, merged: Int) {
        pushUndo()
        var merged = 0
        let sel: [String] = catalog.filter { keys.contains($0.key) }.map { $0.key }
        for k in sel {
            guard let i = catalog.firstIndex(where: { $0.key == k }) else { continue }
            var e = catalog[i]
            switch price {
            case .set(let v): e.priceManual = v
            case .market: e.priceManual = nil
            case .keep: break
            }
            let nl = lang ?? e.lang
            let nv = variant ?? e.variant
            let nc = cond ?? e.cond
            let nk = Entry.makeKey(e.cardId, nl, nv, nc)
            if nk == e.key { catalog[i] = e; continue }
            if let j = catalog.firstIndex(where: { $0.key == nk }) {
                catalog[j].qty += e.qty
                if catalog[j].priceManual == nil, e.priceManual != nil { catalog[j].priceManual = e.priceManual }
                catalog.remove(at: i)
                merged += 1
                continue
            }
            e.lang = nl; e.variant = nv; e.cond = nc; e.key = nk
            if variant != nil, let pr = e.pr, let v = priceNum(pr, e.variant) { e.price = v }
            if cond != nil { e.condEst = nil; e.condNote = nil }
            catalog[i] = e
        }
        save()
        return (sel.count, merged)
    }
}

struct BulkEditSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let keys: Set<String>
    let onDone: () -> Void

    @State private var lang = ""
    @State private var variant = ""
    @State private var cond = ""
    @State private var priceOp = 0   // 0 invariato, 1 imposta, 2 torna al mercato
    @State private var priceText = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Cambia in tutte le carte selezionate") {
                    Picker("Lingua", selection: $lang) {
                        Text("Invariata").tag("")
                        ForEach(LANGS, id: \.self) { Text($0).tag($0) }
                    }
                    Picker("Variante", selection: $variant) {
                        Text("Invariata").tag("")
                        ForEach(VARS, id: \.self) { Text($0).tag($0) }
                    }
                    Picker("Condizione", selection: $cond) {
                        Text("Invariata").tag("")
                        ForEach(CONDS) { Text($0.code + " · " + $0.name).tag($0.code) }
                    }
                }
                Section("Prezzo") {
                    Picker("Prezzo", selection: $priceOp) {
                        Text("Invariato").tag(0)
                        Text("Imposta il mio prezzo").tag(1)
                        Text("Torna al prezzo di mercato").tag(2)
                    }
                    if priceOp == 1 {
                        HStack {
                            Text("Il tuo prezzo")
                            Spacer()
                            TextField("0,00", text: $priceText).keyboardType(.decimalPad).multilineTextAlignment(.trailing).frame(maxWidth: 120)
                            Text("€").foregroundStyle(.secondary)
                        }
                    }
                }
                Section {
                    Text("Se una carta diventa uguale a una che hai già, le quantità vengono sommate.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Modifica \(keys.count) \(keys.count == 1 ? "carta" : "carte")")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annulla") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Applica") { apply() }.buttonStyle(.glassProminent) }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func apply() {
        var price = BulkPrice.keep
        if priceOp == 1 {
            guard let v = parsePrice(priceText), v >= 0 else { store.toast("Scrivi un prezzo valido"); return }
            price = .set(v)
        } else if priceOp == 2 {
            price = .market
        }
        if lang.isEmpty && variant.isEmpty && cond.isEmpty && priceOp == 0 { dismiss(); return }
        let r = store.bulkEdit(keys: keys, lang: lang.isEmpty ? nil : lang, variant: variant.isEmpty ? nil : variant,
                               cond: cond.isEmpty ? nil : cond, price: price)
        store.showUndo("\(r.n) \(r.n == 1 ? "carta modificata" : "carte modificate")" + (r.merged > 0 ? ", \(r.merged) unite ai doppioni" : ""))
        onDone()
        dismiss()
    }
}
