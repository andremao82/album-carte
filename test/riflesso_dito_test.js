// 29/10/2026: sulle carte Holo (e Reverse holo) il riflesso arcobaleno restava sempre sopra l'anteprima, come un alone.
// Ora compare solo mentre si trascina il dito sulla carta. Verifica nel browser vero (Chromium): opacità di ::after.
const {launch}=require(require('./percorsi').SHOT+'/browser.js'), assert=require('assert');
(async()=>{ const browser=await launch();
  let n=0; const errs=[];
  try {
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
  page.on('pageerror',e=>errs.push(e.message));
  await page.evaluateOnNewDocument(()=>{
    const IMG='../screenshot/card.jpg';
    const mk=(k,name,variant)=>({key:`c${k}|IT|${variant}|NM`,cardId:'c'+k,name,setName:'Base',number:String(k),total:'102',img:IMG,lang:'IT',variant,cond:'NM',qty:1,price:1,priceManual:null,added:Date.now()-k*1000,imgFrom:'IT'});
    localStorage.setItem('pkm_catalog',JSON.stringify([mk(1,'Koraidon','Holo'),mk(2,'Pikachu','Reverse holo'),mk(3,'Mew','Normale')]));
    localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x'})); localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
  });
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
  await page.goto(require('./percorsi').APP_URL); await new Promise(r=>setTimeout(r,1000));
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const op=sel=>page.evaluate(s=>{ const el=document.querySelector(s); return el ? +getComputedStyle(el,'::after').opacity : null; },sel);

  // miniature della collezione: nessun velo
  await page.evaluate(()=>document.querySelector('nav button[data-go="cat"]').click()); await wait(500);
  const th=await page.evaluate(()=>[...document.querySelectorAll('#list .art.holo, #list .art.rev')].map(a=>+getComputedStyle(a,'::after').opacity));
  assert.ok(th.length>=2,'miniature Holo/Reverse non trovate: '+th.length); n++;
  th.forEach(o=>{ assert.strictEqual(o,0,'velo sulla miniatura'); n++; });

  for (const [key,cls,atteso] of [['c1|IT|Holo|NM','holo',0.8],['c2|IT|Reverse holo|NM','rev',1]]){
    await page.evaluate(k=>document.querySelector('#list [data-open="'+k+'"]').click(),key); await wait(500);
    assert.ok(await page.evaluate(c=>document.querySelector('#cd-tilt').classList.contains(c),cls),'classe '+cls+' assente'); n++;
    assert.strictEqual(await op('#cd-tilt'),0,cls+': velo visibile a carta ferma'); n++;
    const r=await page.evaluate(()=>{ const b=document.querySelector('#cd-tilt').getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}; });
    const dito=(t,dx,dy)=>page.evaluate((t,x,y)=>document.querySelector('#cd-tilt').dispatchEvent(new PointerEvent(t,{bubbles:true,pointerId:7,pointerType:'touch',clientX:x,clientY:y})),t,r.x+dx,r.y+dy);
    await dito('pointerdown',0,0); await dito('pointermove',30,20); await wait(400);
    assert.ok(Math.abs(await op('#cd-tilt')-atteso)<0.01,cls+': riflesso assente durante il trascinamento'); n++;
    await dito('pointerup',30,20); await wait(400);
    assert.strictEqual(await op('#cd-tilt'),0,cls+': velo rimasto dopo aver staccato il dito'); n++;
    await page.evaluate(()=>history.back()); await wait(400);
  }
  // carta normale: mai riflesso
  await page.evaluate(()=>document.querySelector('#list [data-open="c3|IT|Normale|NM"]').click()); await wait(500);
  assert.ok(await page.evaluate(()=>!/\b(holo|rev|shine)\b/.test(document.querySelector('#cd-tilt').className)),'carta normale con riflesso'); n++;
  } finally { await browser.close(); }
  assert.deepStrictEqual(errs,[],'errori della pagina');
  console.log('riflesso_dito_test: '+n+' controlli superati, errori: nessuno');
})().catch(e=>{ console.error(e); process.exit(1); });
