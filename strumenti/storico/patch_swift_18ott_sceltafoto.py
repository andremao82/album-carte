# 18/10/2026 (sera, correzione della richiesta precedente): l'immagine da internet ha la priorità, ma dalla scheda si può
# scegliere la mia foto e poi tornare all'immagine da internet (la foto resta salvata). Campo nuovo nella voce:
# photoPref = "own" (mia foto) / "web" (internet) / nil (automatico: ufficiale > foto della scansione > inglese).
D='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/'
def patch(name, pairs):
    p=D+name; s=open(p,encoding='utf-8').read()
    for old,new,*n in pairs:
        cnt=n[0] if n else 1
        assert s.count(old)==cnt,(name,old[:100],s.count(old))
        s=s.replace(old,new)
    open(p,'w',encoding='utf-8').write(s)

patch('Models.swift',[
('''    var photo: String?    // id della mia foto (CardPhotos), solo per carte senza immagine nella loro lingua
    var photoQuad: [Double]?  // bordi della foto, 8 numeri 0-1, per rifare il ritaglio
''','''    var photo: String?    // id della mia foto (CardPhotos)
    var photoQuad: [Double]?  // bordi della foto, 8 numeri 0-1, per rifare il ritaglio
    var photoPref: String?    // anteprima scelta: "own" = mia foto, "web" = immagine da internet, nil = automatico
'''),
('''        self.photoQuad = try? c.decodeIfPresent([Double].self, forKey: .photoQuad)
''','''        self.photoQuad = try? c.decodeIfPresent([Double].self, forKey: .photoQuad)
        let pp = c.lenientString(.photoPref)
        self.photoPref = (pp == "own" || pp == "web") ? pp : nil
'''),
])

patch('CardPhotos.swift',[
('''// Foto mie delle carte (18/10/2026). La coda di scansione la tiene da sola solo per le carte senza immagine ufficiale
// nella loro lingua; dalla scheda si può mettere su qualsiasi carta, anche al posto dell'immagine ufficiale.
// Ordine dell'anteprima: mia foto > immagine ufficiale nella lingua della carta > immagine inglese di ripiego > iniziali.''',
'''// Foto mie delle carte (18/10/2026). La coda di scansione la tiene da sola solo per le carte senza immagine ufficiale
// nella loro lingua; dalla scheda si può scattare su qualsiasi carta.
// Anteprima: se ho scelto (photoPref) vale la scelta: "own" = mia foto, "web" = immagine da internet (se manca, la foto).
// Automatico (nil): immagine ufficiale nella lingua della carta > mia foto > immagine inglese di ripiego > iniziali.'''),
('''func previewURL(_ e: Entry) -> String {
    if let p = e.photo, CardPhotos.exists(p) { return CardPhotos.scheme + p }
    return e.img
}

/// Testo del tasto che toglie la mia foto: dice a cosa si torna.
func removePhotoLabel(_ e: Entry) -> String {
    if hasOfficialImage(e) { return "Torna all'immagine ufficiale" }
    if cardImageURL(e.img) != nil { return "Torna all'immagine inglese" }
    return "Rimuovi la foto"
}''','''func previewURL(_ e: Entry) -> String {
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
}'''),
('''        catalog[i].photo = id
        catalog[i].photoQuad = CardPhotos.flatQuad(quad)
        save()
        return true
    }

    func removePhoto(key: String) {
        update(key) { $0.photo = nil; $0.photoQuad = nil }
    }''','''        catalog[i].photo = id
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
    }'''),
])

patch('CardDetailView.swift',[
('''                photoMenu(e)   // sempre: la mia foto può sostituire anche l'immagine ufficiale''',
'''                photoMenu(e)   // sempre: si può scattare una foto e sceglierla al posto dell'immagine da internet'''),
('''        let has = CardPhotos.exists(e.photo)
        return Menu {
            if CardPhotos.hasOriginal(e.photo) {''','''        let has = CardPhotos.exists(e.photo)
        let own = showsOwnPhoto(e)
        return Menu {
            if has && own && cardImageURL(e.img) != nil {
                Button(webImageLabel(e), systemImage: "globe") { store.setPhotoPref(key: currentKey, "web") }
            }
            if has && !own {
                Button("Usa la mia foto", systemImage: "person.crop.square") { store.setPhotoPref(key: currentKey, "own") }
            }
            if CardPhotos.hasOriginal(e.photo) {'''),
('''                Button(removePhotoLabel(e), systemImage: "arrow.uturn.backward", role: .destructive) { store.removePhoto(key: currentKey) }''',
'''                Button("Elimina la foto", systemImage: "trash", role: .destructive) { store.removePhoto(key: currentKey) }'''),
])

patch('DexViews.swift',[
('''        if let e = mine, CardPhotos.exists(e.photo) { return previewURL(e) }   // la mia foto vince anche qui''',
'''        if let e = mine, showsOwnPhoto(e) { return previewURL(e) }   // ho scelto la mia foto: anche qui'''),
('''    /// Immagine di una carta della griglia: la mia foto se c'è, poi quella dell'elenco;''',
'''    /// Immagine di una carta della griglia: la mia foto se è la sua anteprima, poi quella dell'elenco;'''),
])
print('ok')
