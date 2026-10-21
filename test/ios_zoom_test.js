// 18/10/2026 (sera): (1) scheda carta, tocco sull'immagine → tutto schermo (CardZoomView);
// (2) dettaglio Pokédex: la tua carta senza immagine nella lingua dell'elenco mostrava "?" nella griglia.
const fs=require('fs'), assert=require('assert');
const D=require('./percorsi').SWIFT;
const comp=fs.readFileSync(D+'Components.swift','utf8'), det=fs.readFileSync(D+'CardDetailView.swift','utf8'), dex=fs.readFileSync(D+'DexViews.swift','utf8');
const has=(s,...ks)=>{ for(const k of ks) assert.ok(s.includes(k),'manca: '+k); };
const bal=(s,o,c)=>{ let n=0; for(const ch of s){ if(ch===o) n++; if(ch===c) n--; assert.ok(n>=0,'parentesi '+o); } assert.strictEqual(n,0,'parentesi '+o+c+' sbilanciate'); };
for (const s of [comp,det,dex]) { bal(s,'{','}'); bal(s,'(',')'); bal(s,'[',']'); }

// 1 vista a tutto schermo
has(comp,'struct CardZoomView: View','func canZoomImage(_ u: String) -> Bool','MagnifyGesture()','DragGesture()',
  '.onTapGesture(count: 2) { toggleZoom() }','magnify.simultaneously(with: drag)','static let maxScale: CGFloat = 5',
  'static let doubleTapScale: CGFloat = 2.5','static let closeDrag: CGFloat = 120','.statusBarHidden()',
  'accessibilityLabel("Chiudi")','.environment(\\.colorScheme, .dark)','RemoteCardImage(url: url, name: name, number: number)');
assert.ok(!/RemoteCardImage\(url: url, name: name, number: number, fill: true\)/.test(comp.slice(comp.indexOf('struct CardZoomView'))),'a tutto schermo l\'immagine non va ritagliata (fit)');
// 2 scheda: tocco sull'immagine apre la vista, solo se c'è un'immagine
// 20/10: l'immagine è dentro TiltingCard (si inclina col dito); un tocco senza trascinare apre il tutto schermo,
// solo se c'è un'immagine (tapEnabled al posto di allowsHitTesting, che spegnerebbe anche l'inclinazione)
has(det,'@State private var zoom = false','let art = hiImg(previewURL(e))','TiltingCard(kind: holoKind(e.variant), radius: 10, tapEnabled: canZoomImage(art)) { zoom = true }',
  'CardArt(url: art, radius: 10, name: e.name, number: e.number)',
  '.fullScreenCover(isPresented: $zoom)','CardZoomView(url: art, name: e.name, number: e.number) { zoom = false }',
  'accessibilityLabel("Ingrandisci l\'immagine")');
assert.ok(det.indexOf('tapEnabled: canZoomImage(art)) { zoom = true }')<det.indexOf('if let n = imgNote(e)'),'immagine toccabile nella testata');
// 3 Pokédex: anteprima della tua carta quando l'elenco non ha immagine
has(dex,'private func gridImage(_ c: SetCardSummary, _ mine: Entry?) -> String','CardThumb(url: gridImage(c, mineHere)',
  'if let e = mine { return previewURL(e) }','name: mineHere?.name ?? ""');
assert.ok(!dex.includes('CardThumb(url: c.image.isEmpty ? "" : c.image + "/low.webp", width: 96, radius: 8)'),'vecchia immagine solo da elenco rimossa');

// 4 regole rifatte in JS
const MAX=5, CLOSE=120;
const clamp=s=>Math.min(Math.max(s,1),MAX);
const shouldClose=(scale,h)=>scale<=1.01 && Math.abs(h)>CLOSE;
const backdrop=(scale,h)=>scale>1.01?1:Math.max(0.35,1-Math.abs(h)/400);
assert.strictEqual(clamp(0.5),1); assert.strictEqual(clamp(3),3); assert.strictEqual(clamp(9),5);
assert.ok(shouldClose(1,150) && shouldClose(1,-150),'a 1× trascinando oltre 120 pt si chiude');
assert.ok(!shouldClose(1,80),'trascinamento corto: torna al centro');
assert.ok(!shouldClose(2.5,300),'ingrandita: il trascinamento sposta, non chiude');
assert.strictEqual(backdrop(1,0),1); assert.strictEqual(backdrop(1,1000),0.35); assert.strictEqual(backdrop(3,500),1);
const scheme='photo:';
const canZoom=(u,exists)=>u.startsWith(scheme)?exists(u.slice(scheme.length)):(()=>{ const t=u.trim(); if(!t) return false; try{ new URL(t); return true; }catch{ return false; } })();
assert.ok(!canZoom('',()=>true),'senza immagine (iniziali) non si apre');
assert.ok(canZoom('https://assets.tcgdex.net/en/base/base1/8/high.webp',()=>false));
assert.ok(canZoom('photo:abc-1',id=>id==='abc-1')); assert.ok(!canZoom('photo:gone',()=>false),'foto cancellata: non si apre');
const gridImage=(c,mine,prev)=>c.image?c.image+'/low.webp':(mine?prev(mine):'');
const prev=e=>e.photo?scheme+e.photo:e.img;
const machamp={name:'Machamp',number:'8',img:'https://assets.tcgdex.net/en/base/base1/8/high.webp',imgFrom:'EN'};
assert.strictEqual(gridImage({image:''},machamp,prev),machamp.img,'Machamp Set Base IT: immagine inglese come in "Le tue carte"');
assert.strictEqual(gridImage({image:''},{...machamp,photo:'p1'},prev),'photo:p1','con la foto mia: la foto');
assert.strictEqual(gridImage({image:'https://x/it/c13'},machamp,prev),'https://x/it/c13/low.webp','immagine dell\'elenco se c\'è');
assert.strictEqual(gridImage({image:''},null,prev),'','mancante senza immagine: "?" come prima');
console.log('ios_zoom ok');
