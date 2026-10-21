const OUT=require('path').resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
const {launch}=require('./browser'); const fs=require('fs');
(async()=>{ try{
  const browser=await launch();
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  await page.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,600));
  await page.evaluate(()=>{document.getElementById('hm-gear').click();}); await new Promise(r=>setTimeout(r,400));
  await page.screenshot({path:OUT+'set1.png'});
  await page.evaluate(()=>window.scrollTo(0,900)); await new Promise(r=>setTimeout(r,200)); await page.screenshot({path:OUT+'set2.png'});
  await page.evaluate(()=>window.scrollTo(0,1900)); await new Promise(r=>setTimeout(r,200)); await page.screenshot({path:OUT+'set3.png'});
  console.log('browser ok', await browser.version()); await browser.close();
}catch(e){ console.log('non disponibile:',String(e.message).slice(0,400)); } })();
