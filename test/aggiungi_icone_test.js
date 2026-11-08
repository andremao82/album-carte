// 08/11/2026: nel pannello "Aggiungi carte" l'icona della Scansione rapida non è più gialla (richiesta dell'utente
// "non ha più senso il giallo qui": il tasto di scansione nella barra è grigio). Le tre icone hanno lo stesso cerchio
// bianco/chiaro e lo stesso colore del disegno, in tema chiaro e scuro. Verifica nel browser vero (Chromium).
const {launch}=require(require('./percorsi').SHOT+'/browser.js'), assert=require('assert');
(async()=>{ const browser=await launch();
  let n=0; const errs=[];
  const ok=(c,m)=>{ assert.ok(c,m); n++; };
  try {
  for (const theme of ['dark','light']){
    const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
    page.on('pageerror',e=>errs.push(e.message));
    await page.evaluateOnNewDocument(th=>{
      localStorage.setItem('pkm_catalog','[]');
      localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',appearance:th,bkSheet:false}));
      localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
    },theme);
    await page.goto(require('./percorsi').APP_URL); await new Promise(r=>setTimeout(r,800));
    await page.evaluate(()=>document.getElementById('fab').click()); await new Promise(r=>setTimeout(r,400));
    const T=theme+': ';
    const g=await page.evaluate(()=>{
      const one=k=>{ const o=document.querySelector('.addsheet .aopt[data-ad="'+k+'"]'), ai=o.querySelector('.ai'), cs=getComputedStyle(ai);
        return {vis:o.getBoundingClientRect().height>0, bg:cs.backgroundColor, col:cs.color, primary:o.classList.contains('primary')}; };
      const probe=document.createElement('div'); probe.style.background='var(--accent-fill)'; document.body.appendChild(probe);
      const accent=getComputedStyle(probe).backgroundColor; probe.remove();
      return {quick:one('quick'), photos:one('photos'), search:one('search'), accent};
    });
    ok(g.quick.vis&&g.photos.vis&&g.search.vis,T+'pannello aperto con le tre opzioni');
    ok(!g.quick.primary,T+'Scansione rapida senza stile "primary"');
    ok(g.quick.bg!==g.accent,T+'cerchio della Scansione rapida non giallo ('+g.quick.bg+')');
    ok(g.quick.bg===g.photos.bg&&g.quick.bg===g.search.bg,T+'stesso cerchio per le tre icone ('+[g.quick.bg,g.photos.bg,g.search.bg].join(' / ')+')');
    ok(g.quick.col===g.photos.col&&g.quick.col===g.search.col,T+'stesso colore del disegno per le tre icone');
    const quickFirst=await page.evaluate(()=>document.querySelector('.addsheet .aopt').dataset.ad);
    ok(quickFirst==='quick',T+'Scansione rapida resta la prima');
    await page.close();
  }
  ok(errs.length===0,'nessun errore nella pagina ('+errs.join(' | ')+')');
  } catch(e){ console.error(e.message); await browser.close(); process.exit(1); }
  await browser.close();
  console.log('aggiungi_icone: '+n+' controlli superati, errori: nessuno');
})();
