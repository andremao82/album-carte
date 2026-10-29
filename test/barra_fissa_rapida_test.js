// 28/10/2026: nella Scansione rapida, scorrendo la lista, il tasto Indietro spariva verso l'alto.
// Verifica nel browser vero (Chromium): dopo lo scorrimento la barra resta in cima, visibile e cliccabile.
const {launch}=require(require('./percorsi').SHOT+'/browser.js');
let checks=0; const ok=(c,m)=>{ if(!c){ console.log('FALLITO:',m); process.exit(1);} checks++; };
(async()=>{ const browser=await launch(); const errs=[];
  try {
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
  page.on('pageerror',e=>errs.push(e.message));
  await page.evaluateOnNewDocument(()=>{ localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x'})); });
  await page.goto(require('./percorsi').APP_URL); await new Promise(r=>setTimeout(r,800));
  await page.evaluate(()=>{ const w=document.getElementById('prevwarn'); if(w) w.hidden=true; document.getElementById('fab').click(); document.querySelector('[data-ad="quick"]').click(); });
  await new Promise(r=>setTimeout(r,300));
  ok(await page.evaluate(()=>!document.getElementById('v-quick').hidden),'Scansione rapida aperta');
  // lista lunga, per poter scorrere
  await page.evaluate(()=>{ document.getElementById('q-list').innerHTML=Array.from({length:20},(_,i)=>'<div class="qrow"><div class="body"><div class="nm">Carta '+i+'</div></div></div>').join(''); });
  const top0=await page.evaluate(()=>document.querySelector('#v-quick .cd-top').getBoundingClientRect().top);
  await page.evaluate(()=>window.scrollTo(0,900)); await new Promise(r=>setTimeout(r,200));
  ok(await page.evaluate(()=>window.scrollY)>500,'la pagina è scorsa');
  const r=await page.evaluate(()=>{ const b=document.querySelector('#v-quick [data-q="back"]').getBoundingClientRect(), bar=document.querySelector('#v-quick .cd-top');
    const hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2); return {top:b.top,bottom:b.bottom,hit:!!(hit&&hit.closest('[data-q="back"]')),bg:getComputedStyle(bar).backgroundColor,pos:getComputedStyle(bar).position}; });
  console.log('barra prima:',top0,'tasto dopo lo scorrimento:',JSON.stringify(r));
  ok(r.pos==='sticky','barra fissa');
  ok(r.top>=0&&r.bottom<=80,'tasto Indietro in cima dopo lo scorrimento');
  ok(r.hit,'tasto Indietro cliccabile (non coperto dalla lista)');
  ok(r.bg!=='rgba(0, 0, 0, 0)','barra con sfondo pieno (la lista non si vede sotto)');
  await page.evaluate(()=>document.querySelector('#v-quick [data-q="back"]').click()); await new Promise(r=>setTimeout(r,200));
  ok(await page.evaluate(()=>document.getElementById('v-quick').hidden),'Indietro chiude la pagina');
  } finally { await browser.close(); }
  if(errs.length){ console.log('errori:',errs); process.exit(1); }
  console.log('barra_fissa_rapida_test: '+checks+' controlli superati, errori: nessuno'); process.exit(0);
})();
