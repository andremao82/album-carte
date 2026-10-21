// 18/10/2026 (sera): grafico del valore con date, valori e punto toccato; Carte di maggior valore; ordinamento ricordato.
// Ripristina (e controlla che non si perda di nuovo) la modifica della chat precedente, persa per sovrascrittura del kit.
const fs=require('fs'), assert=require('assert');
const D=require('./percorsi').SWIFT;
const rd=f=>fs.readFileSync(D+f,'utf8');
const home=rd('HomeView.swift'), comp=rd('Components.swift'), album=rd('AlbumView.swift'), card=rd('CardDetailView.swift');
const chart=home.slice(home.indexOf('struct AreaValueChart'));

// 1 assi e punti
assert.ok(!chart.includes('.chartXAxis(.hidden)')&&!chart.includes('.chartYAxis(.hidden)'),'assi non nascosti');
assert.ok(/\.chartXAxis \{\s*AxisMarks\(values: ticks\)/.test(chart),'date in basso dai giorni scelti');
assert.ok(chart.includes('chartDayLabel(')&&chart.includes('v.index == 0 ? .topLeading')&&chart.includes('.topTrailing'),'prima e ultima data dentro il grafico');
assert.ok(/AxisMarks\(position: \.trailing, values: \.automatic\(desiredCount: 3\)\)/.test(chart)&&chart.includes('chartEuroLabel(d, whole: whole)'),'valori in euro a destra');
assert.ok(/PointMark[\s\S]*symbolSize\(points\.count > CHART_MAX_DOTS \? 0 : \d+\)/.test(chart),'punti visibili (fino a 31)');
assert.ok(/height: CGFloat = 150/.test(chart),'altezza 150');
// 2 valore del punto al tocco, senza bloccare lo scorrimento
assert.ok(chart.includes('.chartXSelection(value: $selDate)')&&/\.chartGesture \{ proxy in\s*SpatialTapGesture\(\)\.onEnded \{ t in proxy\.selectXValue\(at: t\.location\.x\) \}/.test(chart),'tocco → selezione');
assert.ok(!/DragGesture/.test(chart),'nessun trascinamento sul grafico (bloccherebbe la pagina)');
assert.ok(/RuleMark[\s\S]*annotation[\s\S]*eur\(s\.value\)[\s\S]*chartDayLabel\(s\.day\)/.test(chart),'riquadro con valore e data');
assert.ok(chart.includes('nearestPoint(points,'),'punto più vicino');
// 3 Home: il grafico non è dentro un NavigationLink (il tocco andrebbe alla pagina Valore)
const vc=home.slice(home.indexOf('private var valueCard'),home.indexOf('private var periodText'));
const link=vc.indexOf('NavigationLink { ValueView() }'), linkEnd=vc.indexOf('.accessibilityHint', link), chartAt=vc.indexOf('AreaValueChart(points: series)');
assert.ok(link>0&&chartAt>linkEnd,'collegamento "Dettagli" separato dal grafico');
assert.ok(vc.includes('Text("Dettagli")'),'Dettagli');
// 4 pagina Valore: stesso grafico, filtrato per periodo; scheda carta con lo stesso grafico
const vv=album.slice(album.indexOf('struct ValueView'));
assert.ok(vv.includes('AreaValueChart(points: series, height: 200)')&&/q\[0\] >= start/.test(vv),'pagina Valore filtrata per periodo');
assert.ok(card.includes('AreaValueChart(points: pts)'),'storico prezzo con assi');
// 5 Carte di maggior valore e ordinamento
const order=['valueCard','topValueSection','recentSection','moversSection'].map(k=>home.indexOf('                        '+k));
assert.ok(order.every((v,i)=>v>0&&(i==0||v>order[i-1])),'Carte di maggior valore sopra Ultime aggiunte');
assert.ok(home.includes('"Carte di maggior valore", action: "Tutte") { albumSort = .value; tab = .collection }'),'Tutte → Valore');
assert.ok(home.includes('"Ultime aggiunte", action: "Tutte") { albumSort = .recent; tab = .collection }'),'Tutte → Più recenti');
assert.ok(home.includes('@AppStorage("albumSort") private var albumSort: AlbumSort = .recent')&&album.includes('@AppStorage("albumSort") private var sort: AlbumSort = .recent'),'ordinamento condiviso e ricordato');
assert.ok(!/@State private var sort/.test(album),'niente più @State per l\'ordinamento');

// 6 regole rifatte in JS (stesse di Components.swift)
const cs=comp.slice(comp.indexOf('func chartTickDays'));
assert.ok(/let u = Array\(Set\(days\)\)\.sorted\(\)/.test(cs)&&/Double\(i\) \* Double\(u\.count - 1\) \/ Double\(n - 1\)\)\.rounded\(\)/.test(cs),'regola dei giorni');
assert.ok(/hi - lo >= 5/.test(cs)&&/maximumFractionDigits = 0/.test(cs)&&/"d MMM yy" : "d MMM"/.test(cs)&&/it_IT/.test(cs),'regole delle etichette');
const swRound=x=>Math.sign(x)*Math.round(Math.abs(x)); // .rounded() di Swift: metà lontano dallo zero
function ticks(days,n=4){const u=[...new Set(days)].sort((a,b)=>a-b);if(u.length<=n)return u;const o=[];for(let i=0;i<n;i++){const d=u[swRound(i*(u.length-1)/(n-1))];if(o[o.length-1]!==d)o.push(d);}return o;}
assert.deepStrictEqual(ticks([5,5]),[5],'stesso giorno una volta sola');
assert.deepStrictEqual(ticks([1,2]),[1,2],'due punti: due date (caso dello screen)');
const many=Array.from({length:30},(_,i)=>100+i);
const t=ticks(many); assert.strictEqual(t.length,4); assert.strictEqual(t[0],100); assert.strictEqual(t[3],129,'primo e ultimo giorno compresi');
assert.ok(t.every((v,i)=>i==0||v>t[i-1]),'crescenti, senza doppioni');
assert.deepStrictEqual(ticks([1,2,3,4,5]),[1,2,4,5]);
const whole=v=>Math.max(...v)-Math.min(...v)>=5;
assert.strictEqual(whole([70,78.18]),true); assert.strictEqual(whole([75,78.18]),false,'escursione piccola: due decimali');
const MESI=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const label=(d,today)=>{const a=new Date(d*864e5),b=new Date(today*864e5);return a.getUTCDate()+' '+MESI[a.getUTCMonth()]+(a.getUTCFullYear()!==b.getUTCFullYear()?' '+String(a.getUTCFullYear()).slice(2):'');};
const day=s=>Math.floor(Date.parse(s+'T00:00:00Z')/864e5);
assert.strictEqual(label(day('2026-10-12'),day('2026-10-18')),'12 ott');
assert.strictEqual(label(day('2025-12-31'),day('2026-10-18')),'31 dic 25','altro anno con l\'anno');
const near=(p,d)=>p.reduce((a,b)=>Math.abs(b.day-d)<Math.abs(a.day-d)?b:a);
assert.strictEqual(near([{day:1},{day:10},{day:20}],13).day,10);
// maggior valore: senza prezzo esclusi, ordine per prezzo di una copia, al massimo 12
const ts=comp.slice(comp.indexOf('func topValueEntries'));
assert.ok(/if let u = unit\(e\)/.test(ts)&&/a\.price > b\.price/.test(ts)&&/a\.entry\.added > b\.entry\.added/.test(ts)&&/n: Int = 12/.test(ts),'regola maggior valore');
// Xcode non riusciva a controllare i tipi della versione a catena (compactMap/sorted con tuple anonime $0.1)
const body=ts.slice(0,ts.indexOf('\n}\n'));
assert.ok(!/\$[01]\.[01]/.test(body),'niente tuple anonime $0.1 / $1.0 (type-check lento)');
assert.ok(!/compactMap[\s\S]*\.sorted[\s\S]*\.prefix/.test(body),'niente catena unica compactMap→sorted→prefix');
const top=(cat,n=12)=>cat.filter(e=>e.u!=null).sort((a,b)=>a.u!==b.u?b.u-a.u:b.added-a.added).slice(0,n);
const cat=[{u:1,added:1},{u:null,added:9},{u:5,added:2},{u:5,added:3}];
assert.deepStrictEqual(top(cat).map(e=>e.added),[3,2,1]);
assert.strictEqual(top(Array.from({length:20},(_,i)=>({u:i,added:i}))).length,12);
console.log('ios_chart_test ok, errori: nessuno');
