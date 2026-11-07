// 07/11/2026: nella scheda carta il nome sta al centro della barra fissa in alto, fra Indietro e "…" (scelta dell'utente:
// caso A fra tre anteprime). Se non ci sta va su due righe (mai tagliato con "…" su una riga sola); sotto la barra, centrata,
// la riga set · numero · rarità. Le altre pagine con la barra restano con il titolo su una riga. Chromium vero, due temi.
const P=require('./percorsi'), assert=require('assert');
const {launch}=require(P.SHOT+'/browser.js');
const NAMES={corto:'Venusaur', lungo:'Charizard ex di Team Rocket Lancia Fiammante'};
(async()=>{ const browser=await launch(); let n=0; const errs=[]; const ok=(c,m)=>{ assert.ok(c,m); n++; };
  try {
    for (const theme of ['light','dark']) for (const [k,name] of Object.entries(NAMES)){
      const T=theme+'/'+k+': ';
      const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
      page.on('pageerror',e=>errs.push(e.message));
      await page.evaluateOnNewDocument((th,name)=>{
        const e={key:'c1|IT|Normale|NM',cardId:'c1',name,setName:'Expedition Base Set',number:'30',total:'165',img:'',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:6.44,priceManual:null,added:Date.now(),rarity:'Rare Holo'};
        localStorage.setItem('pkm_catalog',JSON.stringify([e])); localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',appearance:th}));
        localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
      },theme,name);
      await page.goto(P.APP_URL,{waitUntil:'load'}); await new Promise(r=>setTimeout(r,800));
      await page.evaluate(()=>document.querySelector('nav button[data-go="cat"]').click()); await new Promise(r=>setTimeout(r,300));
      await page.evaluate(()=>document.querySelector('#list .item').click()); await new Promise(r=>setTimeout(r,500));
      const r=await page.evaluate(()=>{ const b=e=>e.getBoundingClientRect(), q=s=>document.querySelector(s);
        const bar=q('#v-card > .cd-top'), nm=bar&&bar.querySelector('.cd-name'), back=bar&&bar.querySelector('[data-a="back"]'), more=bar&&bar.querySelector('[data-a="menu"]');
        const sub=q('#cd-mv .cd-ttl'), set=sub&&sub.querySelector('.cd-set'), stage=q('#cd-mv .cd-stage');
        if (!nm) return {nm:false, count:document.querySelectorAll('#v-card .cd-name').length};
        const cs=getComputedStyle(nm), lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.2;
        const range=document.createRange(); range.selectNodeContents(sub);
        const sr=range.getBoundingClientRect();
        return {nm:true, count:document.querySelectorAll('#v-card .cd-name').length, text:nm.textContent,
          lines:Math.round(b(nm).height/lh), cut:nm.scrollHeight>nm.clientHeight+1, ell:cs.textOverflow==='ellipsis'&&cs.whiteSpace==='nowrap',
          nmL:b(nm).left, nmR:b(nm).right, backR:b(back).right, moreL:b(more).left, nmC:(b(nm).left+b(nm).right)/2, barC:(b(bar).left+b(bar).right)/2,
          backMid:(b(back).top+b(back).bottom)/2, nmMid:(b(nm).top+b(nm).bottom)/2, barBottom:b(bar).bottom,
          subC:(sr.left+sr.right)/2, subTop:sr.top, subLines:Math.round(sr.height/parseFloat(getComputedStyle(set).lineHeight||16)), stageTop:stage&&b(stage).top,
          subHasName:!!sub.querySelector('.cd-name'), subText:sub.textContent};
      });
      ok(r.nm,T+'il nome non è nella barra in alto ('+JSON.stringify(r)+')');
      ok(r.count===1,T+'il nome compare una volta sola: '+r.count);
      ok(r.text===name,T+'nome nella barra: '+r.text);
      ok(r.nmL>=r.backR-1&&r.nmR<=r.moreL+1,T+'nome fra Indietro e "…"');
      ok(Math.abs(r.nmC-r.barC)<=2,T+'nome centrato nella barra ('+r.nmC+' / '+r.barC+')');
      ok(Math.abs(r.nmMid-r.backMid)<=3,T+'pulsanti centrati in verticale rispetto al nome');
      ok(!r.cut&&!r.ell,T+'nome tagliato');
      ok(k==='corto'?r.lines===1:r.lines===2,T+'righe del nome: '+r.lines);
      ok(!r.subHasName&&/Expedition Base Set · 30\/165/.test(r.subText)&&/Olografica Rara/.test(r.subText),T+'sottotitolo set · numero · rarità: '+r.subText);
      ok(Math.abs(r.subC-r.barC)<=3,T+'sottotitolo centrato ('+r.subC+')');
      ok(r.subTop>=r.barBottom-1&&r.subTop<=r.barBottom+16,T+'sottotitolo subito sotto la barra');
      ok(r.stageTop>=r.subTop,T+'sottotitolo sopra la carta');
      // swipe/altra carta: il titolo segue la carta mostrata (ri-disegno della scheda)
      await page.close();
    }
    // le altre pagine con la barra non cambiano: titolo su una riga
    const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
    await page.evaluateOnNewDocument(()=>{ localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x'})); localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now())); });
    await page.goto(P.APP_URL,{waitUntil:'load'}); await new Promise(r=>setTimeout(r,600));
    const ws=await page.evaluate(()=>[...document.querySelectorAll('.cd-top .ttl')].filter(t=>!t.classList.contains('cd-name')).map(t=>getComputedStyle(t).whiteSpace));
    ok(ws.length>0&&ws.every(w=>w==='nowrap'),'altre barre con titolo su una riga: '+ws.join(','));
    await page.close();
  } finally { await browser.close(); }
  assert.deepStrictEqual(errs,[],'errori della pagina');
  console.log('titolo_carta_test: '+n+' controlli superati, errori: nessuno');
})().catch(e=>{ console.error(e); process.exit(1); });
