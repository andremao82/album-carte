// Scansione rapida: righe aggiunte con Annulla/Conferma, barra "Conferma tutte" e barra in alto dopo lo scorrimento.
// Uso: node screenshot/shot_conferma.js dark|light  → .work/shot/conferma_<tema>.png e conferma_<tema>_scroll.png
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
  // righe come le genera renderQuick (il codice dell'app è chiuso in una funzione e non si raggiunge da qui)
  await page.evaluate(()=>{ const img='../screenshot/card.jpg', b='<button class="btn small';
    const add=(n,m,d)=>'<div class="qrow"><img src="'+img+'" alt=""><div class="body"><div class="nm">'+n+'</div><div class="meta">'+m+'</div>'+(d?'<span class="qdup">'+d+'</span>':'')+'</div><div class="acts two"><button class="btn qic" type="button"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button><button class="btn solid qic" type="button"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button></div></div>';
    document.getElementById('q-stats').innerHTML='<span>Aggiunte 6</span><span>Da controllare 0</span><span>In coda 0</span>';
    document.getElementById('q-list').innerHTML='<div class="qall">'+b+'" type="button">Annulla tutte (6)</button>'+b+' solid" type="button">Conferma tutte (6)</button></div>'+
      add('Cranidos','Buio Pesto, 044/84, NM')+add('Charizard ex','Ossidiana Infuocata, 125/197, NM','Ce l’hai già: ne avevi 1')+add('Pikachu','Evoluzioni Prismatiche, 027/131, EX')+
      add('Gengar','Fusione Arcana, 066/264, NM')+add('Rovine Insidiose','Megaevoluzione, 127/132, EX','Ce l’hai già: ne avevi 2')+add('Mew','151, 151/165, NM'); });
  await new Promise(r=>setTimeout(r,300));
  await page.evaluate(()=>document.getElementById('q-stats').scrollIntoView({block:'center'})); await new Promise(r=>setTimeout(r,300));
  await page.screenshot({path:OUT+'conferma_'+theme+'.png'});
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight)); await new Promise(r=>setTimeout(r,300));
  await page.screenshot({path:OUT+'conferma_'+theme+'_scroll.png'});
}catch(e){ console.log('non disponibile:',String(e.message).slice(0,400)); } finally { if(browser) await browser.close(); } })();
