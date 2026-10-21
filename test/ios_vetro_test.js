// 20/10/2026, app nativa: ridisegno "Vetro olografico" sulle schermate di prova approvate.
// Lo Swift non si compila qui: controlli sul codice e regole dell'inclinazione rifatte in JS.
const fs=require('fs'); const assert=require('assert');
const D=require('./percorsi').SWIFT;
const rd=f=>fs.readFileSync(D+f,'utf8');
const comp=rd('Components.swift'), det=rd('CardDetailView.swift'), al=rd('AlbumView.swift'), home=rd('HomeView.swift');
let n=0; const ok=(c,m)=>{ n++; assert.ok(c,'NON SUPERATO: '+m); };
const has=(s,f,...ks)=>{ for(const k of ks) ok(s.includes(k),f+' deve contenere: '+k); };
const slice=(s,a,b)=>{ const i=s.indexOf(a); assert.ok(i>=0,'manca '+a); const j=b?s.indexOf(b,i+a.length):s.length; return s.slice(i,j<0?s.length:j); };

// 1 componenti nuovi
has(comp,'Components','enum HoloKind { case none, holo, reverse }','func holoKind(_ variant: String) -> HoloKind','struct HoloSheen: View','struct TiltingCard<Content: View>: View',
  'func tiltPoint(_ loc: CGPoint, in size: CGSize) -> CGPoint','func tiltAngles(_ p: CGPoint?) -> (x: Double, y: Double)');
const tc=slice(comp,'struct TiltingCard','\n}\n');
// le proprietà private renderebbero privato l'inizializzatore automatico: serve quello esplicito
ok(/@State private var/.test(tc)&&/\n    init\(kind: HoloKind, radius: CGFloat = 10, tapEnabled: Bool = true, onTap: @escaping \(\) -> Void, @ViewBuilder content: @escaping \(\) -> Content\)/.test(tc),'TiltingCard: inizializzatore esplicito con @ViewBuilder');
ok(tc.includes('@Environment(\\.accessibilityReduceMotion) private var reduceMotion')&&tc.includes('let p: CGPoint? = reduceMotion ? nil : point'),'Riduci movimento: la carta resta ferma');
ok(/if !reduceMotion \{ point = tiltPoint\(v\.location, in: size\) \}/.test(tc),'con Riduci movimento il punto non si aggiorna');
ok(tc.includes('DragGesture(minimumDistance: 0)'),'il trascinamento parte da fermo');
ok(/let wasTap = moved < 8/.test(tc)&&/if wasTap && tapEnabled \{ onTap\(\) \}/.test(tc),'tocco = spostamento sotto 8 pt, solo se abilitato');
ok(/withAnimation\(\.spring\(duration: 0\.35\)\) \{ point = nil \}/.test(tc),'lasciando il dito torna a riposo con una molla');
ok(tc.indexOf('.gesture(')<tc.indexOf('.rotation3DEffect('),'gesto prima della rotazione: coordinate della carta dritta');
ok(/rotation3DEffect\(\.degrees\(ang\.y\), axis: \(x: 0, y: 1, z: 0\), perspective: 0\.5\)/.test(tc)&&/rotation3DEffect\(\.degrees\(ang\.x\), axis: \(x: 1, y: 0, z: 0\), perspective: 0\.5\)/.test(tc),'rotazione sui due assi');
ok(tc.includes('.onGeometryChange(for: CGSize.self) { $0.size } action: { size = $0 }'),'misura della carta senza GeometryReader');
ok(tc.includes('.overlay { HoloSheen(kind: kind, at: p) }')&&tc.indexOf('.overlay { HoloSheen')<tc.indexOf('.clipShape('),'riflesso sopra l’immagine, ritagliato agli angoli');
ok(/accessibilityAddTraits\(tapEnabled \? \.isButton : \[\]\)/.test(tc)&&/accessibilityAction \{ if tapEnabled \{ onTap\(\) \} \}/.test(tc),'VoiceOver: è un tasto e si attiva col doppio tocco');
const hs=slice(comp,'struct HoloSheen','\n}\n');
ok(/case \.none:\s*\n\s*Color\.clear\.allowsHitTesting\(false\)/.test(hs),'nessun riflesso sulle varianti normali');
ok(/\.blendMode\(\.colorDodge\)/.test(hs)&&/\.blendMode\(\.overlay\)/.test(hs),'arcobaleno sulle Holo, banda chiara sulle Reverse');
ok((hs.match(/allowsHitTesting\(false\)/g)||[]).length===3,'il riflesso non intercetta i tocchi');
ok(!/Color\.yellow|Color\.white|\.white\b/.test(hs),'nessun colore fisso del tema nel riflesso');

