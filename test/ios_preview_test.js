// 18/10/2026 (sera): priorità all'immagine da internet, ma dalla scheda si sceglie la mia foto e si torna a internet.
// photoPref: "own" / "web" / nil (automatico: ufficiale > foto della scansione > inglese > iniziali).
const fs=require('fs'), assert=require('assert');
const D=require('./percorsi').SWIFT;
const P=fs.readFileSync(D+'CardPhotos.swift','utf8'), det=fs.readFileSync(D+'CardDetailView.swift','utf8'), dex=fs.readFileSync(D+'DexViews.swift','utf8'),
      q=fs.readFileSync(D+'ScanQueue.swift','utf8'), mod=fs.readFileSync(D+'Models.swift','utf8');
const has=(s,...ks)=>{ for(const k of ks) assert.ok(s.includes(k),'manca: '+k); };
const bal=(s,o,c)=>{ let n=0; for(const ch of s){ if(ch===o) n++; if(ch===c) n--; assert.ok(n>=0); } assert.strictEqual(n,0,'parentesi '+o+c); };
for (const s of [P,det,dex,mod]) { bal(s,'{','}'); bal(s,'(',')'); }
// 1 campo nella voce, letto in modo tollerante (solo "own"/"web")
has(mod,'var photoPref: String?','let pp = c.lenientString(.photoPref)','self.photoPref = (pp == "own" || pp == "web") ? pp : nil');
// 2 regola dell'anteprima
has(P,'func showsOwnPhoto(_ e: Entry) -> Bool','case "own": return true','case "web": return !web','default: return !hasOfficialImage(e)',
  'showsOwnPhoto(e) ? CardPhotos.scheme + (e.photo ?? "") : e.img','func webImageLabel(_ e: Entry) -> String');
assert.ok(!P.includes('removePhotoLabel'),'vecchio "Torna a..." distruttivo rimosso');
// 3 azioni: scegliere senza cancellare, scattare = scegliere la foto, eliminare azzera la scelta
has(P,'func setPhotoPref(key: String, _ pref: String)','catalog[i].photoPref = "own"','$0.photo = nil; $0.photoQuad = nil; $0.photoPref = nil');
has(det,'let own = showsOwnPhoto(e)','if has && own && cardImageURL(e.img) != nil','store.setPhotoPref(key: currentKey, "web")',
  'Button("Usa la mia foto"','store.setPhotoPref(key: currentKey, "own")','Button("Elimina la foto"','photoMenu(e)   // sempre');
// 4 coda invariata: foto automatica solo senza immagine ufficiale, senza scelta
has(P,'if hasOfficialImage(catalog[i]) || CardPhotos.exists(catalog[i].photo) { return }');
has(q,'guard AppStore.wantsOwnPhoto(c) else { return }');
const att=P.slice(P.indexOf('func attachPhoto'),P.indexOf('func replacePhoto')); assert.ok(!att.includes('photoPref'),'la coda non sceglie');
// 5 Pokédex segue la scelta
has(dex,'if let e = mine, showsOwnPhoto(e) { return previewURL(e) }');
// 6 regole in JS
const files=new Set(['F1']); const url=s=>{ try{ return s&&new URL(s);}catch{return null;} };
const official=e=>!!url(e.img)&&e.imgFrom!=='EN';
const own=e=>{ if(!(e.photo&&files.has(e.photo))) return false; const web=!!url(e.img);
  if(e.photoPref==='own') return true; if(e.photoPref==='web') return !web; return !official(e); };
const preview=e=>own(e)?'photo:'+e.photo:e.img;
const IT='https://assets.tcgdex.net/it/swsh/swsh1/25/high.webp', EN='https://assets.tcgdex.net/en/base/base1/8/high.webp';
assert.strictEqual(preview({img:IT,imgFrom:'IT',photo:'F1'}),IT,'automatico: internet (ufficiale) prima della foto');
assert.strictEqual(preview({img:EN,imgFrom:'EN',photo:'F1'}),'photo:F1','automatico: foto della scansione prima del ripiego inglese');
assert.strictEqual(preview({img:IT,imgFrom:'IT',photo:'F1',photoPref:'own'}),'photo:F1','scelta la mia foto');
assert.strictEqual(preview({img:EN,imgFrom:'EN',photo:'F1',photoPref:'web'}),EN,'scelta internet: torna l\'inglese, foto tenuta');
assert.strictEqual(preview({img:'',photo:'F1',photoPref:'web'}),'photo:F1','internet senza immagine: la foto, non le iniziali');
assert.strictEqual(preview({img:IT,photo:'GONE',photoPref:'own'}),IT,'foto sparita: internet');
// percorso completo: scatto → foto; "Usa l'immagine ufficiale" → internet, foto ancora lì; "Usa la mia foto" → di nuovo foto
const e={img:IT,imgFrom:'IT'}; assert.strictEqual(preview(e),IT);
e.photo='F1'; e.photoPref='own'; assert.strictEqual(preview(e),'photo:F1');
e.photoPref='web'; assert.strictEqual(preview(e),IT); assert.ok(files.has(e.photo),'foto non cancellata');
e.photoPref='own'; assert.strictEqual(preview(e),'photo:F1');
const label=e=>official(e)?"Usa l'immagine ufficiale":"Usa l'immagine inglese";
assert.strictEqual(label({img:IT,imgFrom:'IT'}),"Usa l'immagine ufficiale"); assert.strictEqual(label({img:EN,imgFrom:'EN'}),"Usa l'immagine inglese");
const grid=(c,m)=>(m&&own(m))?preview(m):c.image?c.image+'/low.webp':(m?preview(m):'');
assert.strictEqual(grid({image:'https://x/it/c8'},{img:IT,imgFrom:'IT',photo:'F1'}),'https://x/it/c8/low.webp','griglia: internet se non ho scelto');
assert.strictEqual(grid({image:'https://x/it/c8'},{img:IT,photo:'F1',photoPref:'own'}),'photo:F1','griglia: la mia scelta');
console.log('ios_preview ok');
