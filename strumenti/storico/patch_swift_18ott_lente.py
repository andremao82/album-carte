# 18/10/2026: lente d'ingrandimento sull'angolo trascinato nell'editor dei bordi (app nativa).
p='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/EdgeEditView.swift'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(old[:100],s.count(old))
    s=s.replace(old,new)
rep('''    @State private var original: [CGPoint]
''','''    @State private var original: [CGPoint]
    /// Angolo che si sta trascinando (nil = nessuno): mostra la lente. Torna nil da solo anche se il gesto viene annullato.
    @GestureState private var active: Int? = nil

    /// Lente: diametro, ingrandimento, distanza dal punto toccato.
    static let loupeSize: CGFloat = 130
    static let loupeZoom: CGFloat = 3
    static let loupeGap: CGFloat = 44

    /// Centro della lente: sopra il dito; se in alto non c'è spazio, di lato verso il centro dello schermo.
    /// Resta sempre dentro l'area dell'editor.
    static func loupeCenter(point p: CGPoint, box: CGSize) -> CGPoint {
        let r = loupeSize / 2
        var x = p.x, y = p.y - loupeGap - r
        if y - r < 0 {
            x = p.x < box.width / 2 ? p.x + loupeGap + r : p.x - loupeGap - r
            y = p.y
        }
        x = min(max(x, r), max(box.width - r, r))
        y = min(max(y, r), max(box.height - r, r))
        return CGPoint(x: x, y: y)
    }
''')
rep('''                        .gesture(
                            DragGesture(minimumDistance: 0, coordinateSpace: .named("edit"))
                                .onChanged { v in''','''                        .gesture(
                            DragGesture(minimumDistance: 0, coordinateSpace: .named("edit"))
                                .updating($active) { _, st, _ in st = i }
                                .onChanged { v in''')
rep('''                        )
                }
            }
            .coordinateSpace(name: "edit")''','''                        )
                }
                if let i = active {
                    loupe(i: i, ox: ox, oy: oy, w: w, h: h, box: g.size)
                }
            }
            .coordinateSpace(name: "edit")''')
rep('''    private func outline(''','''    /// Lente: la foto ingrandita centrata sull'angolo, con i bordi e un mirino al centro. Non riceve tocchi.
    private func loupe(i: Int, ox: CGFloat, oy: CGFloat, w: CGFloat, h: CGFloat, box: CGSize) -> some View {
        let d = Self.loupeSize, z = Self.loupeZoom
        let q = quad[i]
        let center = Self.loupeCenter(point: CGPoint(x: ox + q.x * w, y: oy + q.y * h), box: box)
        // punto k della carta dentro la lente (l'angolo i cade al centro)
        func inLoupe(_ k: Int) -> CGPoint {
            CGPoint(x: d / 2 + (quad[k].x - q.x) * w * z, y: d / 2 + (quad[k].y - q.y) * h * z)
        }
        return ZStack {
            Color.black
            Image(uiImage: photo.preview)
                .resizable()
                .frame(width: w * z, height: h * z)
                .position(x: d / 2 + w * z / 2 - q.x * w * z, y: d / 2 + h * z / 2 - q.y * h * z)
            Path { p in
                p.move(to: inLoupe(0))
                for k in 1..<4 { p.addLine(to: inLoupe(k)) }
                p.closeSubpath()
            }
            .stroke(Color.yellow, lineWidth: 2)
            Path { p in
                p.move(to: CGPoint(x: d / 2 - 12, y: d / 2)); p.addLine(to: CGPoint(x: d / 2 + 12, y: d / 2))
                p.move(to: CGPoint(x: d / 2, y: d / 2 - 12)); p.addLine(to: CGPoint(x: d / 2, y: d / 2 + 12))
            }
            .stroke(Color.white, lineWidth: 1.5)
            Circle().stroke(Color.yellow, lineWidth: 2).frame(width: 10, height: 10)
        }
        .frame(width: d, height: d)
        .clipShape(Circle())
        .overlay(Circle().stroke(Color.white, lineWidth: 3))
        .shadow(color: .black.opacity(0.6), radius: 8)
        .position(center)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private func outline(''')
open(p,'w',encoding='utf-8').write(s); print('ok')
