// Ridisegno dell'app nativa (ottobre 2026) sugli screen di riferimento: Home, Collezione, Scheda carta,
// pannello Aggiungi, Progressi, Pokédex e barra a schede in vetro con tasto di scansione al centro.
// Controlli statici (lo Swift non si compila qui) più le regole di calcolo rifatte in JS.
const fs=require('fs'), assert=require('assert');
const D=require('./percorsi').SWIFT;
const files=fs.readdirSync(D).filter(f=>f.endsWith('.swift'));
const src={}; for(const f of files) src[f]=fs.readFileSync(D+f,'utf8');
const all=Object.values(src).join('\n');
const has=(f,...ks)=>{ for(const k of ks) assert.ok(src[f]&&src[f].includes(k),f+' deve contenere: '+k); };

// 1 nessun tipo dichiarato due volte e ogni vista nuova esiste
const decl={}; for(const [f,s] of Object.entries(src)) for(const m of s.matchAll(/^(?:struct|enum|final class|class)\s+(\w+)/gm)){ assert.ok(!decl[m[1]],'tipo dichiarato due volte: '+m[1]+' ('+decl[m[1]]+', '+f+')'); decl[m[1]]=f; }
for(const t of ['Theme','PanelStyle','ScreenHeader','SectionTitle','Pill','PillButton','SearchField','CircleIcon','CardArt','QtyBadge','ThinBar','ProgressRing','AppTab','GlassTabBar','TabBarSpace','HomeView','AreaValueChart','GridCell','AlbumLayout','SetFilter','SetsSummary','SetProgressRow','DexOwnFilter','AddOptionRow','ManualSearchPage'])
  assert.ok(decl[t],'manca il tipo '+t);
