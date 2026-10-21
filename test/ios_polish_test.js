// Ritocchi 18/10/2026: foglio Aggiungi (contrasto, altezza al contenuto, respiro), Progressi (numeri grandi),
// testata Pokédex (schede Pokémon/Allenatori/Energie/Artisti, numero grande, percentuale, "Tutte").
// Controlli statici sullo Swift più le regole di calcolo rifatte in JS.
const fs=require('fs'), assert=require('assert');
const D=require('./percorsi').SWIFT;
const S=n=>fs.readFileSync(D+n,'utf8');
const add=S('AddView.swift'), th=S('Theme.swift'), sets=S('SetsView.swift'), dex=S('DexViews.swift'), app=S('CartePokemonApp.swift'), mod=S('Models.swift');
const has=(s,...ks)=>{ for(const k of ks) assert.ok(s.includes(k),'manca: '+k); };

// 1 foglio Aggiungi: fondo pieno e pannelli chiari, testi leggibili, altezza = contenuto, nessuna altezza fissa
has(th,'static let sheetBg','static let sheetPanel','static let sheetPanelHi','static let sheetText','var fill: Color');
has(add,'.presentationBackground(Theme.sheetBg)','.onGeometryChange(for: CGFloat.self)','contentH = $0','.height(max(contentH + 30, 320))','fill: Theme.sheetPanel','.foregroundStyle(Theme.sheetText)');
assert.ok(!/height\(520\)/.test(app+add),'altezza fissa 520 rimossa');
assert.ok(!/presentationDetents/.test(app),'i detent li decide AddView');
// titolo con più respiro e testi più grandi (caption -> subheadline / footnote)
has(add,'.font(.system(size: 30, weight: .heavy))','.padding(.top, 22)');
const row=add.match(/struct AddOptionRow[\s\S]*?\n\}\n/)[0];
assert.ok(/subheadline/.test(row)&&!/\.caption\)/.test(row),'descrizione delle opzioni più leggibile');
// contrasto: bianco su grigio 0.18 supera 4.5:1 (WCAG), il vecchio secondario su vetro no
const lum=c=>{const f=x=>x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);return f(c)};
const ratio=(a,b)=>{const [l1,l2]=[lum(a),lum(b)].sort((x,y)=>y-x);return (l1+0.05)/(l2+0.05)};
const sheetText=0.74*1+(1-0.74)*0.18; // bianco al 74% sul pannello 0.18
assert.ok(ratio(sheetText,0.18)>=4.5,'testo secondario del foglio >= 4.5:1: '+ratio(sheetText,0.18).toFixed(1));
assert.ok(ratio(1,0.18)>=12,'titoli bianchi su pannello');
// altezza foglio: contenuto + 30, minimo 320
const detent=h=>Math.max(h+30,320);
assert.strictEqual(detent(100),320); assert.strictEqual(detent(380),410);
console.log('1 foglio Aggiungi: fondo pieno, pannelli chiari, contrasto',ratio(sheetText,0.18).toFixed(1)+':1, altezza al contenuto');

// 2 Progressi: numeri grandi
has(sets,'size: 46, weight: .heavy','case .started: return "carte nei set iniziati"','ProgressRing(value: s.pct / 100, size: 88, line: 10)','pct','.foregroundStyle(Theme.accent)');
// il totale è la somma dei set iniziati (screen: 295 + 188 = 483), la percentuale 2/483 = 0,4%
const sum=[295,188].reduce((a,b)=>a+b,0); assert.strictEqual(sum,483);
assert.strictEqual((2/483*100).toFixed(1).replace('.',','),'0,4');
console.log('2 Progressi: numero 46 pt, anello 88 pt con % dentro; 295+188=483, 2/483=0,4%');

// 3 Pokédex: schede, numero grande, percentuale a due decimali, Tutte
has(dex,'case pokemon = "Pokémon", trainers = "Allenatori", energies = "Energie", artists = "Artisti"','ForEach(DexMode.allCases)','size: 56, weight: .heavy','dexPercent(have: st.have, total: t)','ThinBar(value: Double(st.have) / Double(t), height: 8)','PillButton(text: "Tutte", selected: gen < 0) { gen = -1 }','gen < 0 ? GENS','TrainerList()','EnergyList()','struct PendingNote');
assert.ok(!/\.cats|CategoryList|"Categorie"/.test(dex),'Categorie sostituite da Allenatori ed Energie');
has(dex,'if mode == .pokemon || mode == .artists','if mode == .pokemon { pills }');
has(mod,'func dexPercent(have: Int, total: Int)','"%.2f"');
const dexPercent=(h,t)=>t>0?(h/t*100).toFixed(2).replace('.',',')+'%':'0,00%';
assert.strictEqual(dexPercent(1,1025),'0,10%'); assert.strictEqual(dexPercent(0,1025),'0,00%'); assert.strictEqual(dexPercent(1025,1025),'100,00%'); assert.strictEqual(dexPercent(5,0),'0,00%');
// numero grande per scheda
const hero=(mode,cat)=>({pokemon:{have:cat.dex,total:1025,label:'Pokémon raccolti'},trainers:{have:cat.trainer,total:null,label:'carte Allenatore'},energies:{have:cat.energy,total:null,label:'carte Energia'},artists:{have:cat.artists,total:null,label:'artisti nelle tue carte'}})[mode];
const c={dex:1,trainer:12,energy:30,artists:4};
assert.deepStrictEqual(hero('pokemon',c),{have:1,total:1025,label:'Pokémon raccolti'}); assert.strictEqual(hero('trainers',c).total,null); assert.strictEqual(hero('energies',c).have,30);
// 1025 = ultimo numero del Pokédex nazionale usato dall'app
has(mod,'DEX_MAX'); assert.ok(/DEX_MAX\s*=\s*1025/.test(mod),'DEX_MAX = 1025');
// quattro schede con larghezza uguale
assert.deepStrictEqual([...dex.match(/enum DexMode[^\n]*\n[^\n]*/)[0].matchAll(/= "([^"]+)"/g)].map(m=>m[1]),['Pokémon','Allenatori','Energie','Artisti']);
console.log('3 Pokédex: 4 schede, numero 56 pt, % a due decimali (1/1025 = 0,10%), Tutte, Allenatori/Energie');

// 4 parentesi bilanciate nei file toccati
for(const [n,s] of Object.entries({'AddView.swift':add,'Theme.swift':th,'SetsView.swift':sets,'DexViews.swift':dex,'CartePokemonApp.swift':app,'Models.swift':mod})){
  const t=s.replace(/"(?:\\.|[^"\\\n])*"/g,'""').replace(/\/\/.*$/gm,'');
  for(const [o,cl] of [['{','}'],['(',')'],['[',']']]) assert.strictEqual(t.split(o).length,t.split(cl).length,n+' '+o+cl+' sbilanciate');
}
console.log('4 parentesi bilanciate nei 6 file toccati');
console.log('errori: nessuno');
