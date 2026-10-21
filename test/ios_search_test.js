// 19/10/2026: Venusaur 30/165 di Expedition (IT) veniva proposto come la carta 30 di 151 (altro set da 165):
// TCGdex teneva il risultato per solo numero anche con nome diverso e la Pokémon TCG API non veniva interrogata.
// Ora i risultati con nome o numero diversi sono "deboli" e si usano solo se nessuna fonte trova di meglio.
const fs=require('fs'), assert=require('assert');
const D=require('./percorsi').SWIFT;
const api=fs.readFileSync(D+'API.swift','utf8'), ops=fs.readFileSync(D+'StoreOps.swift','utf8'), add=fs.readFileSync(D+'AddView.swift','utf8');
const has=(s,...ks)=>{ for(const k of ks) assert.ok(s.includes(k),'manca: '+k); };
// 1 codice Swift
has(api,'static func searchRanked(name: String, num: String, tot: String, lang: String?) async throws -> (cards: [Candidate], weak: Bool)',
  'static func searchRanked(name: String, num: String, tot: String, key: String) async throws -> (cards: [Candidate], weak: Bool)',
  'else { weakIds = hits.map { jstr($0["id"]) } }','let weak = ids.isEmpty','return (result, weak)',
  'let byNumTot = q.contains("set.printedTotal:")','if !same.isEmpty { return (same, false) }','return (weak, !weak.isEmpty)');
assert.ok(!api.includes('ids = (byName.isEmpty ? hits : byName)'),'vecchio ripiego sul solo numero rimosso');
has(ops,'var weak = false','TCGdex.searchRanked(name: tdName ?? name','PTCG.searchRanked(name: name',
  'if !r.cards.isEmpty && (!r.weak || weakTd.isEmpty)','if out.found.isEmpty && !weakTd.isEmpty');
has(add,'if o.weak && !o.found.isEmpty {','ecco le più vicine');
// le vecchie funzioni restano (compatibilità) e passano dalla nuova
has(api,'try await searchRanked(name: name, num: num, tot: tot, lang: lang).cards','try await searchRanked(name: name, num: num, tot: tot, key: key).cards');

// 2 regole rifatte in JS con dati finti
const norm=s=>s.toLowerCase().replace(/[^\p{L}\p{N}]/gu,''), strip=v=>String(v).replace(/^0+(?=\d)/,'');
const close=(a,b)=>{ const x=norm(a),y=norm(b); return !!x && (x.includes(y)||y.includes(x)); };
// TCGdex: sets {id,official,cards:[{id,localId,name}]}, byName: elenco per nome
function tcgdex(db,name,num,tot){
  let ids=[],weakIds=[];
  if(num&&tot){ const hits=[]; for(const s of db.sets.filter(s=>String(s.official)===tot)){ const m=s.cards.find(c=>strip(c.localId)===strip(num)); if(m) hits.push(m); }
    const byName=name?hits.filter(h=>close(h.name,name)):[];
    if(!name||byName.length) ids=(name?byName:hits).map(h=>h.id); else weakIds=hits.map(h=>h.id); }
  if(!ids.length&&name){ const l=db.sets.flatMap(s=>s.cards).filter(c=>close(c.name,name)); const f=num?l.filter(c=>strip(c.localId)===strip(num)):l;
    if(f.length) ids=f.slice(0,8).map(c=>c.id); else if(!weakIds.length) weakIds=l.slice(0,8).map(c=>c.id); }
  const weak=!ids.length; if(weak) ids=weakIds; if(!ids.length) return {cards:[],weak:false};
  return {cards:ids.map(id=>({id,src:'tcgdex',name:db.sets.flatMap(s=>s.cards).find(c=>c.id===id).name})),weak};
}
// Pokémon TCG API: cards {id,name,number,printedTotal}
function ptcg(db,name,num,tot){
  const q=[]; if(num&&tot) q.push('nt'); if(name&&num) q.push('nn'); if(name) q.push('n');
  let weak=[];
  for(const k of q){
    const f=db.filter(c=>k==='nt'?c.number===num&&String(c.printedTotal)===tot:k==='nn'?close(c.name,name)&&c.number===num:close(c.name,name));
    if(!f.length) continue;
    if(k==='nt'&&name){ const same=f.filter(c=>close(c.name,name)); if(same.length) return {cards:same,weak:false}; if(!weak.length) weak=f; continue; }
    if(k==='n'&&num){ if(!weak.length) weak=f; continue; }
    return {cards:f,weak:false};
  }
  return {cards:weak,weak:weak.length>0};
}
function searchCards(td,pt,name,num,tot,tdName){
  const out={found:[],source:'',weak:false}; let weakTd=[];
  const a=tcgdex(td,tdName||name,num,tot); if(a.weak) weakTd=a.cards; else { out.found=a.cards; out.source='TCGdex'; }
  if(!out.found.length){ const r=ptcg(pt,name,num,tot); if(r.cards.length&&(!r.weak||!weakTd.length)){ out.found=r.cards; out.source='Pokémon TCG API'; out.weak=r.weak; } }
  if(!out.found.length&&weakTd.length){ out.found=weakTd; out.source='TCGdex'; out.weak=true; }
  return out;
}
const autoPick=(rec,c)=>{ if(c.length!==1) return null; const x=c[0]; if(rec.confidence<0.7) return null; if(strip(rec.number)!==strip(x.number||x.localId||'')) return null;
  const a=norm(rec.name_printed),b=norm(x.name),en=norm(rec.name_en); if(a&&b&&!(b.includes(a)||a.includes(b)||(en&&(b.includes(en)||en.includes(b))))) return null; return x; };

