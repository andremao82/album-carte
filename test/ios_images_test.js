// 18/10/2026: nell'app nativa alcune miniature (carte IT) restavano sulla rotellina per sempre.
// Causa: AsyncImage con indirizzo vuoto (TCGdex senza immagine) resta nello stato "vuoto". Ora: riquadro con iniziali
// e numero, secondo tentativo se lo scaricamento fallisce, immagine inglese come ripiego salvata nella voce (imgFrom).
const fs=require('fs'), assert=require('assert');
const D=require('./percorsi').SWIFT;
const S=n=>fs.readFileSync(D+n,'utf8');
const files=['Components.swift','Theme.swift','AlbumView.swift','HomeView.swift','DexViews.swift','AddView.swift','CardDetailView.swift','Models.swift','StoreOps.swift','Store.swift','CartePokemonApp.swift','SetsView.swift'];
const src=Object.fromEntries(files.map(f=>[f,S(f)]));
const has=(s,...ks)=>{ for(const k of ks) assert.ok(s.includes(k),'manca: '+k); };
for (const [n,s] of Object.entries(src)) for (const [a,b] of [['{','}'],['(',')'],['[',']']]) assert.ok(s.split(a).length===s.split(b).length,n+': parentesi '+a+b);
const C=src['Components.swift'], T=src['Theme.swift'], O=src['StoreOps.swift'];

// un solo punto che usa AsyncImage per le carte; nessun URL(string: url) diretto nelle miniature
has(C,'func cardImageURL(_ s: String) -> URL?','struct RemoteCardImage: View','struct CardPlaceholder: View','static let maxAttempts = 2',
  'if let u = cardImageURL(url) {','.id(attempt)','attempt += 1','CardPlaceholder(name: name, number: number)','initials(name)',
  'RemoteCardImage(url: url, name: name, number: number)');
has(T,'RemoteCardImage(url: url, name: name, number: number, fill: true)');
const cardsAsync=(C+T).split('AsyncImage(').length-1;
assert.strictEqual(cardsAsync,2,'AsyncImage solo in RemoteCardImage e negli sprite'); // RemoteCardImage + SpriteView
assert.ok(!T.includes('AsyncImage(url: URL(string: url))'),'CardArt non usa più AsyncImage diretto');
assert.ok(!C.slice(C.indexOf('struct CardThumb'),C.indexOf('struct SpriteView')).includes('AsyncImage'),'CardThumb passa da RemoteCardImage');
// la rotellina compare solo nello stato di caricamento, mai per un indirizzo mancante
const rci=C.slice(C.indexOf('struct RemoteCardImage'),C.indexOf('struct CardPlaceholder'));
assert.ok(rci.indexOf('} else {\n            CardPlaceholder')>0,'senza indirizzo: riquadro, non rotellina');
// tutte le schermate con una voce passano nome e numero
has(src['AlbumView.swift'],'CardArt(url: previewURL(e), name: e.name, number: e.number)','CardThumb(url: previewURL(m.e), width: 38, name: m.e.name, number: m.e.number)');
has(src['HomeView.swift'],'CardArt(url: previewURL(e), name: e.name, number: e.number)');
has(src['DexViews.swift'],'CardThumb(url: previewURL(e), width: 96, radius: 8, name: e.name, number: e.number)');
has(src['CardDetailView.swift'],'let art = hiImg(previewURL(e))','CardArt(url: art, radius: 10, name: e.name, number: e.number)','private func imgNote(_ e: Entry) -> String?','Immagine della versione inglese');
has(C,'CardThumb(url: previewURL(e), name: e.name, number: e.number)');
has(src['AddView.swift'],'name: c.name, number: c.number','name: cand.name, number: cand.number');
// dati: nuovo campo letto in modo tollerante (il web lo conserva: normalizeEntry copia tutti i campi)
has(src['Models.swift'],'var imgFrom: String?','self.imgFrom = c.lenientString(.imgFrom)');
assert.ok(fs.readFileSync(require('./percorsi').APPJS,'utf8').includes('const o = Object.assign({}, e);'),'il web conserva i campi sconosciuti');
// ricerca dell'immagine: avvio e nuove carte, una volta sola per carta
has(O,'static func needsImage(_ e: Entry) -> Bool','e.imgFrom == nil && e.src == "tcgdex"','static func imageLangs(_ srcLang: String?) -> [String]',
  'func fillMissingImages() async','if imgFillRunning { return }','catalog[j].imgFrom = found == nil ? "" : from','catch { failed = true; break }','if changed { save() }');
