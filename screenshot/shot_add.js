const OUT=require('path').resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
const chromium=require('@sparticuz/chromium').default; const puppeteer=require('puppeteer-core'); const fs=require('fs');
(async()=>{ try{
  const exe=process.env.CHROME_PATH||await chromium.executablePath();
  const browser=await puppeteer.launch({args:[...chromium.args,'--no-sandbox'],executablePath:exe,headless:'shell'});
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  await page.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,600));
  await page.evaluate(()=>{document.querySelector('nav button[data-go=cat]').click();document.getElementById('btn-addcard').click();}); await new Promise(r=>setTimeout(r,400));
  await page.screenshot({path:OUT+'add1.png'});
  console.log('browser ok', await browser.version()); await browser.close();
}catch(e){ console.log('non disponibile:',String(e.message).slice(0,400)); } })();
