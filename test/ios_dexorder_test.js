// 18/10/2026: nella scheda del Pokémon (Pokédex) prima le carte possedute, poi le mancanti.
// Ordine: tue carte fuori elenco → possedute dell'elenco → mancanti (ordine TCGdex dentro ogni gruppo).
const fs=require('fs'), assert=require('assert');
const dex=fs.readFileSync(require('./percorsi').SWIFT+'DexViews.swift','utf8');
const has=(...ks)=>{ for(const k of ks) assert.ok(dex.includes(k),'manca: '+k); };
has('let ordered = ownedFirst(list, mineById)','ForEach(ordered) { c in',
  'private func ownedFirst(_ list: [SetCardSummary], _ mineById: [String: Entry]) -> [SetCardSummary]','return have + miss');
assert.ok(!dex.includes('ForEach(list) { c in'),'la griglia non usa più l\'elenco grezzo');
assert.ok(dex.indexOf('ForEach(others)')<dex.indexOf('ForEach(ordered)'),'fuori elenco ancora in testa');
// regola in JS (stabile: conserva l'ordine dentro i gruppi)
const norm=s=>s.toLowerCase().replace(/\d+/g,d=>String(+d));
const list=['swsh4-018','sv1-033','sv3-034','base1-5','neo1-050'].map(id=>({id}));
const mine={[norm('sv3-34')]:1,[norm('neo1-50')]:1};
const owned=c=>mine[norm(c.id)]!==undefined;
const out=[...list.filter(owned),...list.filter(c=>!owned(c))].map(c=>c.id);
assert.deepStrictEqual(out,['sv3-034','neo1-050','swsh4-018','sv1-033','base1-5']);
assert.strictEqual(out.length,list.length,'nessuna carta persa o duplicata');
console.log('ios_dexorder ok');
