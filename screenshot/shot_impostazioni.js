const OUT=require('path').resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
// Impostazioni riordinate (24/10/2026), pagina intera in 3 schermate. Uso: node shot_impostazioni.js [dark|light]
const {launch}=require('./browser');
const theme=process.argv[2]||'dark';
(async()=>{ const browser=await launch();
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  await page.evaluateOnNewDocument(th=>{
    const cat=[{key:'c1|IT|Normale|NM',cardId:'c1',name:'Pikachu',setName:'Megaevoluzione',number:'1',total:'132',img:'',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:3,added:Date.now(),dex:[25],cat:'Pokemon',ill:''}];
    localStorage.setItem('pkm_catalog',JSON.stringify(cat));
    localStorage.setItem('pkm_fx',JSON.stringify({t:Date.now(),r:0.9,d:'2026-10-23'}));
    localStorage.setItem('pkm_prices_t',JSON.stringify(Date.now()-2*36e5));
    localStorage.setItem('pkm_cfg',JSON.stringify({appearance:th}));
    localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
  },theme);
  await page.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,800));
  await page.evaluate(()=>{ const w=document.getElementById('prevwarn'); if(w) w.hidden=true; document.getElementById('hm-gear').click(); });
  await new Promise(r=>setTimeout(r,400));
  for(let i=0;i<5;i++){ await page.evaluate(i=>window.scrollTo(0,i*760),i); await new Promise(r=>setTimeout(r,200)); await page.screenshot({path:OUT+'impostazioni_'+theme+'_'+(i+1)+'.png'}); }
  await browser.close(); })();
