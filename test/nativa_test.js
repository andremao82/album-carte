// Allineamento del sito all'app nativa (20/10/2026): temi e Aspetto, grafico con assi e tocco, pagina Valore,
// pannello Aggiungi, ricerca con risultati deboli (Venusaur 30/165), Gemini (Automatico, quota giornaliera e al minuto,
// sovraccarico), immagine inglese di ripiego, foto mie (anteprima, menu, backup), tutto schermo, Pokédex con id normalizzati.
// Verifiche vere: il test si ferma al primo errore.
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const {IDBFactory}=require('fake-indexeddb');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const js=fs.readFileSync(require('./percorsi').APPJS,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
const DAY=864e5, D=Math.floor(Date.now()/DAY);
let checks=0; const nb=v=>typeof v==='string'?v.replace(/\u00a0/g,' '):v;
function ok(c,m){ checks++; if(!c) throw new Error('NON SUPERATO: '+m); console.log('  ok  '+m); }
function eq(a,b,m){ a=nb(a); b=nb(b); checks++; if(a!==b) throw new Error('NON SUPERATO: '+m+' (atteso '+JSON.stringify(b)+', letto '+JSON.stringify(a)+')'); console.log('  ok  '+m+': '+a); }
async function until(fn,ms=8000){ const t0=Date.now(); while(Date.now()-t0<ms){ if(fn()) return true; await wait(50);} return false; }
const mk=(n,name,price,o={})=>Object.assign({key:`c${n}|IT|Normale|NM`,cardId:'c'+n,name,setName:'Set',number:String(n),total:'100',img:'',lang:'IT',variant:'Normale',cond:'NM',qty:1,price,priceManual:null,added:Date.now()-n*1000},o);
function boot(o={}){
  const errors=[], log={fetch:[]}; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.detail&&e.detail.stack||e.message).split('\n')[0]));
  const dom=new JSDOM(o.html||html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,beforeParse(w){
    if(o.cat) w.localStorage.setItem('pkm_catalog',JSON.stringify(o.cat));
    if(o.cfg) w.localStorage.setItem('pkm_cfg',JSON.stringify(o.cfg));
    for(const [k,v] of Object.entries(o.ls||{})) w.localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));
    if(o.idb) w.indexedDB=o.idb;
    if(o.light!==undefined) w.matchMedia=q=>({matches:/light/.test(q)?o.light:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
    w.confirm=()=>true; w.scrollTo=()=>{}; w.Element.prototype.scrollIntoView=()=>{}; w.createImageBitmap=async()=>({width:900,height:1200,close(){}});
    w.HTMLCanvasElement.prototype.getContext=function(){const c=this;return {canvas:c,drawImage(){},clearRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){},fill(){},arc(){},save(){},restore(){},clip(){},
      getImageData:(x,y,ww,hh)=>{const px=new Uint8ClampedArray(ww*hh*4); for(let i=0;i<ww*hh;i++){const X=i%ww,Y=(i/ww)|0,inC=Math.abs(X-ww/2)<ww*0.22&&Math.abs(Y-hh/2)<ww*0.31; px[i*4]=inC?235:90;px[i*4+1]=inC?200:110;px[i*4+2]=inC?60:85;px[i*4+3]=255;} return {data:px,width:ww,height:hh};},
      createImageData:(ww,hh)=>({data:new Uint8ClampedArray(ww*hh*4),width:ww,height:hh}),putImageData(){},set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){}}};
    w.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/jpeg;base64,QUFB';
    w.Image=class{ constructor(){ this.width=0; this.height=0; } set src(v){ this._s=v; setTimeout(()=>{ this.width=this.naturalWidth=900; this.height=this.naturalHeight=1200; this.onload&&this.onload(); },5); } get src(){ return this._s; } };
    w.fetch=async(u,opt)=>{ u=String(u); log.fetch.push(u); return o.api?o.api(u,opt,log):J({},500); };
    if(o.share){ Object.defineProperty(w.navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'}); w.navigator.canShare=()=>true; w.navigator.share=async d=>{ log.shared=await d.files[0].text(); }; }
  }});
  return {w:dom.window,d:dom.window.document,errors,log};
}
const $=(t,s)=>t.d.querySelector(s), $$=(t,s)=>[...t.d.querySelectorAll(s)];
const txt=(t,s)=>{const el=$(t,s);return el?el.textContent.replace(/\s+/g,' ').trim():null};
const vis=(t,id)=>!t.d.getElementById(id).hidden;
const cat=t=>JSON.parse(t.w.localStorage.getItem('pkm_catalog')||'[]');
const go=async(t,tab)=>{ $(t,`nav button[data-go="${tab}"]`).click(); await wait(60); };
// funzioni pure estratte dal codice dell'app (stesse regole della nativa)
const pick=name=>{ const m=js.match(new RegExp('(?:const '+name+' = [^\\n]*;|function '+name+'\\([^\\n]*?\\)\\{[\\s\\S]*?\\n\\})')); if(!m) throw new Error('manca '+name); return m[0]; };
const pure=new Function(['const dayNow = () => Math.floor(Date.now() / 864e5);','const eur = v => new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(v);',
  "const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];",
  pick('chartTickDays'),pick('chartDayLabel'),pick('chartWholeEuros'),"const EUR0 = new Intl.NumberFormat('it-IT', {style:'currency', currency:'EUR', maximumFractionDigits:0, minimumFractionDigits:0});",pick('chartEuroLabel'),pick('nearestPoint'),
  pick('quotaInfo'),pick('normCardId'),pick('setsPercent'),pick('dexPercent'),pick('pauseFor'),pick('mmss'),
  "const GEMINI_ALIAS = 'gemini-flash-latest';",pick('preferredModel'),pick('modelQueue'),pick('zoomClamp'),pick('zoomShouldClose'),pick('zoomBackdrop'),"const ZOOM_MAX = 5, ZOOM_CLOSE = 120;",
  'return {chartTickDays,chartDayLabel,chartWholeEuros,chartEuroLabel,nearestPoint,quotaInfo,normCardId,setsPercent,dexPercent,pauseFor,mmss,preferredModel,modelQueue,zoomClamp,zoomShouldClose,zoomBackdrop};'].join('\n'))();

