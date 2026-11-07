// 07/11/2026: "stile pulito" scelto dall'utente per Home, Collezione e scheda carta: stesse sezioni e funzioni,
// niente riquadri, scelte a parole (non pillole gialle), nome della carta in alto, grafico a curva morbida
// (linea del colore del testo, solo livelli e date estremi, pallino sull'ultimo punto; tutto schermo con tutti i livelli).
// Verifica nel browser vero (Chromium), tema scuro e chiaro.
const {launch}=require(require('./percorsi').SHOT+'/browser.js'), assert=require('assert');
(async()=>{ const browser=await launch();
  let n=0; const errs=[];
  const ok=(c,m)=>{ assert.ok(c,m); n++; };
  const clear=c=>c==='rgba(0, 0, 0, 0)'||c==='transparent';
  try {
  for (const theme of ['dark','light']){
    const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
    page.on('pageerror',e=>errs.push(e.message));
    await page.evaluateOnNewDocument(th=>{
      const DAY=864e5, D=Math.floor(Date.now()/DAY);
      const mk=(k,name,price,o={})=>({key:`c${k}|IT|Normale|NM`,cardId:'c'+k,name,setName:'Base',number:String(k),total:'102',img:'',lang:'IT',variant:'Normale',cond:'NM',qty:1,price,priceManual:null,added:Date.now()-k*DAY,imgFrom:'IT',...o});
      const cat=[mk(1,'Charizard',25,{rarity:'Rara holo',qty:2}),mk(2,'Pikachu',3),mk(3,'Eevee',1)];
      localStorage.setItem('pkm_catalog',JSON.stringify(cat));
      localStorage.setItem('pkm_hist',JSON.stringify({v:1,s:{'c1|n':[[D-60,1800],[D-30,2100],[D-10,2300],[D,2500]]}}));
      localStorage.setItem('pkm_vhist',JSON.stringify({v:1,s:[[D-20,2400,3],[D-10,2700,3],[D,2900,3]]}));
      localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',appearance:th,bkSheet:false}));
      localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()-5*DAY));
    },theme);
    await page.goto(require('./percorsi').APP_URL); await new Promise(r=>setTimeout(r,800));
    const T=theme+': ';
    // ---- Home
    const h=await page.evaluate(()=>{ const q=s=>document.querySelector(s), cs=s=>getComputedStyle(q(s));
      const svg=q('#v-home svg.vch'), vis=[...svg.querySelectorAll('circle')].filter(c=>getComputedStyle(c).display!=='none');
      const txt=[...svg.querySelectorAll(':scope > text')].filter(t=>getComputedStyle(t).display!=='none').length;
      const pr=q('#v-home .vcard [data-r][aria-pressed="true"]'), np=q('#v-home .vcard [data-r][aria-pressed="false"]');
      return {chipLine:!!q('#v-home .bkline .bkchip'), chipInBtns:!!q('#v-home .hbtns .bkchip'), chipBg:cs('#v-home .bkchip').backgroundColor,
        cardBg:cs('#v-home .vcard').backgroundColor, sideBorder:cs('#v-home .vside').borderTopWidth,
        prBg:getComputedStyle(pr).backgroundColor, prW:getComputedStyle(pr).fontWeight, npW:getComputedStyle(np).fontWeight,
        dots:vis.length, lastIsLst:vis.length===1&&vis[0].classList.contains('lst'), labels:txt, allLabels:svg.querySelectorAll(':scope > text').length,
        grid:[...svg.querySelectorAll('line.gr')].every(l=>getComputedStyle(l).display==='none'),
        stroke:getComputedStyle(svg.querySelector('.ln')).stroke, ink:getComputedStyle(document.body).color,
        moverBg:q('#v-home .movers .mv')?getComputedStyle(q('#v-home .movers .mv')).backgroundColor:null};
    });
    ok(h.chipLine&&!h.chipInBtns,T+'chip del backup in una riga sotto il titolo, non fra i pulsanti');
    ok((()=>{ const c=h.chipBg; return clear(c); })(),T+'chip del backup senza sfondo ('+h.chipBg+')');
    ok(clear(h.cardBg),T+'valore della collezione senza riquadro ('+h.cardBg+')');
    ok(h.sideBorder==='0px',T+'carte / diverse / set senza linee');
    ok(clear(h.prBg),T+'periodo scelto senza pillola gialla ('+h.prBg+')');
    ok(+h.prW>+h.npW,T+'periodo scelto in grassetto ('+h.prW+' contro '+h.npW+')');
    ok(h.dots===1&&h.lastIsLst,T+'grafico: un solo pallino visibile, sull\'ultimo punto ('+h.dots+')');
    ok(h.labels===4&&h.allLabels>4,T+'grafico: visibili solo i 2 livelli e le 2 date estremi ('+h.labels+' su '+h.allLabels+')');
    ok(h.grid,T+'grafico: niente linee della griglia');
    ok(h.stroke===h.ink,T+'grafico: linea del colore del testo ('+h.stroke+' / '+h.ink+')');
    ok(h.moverBg===null||clear(h.moverBg),T+'Si sono mossi senza riquadri');
    // ---- Collezione
    await page.evaluate(()=>{ document.querySelector('nav button[data-go="cat"]').click(); }); await new Promise(r=>setTimeout(r,300));
    const c=await page.evaluate(()=>{ const q=s=>document.querySelector(s);
      const ks=[...document.querySelectorAll('#tag .k')].map(k=>getComputedStyle(k).display), all=q('#c-chips [data-qf="all"]');
      return {k0:ks[0], k1:ks[1], tagBg:getComputedStyle(q('#tag')).backgroundColor, order:[...document.querySelectorAll('#tag>div')].slice(1).every(x=>x.querySelector('.v').getBoundingClientRect().left<x.querySelector('.k').getBoundingClientRect().left), row:(t=>Math.max(...t)-Math.min(...t)<=6?1:2)([...document.querySelectorAll('#tag .v')].map(v=>v.getBoundingClientRect().top)),
        allBg:getComputedStyle(all).backgroundColor, allPressed:all.getAttribute('aria-pressed'), sBg:getComputedStyle(q('#v-cat .sfield')).backgroundColor,
        sB:getComputedStyle(q('#v-cat .sfield')).borderBottomWidth, gridBg:getComputedStyle(q('#v-grid')).backgroundColor};
    });
    ok(c.k0==='none'&&c.k1!=='none',T+'riepilogo: "Valore stimato" nascosto, le altre etichette restano');
    ok(clear(c.tagBg),T+'riepilogo senza riquadro');
    ok(c.order&&c.row===1,T+'riepilogo su una riga, numero prima dell\'etichetta ("4 carte")');
    ok(c.allPressed==='true'&&clear(c.allBg),T+'filtro "Tutte" scelto senza pillola gialla');
    ok(clear(c.sBg)&&c.sB!=='0px',T+'ricerca senza riquadro, con linea sotto');
    ok(clear(c.gridBg),T+'tasto griglia senza riempimento giallo');
    // ---- Scheda carta
    await page.evaluate(()=>{ [...document.querySelectorAll('#list .item')].find(r=>/Charizard/.test(r.getAttribute('aria-label'))).click(); }); await new Promise(r=>setTimeout(r,400));
    const d=await page.evaluate(()=>{ const q=s=>document.querySelector(s), b=e=>e.getBoundingClientRect();
      const ttl=q('#cd-mv .cd-ttl'), st=q('#cd-mv .cd-stage'), cp=q('#v-card .cp [aria-pressed="true"]');
      const svg=q('#v-card .hist svg.vch');
      return {ttl:!!ttl, name:ttl&&ttl.querySelector('.cd-name').textContent, set:ttl&&ttl.querySelector('.cd-set').textContent+' | '+ttl.querySelector('.cd-rar').textContent, same:ttl&&Math.abs(b(ttl.querySelector('.cd-set')).top-b(ttl.querySelector('.cd-rar')).top)<=2,
        above:ttl&&st&&b(ttl).bottom<=b(st).top+1, oldName:document.querySelectorAll('#v-card .cd-name').length,
        cpBg:getComputedStyle(cp).backgroundColor, cpSh:getComputedStyle(cp).boxShadow, lbl:q('#v-card .lbl2 b').innerText,
        mine:getComputedStyle(q('#v-card .mine')).backgroundColor, det:getComputedStyle(q('#v-card .det')).backgroundColor,
        hist:getComputedStyle(q('#v-card .hist')).backgroundColor,
        dots:svg?[...svg.querySelectorAll('circle')].filter(c=>getComputedStyle(c).display!=='none').length:-1};
    });
    ok(d.ttl&&d.name==='Charizard',T+'nome della carta in alto');
    ok(d.above,T+'nome sopra l\'immagine');
    ok(d.oldName===1,T+'il nome compare una volta sola');
    ok(d.set==='Base · 1/102 | Rara holo'&&d.same,T+'set, numero e rarità sulla stessa riga: '+d.set);
    ok(clear(d.cpBg)&&d.cpSh!=='none',T+'condizione scelta sottolineata, senza pillola ('+d.cpBg+' / '+d.cpSh+')');
    ok(/^[A-Z][a-z]/.test(d.lbl),T+'etichette con la sola iniziale maiuscola ('+d.lbl+')');
    ok(clear(d.mine)&&clear(d.det)&&clear(d.hist),T+'quantità, storico e dati senza riquadri');
    ok(d.dots===1,T+'storico prezzo: un solo pallino visibile ('+d.dots+')');
    // ---- grafico a tutto schermo: tutti i livelli
    await page.evaluate(()=>document.querySelector('#v-card [data-a="chfull"]').click()); await new Promise(r=>setTimeout(r,300));
    const f=await page.evaluate(()=>{ const svg=document.querySelector('#chfull svg.vch'); return {gr:[...svg.querySelectorAll('line.gr')].filter(l=>getComputedStyle(l).display!=='none').length, t:[...svg.querySelectorAll(':scope > text')].filter(t=>getComputedStyle(t).display!=='none').length, all:svg.querySelectorAll(':scope > text').length}; });
    ok(f.gr>=3&&f.t===f.all,T+'tutto schermo: livelli e date tutti visibili ('+f.gr+' linee, '+f.t+'/'+f.all+' scritte)');
    await page.close();
  }
  } finally { await browser.close(); }
  assert.deepStrictEqual(errs,[],'errori della pagina');
  console.log('stile_pulito_test: '+n+' controlli superati, errori: nessuno');
})().catch(e=>{ console.error(e); process.exit(1); });
