# 18/10/2026: miniature ferme sulla rotellina per le carte senza immagine (tipico delle carte IT su TCGdex).
# AsyncImage con indirizzo vuoto resta "vuoto" per sempre. Ora: riquadro con iniziali e numero, secondo tentativo
# se lo scaricamento fallisce, e immagine della versione inglese (stesso id TCGdex) come ripiego, salvata nella voce.
D='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/'
def patch(name, pairs):
    p=D+name; s=open(p,encoding='utf-8').read()
    for old,new,*n in pairs:
        cnt=n[0] if n else 1
        assert s.count(old)==cnt,(name,old[:100],s.count(old))
        s=s.replace(old,new)
    open(p,'w',encoding='utf-8').write(s)

patch('Components.swift',[
('''struct CardThumb: View {
    let url: String
    var width: CGFloat = 52
    var radius: CGFloat = 6

    var body: some View {
        AsyncImage(url: URL(string: url)) { phase in
            switch phase {
            case .success(let img):
                img.resizable().scaledToFit()
            case .failure:
                placeholder(systemImage: "photo")
            default:
                placeholder(systemImage: nil)
            }
        }
        .frame(width: width, height: width * 88 / 63)
        .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
    }

    private func placeholder(systemImage: String?) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: radius, style: .continuous).fill(.quaternary)
            if let s = systemImage { Image(systemName: s).foregroundStyle(.secondary) } else { ProgressView().controlSize(.small) }
        }
    }
}''','''/// Indirizzo dell'immagine: nil se vuoto o non valido (AsyncImage con nil resta in caricamento per sempre).
func cardImageURL(_ s: String) -> URL? {
    let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !t.isEmpty, let u = URL(string: t), u.scheme != nil else { return nil }
    return u
}

/// Immagine di una carta dalla rete: rotellina solo mentre scarica; senza indirizzo o dopo due tentativi falliti
/// mostra un riquadro con le iniziali del nome e il numero.
struct RemoteCardImage: View {
    let url: String
    var name: String = ""
    var number: String = ""
    var fill = false
    @State private var attempt = 0

    static let maxAttempts = 2

    var body: some View {
        if let u = cardImageURL(url) {
            AsyncImage(url: u) { phase in
                switch phase {
                case .success(let img):
                    if fill { img.resizable().scaledToFill() } else { img.resizable().scaledToFit() }
                case .failure:
                    if attempt + 1 < Self.maxAttempts {
                        loading.task {
                            try? await Task.sleep(nanoseconds: 800_000_000)
                            attempt += 1
                        }
                    } else {
                        CardPlaceholder(name: name, number: number)
                    }
                default:
                    loading
                }
            }
            .id(attempt)
        } else {
            CardPlaceholder(name: name, number: number)
        }
    }

    private var loading: some View {
        ZStack { Theme.panelHi; ProgressView().controlSize(.small) }
    }
}

/// Riquadro per una carta senza immagine (come le iniziali dell'app web).
struct CardPlaceholder: View {
    var name: String = ""
    var number: String = ""
    var body: some View {
        ZStack {
            Theme.panelHi
            VStack(spacing: 2) {
                Text(name.isEmpty ? "?" : initials(name))
                    .font(.system(size: 34, weight: .heavy, design: .rounded))
                    .minimumScaleFactor(0.3).lineLimit(1)
                if !number.isEmpty {
                    Text(number).font(.caption2.weight(.semibold)).minimumScaleFactor(0.5).lineLimit(1)
                }
            }
            .foregroundStyle(.secondary)
            .padding(4)
        }
        .accessibilityLabel(name.isEmpty ? "Carta senza immagine" : name + ", senza immagine")
    }
}

struct CardThumb: View {
    let url: String
    var width: CGFloat = 52
    var radius: CGFloat = 6
    var name: String = ""
    var number: String = ""

    var body: some View {
        RemoteCardImage(url: url, name: name, number: number)
            .frame(width: width, height: width * 88 / 63)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
    }
}'''),
('''            CardThumb(url: e.img)
            VStack(alignment: .leading, spacing: 4) {
                Text(e.name).font(.headline).lineLimit(1)''','''            CardThumb(url: e.img, name: e.name, number: e.number)
            VStack(alignment: .leading, spacing: 4) {
                Text(e.name).font(.headline).lineLimit(1)'''),
])

patch('Theme.swift',[
('''struct CardArt: View {
    let url: String
    var radius: CGFloat = 8
    var body: some View {
        Color.clear
            .aspectRatio(63.0 / 88.0, contentMode: .fit)
            .overlay {
                AsyncImage(url: URL(string: url)) { phase in
                    switch phase {
                    case .success(let img): img.resizable().scaledToFill()
                    case .failure: ZStack { Theme.panelHi; Image(systemName: "photo").foregroundStyle(.secondary) }
                    default: ZStack { Theme.panelHi; ProgressView().controlSize(.small) }
                    }
                }
            }''','''struct CardArt: View {
    let url: String
    var radius: CGFloat = 8
    var name: String = ""
    var number: String = ""
    var body: some View {
        Color.clear
            .aspectRatio(63.0 / 88.0, contentMode: .fit)
            .overlay {
                RemoteCardImage(url: url, name: name, number: number, fill: true)
            }'''),
])

