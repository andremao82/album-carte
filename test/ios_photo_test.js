// 18/10/2026: carte senza immagine nella loro lingua -> anteprima con la mia foto, con Ritaglia / Riscatta / Rimuovi
// dalla scheda; ripiego inglese solo se manca la foto; foto nel backup (il web ignora la chiave "photos").
const fs=require('fs'), assert=require('assert');
const D=require('./percorsi').SWIFT;
const S=n=>fs.readFileSync(D+n,'utf8');
const P=S('CardPhotos.swift'), Q=S('ScanQueue.swift'), A=S('AddView.swift'), ST=S('Store.swift'), CD=S('CardDetailView.swift'),
      M=S('Models.swift'), I=S('Imaging.swift'), E=S('EdgeEditView.swift'), C=S('Components.swift'), APP=S('CartePokemonApp.swift');
const has=(s,...ks)=>{ for(const k of ks) assert.ok(s.includes(k),'manca: '+k); };
for (const [n,s] of Object.entries({P,Q,A,ST,CD,M,I,E,C,APP})) for (const [a,b] of [['{','}'],['(',')'],['[',']']]) assert.ok(s.split(a).length===s.split(b).length,n+': parentesi '+a+b);
// il file nuovo entra nel progetto da solo (cartella sincronizzata), senza toccare project.pbxproj
const pbx=fs.readFileSync(require('./percorsi').IOS+'CartePokemon.xcodeproj/project.pbxproj','utf8');
assert.ok(/isa = PBXFileSystemSynchronizedRootGroup;\s*path = CartePokemon;/.test(pbx),'cartella sincronizzata');
assert.ok(!pbx.includes('CardPhotos.swift'),'project.pbxproj non toccato');

// --- archivio e anteprima
has(P,'static let scheme = "photo:"','static let origMaxSide: CGFloat = 2000','appendingPathComponent("photos", isDirectory: true)','applicationSupportDirectory',
  'static func validId(_ id: String?) -> Bool','static func write(crop: Data, orig: Data?, id: String = UUID().uuidString) -> String?',
  'static func prune(keep: Set<String>)','static func flatQuad(_ q: [CGPoint]) -> [Double]','static func pointsQuad(_ f: [Double]?) -> [CGPoint]?',
  'func hasOfficialImage(_ e: Entry) -> Bool { cardImageURL(e.img) != nil && e.imgFrom != "EN" }','func previewURL(_ e: Entry) -> String',
  'struct LocalPhotoImage: View','static func wantsOwnPhoto(_ c: Candidate) -> Bool { cardImageURL(c.imageSmall) == nil }',
  'func attachPhoto(key: String, crop: Data, orig: Data?, quad: [CGPoint]?)','if hasOfficialImage(catalog[i]) || CardPhotos.exists(catalog[i].photo) { return }',
  'func replacePhoto(key: String, original: Data, quad: [CGPoint], shrink: Bool) async -> Bool','Imaging.process(original, enhance: false, quad: quad)',
  'func removePhoto(key: String)','func photoIdsInUse() -> Set<String>','Self.bakURL','func backupPhotos() -> [String: BackupPhoto]',
  'func restorePhotos(_ photos: [String: BackupPhoto]?) -> Int','guard CardPhotos.validId(id)','struct BackupPhoto: Codable',
  'struct PhotoCaptureFlow: View','EdgeEditView(photo: p, remaining: 1, discardLabel: "Riscatta")','PhotosPicker(selection: $pick, matching: .images)');
assert.ok(!/absoluteString|\.path\b.*photo/.test(P.slice(P.indexOf('func previewURL'),P.indexOf('struct LocalPhotoImage'))),'anteprima senza percorsi assoluti');
has(C,'if url.hasPrefix(CardPhotos.scheme) {','LocalPhotoImage(id: String(url.dropFirst(CardPhotos.scheme.count))');
has(M,'var photo: String?','var photoQuad: [Double]?','self.photo = c.lenientString(.photo)','self.photoQuad = try? c.decodeIfPresent([Double].self, forKey: .photoQuad)');
has(I,'var quad: [CGPoint]? = nil','let usedQuad: [CGPoint]? = ci.map { toNormalized($0, in: src.extent) }','quad: detected ? usedQuad : nil)');
has(E,'let discardLabel: String','discardLabel: String = "Scarta"','self.discardLabel = discardLabel');
// coda: originale conservato, foto passata alla voce in tutti e tre i modi di aggiunta, prima di cancellare i file
has(Q,'var quad: [Double]?','private func origURL(_ id: UUID) -> URL','rawURL(id), origURL(id)]','orig: CardPhotos.shrink(photo)',
  'j.quad = r.quad.map { CardPhotos.flatQuad($0) }','func keepPhoto(_ id: UUID, key: String, _ c: Candidate)','guard AppStore.wantsOwnPhoto(c) else { return }');
assert.strictEqual(Q.split('keepPhoto(id, key: key, c)').length-1,2,'addAuto e confirm');
const conf=Q.slice(Q.indexOf('func confirm('),Q.indexOf('func keepPhoto'));
assert.ok(conf.indexOf('keepPhoto')<conf.indexOf('drop(id)'),'foto tenuta prima di cancellare il lavoro');
has(A,'var onAddedEntry: ((String, Candidate) -> Void)? = nil','onAddedEntry?(k, c)','onAddedEntry: { k, c in queue.keepPhoto(job.id, key: k, c) }');
const man=A.slice(A.indexOf('let k = store.addEntry'),A.indexOf('let k = store.addEntry')+400);
assert.ok(man.indexOf('onAddedEntry?(k, c)')<man.indexOf('onAdded()'),'cerca a mano: foto prima del drop');
// backup
has(ST,'var photos: [String: BackupPhoto]?','photos: [String: BackupPhoto]? = nil','photos = try? c.decodeIfPresent([String: BackupPhoto].self, forKey: .photos)',
  'let ph: [String: BackupPhoto] = backupPhotos()','photos: ph.isEmpty ? nil : ph)','_ = restorePhotos(bf.photos)');
