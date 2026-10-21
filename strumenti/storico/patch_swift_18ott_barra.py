# 18/10/2026: tasto giallo di scansione centrato nella barra (non sborda più sopra).
p='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/Theme.swift'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(old[:100],s.count(old))
    s=s.replace(old,new)
rep('''    static let barHeight: CGFloat = 76''','''    static let barHeight: CGFloat = 76
    /// Diametro del tasto giallo: uguale all'altezza delle voci, così sta dentro la barra.
    static let scanSize: CGFloat = 52''')
rep('''            .frame(maxWidth: .infinity)
            .padding(.vertical, 7)
            .background(sel''','''            .frame(maxWidth: .infinity, minHeight: Theme.scanSize)
            .background(sel''')
rep('''                Image(systemName: "viewfinder").font(.system(size: 24, weight: .bold))''','''                Image(systemName: "viewfinder").font(.system(size: 22, weight: .bold))''')
rep('''            .frame(width: 60, height: 60)
            .contentShape(Circle())''','''            .frame(width: Theme.scanSize, height: Theme.scanSize)
            .contentShape(Circle())''')
rep('''        .offset(y: -12)
        .accessibilityLabel("Aggiungi carte")''','''        .accessibilityLabel("Aggiungi carte")''')
open(p,'w',encoding='utf-8').write(s); print('ok')
