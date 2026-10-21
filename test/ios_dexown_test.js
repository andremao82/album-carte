// 18/10/2026: nel dettaglio Pokédex la carta posseduta non appariva colorata (Gengar Skyridge 10/144 EN,
// set che non esiste nell'elenco italiano; inoltre le carte lette dalla Pokémon TCG API non hanno srcId).
// Ora: confronto per id normalizzato (srcId o cardId) e le tue carte fuori elenco stanno in testa, colorate.
const fs=require('fs'), assert=require('assert');
const D=require('./percorsi').SWIFT;
const dex=fs.readFileSync(D+'DexViews.swift','utf8'), mod=fs.readFileSync(D+'Models.swift','utf8');
const has=(s,...ks)=>{ for(const k of ks) assert.ok(s.includes(k),'manca: '+k); };
// 1 funzioni nel modello, senza regex letterali (SWIFT_VERSION 5.0 non le accetta senza flag)
has(mod,'func normCardId(_ s: String) -> String','func entryMatchIds(_ e: Entry) -> [String]','[e.srcId ?? "", e.cardId]');
assert.ok(!/replacing\(\//.test(mod),'niente regex /.../ letterali');
// 2 dettaglio: indice per id normalizzato, carte fuori elenco, tocco sulla posseduta apre la scheda
has(dex,'let mineById = ownedById(mine)','let others = notInList(mine, list)','ForEach(others) { e in',
  'mineById[normCardId(c.id)]','Button { openKey = e.key }','if let e = mineHere { openKey = e.key } else { adding = c }',
  '.navigationDestination(item: $openKey) { CardDetailView(key: $0) }','non contano nel totale','non conta nel totale');
assert.ok(!dex.includes('Set(store.catalog.compactMap { $0.srcId })'),'vecchio confronto solo per srcId rimosso');
// 3 le carte fuori elenco vengono prima di quelle dell'elenco
assert.ok(dex.indexOf('ForEach(others)')<dex.indexOf('ForEach(ordered) { c in'),'fuori elenco in testa');
// 4 regole rifatte in JS
const normCardId=s=>{ let out='',dg=''; const fl=()=>{ if(!dg) return; const t=dg.replace(/^0+/,''); out+=t||'0'; dg=''; };
  for (const ch of s.toLowerCase()){ if(/[0-9]/.test(ch)) dg+=ch; else { fl(); out+=ch; } } fl(); return out; };
assert.strictEqual(normCardId('sv01-025'),normCardId('sv1-25'));
assert.strictEqual(normCardId('SWSH1-001'),'swsh1-1');
assert.strictEqual(normCardId('base1-0'),'base1-0');
assert.notStrictEqual(normCardId('sv1-25'),normCardId('sv1-250'));
const ids=e=>[e.srcId||'',e.cardId].filter(Boolean).map(normCardId);
const notInList=(mine,list)=>{ const S=new Set(list.map(c=>normCardId(c.id))), seen=new Set();
  return mine.filter(e=>{ const ks=ids(e); if(ks.some(k=>S.has(k))) return false; const k=ks[0]||e.key; if(seen.has(k)) return false; seen.add(k); return true; }); };
const list=[{id:'swsh4-018'},{id:'sv03.5-094'},{id:'ecard3-10x'}];
const gengar={key:'ecard3-10|EN|Reverse holo|EX',cardId:'ecard3-10',lang:'EN'};
const gengar2={...gengar,key:'ecard3-10|EN|Normale|NM'};               // stessa carta, altra variante: una sola cella
const ptcgInList={key:'k2',cardId:'swsh4-18'};                         // Pokémon TCG API, senza srcId: ora colorata
const td={key:'k3',cardId:'tcgdex:it:sv03.5-094',srcId:'sv03.5-094'};
const out=notInList([gengar,gengar2,ptcgInList,td],list);
assert.deepStrictEqual(out.map(e=>e.key),[gengar.key],'solo Gengar Skyridge fuori elenco, una volta');
const by={}; for (const e of [ptcgInList,td]) for (const k of ids(e)) by[k]=by[k]||e;
assert.ok(by[normCardId('swsh4-018')] && by[normCardId('sv03.5-094')],'possedute riconosciute anche senza srcId');
console.log('ios_dexown ok');