(async()=>{
 console.log('1 regole rifatte come la nativa');
 eq(pure.chartTickDays([1,2,3,4,5,6,7,8,9,10]).join(','),'1,4,7,10','al massimo 4 date, prima e ultima comprese');
 eq(pure.chartTickDays([5,5,6]).join(','),'5,6','date senza doppioni');
 eq(pure.chartDayLabel(D),new Date(D*DAY).getUTCDate()+' '+['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'][new Date(D*DAY).getUTCMonth()],'etichetta "12 ott"');
 ok(/ \d\d$/.test(pure.chartDayLabel(D-400)),'anno diverso: "12 ott 25"');
 eq(pure.chartWholeEuros([10,14.99]),false,'escursione sotto 5 € con i centesimi'); eq(pure.chartWholeEuros([10,15]),true,'da 5 € senza decimali');
 eq(pure.chartEuroLabel(52.4,true),'52 €','euro interi');
 eq(pure.nearestPoint([{day:1},{day:5},{day:9}],7).day,5,'punto più vicino (a parità il primo)');
 eq(JSON.stringify(pure.quotaInfo({error:{message:'x',details:[{'@type':'type.googleapis.com/google.rpc.QuotaFailure',violations:[{quotaId:'GenerateRequestsPerDayPerProjectPerModel-FreeTier'}]},{'@type':'type.googleapis.com/google.rpc.RetryInfo',retryDelay:'34s'}]}})),'{"daily":true,"retry":34}','429 di Google: quota del giorno e attesa');
 eq(JSON.stringify(pure.quotaInfo({error:{message:'Please retry in 12.5s.'}})),'{"daily":false,"retry":12.5}','429 senza dettagli: attesa dal testo');
 eq(JSON.stringify(pure.quotaInfo({error:{message:'Quota exceeded: requests per day'}})),'{"daily":true,"retry":null}','quota del giorno dal testo');
 eq(pure.pauseFor(34),36,'attesa suggerita + 2 s'); eq(pure.pauseFor(1),5,'almeno 5 s'); eq(pure.pauseFor(999),300,'al massimo 5 minuti'); eq(pure.pauseFor(null),65,'senza indicazione 65 s');
 eq(pure.mmss(72000),'1:12','conto alla rovescia m:ss');
 eq(pure.preferredModel('',['gemini-3.6-flash']),'gemini-3.6-flash','Automatico = primo modello dell’elenco');
 eq(pure.preferredModel('',[]),'gemini-flash-latest','alias solo se l’elenco manca');
 eq(pure.modelQueue('m2',['m1','m2','m3','m4','m5','m6']).join(','),'m2,m1,m3,m4,gemini-flash-latest','coda dei modelli');
 eq(pure.normCardId('sv01-025'),pure.normCardId('sv1-25'),'id confrontati senza zeri iniziali');
 eq(pure.setsPercent(0.02),'0,02%','Progressi: due decimali sotto l’1%'); eq(pure.setsPercent(12.34),'12,3%','una cifra sopra');
 eq(pure.dexPercent(1,1025),'0,10%','Pokédex: 1/1025');
 eq(pure.zoomClamp(9),5,'ingrandimento massimo 5×'); eq(pure.zoomShouldClose(1,130),true,'a 1× oltre 120 si chiude'); eq(pure.zoomShouldClose(2,300),false,'ingrandita non si chiude');

 console.log('2 temi Notte blu / Perla e Aspetto');
 ok(/:root\[data-theme="light"\]\{--bg:#F2F2F7;--surface:#FFFFFF;--surface2:#E5E5EA;/.test(html),'palette Perla come la nativa');
 ok(/--accent:#1C1C1E;/.test(html)&&/--accent-fill:#FFCB05;/.test(html),'Perla: accento quasi nero, riempimenti gialli');
 let t=boot({cat:[mk(1,'Uno',2)]}); await wait(200);
 eq(t.d.documentElement.getAttribute('data-theme'),'dark','senza scelta e senza preferenza chiara: Notte blu');
 t=boot({cat:[mk(1,'Uno',2)],light:true}); await wait(200);
 eq(t.d.documentElement.getAttribute('data-theme'),'light','Automatico con iPhone in chiaro: Perla');
 eq($(t,'meta[name="theme-color"]').getAttribute('content'),'#F2F2F7','colore di sistema Perla');
 eq($(t,'meta[name="apple-mobile-web-app-status-bar-style"]').getAttribute('content'),'default','barra di stato scura sul chiaro (letta all’avvio)');
 $(t,'#hm-gear').click(); await wait(50);
 eq($$(t,'#s-appear button').map(b=>b.textContent+(b.getAttribute('aria-pressed')==='true'?'*':'')).join('|'),'Automatico*|Chiaro|Scuro','Aspetto in Impostazioni');
 $(t,'#s-appear [data-ap="dark"]').click(); await wait(20);
 eq(t.d.documentElement.getAttribute('data-theme'),'dark','Scuro: Notte blu anche con iPhone in chiaro');
 eq(JSON.parse(t.w.localStorage.getItem('pkm_cfg')).appearance,'dark','scelta salvata');
 const t2=boot({cfg:{appearance:'light'}}); await wait(150); eq(t2.d.documentElement.getAttribute('data-theme'),'light','Chiaro scelto: Perla all’avvio');

 console.log('3 grafico con assi e tocco, pagina Valore');
 const vh=[[D-30,4800,10],[D-20,5390,12],[D-10,5640,13],[D,5980,13]];
 t=boot({cat:[mk(1,'Uno',59.8)],ls:{pkm_vhist:{v:1,s:vh}}}); await wait(200);
 const svg=$(t,'#v-home svg.vch'); ok(!!svg,'grafico ad area in Home');
 eq($$(t,'#v-home svg.vch circle.dt').length,4,'punti visibili (fino a 31)');
 ok($$(t,'#v-home svg.vch text').some(x=>/^\d+ €$/.test(nb(x.textContent))),'euro interi a destra (escursione ≥ 5 €)');
 svg.getBoundingClientRect=()=>({left:0,top:0,width:340,height:150});
 svg.dispatchEvent(new t.w.MouseEvent('click',{bubbles:true,clientX:330}));
 eq(nb($(t,'#v-home svg.vch .sel .tv').textContent),'59,80 €','tocco: valore del punto più vicino');
 ok($(t,'#v-home svg.vch .sel .rl'),'linea tratteggiata sul punto');
 $(t,'#v-home [data-r="7"]').click(); await wait(20); ok(!$(t,'#v-home .vch .sel .tv'),'cambiando periodo la scelta si azzera');
 $(t,'#v-home [data-a="value"]').click(); await wait(50);
 ok(vis(t,'v-value')&&$(t,'#v-value svg.vch'),'pagina Valore con il grafico'); eq($(t,'#v-value svg.vch').getAttribute('viewBox'),'0 0 340 200','grafico alto 200');

 console.log('4 ricerca a gradini (Venusaur 30/165 di Expedition)');
 const tdSets=[{id:'sv03.5',name:'151',cardCount:{official:165,total:207}}];
 const api4=(variant)=>async(u)=>{
   if(u.endsWith('/it/sets')) return J(tdSets);
   if(/\/it\/sets\/sv03\.5$/.test(u)) return J({cards:[{id:'sv03.5-030',localId:'030',name:'Nidorina'}]});
   if(/\/it\/cards\/sv03\.5-030$/.test(u)) return J({id:'sv03.5-030',localId:'030',name:'Nidorina',image:'https://x/n',set:{id:'sv03.5',name:'151',cardCount:{official:165}},pricing:{cardmarket:{trend:0.2}}});
   if(u.includes('/it/cards?name=')) return J([]);
   if(u.includes('pokemontcg')){ const q=decodeURIComponent(u);
     if(/set\.printedTotal:165/.test(q)) return J({data:[{id:'ecard1-30',name:variant==='weak'?'Bulbasaur':'Venusaur',number:'30',set:{name:'Expedition Base Set',printedTotal:165},images:{small:'https://x/v'}},{id:'sv3pt5-30',name:'Nidorina',number:'30',set:{name:'151',printedTotal:165},images:{small:'https://x/n'}}]});
     return J({data:[]}); }
   return J({},404); };
 t=boot({api:api4('strong')}); await wait(200);
 $(t,'#fab').click(); $(t,'[data-ad="search"]').click(); await wait(50);
 t.d.getElementById('f-name').value='Venusaur'; t.d.getElementById('f-num').value='30'; t.d.getElementById('f-tot').value='165'; t.d.getElementById('btn-search').click();
 ok(await until(()=>$$(t,'#cands .cand').length>0),'risultati');
 eq($$(t,'#cands .cand b').map(b=>b.textContent).join(','),'Venusaur','la carta di 151 col solo numero non vince: Venusaur dalla Pokémon TCG API');
 ok(/fonte: Pokémon TCG API/.test(txt(t,'#status')),'fonte indicata');
 t=boot({api:api4('weak')}); await wait(200);
 $(t,'#fab').click(); $(t,'[data-ad="search"]').click(); await wait(50);
 t.d.getElementById('f-name').value='Venusaur'; t.d.getElementById('f-num').value='30'; t.d.getElementById('f-tot').value='165'; t.d.getElementById('btn-search').click();
 ok(await until(()=>$$(t,'#cands .cand').length>0),'risultati deboli');
 ok(/ecco le più vicine/.test(txt(t,'#status')),'avviso "ecco le più vicine"');
 eq($$(t,'#cands .cand b').map(b=>b.textContent).join(','),'Nidorina','prima TCGdex debole (ha le carte italiane)');
 ok(!$(t,'#cands .cand.on'),'nessuna proposta scelta da sola');

 console.log('5 Gemini come la nativa: quota del giorno, sovraccarico, limite al minuto');
 const recOk={name_en:'Pikachu',name_printed:'Pikachu',number:'55',printed_total:'200',language:'it',variant_hint:'normal',confidence:0.95};
 const gapi=(plan)=>async(u,opt,log)=>{
   if(u.includes('generativelanguage')&&u.includes(':generateContent')){ const m=u.match(/models\/([^:]+):/)[1]; log.models=(log.models||[]).concat(m); const r=plan(m,log);
     if(r===429.1) return J({error:{message:'quota',details:[{'@type':'type.googleapis.com/google.rpc.QuotaFailure',violations:[{quotaId:'GenerateRequestsPerDayPerProjectPerModel-FreeTier'}]}]}},429);
     if(r===429.2) return J({error:{message:'rate',details:[{'@type':'type.googleapis.com/google.rpc.RetryInfo',retryDelay:'10s'}]}},429);
     if(r===503) return J({error:{message:'high demand'}},503);
     return J({candidates:[{content:{parts:[{text:JSON.stringify(recOk)}]}}]}); }
   if(u.includes('generativelanguage')) return J({models:[]});
   if(u.endsWith('/it/sets')) return J([{id:'aa01',name:'Set A',cardCount:{official:200,total:210}}]);
   if(/\/it\/sets\/aa01$/.test(u)) return J({cards:[{id:'aa01-055',localId:'055',name:'Pikachu'}]});
   if(/\/it\/cards\/aa01-055$/.test(u)) return J({id:'aa01-055',localId:'055',name:'Pikachu',image:'https://x/p',set:{id:'aa01',name:'Set A',cardCount:{official:200}},pricing:{cardmarket:{trend:1}},dexId:[25]});
   return J({},404); };
 const send=async t=>{ const input=t.d.getElementById('q-file'); Object.defineProperty(input,'files',{value:[new t.w.File(['x'],'a.jpg',{type:'image/jpeg'})],configurable:true}); input.dispatchEvent(new t.w.Event('change',{bubbles:true})); };
 const gcfg={provider:'gemini',gkey:'AIzaX',gmodel:'',gmodels:['m1','m2']};
 t=boot({cfg:gcfg,idb:new IDBFactory(),api:gapi(m=>m==='m1'?429.1:200)}); await wait(200); await send(t);
 ok(await until(()=>cat(t).length===1),'quota del giorno finita su m1: letta con m2 e aggiunta');
 eq(t.log.models.join(','),'m1,m2','modelli provati in ordine');
 eq(JSON.parse(t.w.localStorage.getItem('pkm_cfg')).gmodel,'','"Automatico" resta automatico');
 t=boot({cfg:gcfg,idb:new IDBFactory(),api:gapi(m=>m==='m1'?503:200)}); await wait(200); await send(t);
 ok(await until(()=>cat(t).length===1),'m1 sovraccarico (503): letta con m2');
 t=boot({cfg:gcfg,idb:new IDBFactory(),api:gapi(()=>429.1)}); await wait(200); await send(t);
 ok(await until(()=>/Quota giornaliera gratuita di Gemini finita/.test(txt(t,'#q-banner')||''),12000),'quota finita su tutti i modelli: coda ferma con il motivo');
 ok(/Si azzera alle \d\d:\d\d/.test(txt(t,'#q-banner')),'ora di azzeramento');
 ok($(t,'#q-banner [data-q="resume"]'),'tasto Riprendi'); ok(/Ferma: quota giornaliera finita/.test(txt(t,'#q-list')),'la carta resta in coda, ferma');
 const n0=t.log.models.length; await wait(300); eq(t.log.models.length,n0,'ferma: nessuna nuova chiamata');
 t=boot({cfg:gcfg,idb:new IDBFactory(),api:gapi(()=>429.2)}); await wait(200); await send(t);
 ok(await until(()=>/riprendo da solo tra/.test(txt(t,'#q-banner')||'')),'limite al minuto: pausa con conto alla rovescia');
 ok(/0:1[0-2]/.test(txt(t,'#q-banner .cdn')),'attesa suggerita (10 s + 2): '+txt(t,'#q-banner .cdn'));
 ok(/In pausa, riprendo tra/.test(txt(t,'#q-list')),'riga della carta in pausa');
 eq(t.log.models.join(','),'m1','al minuto non si cambia modello');

 console.log('6 immagine inglese di ripiego');
 const it=mk(7,'Machamp',2,{key:'tcgdex:it:base1-8|IT|Normale|NM',cardId:'tcgdex:it:base1-8',src:'tcgdex',srcId:'base1-8',srcLang:'it',img:''});
 t=boot({cat:[it],api:async u=>/\/it\/cards\/base1-8$/.test(u)?J({id:'base1-8',localId:'8',name:'Machamp'}):/\/en\/cards\/base1-8$/.test(u)?J({id:'base1-8',localId:'8',name:'Machamp',image:'https://assets.tcgdex.net/en/base/base1/8'}):J({},404)});
 ok(await until(()=>cat(t)[0].imgFrom==='EN',4000),'cercata in italiano, trovata in inglese');
 eq(cat(t)[0].img,'https://assets.tcgdex.net/en/base/base1/8/low.webp','indirizzo salvato');
 await go(t,'cat'); $(t,'#list .item').click(); await wait(50);
 eq(txt(t,'#v-card .cd-note'),'Immagine della versione inglese','nota nella scheda');
 t=boot({cat:[Object.assign({},it,{imgFrom:''})],api:async()=>{throw new Error('non deve cercare')}}); await wait(1800); eq(t.errors.length,0,'già cercata senza esito: niente nuove ricerche');

 console.log('7 foto mie: anteprima, menu, backup e ripristino');
 const idb=new IDBFactory();
 const bk={v:1,catalog:[mk(1,'Senza immagine',1,{photo:'AAAA-1111',photoQuad:[0,0,1,0,1,1,0,1]}),mk(2,'Con immagine',2,{img:'https://x/u.png',photo:'BBBB-2222'})],photos:{'AAAA-1111':{crop:'Q1JPUA==',orig:'T1JJRw=='},'BBBB-2222':{crop:'Q1JPUDI='},'../x':{crop:'eA=='}}};
 t=boot({idb,share:true,cat:[mk(9,'Vecchia',1)]}); await wait(200);
 $(t,'#hm-gear').click(); await wait(30);
 const rs=t.d.getElementById('restore'); Object.defineProperty(rs,'files',{value:[new t.w.File([JSON.stringify(bk)],'b.json',{type:'application/json'})],configurable:true}); rs.dispatchEvent(new t.w.Event('change',{bubbles:true}));
 ok(await until(()=>cat(t).length===2),'backup con foto ripristinato');
 $(t,'#btn-setdone').click(); await go(t,'cat'); t.d.getElementById('v-list').click(); await wait(50);
 const rowImg=n=>{ const r=$$(t,'#list .item').find(x=>x.textContent.includes(n)); const i=r&&r.querySelector('img'); return i?i.getAttribute('src'):''; };
 eq(rowImg('Senza immagine'),'data:image/jpeg;base64,Q1JPUA==','senza immagine ufficiale: la mia foto');
 eq(rowImg('Con immagine'),'https://x/u.png','con immagine ufficiale: vince l’ufficiale');
 $$(t,'#list .item').find(x=>x.textContent.includes('Con immagine')).click(); await wait(50);
 eq(txt(t,'#v-card .cd-ph'),'Foto','tasto Foto (c’è una foto)');
 $(t,'#v-card [data-a="photo"]').click(); await wait(20);
 eq($$(t,'#act-sheet .actbtn').map(b=>b.textContent).join('|'),'Usa la mia foto|Riscatta con la fotocamera|Scegli dalla galleria|Elimina la foto|Annulla','menu Foto con immagine ufficiale (senza foto intera: niente Ritaglia)');
 $$(t,'#act-sheet .actbtn')[0].click(); await wait(30);
 eq(cat(t).find(e=>e.name==='Con immagine').photoPref,'own','scelta salvata (photoPref = own)');
 eq($(t,'#cd-img').getAttribute('src'),'data:image/jpeg;base64,Q1JPUDI=','ora la scheda mostra la foto'); eq(txt(t,'#v-card .cd-note'),'La tua foto','nota "La tua foto"');
 $(t,'#v-card [data-a="photo"]').click(); await wait(20);
 eq($$(t,'#act-sheet .actbtn')[0].textContent,'Usa l’immagine ufficiale','si può tornare all’immagine ufficiale');
 $$(t,'#act-sheet .actbtn')[0].click(); await wait(20); eq(cat(t).find(e=>e.name==='Con immagine').photoPref,'web','photoPref = web, la foto resta');
 $(t,'#v-card [data-a="back"]').click(); await wait(80);
 $$(t,'#list .item').find(x=>x.textContent.includes('Senza immagine')).click(); await wait(50);
 $(t,'#v-card [data-a="photo"]').click(); await wait(20);
 eq($$(t,'#act-sheet .actbtn').map(b=>b.textContent).join('|'),'Ritaglia la foto|Riscatta con la fotocamera|Scegli dalla galleria|Elimina la foto|Annulla','menu Foto senza immagine ufficiale');
 $$(t,'#act-sheet .actbtn')[0].click(); ok(await until(()=>vis(t,'qedge')),'Ritaglia: editor dei bordi sulla foto intera');
 eq(t.d.getElementById('qe-discard').textContent,'Annulla','editor con "Annulla"'); ok(t.d.getElementById('qe-later').hidden,'senza "Più tardi"');
 $(t,'#qedge [data-qe="ok"]').click(); ok(await until(()=>cat(t).find(e=>e.name==='Senza immagine').photo!=='AAAA-1111'),'nuovo ritaglio: foto con id nuovo');
 eq(cat(t).find(e=>e.name==='Senza immagine').photoPref,'own','ritaglio dalla scheda = anteprima scelta');
 $(t,'#v-card [data-a="back"]').click(); await wait(50);
 // backup con le foto (stesso formato della nativa)
 await go(t,'home'); $(t,'#v-home .bkchip').click();
 ok(await until(()=>!!t.log.shared),'backup condiviso');
 const out=JSON.parse(t.log.shared); const ids=Object.keys(out.photos||{});
 eq(ids.length,2,'foto nel backup: solo quelle usate dal catalogo');
 ok(ids.every(id=>/^[A-Za-z0-9-]+$/.test(id)&&typeof out.photos[id].crop==='string'&&!/^data:/.test(out.photos[id].crop)),'base64 senza prefisso, come la nativa');
 ok(!ids.includes('../x'),'id non validi scartati');
 // pulizia all'avvio: la foto vecchia sostituita dal ritaglio non serve più
 const t3=boot({idb,cat:cat(t)}); await wait(500);
 const left=await new Promise(r=>{ const o=idb.open('pkm_photos',1); o.onsuccess=()=>{ const g=o.result.transaction('p').objectStore('p').getAllKeys(); g.onsuccess=()=>r(g.result); }; });
 ok(!left.includes('AAAA-1111')&&left.includes('BBBB-2222')&&left.length===2,'all’avvio restano solo le foto usate ('+left.join(',')+')');

 console.log('8 tutto schermo');
 t=boot({cat:[mk(1,'Charizard',5,{img:'https://x/c/low.webp'})]}); await wait(200); await go(t,'cat'); $(t,'#list .item').click(); await wait(50);
 const card=$(t,'#cd-tilt'); card.getBoundingClientRect=()=>({left:0,top:0,width:200,height:280});
 card.dispatchEvent(new t.w.MouseEvent('pointerdown',{bubbles:true,clientX:100,clientY:100})); card.dispatchEvent(new t.w.MouseEvent('pointerup',{bubbles:true,clientX:100,clientY:100}));
 ok(vis(t,'zoom'),'tocco breve sulla carta: tutto schermo'); eq($(t,'#zoom-img').getAttribute('src'),'https://x/c/high.webp','immagine grande');
 const z=t.d.getElementById('zoom'), P=(type,x,y,id=1)=>{ const e=new t.w.MouseEvent(type,{bubbles:true,clientX:x,clientY:y}); Object.defineProperty(e,'pointerId',{value:id}); z.dispatchEvent(e); };
 P('pointerdown',100,100); P('pointerup',100,100); P('pointerdown',100,100); P('pointerup',100,100);
 ok(/scale\(2\.500\)/.test($(t,'#zoom-img').style.transform),'doppio tocco: 2,5×');
 await wait(400); P('pointerdown',100,100); P('pointerup',100,100); P('pointerdown',100,100); P('pointerup',100,100);
 ok(/scale\(1\.000\)/.test($(t,'#zoom-img').style.transform),'doppio tocco di nuovo: 1×');
 await wait(400); P('pointerdown',100,100); P('pointermove',100,180); ok(nb(z.style.backgroundColor)!=='rgba(0, 0, 0, 1)','trascinando il fondo sfuma');
 P('pointerup',100,180); ok(vis(t,'zoom'),'80 px non bastano per chiudere');
 P('pointerdown',100,100); P('pointermove',100,240); P('pointerup',100,240); ok(!vis(t,'zoom'),'oltre 120 px si chiude');
 card.dispatchEvent(new t.w.MouseEvent('pointerdown',{bubbles:true,clientX:100,clientY:100})); card.dispatchEvent(new t.w.MouseEvent('pointerup',{bubbles:true,clientX:100,clientY:100}));
 $(t,'#zoom [data-z="close"]').click(); ok(!vis(t,'zoom'),'tasto ✕');
 const t4=boot({cat:[mk(1,'Senza',5)]}); await wait(200); await go(t4,'cat'); $(t4,'#list .item').click(); await wait(50);
 const c4=$(t4,'#cd-tilt'); c4.dispatchEvent(new t4.w.MouseEvent('pointerdown',{bubbles:true})); c4.dispatchEvent(new t4.w.MouseEvent('pointerup',{bubbles:true}));
 ok(!vis(t4,'zoom'),'senza immagine (iniziali) il tocco non fa niente');

 console.log('9 Pokédex: id delle due fonti confrontati, tue carte fuori elenco in testa');
 const pk=[mk(1,'Pikachu',1,{key:'sv1-25|IT|Normale|NM',cardId:'sv1-25',dex:[25],cat:'Pokemon',ill:''}),mk(2,'Pikachu',1,{key:'x9-77|EN|Normale|NM',cardId:'x9-77',lang:'EN',number:'77',dex:[25],cat:'Pokemon',ill:''})];
 t=boot({cat:pk,api:async u=>/\/it\/dex-ids\/25$/.test(u)?J({cards:[{id:'sv01-025',localId:'025',name:'Pikachu',image:'https://x/a'},{id:'sv02-001',localId:'001',name:'Pikachu',image:'https://x/b'}]}):u.includes('pokeapi')?J({results:[]}):J({},404)});
 await wait(200); await go(t,'dex'); await wait(100);
 $(t,'#v-dex .dcell[data-n="25"]').click(); ok(await until(()=>$$(t,'#v-dexd .sgrid .scell').length===3),'griglia: 2 dell’elenco + 1 tua fuori elenco');
 eq($$(t,'#v-dexd .sgrid .scell').map(c=>c.classList.contains('own')?'P':'m').join(''),'PPm','ordine: tua fuori elenco, posseduta (sv1-25 = sv01-025), mancante');
 eq(txt(t,'#v-dexd .sgrid .scell .n'),'77 · EN','fuori elenco: numero e lingua');
 ok(/La prima carta colorata è tua ma non esiste in Italiano/.test(txt(t,'#v-dexd .dlnote')),'nota sotto la griglia');

 console.log('10 scansione di una carta senza immagine: la foto diventa l’anteprima');
 const noImg=async(u,opt,log)=>{ if(/\/it\/cards\/aa01-055$/.test(u)) return J({id:'aa01-055',localId:'055',name:'Pikachu',set:{id:'aa01',name:'Set A',cardCount:{official:200}},pricing:{cardmarket:{trend:1}},dexId:[25]}); if(/\/en\/cards\/aa01-055$/.test(u)) return J({},404); return gapi(()=>200)(u,opt,log); };
 const t5=boot({cfg:gcfg,idb:new IDBFactory(),api:noImg}); await wait(200); await send(t5);
 ok(await until(()=>cat(t5).length===1&&!!cat(t5)[0].photo),'aggiunta con la foto della scansione');
 ok(Array.isArray(cat(t5)[0].photoQuad)&&cat(t5)[0].photoQuad.length===8,'bordi salvati (8 numeri, come la nativa)');
 await go(t5,'cat'); ok(/^data:image\/jpeg/.test(($(t5,'#list .item img')||{getAttribute:()=>''}).getAttribute('src')),'in Collezione si vede la foto');

 const all=[t,t2,t3,t4,t5].flatMap(x=>x.errors);
 console.log('verifiche superate:',checks); console.log('errori:',all.length?all:'nessuno'); process.exit(all.length?1:0);
})().catch(e=>{ console.log(e.message); console.log('errori: test interrotto'); process.exit(1); });
