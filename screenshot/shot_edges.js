const OUT=require('path').resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
const {launch}=require('./browser');
(async()=>{ try{
  const browser=await launch();
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:false});
  await page.evaluateOnNewDocument(()=>{ localStorage.setItem('pkm_cfg',JSON.stringify({confirmEdges:true,provider:'claude',key:''})); });
  page.on('pageerror',e=>console.log('ERRORE PAGINA',e.message));
  await page.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,600));
  await page.evaluate(()=>document.getElementById('btn-quick').click()); await new Promise(r=>setTimeout(r,300));
  const inp=await page.$('#q-file'); await inp.uploadFile(__dirname+'/card.jpg',__dirname+'/flat.jpg');
  await page.waitForSelector('#qedge:not([hidden])',{timeout:15000}); await new Promise(r=>setTimeout(r,800));
  await page.screenshot({path:OUT+'edges1.png'});
  const b=await (await page.$('#qe-cv')).boundingBox(); console.log('tela',JSON.stringify(b));
  // trascina l'angolo in alto a sinistra (lente di lato) e poi quello in basso a destra (lente sopra)
  const tl=[b.x+b.width*0.21,b.y+b.height*0.19];
  await page.mouse.move(tl[0],tl[1]); await page.mouse.down(); await page.mouse.move(tl[0]+6,tl[1]+4,{steps:3});
  await page.screenshot({path:OUT+'edges2.png'}); await page.mouse.up();
  const br=[b.x+b.width*0.79,b.y+b.height*0.80];
  await page.mouse.move(br[0],br[1]); await page.mouse.down(); await page.mouse.move(br[0]-4,br[1]-4,{steps:3});
  await page.screenshot({path:OUT+'edges3.png'}); await page.mouse.up();
  await page.evaluate(()=>document.querySelector('[data-qe="later"]').click()); await new Promise(r=>setTimeout(r,300));
  await page.screenshot({path:OUT+'edges4.png'});
  await browser.close();
}catch(e){ console.log('non disponibile:',String(e.message).slice(0,400)); } })();
