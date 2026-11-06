// Menu a tendina nei campi (come in "Controlla la carta"): una sola freccia a destra.
// Uso: node screenshot/shot_freccia.js dark|light  → .work/shot/freccia_<tema>.png
const OUT=require('path').resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
const {launch}=require('./browser');
const theme=process.argv[2]||'dark';
(async()=>{ let browser; try{
  browser=await launch();
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  await page.evaluateOnNewDocument(th=>{ localStorage.setItem('pkm_cfg',JSON.stringify({appearance:th,gkey:'x'})); localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now())); },theme);
  await page.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,600));
  // stessi campi che genera la scheda "Controlla la carta" (il codice dell'app non si raggiunge da qui)
  await page.evaluate(()=>{ const w=document.getElementById('prevwarn'); if(w) w.hidden=true;
    const o=a=>a.map(x=>'<option>'+x+'</option>').join('');
    const d=document.createElement('div'); d.className='card'; d.style.cssText='position:fixed;top:120px;left:16px;right:16px;z-index:999;padding:16px';
    d.innerHTML='<div class="row"><div class="field"><label>Lingua</label><select>'+o(['IT','EN'])+'</select></div><div class="field"><label>Variante</label><select>'+o(['Holo','Normale'])+'</select></div></div>'+
      '<div class="row"><div class="field"><label>Condizione</label><select>'+o(['EX - Excellent','NM - Near Mint'])+'</select></div><div class="field"><label>Quantità</label><input type="number" value="1"></div></div>';
    document.body.appendChild(d); });
  await new Promise(r=>setTimeout(r,300));
  await page.screenshot({path:OUT+'freccia_'+theme+'.png'});
}catch(e){ console.log('non disponibile:',String(e.message).slice(0,400)); } finally { if(browser) await browser.close(); } })();
