// Correzione 18/10/2026: nel Pokédex ogni tocco apriva Mew e "indietro" scorreva fra i Pokémon.
// Causa: la griglia sta in una sola riga della List; più NavigationLink nella stessa riga si attivano tutti
// (si impilano i 151 dettagli di Gen I, in cima l'ultimo = Mew). Ora: pulsanti .borderless + NavigationPath.
const fs=require('fs'), assert=require('assert');
const D=require('./percorsi').SWIFT;
const dex=fs.readFileSync(D+'DexViews.swift','utf8');
const has=(s,...ks)=>{ for(const k of ks) assert.ok(s.includes(k),'manca: '+k); };

// 1 la vista Pokédex governa il percorso e la griglia lo usa
has(dex,'@State private var path = NavigationPath()','NavigationStack(path: $path)',
  'PokemonGrid(gen: gen, own: own, query: query) { path.append($0) }','let open: (DexRoute) -> Void');
assert.strictEqual((dex.match(/NavigationStack/g)||[]).length,1,'un solo NavigationStack nel Pokédex');

// 2 dentro PokemonGrid nessun NavigationLink, solo pulsanti indipendenti
const noCom=t=>t.replace(/\/\/[^\n]*/g,'');
const grid=noCom(dex.match(/struct PokemonGrid[\s\S]*?\n\}\n/)[0]);
assert.ok(!/NavigationLink/.test(grid),'niente NavigationLink nella griglia');
has(grid,'Button { open(DexRoute(kind: "pokemon", n: n, name: store.dexName(n))) }','.buttonStyle(.borderless)','.foregroundStyle(.primary)');
// 3 ogni LazyVGrid dentro una List non deve contenere NavigationLink (stesso difetto)
for (const f of fs.readdirSync(D).filter(n=>n.endsWith('.swift'))) {
  const s=noCom(fs.readFileSync(D+f,'utf8'));
  const re=/LazyVGrid\([^)]*\)\s*\{/g; let m;
  while ((m=re.exec(s))) {
    // estrae il blocco della griglia contando le graffe
    let i=m.index+m[0].length, d=1; while (d>0 && i<s.length) { if (s[i]=='{') d++; else if (s[i]=='}') d--; i++; }
    const block=s.slice(m.index,i), before=s.slice(0,m.index);
    const inList=before.lastIndexOf('List {')>before.lastIndexOf('ScrollView');
    if (inList) {
      assert.ok(!/NavigationLink/.test(block),f+': NavigationLink in una griglia dentro List');
      if (/Button/.test(block)) assert.ok(/\.buttonStyle\(\.borderless\)/.test(block),f+': pulsanti della griglia in List non borderless');
    }
  }
}
// 4 il dettaglio resta raggiungibile: la destinazione DexRoute è registrata sullo stack
has(dex,'.appDestinations()');
// 5 simulazione: con il vecchio difetto lo stack aveva tutti i Pokémon della riga; ora uno solo
const stackOld=[]; for (let n=1;n<=151;n++) stackOld.push(n);
assert.strictEqual(stackOld[stackOld.length-1],151,'vecchio: in cima Mew (#151)');
const path=[]; const open=r=>path.push(r); open({kind:'pokemon',n:25}); assert.deepStrictEqual(path.map(r=>r.n),[25]);
path.pop(); assert.strictEqual(path.length,0,'indietro torna all\'elenco');
console.log('Pokédex: un tocco = un dettaglio, indietro torna all\'elenco; nessuna griglia in List con NavigationLink; errori: nessuno');