has(src['Store.swift'],'@ObservationIgnored var imgFillRunning = false','if AppStore.needsImage(e) { Task { await self.fillMissingImages() } }');
has(src['CartePokemonApp.swift'],'await store.fillMissingImages()');

// --- regole rifatte in JS
const url=s=>{ const t=(s||'').trim(); if(!t) return null; try{ const u=new URL(t); return u.protocol?u:null; }catch{ return null; } };
assert.strictEqual(url(''),null); assert.strictEqual(url('   '),null); assert.strictEqual(url('low.webp'),null);
assert.ok(url('https://assets.tcgdex.net/it/swsh/swsh1/25/low.webp'));
const needs=e=>url(e.img)==null && e.imgFrom==null && e.src==='tcgdex' && !!e.srcId;
assert.ok(needs({img:'',src:'tcgdex',srcId:'swsh1-25'}));
assert.ok(!needs({img:'',src:'tcgdex',srcId:'swsh1-25',imgFrom:''}),'già cercata senza esito: non si ripete');
assert.ok(!needs({img:'',src:'ptcg',srcId:'x'}),'solo carte TCGdex');
assert.ok(!needs({img:'https://x/y.png',src:'tcgdex',srcId:'a'}));
const langs=l=>{ l=(l||'').toLowerCase(); return (!l||l==='en')?['en']:[l,'en']; };
assert.deepStrictEqual(langs('it'),['it','en']); assert.deepStrictEqual(langs('en'),['en']); assert.deepStrictEqual(langs(null),['en']);
// simulazione del riempimento
function fill(catalog,remote){ // remote[lang/id] = url | null | 'ERR'
  const groups={};
  for(const e of catalog.filter(needs)){ const k=(e.srcLang||'')+'/'+e.srcId; (groups[k]=groups[k]||{sid:e.srcId,lang:e.srcLang,keys:[]}).keys.push(e.key); }
  let changed=false;
  for(const g of Object.values(groups)){ let found=null, from='', failed=false;
    for(const l of langs(g.lang)){ const r=remote[l+'/'+g.sid]; if(r==='ERR'){failed=true;break;} if(url(r)){found=r;from=l.toUpperCase();break;} }
    if(failed) continue;
    for(const e of catalog) if(g.keys.includes(e.key)&&needs(e)){ if(found) e.img=found; e.imgFrom=found?from:''; changed=true; } }
  return changed;
}
let cat=[{key:'a',img:'',src:'tcgdex',srcId:'sv3-10',srcLang:'it',lang:'IT'},{key:'b',img:'',src:'tcgdex',srcId:'sv3-10',srcLang:'it',lang:'IT'},
         {key:'c',img:'',src:'tcgdex',srcId:'sv3-11',srcLang:'it',lang:'IT'},{key:'d',img:'',src:'tcgdex',srcId:'sv3-12',srcLang:'it',lang:'IT'},
         {key:'e',img:'',src:'tcgdex',srcId:'sv3-13',srcLang:'it',lang:'IT'}];
const R={'it/sv3-10':null,'en/sv3-10':'https://assets.tcgdex.net/en/sv/sv3/10/low.webp',
         'it/sv3-11':'https://assets.tcgdex.net/it/sv/sv3/11/low.webp',
         'it/sv3-12':null,'en/sv3-12':null,'it/sv3-13':'ERR'};
assert.ok(fill(cat,R));
assert.strictEqual(cat[0].imgFrom,'EN'); assert.strictEqual(cat[1].img,R['en/sv3-10'],'doppioni della stessa carta insieme');
assert.strictEqual(cat[2].imgFrom,'IT','immagine italiana arrivata dopo: si usa quella');
assert.strictEqual(cat[3].imgFrom,''); assert.strictEqual(cat[3].img,'','nessuna immagine: segnata, niente ripetizioni');
assert.strictEqual(cat[4].imgFrom,undefined,'errore di rete: si riprova al prossimo avvio');
assert.ok(!fill(cat,{}) || cat[4].imgFrom===''); // al secondo giro restano solo le carte con errore di rete
// nota nella scheda solo per immagini inglesi su carte non inglesi
const note=e=>(e.imgFrom==='EN'&&e.lang!=='EN')?'Immagine della versione inglese':null; // (senza foto mia)
assert.strictEqual(note(cat[0]),'Immagine della versione inglese'); assert.strictEqual(note(cat[2]),null);
console.log('ios_images_test: ok, errori: nessuno');
