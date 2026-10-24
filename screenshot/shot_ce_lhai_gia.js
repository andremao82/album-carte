// Righe della coda con l'avviso "Ce l'hai già" (create da renderQuick). Uso: node screenshot/shot_ce_lhai_gia.js dark|light
const OUT=require('path').resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
const {launch}=require('./browser');
const theme=process.argv[2]||'dark';
(async()=>{ let browser; try{
  browser=await launch();
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  await page.evaluateOnNewDocument(th=>{ localStorage.setItem('pkm_cfg',JSON.stringify({appearance:th,gkey:'x'})); },theme);
  await page.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,600));
  await page.evaluate(()=>{ const w=document.getElementById('prevwarn'); if(w) w.hidden=true;
    document.getElementById('fab').click(); document.querySelector('[data-ad="quick"]').click(); });
  await new Promise(r=>setTimeout(r,300));
  // righe come le genera renderQuick: aggiunte (con e senza avviso) e da controllare
  await page.evaluate(()=>{ const b='<button class="btn small', dup=t=>'<span class="qdup">'+t+'</span>';
    const add=(n,m,d)=>'<div class="qrow"><img src="" alt=""><div class="body"><div class="nm">'+n+'</div><div class="meta">'+m+'</div>'+(d?dup(d):'')+'</div><div class="acts">'+b+'" type="button">Annulla</button></div></div>';
    const rev=(l,m,d,wide)=>'<div class="qrow'+(wide?' wide':'')+'"><img src="" alt=""><div class="body"><div class="nm">Da controllare: '+l+'</div><div class="meta">'+m+'</div>'+(d?dup(d):'')+'</div><div class="acts">'+b+' solid" type="button">Controlla</button>'+(wide?b+'" type="button">Correggi bordi</button>':'')+b+' danger" type="button">Elimina</button></div></div>';
    document.getElementById('q-list').innerHTML=
      rev('carta non trovata','Pikachu, 999','',false)+
      rev('lettura poco sicura','Rovine Insidiose, 127/132','Forse ce l’hai già: 2 copie',true)+
      add('Charizard ex','Promo Scarlatto e Violetto, 161/198, NM','Ce l’hai già: ne avevi 3')+
      add('Rovine Insidiose','Megaevoluzione, 127/132, EX','Ce l’hai già: ne avevi 1')+
      add('Rovine Insidiose','Megaevoluzione, 127/132, EX','');
    document.getElementById('q-stats').scrollIntoView(); });
  await new Promise(r=>setTimeout(r,400)); await page.screenshot({path:OUT+'ce_lhai_gia_'+theme+'.png'}); 
}catch(e){ console.log('non disponibile:',String(e.message).slice(0,400)); } finally { if(browser) await browser.close(); } })();
