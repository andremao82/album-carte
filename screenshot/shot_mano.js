// Aggiunta a mano (08/11/2026): pagina Controlla la carta senza risultati, modulo precompilato, scheda della carta a mano.
// Uso: node screenshot/shot_mano.js → .work/shot/mano_vuota_<tema>.png, mano_modulo_<tema>.png, mano_scheda_<tema>.png, mano_scheda2_<tema>.png
const path=require('path'), OUT=path.resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
const {launch}=require('./browser');
const fs=require('fs');
const html0=fs.readFileSync(path.resolve(__dirname,'../app/index.html'),'utf8'), END=html0.lastIndexOf('\n})();');
const TMP=path.resolve(__dirname,'../.work/mano.html');
fs.writeFileSync(TMP,html0.slice(0,END)+'\nwindow.__t={reviewJob,get qJobs(){return qJobs;}};'+html0.slice(END));
// carta di prova disegnata su una tela (grigia con una stella), come foto ritagliata
const CARD=`<svg xmlns="http://www.w3.org/2000/svg" width="315" height="440"><rect width="315" height="440" rx="16" fill="#cfd2d6"/><rect x="18" y="60" width="279" height="190" fill="#2a2a2a"/><circle cx="157" cy="155" r="70" fill="#f2f2f2"/><text x="157" y="178" font-size="80" text-anchor="middle" fill="#3a2f4a">★</text><text x="22" y="40" font-size="22" font-weight="700" fill="#333">滋养能量</text><text x="22" y="420" font-size="12" fill="#333">cs6bC 131/131 U</text></svg>`;
const CROP='data:image/svg+xml;base64,'+Buffer.from(CARD).toString('base64');
(async()=>{ const b=await launch();
  for (const th of ['light','dark']){
    const p=await b.newPage(); await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
    await p.evaluateOnNewDocument(th=>{ localStorage.setItem('pkm_catalog','[]'); localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',appearance:th,bkSheet:false})); },th);
    await p.setRequestInterception(true);
    p.on('request',r=>{ const u=r.url(); if(u.includes('tcgdex')) r.respond({status:200,contentType:'application/json',body:'[]'}); else if(u.includes('pokemontcg')) r.respond({status:200,contentType:'application/json',body:'{"data":[]}'}); else r.continue(); });
    await p.goto('file://'+TMP); await new Promise(r=>setTimeout(r,800));
    await p.evaluate(()=>{ const w=document.getElementById('prevwarn'); if(w) w.hidden=true; });
    await p.evaluate(crop=>{ const job={id:'j1',t:Date.now(),status:'review',rec:{name_en:'Nourishing Energy',name_printed:'滋养能量',number:'131',printed_total:'131',set_code:'CS6bC',language:'other',variant_hint:'normal',confidence:0.9},crop,raw:crop,photo:null};
      window.__t.qJobs.push(job); window.__t.reviewJob(job); },CROP);
    await new Promise(r=>setTimeout(r,1500));
    await p.evaluate(()=>document.getElementById('man-open').scrollIntoView({block:'center'})); await new Promise(r=>setTimeout(r,200));
    await p.screenshot({path:OUT+'mano_vuota_'+th+'.png'});
    await p.evaluate(()=>{ document.getElementById('man-open').click(); }); await new Promise(r=>setTimeout(r,300));
    await p.evaluate(()=>document.getElementById('man-form').scrollIntoView({block:'start'})); await new Promise(r=>setTimeout(r,200));
    await p.screenshot({path:OUT+'mano_modulo_'+th+'.png'});
    await p.evaluate(()=>{ document.getElementById('m-name').value='Energia Nutriente'; document.getElementById('m-pm').value='0,50'; document.getElementById('m-add').click(); });
    await new Promise(r=>setTimeout(r,800));
    await p.evaluate(()=>document.querySelector('nav button[data-go="cat"]').click()); await new Promise(r=>setTimeout(r,400));
    await p.evaluate(()=>document.querySelector('#list [data-open]').click()); await new Promise(r=>setTimeout(r,800));
    await p.screenshot({path:OUT+'mano_scheda_'+th+'.png'});
    await p.evaluate(()=>document.getElementById('cd-mn').scrollIntoView({block:'center'})); await new Promise(r=>setTimeout(r,200));
    await p.screenshot({path:OUT+'mano_scheda2_'+th+'.png'}); await p.close(); }
  await b.close(); fs.unlinkSync(TMP); console.log('ok'); })();
