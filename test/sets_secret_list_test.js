// 22/10/2026: in Progressi la riga di ogni set dice quante carte segrete ha (totale completo oltre quello stampato)
// e quante ne possiedi (riga a parte "3 carte segrete · 1 tua"); la pillola "Con segrete" mostra solo i set che ne hanno.
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'), assert=require('assert');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const now=Date.now();
let n=0; const ok=(c,m)=>{ assert.ok(c,m); n++; };
const mk=(sid,num,i)=>({key:`tcgdex:it:${sid}-${num}|IT|Normale|NM`,cardId:`tcgdex:it:${sid}-${num}`,name:'Carta '+num,setName:'Set '+sid,number:num,total:'004',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:1,added:now-i*1000,src:'tcgdex',srcId:sid+'-'+num,srcLang:'it',setId:sid,dex:[]});
// s1: 4 + 3 segrete, tue 002 e 006 (1 segreta); s2: nessuna segreta; s3: 1 segreta, nessuna tua; s4: 2 segrete, tue entrambe
const all=[mk('s1','002',1),mk('s1','006',2),mk('s2','001',3),mk('s3','001',4),mk('s4','011',5),mk('s4','012',6)];
const counts={s1:{official:4,total:7},s2:{official:3,total:3},s3:{official:2,total:3},s4:{official:10,total:12}};
const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
const api=async(url)=>{ url=String(url);
  if(url.endsWith('/it/sets')) return J(Object.keys(counts).map(id=>({id,name:'Set '+id,cardCount:counts[id]})));
  if(/\/(en|ja)\/sets$/.test(url)) return J([]); return J({},404); };
function boot(seed){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.pages.dev/',virtualConsole:vc,
   beforeParse(w){ w.localStorage.setItem('pkm_catalog',JSON.stringify(seed)); w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=api; }});
  return {w:dom.window,d:dom.window.document,errors}; }
const capOf=(t,sid,root='#sets-list')=>{ const r=t.d.querySelector(root+' [data-set*="|'+sid+'"]'); if(!r) return null; const x=r.querySelector('.cap.sx'); return x?x.textContent:''; };
const mainCap=(t,sid)=>t.d.querySelector('#sets-list [data-set*="|'+sid+'"] .cap:not(.sx)').textContent;
const shown=t=>[...t.d.querySelectorAll('#sets-list .sprow')].map(r=>r.dataset.set.split('|').pop()).sort().join(',');
(async()=>{
  const t=boot(all); await wait(250);
  t.d.querySelector('nav button[data-go="sets"]').click(); await wait(300);
  const pills=[...t.d.querySelectorAll('#ss-filter .pb')];
  ok(pills.map(p=>p.textContent).join('|')==='In corso|Completati|Tutti i set|Con segrete','quattro pillole, l\'ultima "Con segrete" ('+pills.map(p=>p.textContent).join('|')+')');
  ok(t.d.getElementById('ss-filter').classList.contains('scroll'),'riga delle pillole scorrevole (non sta in 390 px)');
  t.d.querySelector('#ss-filter [data-sf="all"]').click(); await wait(100);
  ok(capOf(t,'s1')==='3 carte segrete · 1 tua','s1: 3 segrete, 1 tua, su una riga a parte (letto: '+capOf(t,'s1')+')');
  ok(!/segret/.test(mainCap(t,'s1'))&&/mancano 5 carte$/.test(mainCap(t,'s1')),'la riga principale resta com\'era ('+mainCap(t,'s1')+')');
  ok(capOf(t,'s2')==='','s2 senza segrete: nessuna riga in più ('+capOf(t,'s2')+')');
  ok(capOf(t,'s3')==='1 carta segreta · nessuna tua','s3: 1 segreta, nessuna tua (letto: '+capOf(t,'s3')+')');
  ok(capOf(t,'s4')==='2 carte segrete · 2 tue','s4: 2 segrete, 2 tue (letto: '+capOf(t,'s4')+')');
  ok(/2 \/ 7/.test(t.d.querySelector('#sets-list [data-set*="|s1"] .t1').textContent),'il conteggio a destra resta sul totale completo (2 / 7)');
  t.d.querySelector('#ss-filter [data-sf="secret"]').click(); await wait(100);
  ok(t.d.querySelector('#ss-filter [data-sf="secret"]').getAttribute('aria-pressed')==='true','pillola "Con segrete" attiva');
  ok(shown(t)==='s1,s3,s4','"Con segrete" mostra solo s1, s3, s4 (letto: '+shown(t)+')');
  t.d.getElementById('ss-q').value='s3'; t.d.getElementById('ss-q').dispatchEvent(new t.w.Event('input',{bubbles:true})); await wait(100);
  ok(shown(t)==='s3','"Con segrete" insieme alla ricerca (letto: '+shown(t)+')');
  t.d.getElementById('ss-q').value=''; t.d.getElementById('ss-q').dispatchEvent(new t.w.Event('input',{bubbles:true})); await wait(100);
  t.d.querySelector('#ss-filter [data-sf="open"]').click(); await wait(100);
  ok(shown(t)==='s1,s2,s3,s4','"In corso" invariato (letto: '+shown(t)+')');
  // Home, "Set in corso": stessa riga
  t.d.querySelector('nav button[data-go="home"]').click(); await wait(200);
  ok([...t.d.querySelectorAll('#v-home .sprow .cap')].some(c=>/segret/.test(c.textContent)),'anche in Home le righe dei set dicono le segrete');
  // nessun set con segrete
  const t2=boot([mk('s2','001',1)]); await wait(250);
  t2.d.querySelector('nav button[data-go="sets"]').click(); await wait(300);
  t2.d.querySelector('#ss-filter [data-sf="secret"]').click(); await wait(100);
  ok(/Nessuno dei tuoi set ha carte segrete/.test(t2.d.getElementById('sets-list').textContent),'messaggio quando nessun set ha segrete');
  assert.deepStrictEqual([...t.errors,...t2.errors],[],'errori della pagina');
  console.log('sets_secret_list_test: '+n+' controlli superati, errori: nessuno'); process.exit(0);
})().catch(e=>{ console.error(e); process.exit(1); });
