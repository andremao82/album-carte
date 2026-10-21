// Fotocamera nativa: anteprima, scatto, torcia. Gli scatti vanno alla coda di lettura.

import SwiftUI
import AVFoundation
import PhotosUI

final class CameraModel: NSObject, AVCapturePhotoCaptureDelegate, @unchecked Sendable {
    let session = AVCaptureSession()
    private let output = AVCapturePhotoOutput()
    private let queue = DispatchQueue(label: "it.albumcarte.camera")
    private var device: AVCaptureDevice?
    private var configured = false
    private var continuation: CheckedContinuation<Data?, Never>?

    var hasTorch: Bool { device?.hasTorch ?? false }

    // true se la fotocamera è utilizzabile
    func start() async -> Bool {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        var ok = status == .authorized
        if status == .notDetermined { ok = await AVCaptureDevice.requestAccess(for: .video) }
        guard ok else { return false }
        return await withCheckedContinuation { cont in
            queue.async {
                if !self.configured {
                    self.session.beginConfiguration()
                    self.session.sessionPreset = .photo
                    if let dev = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
                       let input = try? AVCaptureDeviceInput(device: dev), self.session.canAddInput(input) {
                        self.session.addInput(input)
                        self.device = dev
                        try? dev.lockForConfiguration()
                        if dev.isFocusModeSupported(.continuousAutoFocus) { dev.focusMode = .continuousAutoFocus }
                        dev.unlockForConfiguration()
                    }
                    if self.session.canAddOutput(self.output) { self.session.addOutput(self.output) }
                    self.session.commitConfiguration()
                    self.configured = self.device != nil
                }
                if self.configured && !self.session.isRunning { self.session.startRunning() }
                cont.resume(returning: self.configured)
            }
        }
    }

    func stop() {
        queue.async {
            self.setTorchNow(false)
            if self.session.isRunning { self.session.stopRunning() }
        }
    }

    private func setTorchNow(_ on: Bool) {
        guard let d = device, d.hasTorch else { return }
        do {
            try d.lockForConfiguration()
            d.torchMode = on ? .on : .off
            d.unlockForConfiguration()
        } catch {}
    }

    func setTorch(_ on: Bool) { queue.async { self.setTorchNow(on) } }

    func capture() async -> Data? {
        await withCheckedContinuation { cont in
            queue.async {
                if self.continuation != nil { cont.resume(returning: nil); return }
                self.continuation = cont
                if let conn = self.output.connection(with: .video), conn.isVideoRotationAngleSupported(90) {
                    conn.videoRotationAngle = 90
                }
                let settings = AVCapturePhotoSettings()
                self.output.capturePhoto(with: settings, delegate: self)
            }
        }
    }

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        let data = error == nil ? photo.fileDataRepresentation() : nil
        let c = continuation
        continuation = nil
        c?.resume(returning: data)
    }
}

final class PreviewUIView: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
    var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
}

struct CameraPreview: UIViewRepresentable {
    let session: AVCaptureSession
    func makeUIView(context: Context) -> PreviewUIView {
        let v = PreviewUIView()
        v.previewLayer.session = session
        v.previewLayer.videoGravity = .resizeAspectFill
        return v
    }
    func updateUIView(_ uiView: PreviewUIView, context: Context) {}
}

// MARK: - Schermata fotocamera

struct CameraScreen: View {
    @Environment(AppStore.self) private var store
    @Environment(ScanQueue.self) private var queue
    @Environment(\.dismiss) private var dismiss

