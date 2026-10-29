// Scheda di una carta Holo: ferma (senza riflesso) e mentre si trascina il dito (con riflesso).
// Uso: node screenshot/shot_riflesso.js   → .work/shot/riflesso_fermo.png, riflesso_dito.png
const {launch}=require('./browser'), path=require('path'), fs=require('fs');
const ROOT=path.resolve(__dirname,'..'), OUT=path.join(ROOT,'.work','shot'); fs.mkdirSync(OUT,{recursive:true});
(async()=>{ const browser=await launch();
  try {
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  await page.evaluateOnNewDocument(()=>{
    localStorage.setItem('pkm_catalog',JSON.stringify([{key:'c1|IT|Holo|NM',cardId:'c1',name:'Koraidon',setName:'Base',number:'8',total:'15',img:'../screenshot/card.jpg',lang:'IT',variant:'Holo',cond:'NM',qty:1,price:0.32,priceManual:null,added:Date.now(),imgFrom:'IT'}]));
    localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',appearance:'light'})); localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
  });
  await page.goto('file://'+path.join(ROOT,'app','index.html')); await new Promise(r=>setTimeout(r,1000));
  await page.evaluate(()=>document.querySelector('nav button[data-go="cat"]').click()); await new Promise(r=>setTimeout(r,500));
  await page.evaluate(()=>document.querySelector('#list [data-open="c1|IT|Holo|NM"]').click()); await new Promise(r=>setTimeout(r,800));
  await page.screenshot({path:path.join(OUT,'riflesso_fermo.png')});
  await page.evaluate(()=>{ const el=document.querySelector('#cd-tilt'), b=el.getBoundingClientRect();
    const ev=(t,x,y)=>el.dispatchEvent(new PointerEvent(t,{bubbles:true,pointerId:7,pointerType:'touch',clientX:x,clientY:y}));
    ev('pointerdown',b.left+b.width*.5,b.top+b.height*.5); ev('pointermove',b.left+b.width*.3,b.top+b.height*.35); });
  await new Promise(r=>setTimeout(r,400));
  await page.screenshot({path:path.join(OUT,'riflesso_dito.png')});
  } finally { await browser.close(); }
  console.log('ok: '+OUT);
})().catch(e=>{ console.error(e); process.exit(1); });
