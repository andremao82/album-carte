// 22/10/2026: nel dettaglio di un set le carte segrete (numero oltre il totale ufficiale stampato, es. 103/102)
// stanno in una sezione a parte "Carte segrete", con il conteggio delle possedute; i filtri Tutte/Possedute/Mancanti valgono anche lì.
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'), assert=require('assert');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const now=Date.now();
let n=0; const ok=(c,m)=>{ assert.ok(c,m); n++; };
const mk=(sid,num,name)=>({key:`tcgdex:it:${sid}-${num}|IT|Normale|NM`,cardId:`tcgdex:it:${sid}-${num}`,name,setName:'Set '+sid,number:num,total:'004',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:1,added:now,src:'tcgdex',srcId:sid+'-'+num,srcLang:'it',setId:sid,dex:[]});
// s1: 4 ufficiali + 3 segrete (005, 006, 007); possedute 002 e 006. s2: nessuna segreta. s3: numeri con lettere oltre il totale (non segrete per numero).
const seed=[mk('s1','002','Due'),mk('s1','006','Sei segreta'),mk('s2','001','Uno'),mk('s3','001','Uno')];
const card=(sid,i,name)=>({id:sid+'-'+i,localId:i,name,image:''});
const sets={
  s1:{id:'s1',name:'Set s1',cardCount:{official:4,total:7},cards:['001','002','003','004','005','006','007'].map(i=>card('s1',i,'Carta '+i))},
  s2:{id:'s2',name:'Set s2',cardCount:{official:3,total:3},cards:['1','2','3'].map(i=>card('s2',i,'Carta '+i))},
  s3:{id:'s3',name:'Set s3',cardCount:{official:2,total:3},cards:['1','2','TG01'].map(i=>card('s3',i,'Carta '+i))}};
const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
const api=async(url)=>{ url=String(url);
  if(url.endsWith('/it/sets')) return J(Object.values(sets).map(s=>({id:s.id,name:s.name,cardCount:s.cardCount})));
  const m=url.match(/\/it\/sets\/(\w+)$/); if(m&&sets[m[1]]) return J(sets[m[1]]);
  if(/\/(en|ja)\/sets$/.test(url)) return J([]); return J({},404); };
function boot(){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.pages.dev/',virtualConsole:vc,
   beforeParse(w){ w.localStorage.setItem('pkm_catalog',JSON.stringify(seed)); w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=api; }});
  return {w:dom.window,d:dom.window.document,errors}; }
const nums=(t,sel)=>[...t.d.querySelectorAll(sel)].map(b=>b.dataset.n).join(',');
(async()=>{
  const t=boot(); await wait(250);
  t.d.querySelector('nav button[data-go="sets"]').click(); await wait(300);
  t.d.querySelector('[data-set*="s1"]').click(); await wait(300);
  const v=t.d.getElementById('v-setd');
  ok(!v.hidden,'dettaglio del set aperto');
  ok(v.querySelectorAll('.sgrid').length===2,'due griglie: carte ufficiali e carte segrete');
  ok(nums(t,'#v-setd .sgrid:not(.sgrid-sec) .scell')==='001,002,003,004','griglia principale solo con le ufficiali ('+nums(t,'#v-setd .sgrid:not(.sgrid-sec) .scell')+')');
  ok(nums(t,'#v-setd .sgrid-sec .scell')==='005,006,007','griglia delle segrete con 005, 006, 007 ('+nums(t,'#v-setd .sgrid-sec .scell')+')');
  const sec=v.querySelector('.ssec'); ok(sec&&sec.querySelector('h2').textContent==='Carte segrete','titolo "Carte segrete"');
  ok(sec.querySelector('.cap').textContent==='1 di 3','conteggio segrete possedute: 1 di 3 (letto '+sec.querySelector('.cap').textContent+')');
  ok(/oltre 4/.test(v.querySelector('.ssec-note').textContent),'nota con il totale ufficiale 4');
  ok(v.querySelector('.sgrid-sec .scell[data-n="006"]').classList.contains('own'),'la segreta posseduta è segnata come tua');
  ok(v.querySelector('.sgrid .scell[data-n="002"]').classList.contains('own'),'la posseduta ufficiale resta nella griglia principale');
  ok(/Tutte \(7\)/.test(v.querySelector('.seg').textContent),'il filtro Tutte conta ancora tutte le carte (7)');
  // filtri
  v.querySelector('[data-f="own"]').click(); await wait(200);
  ok(nums(t,'#v-setd .sgrid:not(.sgrid-sec) .scell')==='002'&&nums(t,'#v-setd .sgrid-sec .scell')==='006','Possedute: 002 sopra, 006 fra le segrete');
  v.querySelector('[data-f="miss"]').click(); await wait(200);
  ok(nums(t,'#v-setd .sgrid:not(.sgrid-sec) .scell')==='001,003,004'&&nums(t,'#v-setd .sgrid-sec .scell')==='005,007','Mancanti: 001,003,004 e segrete 005,007');
  ok(v.querySelector('.ssec .cap').textContent==='1 di 3','il conteggio delle segrete non cambia col filtro');
  // tocco su una segreta posseduta = apre la scheda
  v.querySelector('[data-f="all"]').click(); await wait(200);
  v.querySelector('.sgrid-sec .scell[data-n="006"]').click(); await wait(200);
  ok(!t.d.getElementById('v-card').hidden,'tocco sulla segreta posseduta apre la sua scheda');
  // set senza segrete: nessuna sezione
  t.d.querySelector('#v-card [data-a="back"]').click(); await wait(150);
  t.d.querySelector('#v-setd [data-a="back"]').click(); await wait(200);
  t.d.querySelector('[data-set*="s2"]').click(); await wait(300);
  ok(!v.querySelector('.ssec')&&v.querySelectorAll('.sgrid').length===1&&nums(t,'#v-setd .sgrid .scell')==='1,2,3','set senza segrete: una griglia sola, nessuna sezione');
  // numeri con lettere oltre il totale: restano nella griglia principale
  t.d.querySelector('#v-setd [data-a="back"]').click(); await wait(200);
  t.d.querySelector('[data-set*="s3"]').click(); await wait(300);
  ok(!v.querySelector('.ssec')&&nums(t,'#v-setd .sgrid .scell')==='1,2,TG01','numeri con lettere (TG01) non sono contati come segrete');
  assert.deepStrictEqual(t.errors,[],'errori della pagina');
  console.log('set_secret_test: '+n+' controlli superati, errori: nessuno'); process.exit(0);
})().catch(e=>{ console.error(e); process.exit(1); });
