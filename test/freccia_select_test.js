// 06/11/2026: in "Controlla la carta" (tema chiaro) la freccia dei menu a tendina (Lingua, Variante, Condizione)
// si ripeteva su tutto il campo: `.field select{background:...}` (forma abbreviata) azzerava background-repeat e
// la posizione; in tema scuro la freccia spariva del tutto. Verifica nel browser vero (Chromium), in entrambi i temi:
// ogni select in un campo deve avere una sola freccia, a destra.
const {launch}=require(require('./percorsi').SHOT+'/browser.js'), assert=require('assert');
(async()=>{ const browser=await launch();
  let n=0; const errs=[];
  try {
    for (const theme of ['light','dark']){
      const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
      page.on('pageerror',e=>errs.push(e.message));
      await page.evaluateOnNewDocument(t=>{ localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',appearance:t})); localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now())); },theme);
      await page.goto(require('./percorsi').APP_URL); await new Promise(r=>setTimeout(r,800));
      const r=await page.evaluate(()=>[...document.querySelectorAll('.field select, .tools select')].map(s=>{
        const c=getComputedStyle(s); return {id:s.id||s.name||s.className,img:c.backgroundImage,rep:c.backgroundRepeat,pos:c.backgroundPositionX};}));
      assert.ok(r.length>=3,theme+': trovate solo '+r.length+' select nei campi'); n++;
      for (const x of r){
        assert.ok(/^url\(/.test(x.img),theme+': select senza freccia '+JSON.stringify(x)); n++;
        assert.strictEqual(x.rep,'no-repeat',theme+': freccia ripetuta '+JSON.stringify(x)); n++;
        assert.ok(/right|100%|calc/.test(x.pos),theme+': freccia non a destra '+JSON.stringify(x)); n++;
      }
      await page.close();
    }
  } finally { await browser.close(); }
  assert.deepStrictEqual(errs,[],'errori della pagina');
  console.log('freccia_select_test: '+n+' controlli superati, errori: nessuno');
})().catch(e=>{ console.error(e); process.exit(1); });
