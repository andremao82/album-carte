// 08/11/2026: barra in basso più vicina al bordo (richiesta dell'utente "abbassa la barra il più possibile").
// Sull'iPhone (zona sicura in basso 34 px, simulata con --safeb) la barra sta a 20 px dal fondo, sopra la barretta Home
// (che arriva a ~13 px dal fondo); senza zona sicura a 8 px. Barra della selezione, avvisi e Annulla restano sopra la barra,
// e il fondo delle pagine si può ancora scorrere oltre la barra. Verifica nel browser vero (Chromium).
const {launch}=require(require('./percorsi').SHOT+'/browser.js'), assert=require('assert');
(async()=>{ const browser=await launch();
  let n=0; const errs=[];
  const ok=(c,m)=>{ assert.ok(c,m); n++; };
  try {
  for (const [safe,atteso] of [[34,20],[0,8]]) for (const theme of ['dark','light']){
    const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
    page.on('pageerror',e=>errs.push(e.message));
    await page.evaluateOnNewDocument(th=>{
      const cat=[1,2,3].map(k=>({key:`c${k}|IT|Normale|NM`,cardId:'c'+k,name:'Carta '+k,setName:'Base',number:String(k),total:'102',img:'',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:k,priceManual:null,added:Date.now()-k*864e5,imgFrom:'IT'}));
      localStorage.setItem('pkm_catalog',JSON.stringify(cat));
      localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',appearance:th,bkSheet:false}));
      localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
    },theme);
    await page.goto(require('./percorsi').APP_URL); await new Promise(r=>setTimeout(r,800));
    const T=theme+', zona sicura '+safe+' px: ';
    const g=await page.evaluate(safe=>{
      if (safe) document.documentElement.style.setProperty('--safeb',safe+'px');
      const H=innerHeight, bar=document.querySelector('.dock .bar').getBoundingClientRect();
      const sel=document.querySelector('.selbar'), undo=document.querySelector('.undo'), toast=document.getElementById('toast');
      // mostrati solo per misurarli
      const pos=el=>{ if(!el) return null; const h=el.hidden; el.hidden=false; const d=el.style.display; el.style.display='flex'; const r=el.getBoundingClientRect(); el.hidden=h; el.style.display=d; return {top:r.top,bottom:r.bottom}; };
      const main=document.querySelector('main');
      return {H, top:bar.top, bottom:H-bar.bottom, h:bar.height, sel:pos(sel), undo:pos(undo), toast:{bottom:toast.getBoundingClientRect().bottom},
        mainPad:parseFloat(getComputedStyle(main).paddingBottom)};
    },safe);
    ok(Math.abs(g.bottom-atteso)<=1,T+'barra a '+atteso+' px dal fondo ('+g.bottom+')');
    if (safe) ok(g.bottom>=safe-21,T+'barra sopra la barretta Home ('+g.bottom+' px dal fondo)');
    ok(g.h>=50&&g.h<64,T+'altezza della barra invariata ('+g.h+' px)');
    ok(g.sel&&g.H-g.sel.bottom>=g.H-g.top+8,T+'barra della selezione sopra la barra ('+(g.sel&&g.sel.bottom)+' / '+g.top+')');
    ok(g.undo&&g.undo.bottom<=g.top-8,T+'Annulla sopra la barra');
    ok(g.toast.bottom<=g.top-8,T+'avvisi sopra la barra ('+g.toast.bottom+' / '+g.top+')');
    ok(g.mainPad>=g.H-g.top+20,T+'fondo della pagina scorribile oltre la barra (spazio '+g.mainPad+' px)');
    await page.close();
  }
  ok(errs.length===0,'nessun errore nella pagina ('+errs.join(' | ')+')');
  } catch(e){ console.error(e.message); await browser.close(); process.exit(1); }
  await browser.close();
  console.log('barra_bassa: '+n+' controlli superati, errori: nessuno');
})();