patch('AlbumView.swift',[
('''            CardArt(url: e.img)
                .overlay(alignment: .topTrailing) { if e.qty > 1 { QtyBadge(qty: e.qty) } }''','''            CardArt(url: e.img, name: e.name, number: e.number)
                .overlay(alignment: .topTrailing) { if e.qty > 1 { QtyBadge(qty: e.qty) } }'''),
('''CardThumb(url: m.e.img, width: 38)''','''CardThumb(url: m.e.img, width: 38, name: m.e.name, number: m.e.number)'''),
])
patch('HomeView.swift',[
('''CardArt(url: e.img).frame(width: 74)''','''CardArt(url: e.img, name: e.name, number: e.number).frame(width: 74)'''),
])
patch('DexViews.swift',[
('''CardThumb(url: e.img, width: 96, radius: 8)''','''CardThumb(url: e.img, width: 96, radius: 8, name: e.name, number: e.number)'''),
])
patch('AddView.swift',[
('''CardThumb(url: c.imageSmall, width: 46)''','''CardThumb(url: c.imageSmall, width: 46, name: c.name, number: c.number)'''),
('''CardThumb(url: hiImg(cand.imageSmall), width: 110, radius: 8)''','''CardThumb(url: hiImg(cand.imageSmall), width: 110, radius: 8, name: cand.name, number: cand.number)'''),
])
patch('CardDetailView.swift',[
('''            CardArt(url: hiImg(e.img), radius: 10)
                .frame(width: 128)
                .shadow(color: .black.opacity(0.5), radius: 10, y: 4)''','''            VStack(spacing: 4) {
                CardArt(url: hiImg(e.img), radius: 10, name: e.name, number: e.number)
                    .frame(width: 128)
                    .shadow(color: .black.opacity(0.5), radius: 10, y: 4)
                if let n = imgNote(e) { Text(n).font(.caption2).foregroundStyle(.secondary).multilineTextAlignment(.center).frame(width: 128) }
            }'''),
('''    // MARK: - Testata
''','''    // MARK: - Testata

    private func imgNote(_ e: Entry) -> String? {
        if e.imgFrom == "EN" && e.lang != "EN" { return "Immagine della versione inglese" }
        return nil
    }
'''),
])

patch('Models.swift',[
('''    var condNote: String?

    var id: String { key }''','''    var condNote: String?
    var imgFrom: String?  // lingua da cui viene l'immagine presa come ripiego ("EN"); "" = cercata, nessuna trovata

    var id: String { key }'''),
('''        self.condNote = c.lenientString(.condNote)
    }''','''        self.condNote = c.lenientString(.condNote)
        self.imgFrom = c.lenientString(.imgFrom)
    }'''),
])

patch('StoreOps.swift',[
('''    func pendingDex() -> Int {''','''    /// Voci senza immagine da cercare: solo carte TCGdex mai cercate (imgFrom nil).
    static func needsImage(_ e: Entry) -> Bool {
        cardImageURL(e.img) == nil && e.imgFrom == nil && e.src == "tcgdex" && !(e.srcId ?? "").isEmpty
    }

    /// Lingue da provare per l'immagine: prima la lingua della carta (TCGdex può averla aggiunta), poi l'inglese.
    static func imageLangs(_ srcLang: String?) -> [String] {
        let l = (srcLang ?? "").lowercased()
        return l.isEmpty || l == "en" ? ["en"] : [l, "en"]
    }

    /// Cerca l'immagine delle carte che non ce l'hanno: stessa carta su TCGdex nella sua lingua, poi in inglese.
    /// Si salva il risultato (anche "nessuna": imgFrom = "") così non si ripete a ogni avvio; errori di rete = si riprova dopo.
    func fillMissingImages() async {
        if imgFillRunning { return }
        let need = catalog.filter { Self.needsImage($0) }
        if need.isEmpty { return }
        imgFillRunning = true
        defer { imgFillRunning = false }
        struct ImgGroup { var sid: String; var lang: String?; var keys: [String] }
        var groups: [String: ImgGroup] = [:]
        for e in need {
            let sid: String = e.srcId ?? ""
            let k: String = (e.srcLang ?? "") + "/" + sid
            var g: ImgGroup = groups[k] ?? ImgGroup(sid: sid, lang: e.srcLang, keys: [])
            g.keys.append(e.key)
            groups[k] = g
        }
        var changed = false
        for (_, g) in groups {
            var found: String? = nil
            var from = ""
            var failed = false
            for l in Self.imageLangs(g.lang) {
                do {
                    if let c = try await TCGdex.card(lang: l, id: g.sid), cardImageURL(c.imageSmall) != nil {
                        found = c.imageSmall; from = l.uppercased(); break
                    }
                } catch { failed = true; break }
            }
            if failed { continue }
            let ks = Set(g.keys)
            for j in catalog.indices where ks.contains(catalog[j].key) && Self.needsImage(catalog[j]) {
                if let f = found { catalog[j].img = f }
                catalog[j].imgFrom = found == nil ? "" : from
                changed = true
            }
        }
        if changed { save() }
    }

    func pendingDex() -> Int {'''),
])

patch('Store.swift',[
('''    var dexFill = DexFill()''','''    var dexFill = DexFill()
    @ObservationIgnored var imgFillRunning = false'''),
])
patch('CartePokemonApp.swift',[
('''        .task { await store.refreshFx() }''','''        .task {
            await store.refreshFx()
            await store.fillMissingImages()
        }'''),
])
print('ok')
patch('Store.swift',[
('''            catalog.append(e)
            recordPrice(e)
        }
        save()
        return key''','''            catalog.append(e)
            recordPrice(e)
            if AppStore.needsImage(e) { Task { await self.fillMissingImages() } }
        }
        save()
        return key'''),
])
print('ok 2')
