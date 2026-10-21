# 18/10/2026 (sera): (1) scheda carta: tocco sull'immagine → immagine a tutto schermo (pizzico, doppio tocco,
# trascina in basso o ✕ per chiudere); (2) dettaglio Pokédex: nella griglia "Tutte le carte" la tua carta senza
# immagine nella lingua dell'elenco mostrava "?" invece della sua anteprima (foto mia o immagine inglese).
D='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/'
def patch(name, pairs):
    p=D+name; s=open(p,encoding='utf-8').read()
    for old,new,*n in pairs:
        cnt=n[0] if n else 1
        assert s.count(old)==cnt,(name,old[:100],s.count(old))
        s=s.replace(old,new)
    open(p,'w',encoding='utf-8').write(s)

patch('Components.swift',[
('''struct CardThumb: View {''',
'''/// C'è davvero un'immagine da ingrandire (foto mia presente su disco o indirizzo valido)?
func canZoomImage(_ u: String) -> Bool {
    if u.hasPrefix(CardPhotos.scheme) { return CardPhotos.exists(String(u.dropFirst(CardPhotos.scheme.count))) }
    return cardImageURL(u) != nil
}

/// Immagine della carta a tutto schermo: pizzico per ingrandire (fino a 5×), doppio tocco 1×/2,5×,
/// trascina per spostarla quando è ingrandita; a 1× trascinando in basso (o in alto) oltre 120 pt si chiude; tasto ✕.
/// Fondo sempre nero (come fotocamera ed editor dei bordi: si guarda un'immagine).
struct CardZoomView: View {
    let url: String
    var name: String = ""
    var number: String = ""
    let onClose: () -> Void

    @State private var scale: CGFloat = 1
    @State private var baseScale: CGFloat = 1
    @State private var offset: CGSize = .zero
    @State private var baseOffset: CGSize = .zero

    static let maxScale: CGFloat = 5
    static let doubleTapScale: CGFloat = 2.5
    static let closeDrag: CGFloat = 120

    static func clampScale(_ s: CGFloat) -> CGFloat { min(max(s, 1), maxScale) }
    static func shouldClose(scale: CGFloat, dragHeight: CGFloat) -> Bool { scale <= 1.01 && abs(dragHeight) > closeDrag }
    static func backdrop(scale: CGFloat, dragHeight: CGFloat) -> Double {
        scale > 1.01 ? 1 : max(0.35, 1 - Double(abs(dragHeight)) / 400)
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.black.opacity(Self.backdrop(scale: scale, dragHeight: offset.height)).ignoresSafeArea()
            RemoteCardImage(url: url, name: name, number: number)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .padding(16)
                .scaleEffect(scale)
                .offset(offset)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .contentShape(Rectangle())
                .onTapGesture(count: 2) { toggleZoom() }
                .gesture(magnify.simultaneously(with: drag))
                .accessibilityLabel(name.isEmpty ? "Immagine della carta" : "Immagine di \\(name)")
            Button { onClose() } label: {
                Image(systemName: "xmark").font(.headline).foregroundStyle(.white).frame(width: 44, height: 44)
            }
            .buttonStyle(.glass)
            .padding(.trailing, 16)
            .padding(.top, 8)
            .accessibilityLabel("Chiudi")
        }
        .statusBarHidden()
        .environment(\\.colorScheme, .dark)   // vetro scuro anche col tema Perla
    }

    private var magnify: some Gesture {
        MagnifyGesture()
            .onChanged { v in scale = Self.clampScale(baseScale * v.magnification) }
            .onEnded { _ in
                baseScale = scale
                if scale <= 1.01 { withAnimation(.spring) { reset() } }
            }
    }

    private var drag: some Gesture {
        DragGesture()
            .onChanged { v in
                if scale > 1.01 {
                    offset = CGSize(width: baseOffset.width + v.translation.width, height: baseOffset.height + v.translation.height)
                } else {
                    offset = CGSize(width: 0, height: v.translation.height)
                }
            }
            .onEnded { v in
                if Self.shouldClose(scale: scale, dragHeight: v.translation.height) { onClose(); return }
                if scale > 1.01 { baseOffset = offset } else { withAnimation(.spring) { offset = .zero } }
            }
    }

    private func toggleZoom() {
        withAnimation(.spring) {
            if scale > 1.01 { reset() } else { scale = Self.doubleTapScale; baseScale = scale }
        }
    }

    private func reset() {
        scale = 1; baseScale = 1; offset = .zero; baseOffset = .zero
    }
}

struct CardThumb: View {'''),
])

patch('CardDetailView.swift',[
('''    @State private var photoBusy = false
''','''    @State private var photoBusy = false
    @State private var zoom = false        // immagine a tutto schermo
'''),
('''                CardArt(url: hiImg(previewURL(e)), radius: 10, name: e.name, number: e.number)
                    .frame(width: 128)
                    .shadow(color: .black.opacity(0.5), radius: 10, y: 4)
''','''                let art = hiImg(previewURL(e))
                Button { zoom = true } label: {
                    CardArt(url: art, radius: 10, name: e.name, number: e.number)
                }
                .buttonStyle(.plain)
                .allowsHitTesting(canZoomImage(art))   // senza immagine (riquadro con le iniziali) non si apre
                .accessibilityLabel("Ingrandisci l'immagine")
                .frame(width: 128)
                .shadow(color: .black.opacity(0.5), radius: 10, y: 4)
                .fullScreenCover(isPresented: $zoom) {
                    CardZoomView(url: art, name: e.name, number: e.number) { zoom = false }
                }
'''),
])

patch('DexViews.swift',[
('''                                        CardThumb(url: c.image.isEmpty ? "" : c.image + "/low.webp", width: 96, radius: 8)
                                            .saturation(isOwned ? 1 : 0).opacity(isOwned ? 1 : 0.35)''',
'''                                        CardThumb(url: gridImage(c, mineHere), width: 96, radius: 8,
                                                  name: mineHere?.name ?? "", number: mineHere?.number ?? "")
                                            .saturation(isOwned ? 1 : 0).opacity(isOwned ? 1 : 0.35)'''),
('''    /// Le tue carte indicizzate per id normalizzato''',
'''    /// Immagine di una carta della griglia: quella dell'elenco se c'è; se manca (tipico delle carte IT su TCGdex)
    /// e la carta è tua, la stessa anteprima di "Le tue carte" (foto mia o immagine inglese); altrimenti "?".
    private func gridImage(_ c: SetCardSummary, _ mine: Entry?) -> String {
        if !c.image.isEmpty { return c.image + "/low.webp" }
        if let e = mine { return previewURL(e) }
        return ""
    }

    /// Le tue carte indicizzate per id normalizzato'''),
])
print('ok')
