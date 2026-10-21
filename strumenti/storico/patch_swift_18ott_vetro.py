# 18/10/2026 (sera): barra a schede in basso più trasparente: vetro "clear" al posto di "regular" per la capsula.
# La goccia della voce scelta e il tasto giallo restano su vetro regular tinto (si leggono bene).
# Con il vetro chiaro il contenuto sotto si vede di più: alone del colore di fondo dietro icone e scritte per leggerle.
D='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/'
def patch(name, pairs):
    p=D+name; s=open(p,encoding='utf-8').read()
    for old,new,*n in pairs:
        cnt=n[0] if n else 1
        assert s.count(old)==cnt,(name,old[:100],s.count(old))
        s=s.replace(old,new)
    open(p,'w',encoding='utf-8').write(s)

patch('Theme.swift',[
('''            .glassEffect(.regular.interactive(), in: .capsule)
        }''','''            .glassEffect(.clear.interactive(), in: .capsule)   // vetro chiaro: si vede il contenuto sotto
        }'''),
('''            .foregroundStyle(sel ? Theme.accent : Color.primary.opacity(0.85))
            .frame(maxWidth: .infinity, minHeight: Theme.scanSize)''','''            .foregroundStyle(sel ? Theme.accent : Color.primary.opacity(0.85))
            .shadow(color: Theme.bg.opacity(0.7), radius: 3)   // alone per leggere sul vetro chiaro sopra le immagini
            .frame(maxWidth: .infinity, minHeight: Theme.scanSize)'''),
])
print('ok')