// 2 regole rifatte in JS (stesse dello Swift)
const tiltPoint=(x,y,w,h)=>(w>0&&h>0)?[Math.min(1,Math.max(0,x/w)),Math.min(1,Math.max(0,y/h))]:[0.5,0.5];
const tiltAngles=p=>p?{x:(0.5-p[1])*22,y:(p[0]-0.5)*28}:{x:0,y:0};
const holoKind=v=>v==='Holo'?'holo':v==='Reverse holo'?'reverse':'none';
ok(/\(0\.5 - Double\(p\.y\)\) \* 22/.test(comp)&&/\(Double\(p\.x\) - 0\.5\) \* 28/.test(comp),'formule dello Swift uguali a quelle provate qui');
ok(/min\(1, max\(0, loc\.x \/ size\.width\)\)/.test(comp)&&/min\(1, max\(0, loc\.y \/ size\.height\)\)/.test(comp),'punto limitato alla carta nello Swift');
assert.deepStrictEqual(tiltPoint(230,0,230,321),[1,0]); assert.deepStrictEqual(tiltAngles(tiltPoint(230,0,230,321)),{x:11,y:14}); n++;
assert.deepStrictEqual(tiltAngles(tiltPoint(0,321,230,321)),{x:-11,y:-14}); n++;
assert.deepStrictEqual(tiltAngles(tiltPoint(115,160.5,230,321)),{x:0,y:0}); n++;
assert.deepStrictEqual(tiltPoint(900,-50,230,321),[1,0]); n++;                       // fuori dalla carta: bordo
assert.deepStrictEqual(tiltPoint(10,10,0,0),[0.5,0.5]); n++;                          // misura non ancora nota
assert.deepStrictEqual(tiltAngles(null),{x:0,y:0}); n++;
assert.deepStrictEqual(['Holo','Reverse holo','Normale','1st edition','Altro'].map(holoKind),['holo','reverse','none','none','none']); n++;
ok(/case "Holo": return \.holo/.test(comp)&&/case "Reverse holo": return \.reverse/.test(comp)&&/default: return \.none/.test(comp),'varianti dello Swift uguali');
console.log('1-2 inclinazione e riflesso: regole e componenti ok');

// 3 scheda carta
const hero=slice(det,'private func hero(_ e: Entry)','private func sourceLine(');
has(hero,'scheda','TiltingCard(kind: holoKind(e.variant), radius: 10, tapEnabled: canZoomImage(art)) { zoom = true } content: {',
  'CardArt(url: art, radius: 10, name: e.name, number: e.number)','.frame(width: 230)','.fullScreenCover(isPresented: $zoom)',
  'Text("Trascina il dito sulla carta per inclinarla")','if !reduceMotion {','photoMenu(e)','.font(.system(size: 44, weight: .heavy, design: .rounded))','sourceLine(e, info)','setLine(e.setName, e.number, e.total)');