const topf={}; for(const s of Object.values(src)) for(const m of s.matchAll(/^func (\w+)\(/gm)){ assert.ok(!topf[m[1]],'funzione globale doppia: '+m[1]); topf[m[1]]=1; }
// i membri di Theme usati esistono
const themeMembers=[...src['Theme.swift'].match(/enum Theme \{([\s\S]*?)\n\}/)[1].matchAll(/static let (\w+)/g)].map(m=>m[1]);
for(const m of all.matchAll(/Theme\.(\w+)/g)) assert.ok(themeMembers.includes(m[1]),'Theme.'+m[1]+' non esiste');
console.log('1',Object.keys(decl).length,'tipi senza doppioni, viste nuove presenti, membri di Theme validi');

// 2 barra a schede: 4 schede + tasto giallo al centro in vetro, sistema TabView rimosso
const app=src['CartePokemonApp.swift'], th=src['Theme.swift'];
assert.ok(!/TabView\(|tabViewBottomAccessory/.test(app),'niente barra di sistema');
assert.deepStrictEqual([...th.matchAll(/item\(\.(\w+), "([^"]+)"/g)].map(m=>m[2]),['Home','Collezione','Progressi','Pokédex'],'quattro schede nell\'ordine dello screen');
const bar=th.match(/struct GlassTabBar[\s\S]*?\n\}\n/)[0];
assert.ok(bar.indexOf('"Collezione"')<bar.indexOf('scanButton.frame')&&bar.indexOf('scanButton.frame')<bar.indexOf('"Progressi"'),'scansione al centro');
assert.ok(/glassEffect\(\.regular\.tint\(Theme\.accentFill\)\.interactive\(\), in: \.circle\)/.test(bar)&&/glassEffect\((capsuleGlass|\.(regular|clear)(\.interactive\(\))?), in: \.capsule\)/.test(bar),'Liquid Glass: capsula e cerchio giallo interattivo');
assert.ok(/reviewCount > 0/.test(bar),'numero delle carte da controllare sul tasto');
has('CartePokemonApp.swift','visited.contains(t)','.ignoresSafeArea(.keyboard','showAdd = true','.allowsHitTesting(tab == t)');
console.log('2 barra in vetro: Home, Collezione, [scansione], Progressi, Pokédex; schede create alla prima visita');

// 3 Home (screen 1)
has('HomeView.swift','ScreenHeader(title: "Album")','Valore della collezione','Ultime aggiunte','Si sono mossi (30 gg)','Set in corso','moverList("Salite", ups)','moverList("Scese", downs)',
  '(7, "7 gg"), (30, "30 gg"), (90, "90 gg"), (0, "Tutto")','priceMovers(days: days)','store.vhist','tab = .collection','tab = .progress','showSettings = true','backupFileURL','markBackupDone','snoozeBackup','gg fa','diverse');
console.log('3 Home: valore + periodo, ultime aggiunte, si sono mossi, set in corso, backup e impostazioni');

// 4 Collezione (screen 2)
const al=src['AlbumView.swift'];
has('AlbumView.swift','ScreenHeader(title: "Collezione"','"Nome, set o numero"','"Lingua"','"Set"','"Doppioni"','"Senza prezzo"','PillButton(text: "Tutte"','count: 3','QtyBadge','selection.insert(e.key)','List(selection: $selection)','layout == .grid','"Seleziona"');
assert.ok(/dupOnly \{ items = items\.filter \{ \$0\.qty > 1 \} \}/.test(al)&&/noPrice \{ items = items\.filter \{ store\.unit\(\$0\) == nil \} \}/.test(al)&&/store\.groupKey\(\$0\) == k/.test(al),'regole dei filtri');
console.log('4 Collezione: griglia a 3, filtri a pillole, ordina, griglia/elenco, selezione in entrambi');

// 5 Scheda carta (screen 3)
has('CardDetailView.swift','label("Variante")','store.priceInfo(e.pr, v)','label("Condizione")','ForEach(CONDS)','"Quantità"','"Prezzo mio"','"non impostato"','"Storico prezzo"',' gg")','AreaValueChart(points: pts)','Image(systemName: "ellipsis")','confirmDelete = true','edit(variant: v)','edit(cond: c.code)','$0.qty = max(1, $0.qty - 1)','min(999, $0.qty + 1)');
console.log('5 Scheda carta: varianti col prezzo, condizione a pillole, quantità −/+, prezzo mio, storico con variazione');

// 6 Pannello Aggiungi (screen 4)
has('AddView.swift','maxSelectionCount: 20','queue.submit(photo: d)','"Riprendi"','Riconoscimento con','cambia in Impostazioni','showCamera ? nil : queue.pendingEdges.first','EdgeEditView(','ManualSearchPage {','highlight: primary');
has('AddView.swift','.presentationDetents([.height(max(contentH + 30, 320)), .large])');
console.log('6 Aggiungi: Scansione rapida / Da foto / Cerca e aggiungi, coda con Riprendi, bordi da confermare');

// 7 Progressi (screen 5)
has('SetsView.swift','ScreenHeader(title: "Progressi")','case open = "In corso", done = "Completati", all = "Tutti i set"','ProgressRing(','"Cerca un set"','carte nei set iniziati','scope.caption','mancano ','ThinBar(');
console.log('7 Progressi: anello, ricerca, In corso / Completati / Tutti i set, righe con mancanti');

// 8 Pokédex (screen 6)
has('DexViews.swift','ScreenHeader(title: "Pokédex"','Pokémon raccolti','non ancora collegat','"Leggi ora"','"Gen \\(g.roman)"','"Mancanti"','"Posseduti"','"Tutte"','"Energie"','ensureDexTotals(Array(g.lo...g.hi))','strokeBorder(Theme.accent','carte")','"Generazione \\(g.roman) · \\(g.region)"');
console.log('8 Pokédex: totale su 1025, avviso carte da collegare, generazioni a pillole, celle evidenziate');

// 9 regole rifatte in JS
// 9a riepilogo dei set (come setsSummary/isComplete)
function summary(groups){ const s={have:0,total:0,started:0,complete:0}; for(const g of groups){ s.started++; if(g.total>0){ s.total+=g.total; s.have+=Math.min(g.have,g.total); if(g.have>=g.total) s.complete++; } } s.pct=s.total>0?s.have/s.total*100:0; return s; }
const S=summary([{have:5,total:132},{have:0,total:0},{have:12,total:10},{have:3,total:0}]);
assert.deepStrictEqual([S.have,S.total,S.started,S.complete],[15,142,4,1]); assert.ok(Math.abs(S.pct-10.563)<0.01);
assert.strictEqual(summary([]).pct,0,'nessuna divisione per zero');
const sw=src['SetsView.swift'];
assert.ok(/: min\(g\.nums\.count, t\)/.test(sw)&&/if h >= t \{ s\.complete \+= 1 \}/.test(sw)&&/s\.have \+= h/.test(sw)&&/total > 0 \? Double\(have\) \/ Double\(total\) \* 100 : 0/.test(sw),'Swift con le stesse regole');
// 9b "si sono mossi": la più salita e la più scesa, ignorando le variazioni nulle
// 20/10: le prime 3 salite (dalla più salita) e le prime 3 scese (dalla più scesa), soglia 0,004 €
function movers(rows){ const up=rows.filter(r=>r.d>0.004).sort((a,b)=>b.d-a.d).slice(0,3), down=rows.filter(r=>r.d<-0.004).sort((a,b)=>a.d-b.d).slice(0,3); return [up.map(r=>r.n),down.map(r=>r.n)]; }
assert.deepStrictEqual(movers([{n:'A',d:4},{n:'B',d:-0.8},{n:'C',d:0},{n:'D',d:1},{n:'E',d:2},{n:'F',d:0.5},{n:'G',d:-3}]),[['A','E','D'],['G','B']]);
assert.deepStrictEqual(movers([{n:'C',d:0},{n:'H',d:0.003}]),[[],[]]);
assert.ok(/rows\.filter \{ \$0\.d > 0\.004 \}\.sorted \{ \$0\.d > \$1\.d \}\.prefix\(3\)/.test(src['HomeView.swift'])&&/rows\.filter \{ \$0\.d < -0\.004 \}\.sorted \{ \$0\.d < \$1\.d \}\.prefix\(3\)/.test(src['HomeView.swift']),'regola delle salite/scese nello Swift');
// 9c set "in corso" in Home: totale ignoto o non completo
const open=g=>g.total===0||g.have<g.total;
assert.deepStrictEqual([{have:1,total:0},{have:5,total:5},{have:4,total:5}].map(open),[true,false,true]);
assert.ok(/t == 0 \|\| g\.nums\.count < t/.test(src['HomeView.swift']));
// 9d storico della carta: variazione = ultimo − primo, giorni almeno 1
const pts=[{day:100,v:18},{day:130,v:20},{day:160,v:25}]; assert.strictEqual(pts.at(-1).v-pts[0].v,7); assert.strictEqual(Math.max(1,pts.at(-1).day-pts[0].day),60);
console.log('9 regole: riepilogo set (15/142, 1 completo), prime 3 salite/scese, set in corso, variazione dello storico');

console.log('errori: nessuno'); process.exit(0);
