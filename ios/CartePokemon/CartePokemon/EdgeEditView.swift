// Regolazione a mano dei bordi: quattro angoli da trascinare sulla carta, poi conferma.

import SwiftUI

struct EdgeEditView: View {
    let photo: PendingPhoto
    let remaining: Int
    let onConfirm: ([CGPoint]) -> Void
    let onDiscard: () -> Void
    /// Testo del tasto a sinistra: "Scarta" in coda, "Annulla"/"Riscatta" dalla scheda della carta.
    let discardLabel: String

    @State private var quad: [CGPoint]
    @State private var original: [CGPoint]
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

    init(photo: PendingPhoto, remaining: Int, discardLabel: String = "Scarta", onConfirm: @escaping ([CGPoint]) -> Void, onDiscard: @escaping () -> Void) {
        self.photo = photo
        self.remaining = remaining
        self.discardLabel = discardLabel
        self.onConfirm = onConfirm
        self.onDiscard = onDiscard
        _quad = State(initialValue: photo.quad)
        _original = State(initialValue: photo.quad)
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 12) {
                Text(photo.detected ? "Controlla i bordi, poi conferma." : "Non trovo bene i bordi: trascina gli angoli sulla carta, poi conferma.")
                    .font(.subheadline).foregroundStyle(.white).multilineTextAlignment(.center)
                    .padding(.horizontal, 20).padding(.top, 12)
                editor
                if remaining > 1 {
                    Text("Altre \(remaining - 1) foto in attesa").font(.footnote).foregroundStyle(.secondary)
                }
                controls
            }
        }
        .interactiveDismissDisabled()
    }

    private var editor: some View {
        GeometryReader { g in
            let size = photo.preview.size
            let scale = min(g.size.width / size.width, g.size.height / size.height)
            let w = size.width * scale, h = size.height * scale
            let ox = (g.size.width - w) / 2, oy = (g.size.height - h) / 2
            ZStack {
                Image(uiImage: photo.preview)
                    .resizable()
                    .frame(width: w, height: h)
                    .position(x: g.size.width / 2, y: g.size.height / 2)
                outline(ox: ox, oy: oy, w: w, h: h)
                ForEach(0..<4, id: \.self) { i in
                    Circle()
                        .fill(Color.yellow.opacity(0.35))
                        .overlay(Circle().stroke(Color.yellow, lineWidth: 3))
                        .frame(width: 36, height: 36)
                        .contentShape(Circle())
                        .position(x: ox + quad[i].x * w, y: oy + quad[i].y * h)
                        .gesture(
                            DragGesture(minimumDistance: 0, coordinateSpace: .named("edit"))
                                .updating($active) { _, st, _ in st = i }
                                .onChanged { v in
                                    let nx = min(max((v.location.x - ox) / w, 0), 1)
                                    let ny = min(max((v.location.y - oy) / h, 0), 1)
                                    quad[i] = CGPoint(x: nx, y: ny)
                                }
                        )
                }
                if let i = active {
                    loupe(i: i, ox: ox, oy: oy, w: w, h: h, box: g.size)
                }
            }
            .coordinateSpace(name: "edit")
        }
    }

    /// Lente: la foto ingrandita centrata sull'angolo, con i bordi e un mirino al centro. Non riceve tocchi.
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

    private func outline(ox: CGFloat, oy: CGFloat, w: CGFloat, h: CGFloat) -> some View {
        Path { p in
            p.move(to: CGPoint(x: ox + quad[0].x * w, y: oy + quad[0].y * h))
            for i in 1..<4 { p.addLine(to: CGPoint(x: ox + quad[i].x * w, y: oy + quad[i].y * h)) }
            p.closeSubpath()
        }
        .stroke(Color.yellow, lineWidth: 2)
        .allowsHitTesting(false)
    }

    private var controls: some View {
        GlassEffectContainer(spacing: 12) {
            HStack(spacing: 12) {
                Button(discardLabel, role: discardLabel == "Scarta" ? .destructive : nil) { onDiscard() }
                    .buttonStyle(.glass)
                Button("Ripristina") { quad = original }
                    .buttonStyle(.glass)
                Button("Conferma") { onConfirm(quad) }
                    .buttonStyle(.glassProminent)
            }
            .controlSize(.large)
        }
        .padding(.bottom, 14)
    }
}
