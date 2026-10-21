const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const now=Date.now(), DAY=864e5;
const mk=(id,num,name,set,setId,o={})=>({key:`tcgdex:it:${id}|IT|Normale|NM`,cardId:`tcgdex:it:${id}`,name,setName:set,number:num,total:'6',img:`https://assets.tcgdex.net/it/me/${setId}/${num}/low.webp`,lang:'IT',variant:'Normale',cond:'NM',qty:1,price:1,priceManual:null,pr:{normal:1,avg30:1},added:now,src:'tcgdex',srcId:id,srcLang:'it',setId,...o});
const seed=[
 mk('me01-001','001','Carta cara','Megaevoluzione','me01',{price:25,pr:{normal:25,avg30:20},added:now-5*DAY}),
 mk('me01-003','003','Carta media','Megaevoluzione','me01',{qty:3,price:2,pr:{normal:2,avg30:2.5},added:now-3*DAY}),
 mk('sv01-010','010','Altra','Scarlatto e Violetto','sv01',{price:0.5,pr:{normal:0.5,avg30:0.5},added:now-1*DAY}),
 {key:'old|IT|Normale|NM',cardId:'sv3pt5-58',name:'Pikachu',setName:'Base',number:'58',total:'102',img:'x.png',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:null,added:1}];
const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
const api=async(url)=>{url=String(url); if(url.endsWith('/it/sets')) return J([{id:'me01',name:'Megaevoluzione',cardCount:{official:6,total:8}},{id:'sv01',name:'Scarlatto e Violetto',cardCount:{official:198,total:258}}]);
  if(url.endsWith('/it/sets/me01')) return J({id:'me01',name:'Megaevoluzione',cardCount:{total:8},cards:[1,2,3,4,5,6,7,8].map(n=>({id:'me01-00'+n,localId:'00'+n,name:'C'+n}))}); return J({},404)};
function boot(opts={}){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.detail&&e.detail.stack||e.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
   beforeParse(w){ if(opts.seed!==null) w.localStorage.setItem('pkm_catalog',JSON.stringify(opts.seed||seed)); if(opts.cfg) w.localStorage.setItem('pkm_cfg',JSON.stringify(opts.cfg));
    w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=api; }});
  return {w:dom.window,d:dom.window.document,errors,ls:dom.window.localStorage}; }