    @State private var cam = CameraModel()
    @State private var ready = false
    @State private var denied = false
    @State private var torch = false
    @State private var busy = false
    @State private var flash = false
    @State private var picks: [PhotosPickerItem] = []
    @State private var showReview = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            if ready {
                CameraPreview(session: cam.session).ignoresSafeArea()
                guide
            } else if denied {
                deniedView
            } else {
                ProgressView().tint(.white)
            }
            if flash { Color.white.opacity(0.6).ignoresSafeArea().allowsHitTesting(false) }
            VStack {
                topBar
                Spacer()
                if !queue.jobs.isEmpty { queueChip }
                bottomBar
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 8)
        }
        .task {
            let ok = await cam.start()
            ready = ok
            denied = !ok
        }
        .onDisappear { cam.stop() }
        .onChange(of: picks) { _, items in
            guard !items.isEmpty else { return }
            let list = items
            picks = []
            Task { await addFromLibrary(list) }
        }
        .sheet(isPresented: $showReview) {
            ReviewListView().environment(store).environment(queue)
        }
        .fullScreenCover(item: Binding(get: { queue.pendingEdges.first }, set: { _ in })) { p in
            EdgeEditView(photo: p, remaining: queue.pendingEdges.count) { quad in
                Task { await queue.acceptEdges(p.id, quad: quad) }
            } onDiscard: {
                queue.discardEdges(p.id)
            }
            .id(p.id)
        }
        .statusBarHidden(true)
    }

    private var guide: some View {
        GeometryReader { g in
            let w = min(g.size.width - 64, (g.size.height - 280) * 63 / 88)
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(.white.opacity(0.75), style: StrokeStyle(lineWidth: 2, dash: [10, 8]))
                .frame(width: w, height: w * 88 / 63)
                .position(x: g.size.width / 2, y: g.size.height / 2 - 10)
        }
        .allowsHitTesting(false)
    }

    private var deniedView: some View {
        VStack(spacing: 14) {
            Image(systemName: "camera.fill").font(.system(size: 40)).foregroundStyle(.secondary)
            Text("Accesso alla fotocamera negato").font(.headline)
            Text("Puoi attivarlo da Impostazioni › Album carte, oppure scegliere le foto dalla galleria.")
                .font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
            Button("Apri Impostazioni") {
                if let u = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(u) }
            }
            .buttonStyle(.glass)
        }
        .padding(32)
    }

    private var topBar: some View {
        HStack {
            Button { dismiss() } label: {
                Image(systemName: "xmark").font(.title3.weight(.semibold)).frame(width: 44, height: 44)
            }
            .buttonStyle(.glass)
            .buttonBorderShape(.circle)
            .accessibilityLabel("Chiudi")
            Spacer()
            if cam.hasTorch {
                Button {
                    torch.toggle()
                    cam.setTorch(torch)
                } label: {
                    Image(systemName: torch ? "bolt.fill" : "bolt.slash.fill").font(.title3).frame(width: 44, height: 44)
                }
                .buttonStyle(.glass)
                .buttonBorderShape(.circle)
                .tint(torch ? Color.yellow : nil)
                .accessibilityLabel("Torcia")
            }
        }
        .padding(.top, 6)
    }

    private var queueChip: some View {
        Button { showReview = true } label: {
            HStack(spacing: 8) {
                if queue.activeCount > 0 { ProgressView().controlSize(.small) }
                Text(queue.summary).font(.subheadline.weight(.medium))
                Image(systemName: "chevron.up").font(.caption.weight(.bold))
            }
            .padding(.horizontal, 14).padding(.vertical, 10)
        }
        .buttonStyle(.glass)
        .padding(.bottom, 10)
    }

    private var bottomBar: some View {
        GlassEffectContainer(spacing: 24) {
            HStack {
                PhotosPicker(selection: $picks, maxSelectionCount: 20, matching: .images) {
                    Image(systemName: "photo.on.rectangle").font(.title2).frame(width: 56, height: 56)
                }
                .buttonStyle(.glass)
                .buttonBorderShape(.circle)
                .accessibilityLabel("Scegli dalla galleria")
                Spacer()
                Button { Task { await shoot() } } label: {
                    ZStack {
                        Circle().strokeBorder(.white, lineWidth: 4).frame(width: 78, height: 78)
                        Circle().fill(.white).frame(width: 62, height: 62).opacity(busy ? 0.5 : 1)
                    }
                }
                .disabled(!ready || busy)
                .accessibilityLabel("Scatta")
                Spacer()
                Button { showReview = true } label: {
                    Image(systemName: "list.bullet").font(.title2).frame(width: 56, height: 56)
                }
                .buttonStyle(.glass)
                .buttonBorderShape(.circle)
                .accessibilityLabel("Coda e carte da controllare")
            }
        }
        .padding(.bottom, 6)
    }

    private func shoot() async {
        busy = true
        defer { busy = false }
        guard let data = await cam.capture() else { store.toast("Scatto non riuscito"); return }
        flash = true
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        try? await Task.sleep(nanoseconds: 120_000_000)
        flash = false
        await queue.submit(photo: data)
    }

    private func addFromLibrary(_ items: [PhotosPickerItem]) async {
        for it in items {
            if let d = try? await it.loadTransferable(type: Data.self) {
                await queue.submit(photo: d)
            }
        }
    }
}
