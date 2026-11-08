// Pannello "Aggiungi carte" in tema chiaro e scuro (08/11/2026: icona della Scansione rapida bianca come le altre).
const OUT=require('path').resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
const {launch}=require('./browser');
(async()=>{ const browser=await launch();
  for (const th of ['light','dark']){
    const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
    await page.evaluateOnNewDocument(th=>{ localStorage.setItem('pkm_catalog','[]'); localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',appearance:th,bkSheet:false})); localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now())); },th);
    await page.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,800));
    await page.evaluate(()=>document.getElementById('fab').click()); await new Promise(r=>setTimeout(r,600));
    await page.screenshot({path:OUT+'aggiungi_'+th+'.png'}); await page.close();
  }
  await browser.close(); console.log('ok');
})();
