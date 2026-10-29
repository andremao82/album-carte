// Scheda carta con immagine web 600×825 (niente striscia grigia sotto) e fotocamera dell'app in modalità "Foto della carta".
// Uso: node shot_foto_carta.js dark|light → .work/shot/foto_carta_<tema>_scheda.png, foto_carta_<tema>_fotocamera.png
const {launch}=require('./browser'), path=require('path'), fs=require('fs');
const theme=process.argv[2]==='light'?'light':'dark';
const OUT=path.join(__dirname,'..','.work','shot'); fs.mkdirSync(OUT,{recursive:true});
(async()=>{ const browser=await launch();
  try {
    const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
    await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:theme}]);
    await page.evaluateOnNewDocument(()=>{
      // carta finta 600×825 con cornice argentata, come le immagini di TCGdex
      const im=document.createElement('canvas'); im.width=600; im.height=825; const g=im.getContext('2d');
      g.fillStyle='#b9bcc2'; g.fillRect(0,0,600,825); g.fillStyle='#e3a33a'; g.fillRect(22,22,556,781); g.fillStyle='#7ab0d8'; g.fillRect(60,90,480,330);
      g.fillStyle='#222'; g.font='bold 40px sans-serif'; g.fillText('Toedscool',70,70);
      const mk=(k,name,img)=>({key:`c${k}|IT|Normale|NM`,cardId:'c'+k,name,setName:'Rivali Predestinati',number:String(k),total:'182',img,lang:'IT',variant:'Normale',cond:'NM',qty:1,price:0.03,priceManual:null,added:Date.now(),imgFrom:'IT'});
      localStorage.setItem('pkm_catalog',JSON.stringify([mk(109,'Toedscool di Pepe',im.toDataURL('image/png'))]));
      localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x'})); localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
      const W=720,H=1280, cv=document.createElement('canvas'); cv.width=W; cv.height=H; const c=cv.getContext('2d');
      setInterval(()=>{ c.fillStyle='#5b4a3a'; c.fillRect(0,0,W,H); c.save(); c.translate(W/2,H/2); c.rotate(-0.04); c.drawImage(im,-215,-296,430,592); c.restore(); },100);
      navigator.mediaDevices.getUserMedia=async()=>cv.captureStream(10);
    });
    await page.goto('file://'+path.join(__dirname,'..','app','index.html')); await new Promise(r=>setTimeout(r,900));
    await page.evaluate(()=>document.querySelector('nav button[data-go="cat"]').click()); await new Promise(r=>setTimeout(r,400));
    await page.evaluate(()=>document.querySelector('#list [data-open]').click()); await new Promise(r=>setTimeout(r,700));
    await page.screenshot({path:path.join(OUT,'foto_carta_'+theme+'_scheda.png')});
    await page.evaluate(()=>document.querySelector('#v-card [data-a="photo"]').click()); await new Promise(r=>setTimeout(r,200));
    await page.screenshot({path:path.join(OUT,'foto_carta_'+theme+'_menu.png')});
    await page.evaluate(()=>document.querySelectorAll('#act-sheet .actbtn')[[...document.querySelectorAll('#act-sheet .actbtn')].findIndex(b=>/fotocamera/.test(b.textContent))].click());
    await new Promise(r=>setTimeout(r,800));
    await page.screenshot({path:path.join(OUT,'foto_carta_'+theme+'_fotocamera.png')});
    console.log('ok '+OUT);
  } finally { await browser.close(); }
})().catch(e=>{ console.error(e); process.exit(1); });
