const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
function boot(seed){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.detail&&e.detail.stack||e.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
   beforeParse(w){ seed(w.localStorage); w.confirm=()=>true; w.prompt=()=>null; w.scrollTo=()=>{};
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); }});
  return {w:dom.window,d:dom.window.document,errors,ls:dom.window.localStorage}; }
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 // A) catalogo "vecchio formato" + campo sconosciuto
 const old=[{cardId:'mep-127',name:'Lurking Ruins',setName:'Mega Evolution',number:'127',total:132,lang:'IT',variant:'Normale',cond:'NM',qty:'2',price:0.21,futuro:'conservami'},{cardId:'x-1',name:'Pikachu',qty:1}];
 let t=boot(ls=>ls.setItem('pkm_catalog',JSON.stringify(old))); await wait(250);
 t.d.querySelector('nav button[data-go="cat"]').click();
 console.log('A1 voci mostrate:',t.d.querySelectorAll('#list .item').length,'| avviso dati illeggibili:',!t.d.getElementById('datawarn').hidden);
 t.d.querySelector('#list .item').click(); t.d.querySelector('#v-card [data-a="qplus"]').click();   // provoca un salvataggio
 const saved=JSON.parse(t.ls.getItem('pkm_catalog'));
 console.log('A2 dopo salvataggio:',JSON.stringify(saved.map(e=>({name:e.name,qty:e.qty,key:e.key,lang:e.lang,cond:e.cond,futuro:e.futuro,added:typeof e.added}))));
 console.log('A3 versione dati:',t.ls.getItem('pkm_dataver'),'| copia pre-migrazione:',!!t.ls.getItem('pkm_catalog_prima_migrazione'),'| copia automatica:',!!t.ls.getItem('pkm_catalog_bak'));
 // B) svuota + recupera dalla copia automatica
 t.d.getElementById('hm-gear').click(); t.d.getElementById('btn-reset').click();
 console.log('B1 dopo svuotamento, voci:',JSON.parse(t.ls.getItem('pkm_catalog')).length);
 t.d.getElementById('btn-autobak').click();
 console.log('B2 dopo ripristino automatico, voci:',JSON.parse(t.ls.getItem('pkm_catalog')).length,'| stato:',t.d.getElementById('bakstate').textContent);
 console.log('errori A/B:',t.errors.length?t.errors:'nessuno');
 // C) dati danneggiati
 t=boot(ls=>ls.setItem('pkm_catalog','{rotto')); await wait(250);
 console.log('C1 avviso dati:',!t.d.getElementById('datawarn').hidden,'| copia dell\'originale:',t.ls.getItem('pkm_catalog_illeggibile'),'| originale intatto:',t.ls.getItem('pkm_catalog'),'| errori:',t.errors.length?t.errors:'nessuno');
 // D) primo avvio senza dati
 t=boot(()=>{}); await wait(250); t.d.querySelector('nav button[data-go="cat"]').click(); console.log('D1 primo avvio -> errori:',t.errors.length?t.errors:'nessuno','| vista catalogo vuota:',t.d.querySelector('#list .empty')?'sì':'no');
 process.exit(0);
})();
