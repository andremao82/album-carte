// Progressi: contatore rispetto a tutti i set con selettore Iniziati / Ufficiali / Tutti (18/10/2026).
const fs=require('fs'), assert=require('assert');
const D=require('./percorsi').SWIFT;
const sets=fs.readFileSync(D+'SetsView.swift','utf8'), mod=fs.readFileSync(D+'Models.swift','utf8');
const has=(s,...ks)=>{ for(const k of ks) assert.ok(s.includes(k),'manca: '+k); };

// 1 struttura nello Swift
has(sets,'enum SetScope: String, CaseIterable, Identifiable','case started = "Iniziati", official = "Ufficiali", all = "Tutti"','func setsSummary(scope: SetScope = .started)','tdMeta["it"]','func officialOf','func officialHave','@AppStorage("setsScope")','SetScope.all.rawValue','ForEach(SetScope.allCases)','scopeRaw = sc.rawValue','setsSummary(scope: scope)','func setsLine','var sets = 0');
has(mod,'func setsPercent(_ p: Double)','"%.2f"');
assert.ok(!/store\.setsSummary\(\)/.test(sets),'la scheda usa sempre l\'ambito scelto');
console.log('1 SetScope, selettore a tre pillole salvato (predefinito Tutti), riepilogo con ambito');

// 2 regole rifatte in JS (stesse del Swift)
const normNum=v=>v.replace(/^0+(?=.)/,'');
function summary(groups,itMeta,scope){
  const s={have:0,total:0,started:0,complete:0,sets:0}, startedIT=new Set();
  for(const g of groups){
    s.started++; if(g.lang==='it'&&g.setId) startedIT.add(g.setId);
    const off=g.official>0?g.official:0, tot=g.total>0?g.total:off;
    const t=scope==='official'?off:tot; if(!(t>0)) continue;
    const nums=new Set(g.nums.map(normNum));
    const h=scope==='official'?[...nums].filter(n=>/^\d+$/.test(n)&&+n>=1&&+n<=t).length:Math.min(nums.size,t);
    s.total+=t; s.have+=h; s.sets++; if(h>=t) s.complete++;
  }
  if(scope!=='started') for(const [id,m] of Object.entries(itMeta)) if(!startedIT.has(id)){ const t=scope==='official'?(m.official||0):(m.total||m.official||0); if(t>0){s.total+=t;s.sets++;} }
  return s;
}
const it={ me02:{official:217,total:295}, me01:{official:132,total:188}, sv3:{official:197,total:230}, sv4:{official:182,total:266}, promo:{official:0,total:0} };
const owned=[ {lang:'it',setId:'me02',official:217,total:295,nums:['012']}, {lang:'it',setId:'me01',official:132,total:188,nums:['7']} ];
let a=summary(owned,it,'started');
assert.deepStrictEqual([a.have,a.total,a.started,a.sets],[2,483,2,2],'iniziati come prima: 2/483');
a=summary(owned,it,'all');
assert.deepStrictEqual([a.have,a.total,a.sets],[2,295+188+230+266,4],'tutti: anche sv3 e sv4 mai iniziati, promo vuoto escluso');
a=summary(owned,it,'official');
assert.deepStrictEqual([a.have,a.total,a.sets],[2,217+132+197+182,4],'ufficiali: solo i numeri ufficiali');
// una segreta (n. 250 di 295) conta in Tutti ma non in Ufficiali
const sec=[{lang:'it',setId:'me02',official:217,total:295,nums:['250','12']}];
assert.strictEqual(summary(sec,it,'all').have,2); assert.strictEqual(summary(sec,it,'official').have,1,'segreta fuori dagli ufficiali');
// numero con lettere (TG01) non è ufficiale
assert.strictEqual(summary([{lang:'it',setId:'me02',official:217,total:295,nums:['TG01','5']}],it,'official').have,1);
// un set in inglese che non è nell'elenco italiano conta col suo totale e non fa superare il 100%
const en=[{lang:'en',setId:'xy1',official:146,total:146,nums:['1','2','3']}];
a=summary(en,it,'all'); assert.strictEqual(a.have,3); assert.strictEqual(a.total,146+295+188+230+266);
// set completo
const full={lang:'it',setId:'sv3',official:3,total:3,nums:['1','2','3']}; assert.strictEqual(summary([full],{sv3:{official:3,total:3}},'all').complete,1);
// l'elenco italiano non ancora caricato: Tutti = solo i set che hai (nessun errore, nessun totale a metà)
a=summary(owned,{},'all'); assert.strictEqual(a.total,483);
// un set iniziato appare una sola volta
assert.strictEqual(summary(owned,it,'all').sets,4);
console.log('2 riepilogo: iniziati 2/483, tutti 2/979, ufficiali 2/728; segrete e numeri con lettere fuori dagli ufficiali');

// 3 percentuale: due decimali sotto l'1%
const pct=p=>(p>0&&p<1?p.toFixed(2):p.toFixed(1)).replace('.',',')+'%';
assert.strictEqual(pct(0),'0,0%'); assert.strictEqual(pct(2/979*100),'0,20%'); assert.strictEqual(pct(0.414),'0,41%'); assert.strictEqual(pct(12.34),'12,3%'); assert.strictEqual(pct(100),'100,0%');
// riga sotto il numero
const line=(s,sc)=>{const c=s.complete+' '+(s.complete===1?'completo':'completi'); return sc==='started'?`${s.started} ${s.started===1?'set iniziato':'set iniziati'} · ${c}`:`${s.started} ${s.started===1?'iniziato':'iniziati'} su ${Math.max(s.sets,s.started)} set · ${c}`;};
assert.strictEqual(line({started:2,complete:0,sets:2},'started'),'2 set iniziati · 0 completi');
assert.strictEqual(line({started:1,complete:1,sets:99},'all'),'1 iniziato su 99 set · 1 completo');
console.log('3 percentuale 0,20% sotto l\'1%, riga "2 iniziati su N set"');

// 4 parentesi bilanciate
for(const [n,s] of Object.entries({'SetsView.swift':sets,'Models.swift':mod})){
  const t=s.replace(/"(?:\\.|[^"\\\n])*"/g,'""').replace(/\/\/.*$/gm,'');
  for(const [o,c] of [['{','}'],['(',')'],['[',']']]) assert.strictEqual(t.split(o).length,t.split(c).length,n+' '+o+c);
}
console.log('4 parentesi bilanciate');
console.log('errori: nessuno');
