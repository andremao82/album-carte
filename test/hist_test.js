const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const DAY=864e5;
let clock=Date.UTC(2026,9,1,12);   // 1 ottobre 2026
const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
let trend=10;
const api=async(url)=>{url=String(url); if(/cards\/me01-127$/.test(url)) return J({id:'me01-127',localId:'127',name:'Rovine',rarity:'Comune',image:'https://x/127',set:{id:'me01',name:'Mega',cardCount:{official:132,total:188}},pricing:{cardmarket:{trend,avg30:trend}},dexId:[]}); if(url.endsWith('/it/sets')) return J([]); return J({},404)};
const entry=(o={})=>({key:'tcgdex:it:me01-127|IT|Normale|NM',cardId:'tcgdex:it:me01-127',name:'Rovine',setName:'Mega',number:'127',total:'132',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:10,priceT:clock,pr:{normal:10,avg30:10},added:clock,src:'tcgdex',srcId:'me01-127',srcLang:'it',setId:'me01',...o});
function boot(seed,histSeed){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
   beforeParse(w){ const R=w.Date; w.Date=class extends R{constructor(...a){a.length?super(...a):super(clock)} static now(){return clock}};
    w.localStorage.setItem('pkm_catalog',JSON.stringify(seed)); if(histSeed) w.localStorage.setItem('pkm_hist',JSON.stringify({v:1,s:histSeed}));
    w.confirm=()=>true; w.prompt=()=>null; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=api; }});
  return {w:dom.window,d:dom.window.document,errors,ls:dom.window.localStorage}; }
const H=t=>{const h=JSON.parse(t.ls.getItem('pkm_hist')||'null'); return h&&h.s};
const txt=(t,sel)=>{const el=t.d.querySelector(sel);return el?el.textContent.replace(/\s+/g,' ').trim():null};
const day=ms=>Math.floor(ms/DAY);
(async()=>{
 // 1) primo avvio: un punto dal prezzo già noto (con data); nessuno se non c'è la data
 let t=boot([entry(),entry({key:'old|IT|Normale|NM',cardId:'old',priceT:undefined,price:3})]); await wait(1200);
 console.log('1 punti iniziali:',JSON.stringify(H(t)));
 // 2) aggiornamenti in giorni diversi
 t.d.querySelector('nav button[data-go="cat"]').click(); t.d.querySelector('#list .item').click();
 const refresh=async(label,days,tr)=>{ clock=Date.UTC(2026,9,1,12)+days*DAY; trend=tr; t.d.querySelector('#v-card [data-a="refresh"]').click(); await wait(1300); const s=(H(t)||{})['tcgdex:it:me01-127|n']; console.log(label.padEnd(54),'->',JSON.stringify(s)); };
 await refresh('g0  10,10 (stesso giorno: sostituisce)',0,10.1);
 await refresh('g1  10,50 (+5%: nuovo punto)',1,10.5);
 await refresh('g2  10,50 (uguale: nessun punto)',2,10.5);
 await refresh('g3  8,00 (-24%: nuovo punto)',3,8);
 await refresh('g10 8,05 (piccola variazione: nuovo punto)',10,8.05);
 await refresh('g20 8,05 (uguale, 10 giorni: nessun punto)',20,8.05);
 await refresh('g20 8,20 (stesso giorno: sostituisce)',20,8.2);
 const svg=t.d.querySelector('#v-card svg.vch'); console.log('3 grafico dello storico:',!!svg,'| variazione:',txt(t,'#v-card .hist .hh span'),'| punti:',svg.querySelectorAll('circle.dt').length,'| testi:',[...svg.querySelectorAll('text')].map(x=>x.textContent).join(' - '));
 if(!svg||svg.querySelectorAll('circle.dt').length!==(H(t)['tcgdex:it:me01-127|n']||[]).length) throw new Error('punti del grafico diversi dallo storico');
 // 4) una sola rilevazione e niente medie Cardmarket -> nessun grafico, solo la nota (con le medie: grafico_carta_test.js)
 const t2=boot([entry({pr:{normal:10}})]); await wait(300); t2.d.querySelector('nav button[data-go="cat"]').click(); t2.d.querySelector('#list .item').click();
 console.log('4 con una sola rilevazione:',t2.d.querySelector('#v-card svg.vch')?'grafico':'nessun grafico','|',txt(t2,'#v-card .hist .cap'));
 if(t2.d.querySelector('#v-card svg.vch')) throw new Error('grafico con un solo punto');
 // 5) diradamento: 300 punti giornalieri -> max 160, ultimi 90 giorni intatti
 const long=Array.from({length:300},(_,i)=>[day(clock)-299+i,1000+i]); 
 const t3=boot([entry()],{'tcgdex:it:me01-127|n':long}); await wait(200); t3.d.querySelector('nav button[data-go="cat"]').click(); t3.d.querySelector('#list .item').click();
 clock+=DAY; trend=20; t3.d.querySelector('#v-card [data-a="refresh"]').click(); await wait(1300);
 const s3=H(t3)['tcgdex:it:me01-127|n'], t0=day(clock);
 console.log('5 dopo diradamento: punti',s3.length,'(da 301) | primo conservato:',s3[0][0]===long[0][0],'| ultimi 90 giorni tutti presenti:',s3.filter(p=>t0-p[0]<=90).length,'su',long.filter(p=>t0-p[0]<=90).length+1,'| ultimo:',JSON.stringify(s3[s3.length-1]));
 // 6) serie di carte non più possedute: tolte solo se vecchie
 const t4=boot([entry()],{'gone-old|n':[[day(clock)-200,500]],'gone-new|n':[[day(clock)-10,500]],'tcgdex:it:me01-127|n':[[day(clock)-5,1000]]}); await wait(1300);
 console.log('6 serie dopo la pulizia:',Object.keys(H(t4)).join(', '));
 // 7) Impostazioni: stato e cancellazione
 t4.d.getElementById('hm-gear').click(); console.log('7 stato:',txt(t4,'#histstate'));
 t4.d.getElementById('btn-histdel').click(); console.log('7 dopo cancellazione:',txt(t4,'#histstate'),'| salvato:',JSON.stringify(H(t4)));
 console.log('errori:',[t,t2,t3,t4].flatMap(x=>x.errors).length?[t,t2,t3,t4].flatMap(x=>x.errors):'nessuno');
 process.exit(0);
})();
