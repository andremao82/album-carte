// 22/10/2026: l'utente preferisce le icone piene della vecchia app nativa (stile SF Symbols: house.fill, square.stack.fill,
// books.vertical.fill, square.grid.3x3.fill) a quelle a contorno. Verifica nel browser vero (Chromium): le quattro schede
// hanno icone piene (fill del colore del testo, niente contorno) in entrambi i temi; il pulsante di scansione resta a contorno.
const {launch}=require(require('./percorsi').SHOT+'/browser.js'), assert=require('assert');
(async()=>{ const browser=await launch();
  let n=0; const errs=[];
  try {
  for (const theme of ['light','dark']){
    const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
    page.on('pageerror',e=>errs.push(e.message));
    await page.evaluateOnNewDocument(th=>{ localStorage.setItem('pkm_cfg',JSON.stringify({appearance:th})); },theme);
    await page.goto(require('./percorsi').APP_URL); await new Promise(r=>setTimeout(r,500));
    const r=await page.evaluate(()=>{
      const tabs=[...document.querySelectorAll('.bar button[data-go]')].map(b=>{ const s=b.querySelector('svg'), cs=getComputedStyle(s), bb=s.getBBox();
        return {go:b.dataset.go,fill:cs.fill,color:getComputedStyle(b).color,stroke:cs.stroke,area:bb.width*bb.height}; });
      const fs=getComputedStyle(document.querySelector('#fab svg'));
      return {tabs,fab:{fill:fs.fill,stroke:fs.stroke}};
    });
    assert.deepStrictEqual(r.tabs.map(t=>t.go),['home','cat','sets','dex'],theme+': schede della barra');
    for (const t of r.tabs){
      assert.strictEqual(t.fill,t.color,theme+' '+t.go+': icona piena del colore del testo'); n++;
      assert.strictEqual(t.stroke,'none',theme+' '+t.go+': niente contorno'); n++;
      assert.ok(t.area>200,theme+' '+t.go+': icona che occupa la casella ('+t.area+')'); n++;
    }
    assert.strictEqual(r.fab.fill,'none',theme+': scansione a contorno'); n++;
    assert.notStrictEqual(r.fab.stroke,'none',theme+': scansione con contorno visibile'); n++;
    await page.close();
  }
  } finally { await browser.close(); }
  assert.deepStrictEqual(errs,[],'errori della pagina');
  console.log('icone_barra_test: '+n+' controlli superati, errori: nessuno');
})().catch(e=>{ console.error(e); process.exit(1); });
