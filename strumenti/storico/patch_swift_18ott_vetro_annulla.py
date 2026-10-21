# 18/10/2026 (sera): annullata patch_swift_18ott_vetro.py su richiesta dell'utente ("era meglio prima"):
# capsula di nuovo in vetro regular, tolto l'alone dietro icone e scritte.
D='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/'
def patch(name, pairs):
    p=D+name; s=open(p,encoding='utf-8').read()
    for old,new,*n in pairs:
        cnt=n[0] if n else 1
        assert s.count(old)==cnt,(name,old[:100],s.count(old))
        s=s.replace(old,new)
    open(p,'w',encoding='utf-8').write(s)

patch('Theme.swift',[
('''            .glassEffect(.clear.interactive(), in: .capsule)   // vetro chiaro: si vede il contenuto sotto
        }''','''            .glassEffect(.regular.interactive(), in: .capsule)
        }'''),
('''            .shadow(color: Theme.bg.opacity(0.7), radius: 3)   // alone per leggere sul vetro chiaro sopra le immagini
''',''),
])
print('ok')
