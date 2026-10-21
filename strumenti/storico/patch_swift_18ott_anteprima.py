# 18/10/2026 (sera): l'anteprima si può sempre sostituire con una mia foto, anche se la carta ha l'immagine
# ufficiale (prima il tasto Foto c'era solo senza immagine ufficiale). Nuovo ordine: mia foto > ufficiale > inglese > iniziali.
# "Rimuovi" riporta all'immagine da internet. La coda di scansione continua ad attaccare la foto solo alle carte senza immagine.
D='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/'
def patch(name, pairs):
    p=D+name; s=open(p,encoding='utf-8').read()
    for old,new,*n in pairs:
        cnt=n[0] if n else 1
        assert s.count(old)==cnt,(name,old[:100],s.count(old))
        s=s.replace(old,new)
    open(p,'w',encoding='utf-8').write(s)

patch('CardPhotos.swift',[
('''// Foto mie delle carte senza immagine ufficiale nella loro lingua (18/10/2026).
// Ordine dell'anteprima: immagine ufficiale nella lingua della carta > mia foto > immagine inglese di ripiego > iniziali.''',
'''// Foto mie delle carte (18/10/2026). La coda di scansione la tiene da sola solo per le carte senza immagine ufficiale
// nella loro lingua; dalla scheda si può mettere su qualsiasi carta, anche al posto dell'immagine ufficiale.
// Ordine dell'anteprima: mia foto > immagine ufficiale nella lingua della carta > immagine inglese di ripiego > iniziali.'''),
('''func previewURL(_ e: Entry) -> String {
    if hasOfficialImage(e) { return e.img }
    if let p = e.photo, CardPhotos.exists(p) { return CardPhotos.scheme + p }
    return e.img
}''','''func previewURL(_ e: Entry) -> String {
    if let p = e.photo, CardPhotos.exists(p) { return CardPhotos.scheme + p }
    return e.img
}

/// Testo del tasto che toglie la mia foto: dice a cosa si torna.
func removePhotoLabel(_ e: Entry) -> String {
    if hasOfficialImage(e) { return "Torna all'immagine ufficiale" }
    if cardImageURL(e.img) != nil { return "Torna all'immagine inglese" }
    return "Rimuovi la foto"
}'''),
])

patch('CardDetailView.swift',[
('''                if !hasOfficialImage(e) { photoMenu(e) }''','''                photoMenu(e)   // sempre: la mia foto può sostituire anche l'immagine ufficiale'''),
('''                Button("Rimuovi la foto", systemImage: "trash", role: .destructive) { store.removePhoto(key: currentKey) }''',
'''                Button(removePhotoLabel(e), systemImage: "arrow.uturn.backward", role: .destructive) { store.removePhoto(key: currentKey) }'''),
])

patch('DexViews.swift',[
('''    private func gridImage(_ c: SetCardSummary, _ mine: Entry?) -> String {
        if !c.image.isEmpty { return c.image + "/low.webp" }''','''    private func gridImage(_ c: SetCardSummary, _ mine: Entry?) -> String {
        if let e = mine, CardPhotos.exists(e.photo) { return previewURL(e) }   // la mia foto vince anche qui
        if !c.image.isEmpty { return c.image + "/low.webp" }'''),
('''    /// Immagine di una carta della griglia: quella dell'elenco se c'è;''','''    /// Immagine di una carta della griglia: la mia foto se c'è, poi quella dell'elenco;'''),
])
print('ok')
