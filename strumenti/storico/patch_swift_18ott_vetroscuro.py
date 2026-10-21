# 18/10/2026 (sera): nel tema scuro (Notte blu) la barra a schede in vetro sembrava troppo chiara.
# Solo col tema scuro la capsula è tinta col colore di fondo (Theme.bg, blu notte) al 60%; il chiaro (Perla) resta com'era.
D='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/'
def patch(name, pairs):
    p=D+name; s=open(p,encoding='utf-8').read()
    for old,new,*n in pairs:
        cnt=n[0] if n else 1
        assert s.count(old)==cnt,(name,old[:100],s.count(old))
        s=s.replace(old,new)
    open(p,'w',encoding='utf-8').write(s)

patch('Theme.swift',[
('''    static let scanSize: CGFloat = 52
''','''    static let scanSize: CGFloat = 52
    /// Tinta della barra a schede nel tema scuro: colore di fondo a questa opacità (più alto = vetro più scuro).
    static let barDarkTint: Double = 0.6
'''),
('''    let onScan: () -> Void
    @Namespace private var glassNS
''','''    let onScan: () -> Void
    @Namespace private var glassNS
    @Environment(\\.colorScheme) private var scheme
'''),
('''            .glassEffect(.regular.interactive(), in: .capsule)
        }''','''            .glassEffect(capsuleGlass, in: .capsule)
        }'''),
('''    private func item(_ t: AppTab, _ label: String, _ icon: String) -> some View {''',
'''    /// Vetro della capsula: nel tema scuro tinto di blu notte (altrimenti sul fondo scuro sembra grigio chiaro).
    private var capsuleGlass: Glass {
        scheme == .dark ? .regular.tint(Theme.bg.opacity(Theme.barDarkTint)).interactive() : .regular.interactive()
    }

    private func item(_ t: AppTab, _ label: String, _ icon: String) -> some View {'''),
])
print('ok')