const vis=(t,id)=>!t.d.getElementById(id).hidden;
const txt=(t,sel)=>{const el=t.d.querySelector(sel);return el?el.textContent.replace(/\s+/g,' ').trim():null};
const tab=t=>{const b=[...t.d.querySelectorAll('nav button')].find(b=>b.getAttribute('aria-current')==='true');return b&&b.dataset.go};
function eq(a,b,msg){ const nb=v=>typeof v==='string'?v.replace(/\u00a0/g,' '):v; a=nb(a); b=nb(b); if(a!==b) throw new Error('NON SUPERATO: '+msg+' (atteso '+JSON.stringify(b)+', letto '+JSON.stringify(a)+')'); console.log('  ok  '+msg+': '+a); }
function ok(c,msg){ if(!c) throw new Error('NON SUPERATO: '+msg); console.log('  ok  '+msg); }
(async()=>{
 let t=boot({cfg:{gkey:'AIzaX',provider:'gemini'}}); await wait(300);
 eq([...t.d.querySelectorAll('nav button[data-go]')].map(b=>b.textContent.trim()).join(' | '),'Home | Collezione | Progressi | Pokédex','1 barra come la nativa');
 eq(tab(t),'home','1 pagina iniziale'); ok(vis(t,'fab'),'1 tasto giallo');
 eq(txt(t,'#v-home h1'),'Album','2 titolo Album');
 eq(txt(t,'#v-home .vbig'),'31,50 €','2 valore (25 + 3×2 + 0,5)');
 eq([...t.d.querySelectorAll('#v-home .vside b')].map(b=>b.textContent).join('|'),'6|4|3','2 carte / diverse / set');
 eq(txt(t,'#v-home .vcard .warn'),'1 carta senza prezzo','2 carte senza prezzo');
 ok(!t.d.querySelector('#v-home svg.vch')&&/Il grafico si riempie/.test(txt(t,'#v-home .vcard')),'2 senza storico: nota al posto del grafico');
 eq([...t.d.querySelectorAll('#v-home .vcard [data-r]')].map(b=>b.textContent+(b.getAttribute('aria-pressed')==='true'?'*':'')).join(' '),'7 gg 30 gg* 90 gg Tutto','2 pillole del periodo');
 const strips=t.d.querySelectorAll('#v-home .strip');
 eq([...strips[0].querySelectorAll('.st')].map(x=>x.getAttribute('aria-label')+' '+x.querySelector('b').textContent).join(' > '),'Carta cara 25,00 € > Carta media 2,00 € > Altra 0,50 €','3 maggior valore (prezzo di una copia, senza le carte senza prezzo)');
 eq([...strips[1].querySelectorAll('.st')].map(x=>x.getAttribute('aria-label')).join(' > '),'Altra > Carta media > Carta cara > Pikachu','4 ultime aggiunte');
 eq([...t.d.querySelectorAll('#v-home .sec2 h2')].map(x=>x.textContent).join(' | '),'Carte di maggior valore | Ultime aggiunte | Set in corso','5 sezioni');
 eq([...t.d.querySelectorAll('#v-home .sprow')].length,3,'5 set in corso');
 ok(!t.d.querySelector('#v-home .status'),'6 niente avvisi della coda o della chiave in Home (stanno nel pannello Aggiungi)');
 eq(txt(t,'#v-home .bkchip'),'Nessun backup','6 chip del backup');
 t.d.querySelector('#v-home .st').click(); ok(vis(t,'v-card'),'7 tocco su una carta -> scheda'); eq(tab(t),'home','7 la scheda resta sotto Home');
 t.d.querySelector('#v-card [data-a="back"]').click(); await wait(100); ok(vis(t,'v-home'),'7 indietro -> Home');
 t.d.querySelector('#v-home [data-set^="td|it|me01"]').click(); await wait(300); ok(vis(t,'v-setd'),'8 set -> dettaglio'); eq(txt(t,'#v-setd .sdr b'),'2 di 8','8 testata del set');
 t.d.querySelector('#v-setd [data-a="back"]').click(); await wait(100);
 t.d.querySelector('#v-home [data-a="allcards"]').click(); ok(vis(t,'v-cat'),'9 Tutte -> Collezione'); eq(t.d.getElementById('c-sort').value,'value','9 ordinata per valore');
 t.d.querySelector('nav button[data-go="home"]').click(); t.d.querySelector('#v-home [data-a="recentcards"]').click(); eq(t.d.getElementById('c-sort').value,'recent','9 Ultime aggiunte -> più recenti');
 t.d.querySelector('nav button[data-go="home"]').click(); t.d.getElementById('hm-gear').click(); await wait(50);
 ok(vis(t,'v-set')&&t.d.body.classList.contains('inset'),'10 Impostazioni come foglio (barra nascosta)');
 t.d.getElementById('btn-setdone').click(); await wait(100); ok(vis(t,'v-home')&&!t.d.body.classList.contains('inset'),'10 Fine -> torna alla Home');
 t.d.querySelector('#v-home [data-a="value"]').click(); await wait(50); ok(vis(t,'v-value'),'11 Dettagli -> pagina Valore');
 eq([...t.d.querySelectorAll('#v-value [data-r]')].map(b=>b.textContent).join('|'),'7 giorni|30 giorni|90 giorni|Tutto','11 periodi');
 t.d.querySelector('#v-value [data-a="back"]').click(); await wait(100);
 t.d.getElementById('hm-gear').click(); await wait(50);
 { const el=t.d.getElementById('s-start'); eq([...el.options].map(o=>o.textContent).join('|'),'Home|Collezione|Progressi','12 pagine iniziali'); el.value='cat'; el.dispatchEvent(new t.w.Event('change',{bubbles:true})); } await wait(100);
 eq(JSON.parse(t.ls.getItem('pkm_cfg')).startPage,'cat','12 preferenza salvata');
 const t2=boot({cfg:{startPage:'cat',gkey:'k'}}); await wait(250); ok(vis(t2,'v-cat'),'12 riapertura su Collezione');
 const t3=boot({cfg:{startPage:'sets',gkey:'k'}}); await wait(250); ok(vis(t3,'v-sets'),'12 riapertura su Progressi');
 const t4=boot({seed:null}); await wait(250);
 eq(txt(t4,'#v-home .empty2 b'),'Nessuna carta','13 vuoto'); ok(!t4.d.querySelector('#v-home .bkchip'),'13 nessun chip del backup');
 t4.d.querySelector('#v-home [data-a="add"]').click(); ok(vis(t4,'add-sheet'),'13 "Aggiungi la prima carta" apre il pannello');
 ok(!t4.d.getElementById('add-key').hidden,'13 nel pannello l’avviso della chiave mancante');
 console.log('errori:',[t,t2,t3,t4].flatMap(x=>x.errors).length?[t,t2,t3,t4].flatMap(x=>x.errors):'nessuno');
 process.exit(0);
})();
