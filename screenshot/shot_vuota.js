// Pagine vuote (catalogo senza carte) in tema chiaro e scuro: 08/11/2026, niente giallo (icona grigia, tasto come quello di scansione).
// Uso: node screenshot/shot_vuota.js → .work/shot/vuota_<tema>.png (Home), vuota_coll_<tema>.png (Collezione)
const path=require('path'), OUT=path.resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
const {launch}=require('./browser');
(async()=>{ const b=await launch();
  for (const th of ['light','dark']){
    const p=await b.newPage(); await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
    await p.evaluateOnNewDocument(th=>{ localStorage.setItem('pkm_catalog','[]'); localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',appearance:th,bkSheet:false})); },th);
    await p.goto('file://'+path.resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,800));
    await p.evaluate(()=>{ const w=document.getElementById('prevwarn'); if(w) w.hidden=true; });
    await p.screenshot({path:OUT+'vuota_'+th+'.png'});
    await p.evaluate(()=>document.querySelector('nav button[data-go="cat"]').click()); await new Promise(r=>setTimeout(r,400));
    await p.screenshot({path:OUT+'vuota_coll_'+th+'.png'}); await p.close(); }
  await b.close(); console.log('ok'); })();
