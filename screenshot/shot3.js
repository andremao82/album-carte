const OUT=require('path').resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
const {launch}=require('./browser');
(async()=>{ const browser=await launch();
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  await page.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,500));
  await page.evaluate(()=>{ document.getElementById('prevwarn').hidden=true; document.getElementById('hm-gear').click(); }); await new Promise(r=>setTimeout(r,300));
  await page.evaluate(()=>window.scrollTo(0,0)); await page.screenshot({path:OUT+'u1.png'});
  await page.evaluate(()=>window.scrollTo(0,520)); await new Promise(r=>setTimeout(r,200)); await page.screenshot({path:OUT+'u2.png'});
  await browser.close(); })();
