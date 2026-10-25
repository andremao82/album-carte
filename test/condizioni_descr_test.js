// Descrizione di ogni condizione sotto il nome in Impostazioni → Prezzo per condizione (25/10/2026).
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8'); const wait=ms=>new Promise(r=>setTimeout(r,ms));
let n=0; const ok=(c,m)=>{ if(!c){ console.log('NON SUPERATO: '+m); process.exit(1); } n++; };
const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.message).split('\n')[0]));
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.pages.dev/',virtualConsole:vc,beforeParse(w){ w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=async()=>({ok:false,status:404,json:async()=>({})}); }});
const w=dom.window, d=w.document;
const want=[['MT','Mint','Perfetta, appena uscita dalla bustina'],['NM','Near Mint','Al massimo 1-2 micro-imperfezioni visibili solo da vicino'],
  ['EX','Excellent','Leggero whitening o qualche graffio superficiale'],['GD','Good','Usura evidente su bordi e angoli, nessuna piega'],
  ['LP','Light Played','Usura diffusa, piccole pieghe o graffi marcati'],['PL','Played','Pieghe evidenti, forte usura'],['PO','Poor','Danni gravi: strappi, acqua, scritte']];
(async()=>{
  await wait(250); d.getElementById('hm-gear').click(); await wait(50);
  for(const [c,name,desc] of want){
    const lbl=d.querySelector('label[for="cc-'+c+'"]'); ok(lbl,'etichetta '+c);
    const sm=lbl.querySelector('.sdesc'); ok(sm,'descrizione presente per '+c);
    ok(sm.textContent===desc,c+': descrizione "'+(sm&&sm.textContent)+'"');
    ok(lbl.firstChild.nodeType===3&&lbl.firstChild.textContent===name,c+': nome "'+name+'" prima della descrizione');
    ok(lbl.closest('.srow2').querySelector('.ico.code').textContent===c,c+': sigla nella stessa riga');
    ok(lbl.closest('.srow2').querySelector('#cc-'+c),c+': campo percentuale nella stessa riga');
  }
  ok(d.querySelectorAll('#v-set .sdesc').length===7,'sette descrizioni, solo nelle condizioni');
  // il campo funziona ancora
  const i=d.getElementById('cc-EX'); i.value='80'; i.dispatchEvent(new w.Event('change',{bubbles:true}));
  ok(JSON.parse(w.localStorage.getItem('pkm_cfg')||'{}').condCoef.EX===0.8||JSON.parse(w.localStorage.getItem('pkm_cfg')).condCoef.EX===80,'percentuale EX salvata');
  ok(/\.sdesc\{[^}]*display:block/.test(html),'descrizione su una riga sua (CSS)');
  ok(/\.ico\.lp\{display:grid/.test(html),'icona LP centrata (la regola .lp dei pulsanti lingua non la rende flex)');
  console.log('condizioni_descr_test: '+n+' controlli superati, errori: '+(errors.length?errors.join(' / '):'nessuno'));
})();
