// 08/11/2026: pagine vuote senza giallo (scelta dell'utente fra tre anteprime: "1 · Grigio come la barra").
// Con il catalogo vuoto, Home e Collezione dicono "Tocca il tasto al centro della barra in basso" (non più "tasto giallo"),
// l'icona sopra "Nessuna carta" è grigia e il tasto "Aggiungi la prima carta" ha lo stesso aspetto del tasto di scansione
// nella barra (grigio con bordo sottile). In tema chiaro e scuro. Verifica nel browser vero (Chromium).
const {launch}=require(require('./percorsi').SHOT+'/browser.js'), assert=require('assert');
(async()=>{ const browser=await launch();
  let n=0; const errs=[];
  const ok=(c,m)=>{ assert.ok(c,m); n++; };
  try {
  for (const theme of ['dark','light']){
    const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
    page.on('pageerror',e=>errs.push(e.message));
    await page.evaluateOnNewDocument(th=>{
      localStorage.setItem('pkm_catalog','[]');
      localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',appearance:th,bkSheet:false}));
    },theme);
    await page.goto(require('./percorsi').APP_URL); await new Promise(r=>setTimeout(r,800));
    const T=theme+': ';
    const accent=await page.evaluate(()=>{ const p=document.createElement('div'); p.style.color='var(--accent)'; document.body.appendChild(p); const a=getComputedStyle(p).color;
      p.style.color='var(--accent-fill)'; const b=getComputedStyle(p).color; p.remove(); return [a,b]; });
    const h=await page.evaluate(()=>{ const e=document.querySelector('#v-home .empty2'), b=e&&e.querySelector('.btn'), sc=document.querySelector('.dock .bar .scan button');
      const cs=x=>getComputedStyle(x), muted=(()=>{ const p=document.createElement('div'); p.style.color='var(--muted)'; document.body.appendChild(p); const c=getComputedStyle(p).color; p.remove(); return c; })();
      return {txt:e&&e.querySelector('p').textContent, icon:e&&cs(e.querySelector('svg')).stroke, muted,
        btn:b&&{bg:cs(b).backgroundColor, col:cs(b).color, bc:cs(b).borderTopColor, bw:cs(b).borderTopWidth, sh:cs(b).boxShadow, label:b.textContent},
        scan:{bg:cs(sc).backgroundColor, col:cs(sc).color, bc:cs(sc).borderTopColor}}; });
    ok(h.txt&&h.txt.includes('Tocca il tasto al centro della barra in basso'),T+'Home: testo con "tasto al centro della barra"');
    ok(!/giall/i.test(h.txt),T+'Home: il testo non parla più di tasto giallo');
    ok(h.icon===h.muted,T+'Home: icona grigia ('+h.icon+')');
    ok(!accent.includes(h.icon),T+'Home: icona non gialla');
    ok(h.btn&&h.btn.label==='Aggiungi la prima carta',T+'Home: tasto "Aggiungi la prima carta" ancora presente');
    ok(!accent.includes(h.btn.bg),T+'Home: tasto non giallo ('+h.btn.bg+')');
    ok(h.btn.bg===h.scan.bg&&h.btn.col===h.scan.col&&h.btn.bc===h.scan.bc,T+'Home: tasto come quello di scansione nella barra ('+h.btn.bg+' / '+h.scan.bg+')');
    ok(h.btn.bw==='1px'&&h.btn.sh==='none',T+'Home: bordo sottile, senza alone');
    // il tasto apre ancora il pannello Aggiungi carte
    await page.evaluate(()=>document.querySelector('#v-home .empty2 .btn').click()); await new Promise(r=>setTimeout(r,400));
    ok(await page.evaluate(()=>{ const s=document.getElementById('add-sheet'); return !!s&&!s.hidden&&s.getBoundingClientRect().height>0; }),T+'Home: il tasto apre Aggiungi carte');
    await page.evaluate(()=>{ const x=document.querySelector('#add-sheet [data-ad="close"],#add-sheet .close,#add-sheet [aria-label="Chiudi"]'); if(x) x.click(); else document.getElementById('add-sheet').hidden=true; }); await new Promise(r=>setTimeout(r,400));
    await page.evaluate(()=>document.querySelector('nav button[data-go="cat"]').click()); await new Promise(r=>setTimeout(r,400));
    const c=await page.evaluate(()=>{ const e=document.querySelector('#list .empty2'), l=document.getElementById('list'); return {txt:e&&e.querySelector('p').textContent, icon:e&&getComputedStyle(e.querySelector('svg')).stroke, w:e&&e.getBoundingClientRect().width, lw:l.getBoundingClientRect().width}; });
    ok(c.w>=c.lw-1,T+'Collezione: messaggio largo quanto la pagina, non stretto in una colonna della griglia ('+Math.round(c.w)+' / '+Math.round(c.lw)+')');
    ok(c.txt&&c.txt.includes('Tocca il tasto al centro della barra in basso')&&!/giall/i.test(c.txt),T+'Collezione: stesso testo nuovo');
    ok(c.icon===h.muted,T+'Collezione: icona grigia');
    await page.close();
  }
  ok(errs.length===0,'nessun errore nella pagina ('+errs.join(' | ')+')');
  } catch(e){ console.error(e.message); await browser.close(); process.exit(1); }
  await browser.close();
  console.log('pagina_vuota: '+n+' controlli superati, errori: nessuno');
})();
