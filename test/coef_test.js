const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const now=Date.now();
const mk=(n,name,cond,o={})=>({key:`c${n}|IT|Normale|${cond}`,cardId:'c'+n,name,setName:'Set',number:String(n),total:'10',img:'x',lang:'IT',variant:'Normale',cond,qty:1,price:10,priceManual:null,added:now-n,...o});
const seed=[mk(1,'Uno NM','NM'),mk(2,'Due EX','EX',{qty:2}),mk(3,'Tre PL','PL'),mk(4,'Quattro manuale','PL',{priceManual:20}),mk(5,'Cinque senza prezzo','NM',{price:null})];
const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
const card={id:'me01-127',localId:'127',name:'Rovine Insidiose',rarity:'Comune',image:'https://x/127',set:{id:'me01',name:'Mega',cardCount:{official:132,total:188}},pricing:{cardmarket:{trend:10,avg30:9}},dexId:[]};
const api=async(url)=>{url=String(url); if(url.endsWith('/it/sets')) return J([{id:'me01',name:'Mega',cardCount:{official:132,total:188}}]); if(/sets\/me01$/.test(url)) return J({cards:[{id:'me01-127',localId:'127',name:'Rovine Insidiose'}]}); if(/cards\/me01-127$/.test(url)) return J(card); return J({},404)};
function boot(cfg){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
   beforeParse(w){ w.localStorage.setItem('pkm_catalog',JSON.stringify(seed)); if(cfg) w.localStorage.setItem('pkm_cfg',JSON.stringify(cfg)); w.confirm=()=>true; w.prompt=()=>null; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=api; }});
  return {w:dom.window,d:dom.window.document,errors,ls:dom.window.localStorage}; }
const txt=(t,sel)=>{const el=t.d.querySelector(sel);return el?el.textContent.replace(/\s+/g,' ').trim():null};
const val=(t,id)=>t.d.getElementById(id).value;
const fire=(t,id,v)=>{const el=t.d.getElementById(id); el.value=v; el.dispatchEvent(new t.w.Event('change',{bubbles:true}));};
(async()=>{
 const t=boot(); await wait(250);
 console.log('1 Home, valore con le percentuali predefinite (atteso 10 + 2×8,5 + 4 + 20 = 51):',txt(t,'#v-home .vbig'));
 t.d.getElementById('hm-gear').click();
 console.log('2 percentuali in Impostazioni:',['MT','NM','EX','GD','LP','PL','PO'].map(k=>k+' '+val(t,'cc-'+k)).join(' | '));
 for (const [i,v] of [['cc-PL','50'],['cc-EX','90,5']]){ const el=t.d.getElementById(i); el.value=v; el.dispatchEvent(new t.w.Event('change',{bubbles:true})); } await wait(100);
 console.log('3 salvate:',JSON.stringify(JSON.parse(t.ls.getItem('pkm_cfg')).condCoef));
 t.d.querySelector('nav button[data-go="home"]').click(); console.log('3 Home ora (atteso 10 + 2×9,05 + 5 + 20 = 53,10):',txt(t,'#v-home .vbig'));
 t.d.querySelector('nav button[data-go="cat"]').click();
 console.log('4 righe catalogo:',[...t.d.querySelectorAll('#list .item')].map(r=>txt({d:{querySelector:()=>r}},'.nm')+' -> '+r.querySelector('.val').textContent.replace(/\s+/g,' ').trim()).join(' || '));
 console.log('4 filtro "senza prezzo": ',(()=>{t.d.querySelector('[data-qf="noprice"]').click(); const n=[...t.d.querySelectorAll('#list .item')].map(x=>x.getAttribute('aria-label')).join(','); t.d.querySelector('[data-qf="noprice"]').click(); return n})());
 // pagina carta: PL e manuale
 [...t.d.querySelectorAll('#list .item')].find(r=>r.getAttribute('aria-label').includes('Tre PL')).click();
 console.log('5 pagina carta PL:',txt(t,'#v-card .cd-price .v'),'|',txt(t,'#v-card .mine'));
 // cambio condizione dalla pagina carta
 t.d.querySelector('#v-card [data-ed="cond"][data-v="NM"]').click(); console.log('5 dopo NM:',txt(t,'#v-card .cd-price .v'),'|',txt(t,'#v-card .mine'));
 t.d.querySelector('#v-card [data-a="back"]').click(); await wait(100);
 [...t.d.querySelectorAll('#list .item')].find(r=>r.getAttribute('aria-label').includes('Quattro')).click();
 console.log('6 con prezzo manuale (nessuna percentuale):',txt(t,'#v-card .cd-price .v'),'|',txt(t,'#v-card .cd-price .cap'));
 // valori non validi
 t.d.querySelector('#v-card [data-a="back"]').click(); await wait(100); t.d.querySelector('nav button[data-go="home"]').click(); t.d.getElementById('hm-gear').click();
 for (const [i,v] of [['cc-GD','abc'],['cc-PO','-5'],['cc-LP','70,5']]){ const el=t.d.getElementById(i); el.value=v; el.dispatchEvent(new t.w.Event('change',{bubbles:true})); } await wait(100);
 const cc=JSON.parse(t.ls.getItem('pkm_cfg')).condCoef; console.log('7 valori non validi ignorati: GD',cc.GD,'PO',cc.PO,'| 70,5 ->',cc.LP);
 t.d.getElementById('btn-ccdef').click(); console.log('8 ripristino:',['MT','NM','EX','GD','LP','PL','PO'].map(k=>val(t,'cc-'+k)).join('/'));
 // pannello di aggiunta (scansione): il prezzo cambia con la condizione
 {const _x=t; _x.d.querySelector('nav button[data-go="cat"]').click(); _x.d.getElementById('fab').click(); _x.d.querySelector('[data-ad="search"]').click();};
 t.d.getElementById('f-num').value='127'; t.d.getElementById('f-tot').value='132'; t.d.getElementById('btn-search').click(); await wait(300);
 console.log('9 aggiunta: prezzo iniziale:',txt(t,'#ap-price'));
 fire(t,'ap-cond','PL'); console.log('9 con condizione PL:',txt(t,'#ap-price'));
 t.d.getElementById('ap-add').click(); const e=JSON.parse(t.ls.getItem('pkm_catalog')).find(x=>x.number==='127'); console.log('9 salvata: condizione',e.cond,'| prezzo di mercato salvato (NM):',e.price);
 console.log('errori:',t.errors.length?t.errors:'nessuno'); process.exit(0);
})();
