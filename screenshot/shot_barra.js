const OUT=require('path').resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
// Barra in basso (22/10/2026: icone piene come l'app nativa). Uso: node shot_barra.js [dark|light] → .work/shot/barra_<tema>.png
const {launch}=require('./browser');
const theme=process.argv[2]||'light';
(async()=>{ const browser=await launch();
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  await page.evaluateOnNewDocument(th=>{ localStorage.setItem('pkm_cfg',JSON.stringify({appearance:th})); },theme);
  await page.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,600));
  await page.evaluate(()=>{ const w=document.getElementById('prevwarn'); if(w) w.hidden=true; document.querySelector('nav button[data-go="cat"]').click(); });
  await new Promise(r=>setTimeout(r,300));
  await page.screenshot({path:OUT+'barra_'+theme+'.png',clip:{x:0,y:724,width:390,height:120}});
  await browser.close(); })();