const rs=ST.slice(ST.indexOf('func restore(from'),ST.indexOf('func restoreAutoCopy'));
assert.ok(rs.indexOf('restorePhotos')<rs.indexOf('catalog = bf.catalog'),'foto scritte prima delle voci');
assert.ok(fs.readFileSync(require('./percorsi').APPJS,'utf8').includes('if (!d || !Array.isArray(d.catalog)) throw new Error();'),'il web legge solo catalog');
has(APP,'store.prunePhotos()');
// scheda
has(CD,'enum PhotoFlow: Identifiable','.fullScreenCover(item: $photoFlow)','PhotoCaptureFlow { data, q in','savePhoto(data, q, shrink: true)',
  'EdgeEditView(photo: p, remaining: 1, discardLabel: "Annulla")','savePhoto(p.data, q, shrink: false)','photoMenu(e)   // sempre',
  '"Ritaglia la foto"','has ? "Riscatta la foto" : "Scatta una foto"','"Elimina la foto"','CardPhotos.hasOriginal(e.photo)',
  'CardPhotos.pointsQuad(e.photoQuad)','return "La tua foto"','let art = hiImg(previewURL(e))','CardArt(url: art');

// --- regole rifatte in JS
const url=s=>{ const t=(s||'').trim(); if(!t) return null; try{ return new URL(t);}catch{ return null; } };
const official=e=>url(e.img)!=null && e.imgFrom!=='EN';
const files=new Set();
const preview=e=>official(e)?e.img:(e.photo&&files.has(e.photo))?'photo:'+e.photo:e.img;   // automatico (photoPref nil), vedi ios_preview_test
files.add('F1');
const IT='https://assets.tcgdex.net/it/sv/sv3/11/low.webp', EN='https://assets.tcgdex.net/en/sv/sv3/10/low.webp';
assert.strictEqual(preview({img:IT,photo:'F1'}),IT,'immagine ufficiale prima della foto');
assert.strictEqual(preview({img:IT,imgFrom:'IT',photo:'F1'}),IT);
assert.strictEqual(preview({img:EN,imgFrom:'EN',photo:'F1'}),'photo:F1','foto prima del ripiego inglese');
assert.strictEqual(preview({img:EN,imgFrom:'EN'}),EN,'senza foto: ripiego inglese');
assert.strictEqual(preview({img:'',photo:'F1'}),'photo:F1');
assert.strictEqual(preview({img:'',photo:'GONE'}),'','foto sparita: iniziali');
const valid=id=>!!id && id.length<=64 && /^[A-Za-z0-9-]+$/.test(id);
assert.ok(valid('3F2504E0-4F89-11D3-9A0C-0305E82C3301')); assert.ok(!valid('../catalog')); assert.ok(!valid('a/b')); assert.ok(!valid('')); assert.ok(!valid('x'.repeat(65)));
const flat=q=>q.flatMap(p=>[p.x,p.y]), pts=f=>(f&&f.length===8)?[0,2,4,6].map(i=>({x:f[i],y:f[i+1]})):null;
const q=[{x:.1,y:.1},{x:.9,y:.12},{x:.88,y:.9},{x:.12,y:.88}];
assert.deepStrictEqual(pts(flat(q)),q); assert.strictEqual(pts([1,2,3]),null); assert.strictEqual(pts(null),null);
// tenere la foto: solo se la carta scelta non ha immagine nella sua lingua, senza sovrascrivere
const wants=c=>url(c.imageSmall)==null;
assert.ok(wants({imageSmall:''})); assert.ok(!wants({imageSmall:IT}));
function attach(e,id){ if(official(e)||(e.photo&&files.has(e.photo))) return false; files.add(id); e.photo=id; return true; }
let e1={img:''}; assert.ok(attach(e1,'F2')); assert.strictEqual(e1.photo,'F2');
assert.ok(!attach(e1,'F3'),'doppione aggiunto dopo: la prima foto resta');
assert.ok(!attach({img:IT},'F4'),'carta con immagine: niente foto');
// backup: andata e ritorno; id non validi scartati
const cat=[{key:'a',img:'',photo:'F1'},{key:'b',img:'',photo:'F1'},{key:'c',img:IT}];
const bk={v:1,catalog:cat,photos:{}}; for(const e of cat) if(e.photo&&!bk.photos[e.photo]) bk.photos[e.photo]={crop:'QUJD',orig:'REVG'};
assert.deepStrictEqual(Object.keys(bk.photos),['F1'],'una foto per id anche con più voci');
const restored=new Set(); bk.photos['../x']={crop:'QUJD'};
for(const [id,p] of Object.entries(bk.photos)) if(valid(id)&&Buffer.from(p.crop,'base64').length) restored.add(id);
assert.deepStrictEqual([...restored],['F1']);
const webRestore=d=>{ if(!d||!Array.isArray(d.catalog)) throw new Error(); return d.catalog.length; };
assert.strictEqual(webRestore(JSON.parse(JSON.stringify(bk))),3,'il web ripristina il backup con le foto');
// pulizia all'avvio: tiene catalogo e copia automatica
const disk=['F1.jpg','F1.orig.jpg','F9.jpg','F9.orig.jpg','B1.jpg'], keep=new Set(['F1','B1']);
assert.deepStrictEqual(disk.filter(f=>!keep.has(f.split('.')[0])),['F9.jpg','F9.orig.jpg']);
console.log('ios_photo_test: ok, errori: nessuno');
