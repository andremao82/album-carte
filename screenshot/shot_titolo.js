// Scheda carta: nome al centro della barra in alto (una o due righe) e set · numero · rarità centrati sotto.
// Uso: node screenshot/shot_titolo.js dark|light → .work/shot/titolo_<tema>_corto.png, _lungo.png, _lungo_scroll.png
const OUT=require('path').resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
const {launch}=require('./browser');
const theme=process.argv[2]||'dark';
(async()=>{ let browser; try{
  browser=await launch();
  for (const [k,name] of [['corto','Venusaur'],['lungo','Charizard ex di Team Rocket Lancia Fiammante']]){
    const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
    await page.evaluateOnNewDocument((th,name)=>{
      const e={key:'c1|IT|Normale|NM',cardId:'c1',name,setName:'Expedition Base Set',number:'30',total:'165',img:'../screenshot/card.jpg',imgFrom:'IT',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:6.44,priceManual:null,added:Date.now(),rarity:'Rare Holo'};
      localStorage.setItem('pkm_catalog',JSON.stringify([e])); localStorage.setItem('pkm_cfg',JSON.stringify({appearance:th,gkey:'x'}));
      localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
    },theme,name);
    await page.goto('file://'+require('path').resolve(__dirname,'../app/index.html'),{waitUntil:'load'}); await new Promise(r=>setTimeout(r,800));
    await page.evaluate(()=>{ const w=document.getElementById('prevwarn'); if(w) w.hidden=true; document.querySelector('nav button[data-go="cat"]').click(); });
    await new Promise(r=>setTimeout(r,300));
    await page.evaluate(()=>{ document.querySelector('#list .item').click(); window.scrollTo(0,0); }); await new Promise(r=>setTimeout(r,600));
    await page.screenshot({path:OUT+'titolo_'+theme+'_'+k+'.png'});
    if (k==='lungo'){ await page.evaluate(()=>window.scrollTo(0,700)); await new Promise(r=>setTimeout(r,300)); await page.screenshot({path:OUT+'titolo_'+theme+'_'+k+'_scroll.png'}); }
    await page.close();
  }
}catch(e){ console.log('non disponibile:',String(e.message).slice(0,400)); } finally { if(browser) await browser.close(); } })();