const tdIT={sets:[
  {id:'sv03.5',official:165,cards:[{id:'sv03.5-003',localId:'003',name:'Venusaur'},{id:'sv03.5-030',localId:'030',name:'Nidorina'}]},
  {id:'base1',official:102,cards:[{id:'base1-15',localId:'15',name:'Venusaur'}]}]};   // Expedition non c'è in italiano
const pt=[{id:'ecard1-30',name:'Venusaur',number:'30',printedTotal:165},{id:'sv3pt5-30',name:'Nidorina',number:'30',printedTotal:165},
  {id:'sv3pt5-3',name:'Venusaur',number:'3',printedTotal:165},{id:'base1-15',name:'Venusaur',number:'15',printedTotal:102}];
const rec={name_en:'Venusaur',name_printed:'Venusaur',number:'30',printed_total:'165',language:'it',confidence:0.9};

// il caso dello screen: prima usciva Nidorina di 151
let o=searchCards(tdIT,pt,'Venusaur','30','165','Venusaur');
assert.deepStrictEqual(o.found.map(c=>c.id),['ecard1-30'],'trova Venusaur di Expedition'); assert.strictEqual(o.source,'Pokémon TCG API'); assert.strictEqual(o.weak,false);
assert.ok(autoPick(rec,o.found.map(c=>({...c}))),'aggiunta automatica');
// la carta giusta su TCGdex resta la prima scelta (italiano)
o=searchCards(tdIT,pt,'Nidorina','30','165');
assert.deepStrictEqual(o.found.map(c=>c.id),['sv03.5-030']); assert.strictEqual(o.source,'TCGdex');
o=searchCards(tdIT,pt,'Venusaur','3','165');
assert.deepStrictEqual(o.found.map(c=>c.id),['sv03.5-003']); assert.strictEqual(o.weak,false);
// numero senza nome: come prima, i risultati per numero valgono
o=searchCards(tdIT,pt,'','30','165');
assert.deepStrictEqual(o.found.map(c=>c.id),['sv03.5-030']); assert.strictEqual(o.weak,false);
// nessuna fonte con nome e numero giusti: si propongono i più vicini di TCGdex, segnati come deboli, mai aggiunti da soli
o=searchCards(tdIT,pt,'Mew','30','165');
assert.deepStrictEqual(o.found.map(c=>c.id),['sv03.5-030']); assert.strictEqual(o.weak,true); assert.strictEqual(o.source,'TCGdex');
assert.strictEqual(autoPick({...rec,name_en:'Mew',name_printed:'Mew'},o.found.map(c=>({...c,number:'30'}))),null);
// stesso nome con altro numero: deboli
o=searchCards(tdIT,pt,'Venusaur','99','');
assert.strictEqual(o.weak,true); assert.ok(o.found.length>=1);
// solo la Pokémon TCG API ha qualcosa di debole: si usa (TCGdex vuoto)
o=searchCards({sets:[]},pt,'Mew','30','165');
assert.deepStrictEqual(o.found.map(c=>c.id).sort(),['ecard1-30','sv3pt5-30']); assert.strictEqual(o.weak,true); assert.strictEqual(o.source,'Pokémon TCG API');
// nome forte sulla Pokémon TCG API scavalca il debole di TCGdex
o=searchCards({sets:[{id:'x',official:165,cards:[{id:'x-30',localId:'30',name:'Nidorina'}]}]},pt,'Venusaur','30','165');
assert.deepStrictEqual(o.found.map(c=>c.id),['ecard1-30']);
console.log('ios_search ok');
