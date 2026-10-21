const OUT=require('path').resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
const {launch}=require('./browser');
(async()=>{ try{
  const browser=await launch();
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  await page.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,600));
  await page.evaluate(()=>document.getElementById('btn-quick').click()); await new Promise(r=>setTimeout(r,300));
  // righe come le genera renderQuick (stato review con foto conservata, stato edges)
  await page.evaluate(()=>{ const b='<button class="btn small';
    document.getElementById('q-list').innerHTML=
    '<div class="qrow wide"><img src="" alt=""><div class="body"><div class="nm">Da controllare: lettura poco sicura</div><div class="meta">Rovine Insidiose, 127</div></div><div class="acts">'+b+' solid" type="button">Controlla</button>'+b+'" type="button">Correggi bordi</button>'+b+' danger" type="button">Elimina</button></div></div>'+
    '<div class="qrow"><img src="" alt=""><div class="body"><div class="nm">Bordi da controllare</div></div><div class="acts">'+b+'" type="button">Correggi bordi</button>'+b+' danger" type="button">Elimina</button></div></div>';
    document.getElementById('q-list').scrollIntoView(); });
  await new Promise(r=>setTimeout(r,300)); await page.screenshot({path:OUT+'edges_list.png'}); await browser.close();
}catch(e){ console.log('non disponibile:',String(e.message).slice(0,400)); } })();
