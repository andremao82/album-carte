// Elaborazione delle foto: riconoscimento dei bordi della carta (Vision), raddrizzamento e miglioramento (Core Image).

import UIKit
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins
import ImageIO

struct ScanImages {
    var crop: Data        // carta raddrizzata, 756x1056
    var raw: Data?        // stessa carta raddrizzata senza miglioramento (per la condizione), come nel web; nil se non serve
    var detected: Bool    // false = bordi non trovati, ritaglio centrale
    var quad: [CGPoint]? = nil  // bordi usati, normalizzati (per rifare il ritaglio della mia foto)
}

struct PreparedPhoto {
    var preview: Data
    var quad: [CGPoint]
    var detected: Bool
}

enum Imaging {
    static let ctx = CIContext(options: [.useSoftwareRenderer: false])
    static let outW: CGFloat = 756
    static let outH: CGFloat = 1056

    // MARK: - Caricamento

    static func load(_ data: Data, maxSide: CGFloat = 2400) -> CIImage? {
        guard let src = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }
        let opts: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxSide
        ]
        guard let cg = CGImageSourceCreateThumbnailAtIndex(src, 0, opts as CFDictionary) else { return nil }
        return CIImage(cgImage: cg)
    }

    // MARK: - Bordi

    // angoli nell'ordine alto-sx, alto-dx, basso-dx, basso-sx, in coordinate Core Image (origine in basso a sinistra)
    static func detectCard(_ img: CIImage) -> [CGPoint]? {
        let req = VNDetectRectanglesRequest()
        req.minimumAspectRatio = 0.5
        req.maximumAspectRatio = 0.95
        req.minimumSize = 0.2
        req.minimumConfidence = 0.4
        req.maximumObservations = 6
        req.quadratureTolerance = 30
        let handler = VNImageRequestHandler(ciImage: img, options: [:])
        do { try handler.perform([req]) } catch { return nil }
        guard let results = req.results, !results.isEmpty else { return nil }
        func area(_ o: VNRectangleObservation) -> CGFloat { o.boundingBox.width * o.boundingBox.height }
        guard let best = results.max(by: { area($0) < area($1) }) else { return nil }
        let w = img.extent.width, h = img.extent.height
        let ox = img.extent.origin.x, oy = img.extent.origin.y
        func pt(_ p: CGPoint) -> CGPoint { CGPoint(x: ox + p.x * w, y: oy + p.y * h) }
        return [pt(best.topLeft), pt(best.topRight), pt(best.bottomRight), pt(best.bottomLeft)]
    }

    static func dist(_ a: CGPoint, _ b: CGPoint) -> CGFloat { hypot(a.x - b.x, a.y - b.y) }

    // se la carta è stata fotografata di traverso, ruota l'ordine degli angoli perché il risultato sia in verticale
    static func portraitOrder(_ q: [CGPoint]) -> [CGPoint] {
        guard q.count == 4 else { return q }
        let wide = dist(q[0], q[1]) + dist(q[3], q[2])
        let tall = dist(q[0], q[3]) + dist(q[1], q[2])
        if wide > tall { return [q[3], q[0], q[1], q[2]] }
        return q
    }

    // MARK: - Raddrizzamento e miglioramento

    static func warp(_ img: CIImage, quad: [CGPoint]) -> CIImage? {
        let f = CIFilter.perspectiveCorrection()
        f.inputImage = img
        f.topLeft = quad[0]
        f.topRight = quad[1]
        f.bottomRight = quad[2]
        f.bottomLeft = quad[3]
        guard let out = f.outputImage else { return nil }
        return fit(out)
    }

    static func centerCrop(_ img: CIImage) -> CIImage {
        let e = img.extent
        let target = outW / outH
        var cw = e.width, ch = e.height
        if cw / ch > target { cw = ch * target } else { ch = cw / target }
        // la carta occupa circa l'85% dell'inquadratura
        cw *= 0.9; ch *= 0.9
        let r = CGRect(x: e.midX - cw / 2, y: e.midY - ch / 2, width: cw, height: ch)
        return fit(img.cropped(to: r))
    }

    // porta l'immagine a 756x1056 con origine in (0,0)
    static func fit(_ img: CIImage) -> CIImage {
        let e = img.extent
        guard e.width > 1, e.height > 1 else { return img }
        let moved = img.transformed(by: CGAffineTransform(translationX: -e.origin.x, y: -e.origin.y))
        let scaled = moved.transformed(by: CGAffineTransform(scaleX: outW / e.width, y: outH / e.height))
        return scaled.cropped(to: CGRect(x: 0, y: 0, width: outW, height: outH))
    }

    static func enhanced(_ img: CIImage) -> CIImage {
        let c = CIFilter.colorControls()
        c.inputImage = img
        c.contrast = 1.08
        c.saturation = 1.05
        c.brightness = 0.01
        var out = c.outputImage ?? img
        let s = CIFilter.unsharpMask()
        s.inputImage = out
        s.radius = 1.6
        s.intensity = 0.5
        out = s.outputImage ?? out
        return out.cropped(to: CGRect(x: 0, y: 0, width: outW, height: outH))
    }

    static func jpeg(_ img: CIImage, quality: CGFloat = 0.85) -> Data? {
        guard let cs = CGColorSpace(name: CGColorSpace.sRGB) else { return nil }
        let key = CIImageRepresentationOption(rawValue: kCGImageDestinationLossyCompressionQuality as String)
        return ctx.jpegRepresentation(of: img, colorSpace: cs, options: [key: quality])
    }

    // immagine minuscola per la prova di connessione a Gemini
    static func tinyJPEG() -> Data? {
        jpeg(CIImage(color: CIColor(red: 0.9, green: 0.8, blue: 0.1)).cropped(to: CGRect(x: 0, y: 0, width: 16, height: 16)), quality: 0.8)
    }

    // MARK: - Bordi in coordinate normalizzate (0...1, origine in alto a sinistra), per la regolazione a mano

    static func toNormalized(_ q: [CGPoint], in e: CGRect) -> [CGPoint] {
        q.map { CGPoint(x: ($0.x - e.origin.x) / e.width, y: 1 - ($0.y - e.origin.y) / e.height) }
    }

    static func fromNormalized(_ q: [CGPoint], in e: CGRect) -> [CGPoint] {
        q.map { CGPoint(x: e.origin.x + $0.x * e.width, y: e.origin.y + (1 - $0.y) * e.height) }
    }

    // quadrilatero predefinito se i bordi non si trovano: la carta al centro, con un margine
    static func defaultQuad() -> [CGPoint] {
        let target = outW / outH
        let h: CGFloat = 0.8
        let w = min(0.84, h * target * 0.75)
        let x0 = (1 - w) / 2, y0 = (1 - h) / 2
        return [CGPoint(x: x0, y: y0), CGPoint(x: x0 + w, y: y0), CGPoint(x: x0 + w, y: y0 + h), CGPoint(x: x0, y: y0 + h)]
    }

    // anteprima ridotta e bordi trovati, per mostrare la schermata di regolazione
    static func prepare(_ data: Data) -> PreparedPhoto? {
        guard let src = load(data, maxSide: 1400) else { return nil }
        let found = detectCard(src)
        let quad = found.map { toNormalized($0, in: src.extent) } ?? defaultQuad()
        guard let prev = jpeg(src, quality: 0.8) else { return nil }
        return PreparedPhoto(preview: prev, quad: quad, detected: found != nil)
    }

    // MARK: - Percorso completo

    // quad: bordi già decisi (normalizzati, alto-sx, alto-dx, basso-dx, basso-sx); se manca li cerca da solo
    static func process(_ data: Data, enhance: Bool, quad: [CGPoint]? = nil) -> ScanImages? {
        guard let src = load(data) else { return nil }
        var detected = false
        var card: CIImage
        let ci: [CGPoint]? = (quad != nil && quad!.count == 4) ? fromNormalized(quad!, in: src.extent) : detectCard(src)
        let usedQuad: [CGPoint]? = ci.map { toNormalized($0, in: src.extent) }
        if let q = ci, let w = warp(src, quad: portraitOrder(q)) {
            card = w
            detected = true
        } else {
            card = centerCrop(src)
        }
        // come nel web: la seconda immagine è la stessa carta non elaborata, solo se la prima è stata migliorata
        // e i bordi sono stati trovati (non più la foto intera, che appesantiva l'invio)
        let plain = card
        if enhance { card = enhanced(card) }
        guard let crop = jpeg(card, quality: 0.9) else { return nil }
        let raw: Data? = (enhance && detected) ? jpeg(plain, quality: 0.85) : nil
        return ScanImages(crop: crop, raw: raw, detected: detected, quad: detected ? usedQuad : nil)
    }
}