ok(hero.indexOf('TiltingCard(')<hero.indexOf('Text(e.name)')&&hero.indexOf('Text(e.name)')<hero.indexOf('if let u = store.unit(e)'),'ordine: carta, nome e set, prezzo');
ok(!/Button \{ zoom = true \}/.test(det)&&!/allowsHitTesting\(canZoomImage/.test(det),'il vecchio tasto sull’immagine è sostituito');
ok(det.includes('@Environment(\\.accessibilityReduceMotion) private var reduceMotion'),'la scheda sa se Riduci movimento è attivo');
const ls=slice(det,'private func langSection(_ e: Entry)','// MARK: - Variante');
has(ls,'lingua','label("Lingua")','ForEach(LANGS, id: \\.self) { l in','edit(lang: l)','accessibilityLabel(langLong(l))','Theme.accentFill','frame(maxWidth: .infinity, minHeight: 38)','.isSelected');
ok(/hero\(e\)\n\s*langSection\(e\)\n\s*variantSection\(e\)/.test(det),'lingua subito sopra la variante');
ok(!/Picker\("Lingua"/.test(det)&&!/chevron\.up\.chevron\.down/.test(det),'niente più menu della lingua');
const mine=slice(det,'private func mineSection','// MARK: - Storico');
ok(!/Text\("Lingua"\)/.test(mine)&&mine.includes('Text("Quantità")')&&mine.includes('Text("Prezzo mio")'),'pannello: quantità e prezzo mio, senza la riga della lingua');
console.log('3 scheda carta: carta che si inclina, prezzo sotto, lingua a pillole');

// 4 Collezione
ok(al.includes('@AppStorage("albumLayout") private var layout: AlbumLayout = .grid')&&/enum AlbumLayout: String \{ case grid, list \}/.test(al),'griglia/elenco ricordato (predefinita griglia)');
has(al,'Collezione','private var layoutSwitch: some View','layoutButton(.grid, "square.grid.3x3", "Griglia")','layoutButton(.list, "list.bullet", "Elenco")','withAnimation { layout = l }');
ok(!/layout = layout == \.grid \? \.list : \.grid/.test(al),'il vecchio tasto unico è sostituito');
const ss=slice(al,'private var statsStrip: some View','// MARK: - Griglia o elenco');
has(ss,'fascia','Text("Valore stimato")','eur(s.val)','statCell("Carte", "\\(s.n)")','statCell("Diverse", "\\(d)")','Set(store.catalog.map { $0.cardId }).count','minimumScaleFactor(0.55)','senza prezzo');
ok(/if !store\.catalog\.isEmpty \{ statsStrip \}/.test(al),'fascia solo con carte in catalogo');
ok(/ScreenHeader\(title: "Collezione"\) \{/.test(al)&&!/private var subtitle: Text/.test(al),'valori nella fascia, non più nel sottotitolo');
const gc=slice(al,'struct GridCell','// MARK: - Riquadro del valore');
ok(/\.overlay \{ HoloSheen\(kind: holoKind\(e\.variant\)\) \}/.test(gc),'miniature con riflesso statico');
ok(gc.indexOf('HoloSheen')<gc.indexOf('.clipShape(')&&gc.indexOf('.clipShape(')<gc.indexOf('QtyBadge'),'riflesso ritagliato, badge ×N sopra');
console.log('4 Collezione: fascia valori, griglia/elenco ricordato, riflessi');

// 5 Home
const vc=slice(home,'private var valueCard','private var periodText');
has(vc,'valore','valueSideStat("\\(s.n)", s.n == 1 ? "carta" : "carte", accent: true)','valueSideStat("\\(distinct)", "diverse")','valueSideStat("\\(sets)", "set")','.frame(width: 92, alignment: .leading)','"prezzi rispetto a " + periodText','minimumScaleFactor(0.5)');
ok(vc.indexOf('Text(eur(s.val))')<vc.indexOf('valueSideStat('),'valore a sinistra, colonna a destra');
ok(home.includes('private func valueSideStat(_ value: String, _ name: String, accent: Bool = false) -> some View'),'colonna dei numeri');
const mv=slice(home,'private var moversSection','// MARK: - Set in corso');
has(mv,'Si sono mossi','SectionTitle(text: "Si sono mossi (30 gg)")','let ups: [AppStore.Mover] = Array(','let downs: [AppStore.Mover] = Array(','moverList("Salite", ups)','moverList("Scese", downs)',
  'ForEach(items, id: \\.e.key)','NavigationLink(value: CardRoute(key: m.e.key))','Text(signedEur(m.d))','Text(signedPct(m.pct))','Text("Nessuna")');
ok(!/moverBox/.test(home),'vecchi riquadri Più salita/Più scesa rimossi');
console.log('5 Home: colonna a destra, prime 3 salite e scese');

// 6 regole dello Swift
for (const [f,s] of [['Components',comp],['CardDetailView',det],['AlbumView',al],['HomeView',home]]){
  let b=0,p=0; for(const ch of s.replace(/"(?:[^"\\\n]|\\.)*"/g,'""').replace(/\/\/[^\n]*/g,'')){ if(ch==='{')b++; if(ch==='}')b--; if(ch==='(')p++; if(ch===')')p--; }
  ok(b===0&&p===0,f+': graffe e tonde bilanciate ('+b+','+p+')');
  ok(!/Color\.yellow/.test(s),f+': nessun giallo fisso');
}
console.log('6 graffe e tonde bilanciate, nessun giallo fisso');
console.log('verifiche superate:',n);
console.log('errori: nessuno');
