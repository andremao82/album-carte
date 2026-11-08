const OUT=require('path').resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
// Barra in basso vicina al bordo (08/11/2026), con la zona sicura dell'iPhone simulata (34 px) e la barretta Home disegnata
// (134×5 px a 8 px dal fondo). Uso: node shot_barra_bassa.js [dark|light] → .work/shot/barra_bassa_<tema>.png (fondo della Collezione)
const {launch}=require('./browser');
const theme=process.argv[2]||'light';
(async()=>{ const browser=await launch();
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  await page.evaluateOnNewDocument(th=>{
    const cat=Array.from({length:12},(_,i)=>({key:`c${i}|IT|Normale|NM`,cardId:'c'+i,name:['Pikachu','Charizard','Eevee','Bulbasaur','Squirtle','Mew'][i%6],setName:'Base',number:String(i+1),total:'102',img:'',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:i+1,priceManual:null,added:Date.now()-i*864e5,imgFrom:'IT'}));
    localStorage.setItem('pkm_catalog',JSON.stringify(cat));
    localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',appearance:th,bkSheet:false}));
    localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
  },theme);
  await page.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,700));
  await page.evaluate(()=>{ const w=document.getElementById('prevwarn'); if(w) w.hidden=true;
    document.querySelector('nav button[data-go="cat"]').click();
    document.documentElement.style.setProperty('--safeb','34px');
    const hi=document.createElement('div'); const dark=document.documentElement.dataset.theme!=='light';
    hi.style.cssText='position:fixed;z-index:99;left:50%;bottom:8px;width:134px;height:5px;margin-left:-67px;border-radius:3px;background:'+(dark?'#fff':'#000');
    document.body.appendChild(hi); });
  await new Promise(r=>setTimeout(r,300));
  await page.screenshot({path:OUT+'barra_bassa_'+theme+'.png',clip:{x:0,y:604,width:390,height:240}});
  await browser.close(); })();
