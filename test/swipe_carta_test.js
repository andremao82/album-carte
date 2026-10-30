// 30/10/2026: nella scheda carta si scorre di lato per passare alla carta dopo (verso sinistra) o prima (verso destra)
// dell'elenco da cui è stata aperta (filtri e ordinamento di quel momento). La scheda segue il dito, ai capi rimbalza,
// non parte dall'immagine (inclinazione) né mentre si scrive nel prezzo o nella nota. Verifica nel browser vero (Chromium).
const {launch}=require(require('./percorsi').SHOT+'/browser.js'), assert=require('assert');
(async()=>{ const browser=await launch();
  let n=0; const errs=[];
  const ok=(c,m)=>{ assert.ok(c,m); n++; }, eq=(a,b,m)=>{ assert.deepStrictEqual(a,b,m); n++; };
  try {
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
  page.on('pageerror',e=>errs.push(e.message));
  await page.evaluateOnNewDocument(()=>{
    const mk=(k,name,lang)=>({key:`c${k}|${lang}|Normale|NM`,cardId:'c'+k,name,setName:'Base',number:String(k),total:'102',img:'',lang,variant:'Normale',cond:'NM',qty:1,price:k,priceManual:null,added:Date.now()-k*1000,imgFrom:''});
    // più recenti prima: Abra(1), Bulbasaur(2), Charmander(3), Ditto(4), Eevee(5)
    localStorage.setItem('pkm_catalog',JSON.stringify([mk(1,'Abra','IT'),mk(2,'Bulbasaur','EN'),mk(3,'Charmander','IT'),mk(4,'Ditto','EN'),mk(5,'Eevee','IT')]));
    localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',albumSort:'recent'})); localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
  });
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
  await page.goto(require('./percorsi').APP_URL); await new Promise(r=>setTimeout(r,1000));
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const name=()=>page.evaluate(()=>{ const v=document.getElementById('v-card'); return v.hidden ? null : (v.querySelector('.cd-name')||{}).textContent; });
  const shift=()=>page.evaluate(()=>{ const m=document.getElementById('cd-mv'); return m ? new DOMMatrix(getComputedStyle(m).transform).m41 : null; });
  const visible=id=>page.evaluate(i=>!document.getElementById(i).hidden,id);
  // trascinamento col dito (eventi pointer sul punto toccato), con i tempi veri fra un passo e l'altro
  async function drag(sel,dx,{dy=0,steps=8,hold=false,from=null}={}){
    const p=from||await page.evaluate(s=>{ const r=document.querySelector(s).getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+Math.min(r.height/2,40)}; },sel);
    const fire=(t,x,y)=>page.evaluate((s,t,x,y)=>{ const el=document.elementFromPoint(x,y)||document.querySelector(s);
      el.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,pointerId:3,pointerType:'touch',isPrimary:true,clientX:x,clientY:y})); },sel,t,x,y);
    await fire('pointerdown',p.x,p.y);
    for(let i=1;i<=steps;i++){ await fire('pointermove',p.x+dx*i/steps,p.y+dy*i/steps); await wait(25); }
    if(hold) return async()=>{ await fire('pointerup',p.x+dx,p.y+dy); };
    await fire('pointerup',p.x+dx,p.y+dy);
    // il tocco finale: il click che il browser manderebbe sul pulsante sotto il dito
    await page.evaluate((x,y)=>{ const el=document.elementFromPoint(x,y); if(el) el.click(); },p.x+dx,p.y+dy);
  }
  const SEL='#v-card .cd-name';

  // Collezione con filtro Italiano: Abra, Charmander, Eevee
  await page.evaluate(()=>document.querySelector('nav button[data-go="cat"]').click()); await wait(400);
  await page.evaluate(()=>{ const s=document.getElementById('cf-lang'); s.value='IT'; s.dispatchEvent(new Event('change',{bubbles:true})); }); await wait(300);
  eq(await page.evaluate(()=>[...document.querySelectorAll('#list [data-open]')].map(b=>b.dataset.open.split('|')[0])),['c1','c3','c5'],'filtro Italiano nella Collezione');
  await page.evaluate(()=>document.querySelector('#list [data-open^="c3|"]').click()); await wait(400);
  eq(await name(),'Charmander','apre la carta toccata');
  ok(await page.evaluate(()=>getComputedStyle(document.getElementById('cd-mv')).touchAction==='pan-y'),'scorrimento verticale lasciato al browser (touch-action pan-y)');
  ok(await page.evaluate(()=>getComputedStyle(document.getElementById('cd-sw')).overflowX==='clip'),'contenuto tagliato ai bordi mentre scorre (niente scorrimento orizzontale della pagina)');
  ok(await page.evaluate(()=>document.querySelector('#v-card > .cd-top')!==null && !document.getElementById('cd-mv').contains(document.querySelector('#v-card .cd-top'))),'la barra con Indietro resta ferma (fuori da ciò che scorre)');

  // la scheda segue il dito
  const rel=await drag(SEL,-80,{hold:true}); await wait(30);
  ok(Math.abs(await shift()+80)<2,'segue il dito: '+await shift());
  await rel(); await wait(450);
  eq(await name(),'Charmander','80 px lenti: torna dov\'era');
  ok(Math.abs(await shift())<1,'tornata in posizione');

  // verso sinistra: carta dopo, saltando Ditto (inglese, filtrata)
  await drag(SEL,-200); await wait(600);
  eq(await name(),'Eevee','verso sinistra: carta dopo nell\'elenco filtrato');
  ok(Math.abs(await shift())<1,'nuova carta al centro');
  eq(await page.evaluate(()=>window.scrollY),0,'nuova carta dall\'alto');
  // ultima carta: rimbalzo, la scheda si sposta poco e torna
  const relE=await drag(SEL,-200,{hold:true}); await wait(30);
  const s0=await shift(); ok(s0<-5&&s0>-95,'all\'ultima carta resistenza (elastico): '+s0);
  await relE(); await wait(600);
  eq(await name(),'Eevee','all\'ultima carta resta');
  ok(Math.abs(await shift())<1,'rimbalza al centro');
  // verso destra: carta prima
  await drag(SEL,200); await wait(600); eq(await name(),'Charmander','verso destra: carta prima');
  await drag(SEL,200); await wait(600); eq(await name(),'Abra','verso destra: prima carta');
  await drag(SEL,200); await wait(600); eq(await name(),'Abra','alla prima carta resta (rimbalzo)');
  // scatto veloce e corto (60 px in 2 passi) basta per cambiare
  await drag(SEL,-60,{steps:2}); await wait(600); eq(await name(),'Charmander','scatto veloce: carta dopo');

  // il trascinamento non preme i pulsanti sotto il dito
  const qty=()=>page.evaluate(()=>+document.querySelector('#v-card .qctl b').textContent);
  await page.evaluate(()=>document.querySelector('#v-card .qctl [data-a="qplus"]').scrollIntoView({block:'center'})); await wait(100);
  const qp=await page.evaluate(()=>{ const r=document.querySelector('#v-card .qctl [data-a="qplus"]').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; });
  await drag(SEL,40,{from:qp}); await wait(500);
  eq(await name(),'Charmander','40 px lenti: nessun cambio'); eq(await qty(),1,'il pulsante + non è stato premuto');

  // movimento verticale: niente cambio (è lo scorrimento della pagina)
  await page.evaluate(()=>window.scrollTo(0,0)); await wait(50);
  await drag(SEL,-60,{dy:-200}); await wait(500); eq(await name(),'Charmander','movimento verticale: nessun cambio');
  ok(Math.abs(await shift())<1,'movimento verticale: la scheda non si sposta');

  // dall'immagine: inclinazione, non cambio carta
  await page.evaluate(()=>window.scrollTo(0,0)); await wait(50);
  await drag('#cd-tilt',-200); await wait(500); eq(await name(),'Charmander','dall\'immagine: nessun cambio');
  // dal bordo sinistro (gesto Indietro di iOS): niente
  await drag(SEL,200,{from:{x:8,y:300}}); await wait(500); eq(await name(),'Charmander','dal bordo sinistro: nessun cambio');

  // mentre si scrive nella nota o nel prezzo: bloccato
  await page.evaluate(()=>document.getElementById('cd-note').focus());
  await drag(SEL,-200); await wait(500); eq(await name(),'Charmander','nota in modifica: bloccato');
  await page.evaluate(()=>{ document.activeElement.blur(); document.getElementById('cd-pm').focus(); });
  await drag(SEL,-200); await wait(500); eq(await name(),'Charmander','prezzo mio in modifica: bloccato');
  await page.evaluate(()=>document.activeElement.blur());
  await drag(SEL,-200); await wait(600); eq(await name(),'Eevee','finita la modifica: si scorre di nuovo');

  // cambio di condizione (la chiave cambia): l'elenco resta valido
  await page.evaluate(()=>document.querySelector('#v-card [data-ed="cond"][data-v="EX"]').click()); await wait(200);
  await drag(SEL,200); await wait(600); eq(await name(),'Charmander','dopo il cambio di condizione: carta prima');
  await drag(SEL,-200); await wait(600); eq(await name(),'Eevee','e di nuovo quella modificata');
  eq(await page.evaluate(()=>document.querySelector('#v-card [data-ed="cond"][aria-pressed="true"]').dataset.v),'EX','condizione cambiata conservata');

  // Indietro: si torna alla Collezione (le carte scorse non si accumulano nella cronologia)
  await page.evaluate(()=>document.querySelector('#v-card [data-a="back"]').click()); await wait(400);
  ok(await visible('v-cat'),'Indietro torna alla Collezione');

  // Home, "Ultime aggiunte": l'elenco è quello della striscia (tutte le lingue)
  await page.evaluate(()=>document.querySelector('nav button[data-go="home"]').click()); await wait(400);
  const strip=await page.evaluate(()=>{ const b=[...document.querySelectorAll('#v-home .st[data-open]')]; const c=b.find(x=>x.dataset.open.startsWith('c2|')); return c ? [...c.parentElement.children].map(x=>x.dataset.open.split('|')[0]) : null; });
  ok(strip&&strip.length>=3,'striscia della Home trovata: '+strip);
  await page.evaluate(()=>{ const b=[...document.querySelectorAll('#v-home .st[data-open]')].find(x=>x.dataset.open.startsWith('c2|')); b.click(); }); await wait(400);
  eq(await name(),'Bulbasaur','Home: apre la carta');
  const after=strip[strip.indexOf('c2')+1], names={c1:'Abra',c2:'Bulbasaur',c3:'Charmander',c4:'Ditto',c5:'Eevee'};
  await drag(SEL,-200); await wait(600); eq(await name(),names[after],'Home: carta dopo nella stessa striscia');
  await page.evaluate(()=>document.querySelector('#v-card [data-a="back"]').click()); await wait(400);
  ok(await visible('v-home'),'Indietro torna alla Home');

  // Riduci movimento: cambio immediato, senza animazione
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.evaluate(()=>document.querySelector('nav button[data-go="cat"]').click()); await wait(300);
  await page.evaluate(()=>document.querySelector('#list [data-open^="c1|"]').click()); await wait(300);
  await drag(SEL,-200); await wait(30); eq(await name(),'Charmander','Riduci movimento: cambio subito');
  } finally { await browser.close(); }
  assert.deepStrictEqual(errs,[],'errori della pagina');
  console.log('swipe_carta_test: '+n+' controlli superati, errori: nessuno');
})().catch(e=>{ console.error(e); process.exit(1); });
