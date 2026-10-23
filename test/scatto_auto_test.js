// 23/10/2026: Scansione rapida con scatto automatico. Chromium vero, fotocamera finta (canvas.captureStream) che mostra
// una scena disegnata: muro vuoto, poi una carta ferma (riquadro, anello di attesa, scatto da solo), carta che resta
// (nessun secondo scatto), carta tolta e un'altra (secondo scatto), carta che si muove (niente scatto), tasto Auto spento.
// Dal 23/10 sera: anello che avanza in modo continuo (campionato a ogni fotogramma), riquadro che scivola senza salti,
// spunta per 1 secondo dopo lo scatto e poi "Inquadra la prossima carta".
// Verifiche vere: il test si ferma al primo errore.
const {launch}=require(require('./percorsi').SHOT+'/browser.js');
const P=require('./percorsi');
let checks=0;
function ok(c,m){ checks++; if(!c) throw new Error('NON SUPERATO: '+m); console.log('  ok  '+m); }
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  let browser;
  try {
    browser=await launch();
    const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
    const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.evaluateOnNewDocument(()=>{
      localStorage.setItem('pkm_cfg',JSON.stringify({provider:'claude',key:'',confirmEdges:false}));
      localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
      // fotocamera finta: una tela 720×1280 ridisegnata 10 volte al secondo; window.__scena decide cosa c'è davanti
      const W=720,H=1280, cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d');
      let s=3; const r=()=>(s=(s*16807)%2147483647)/2147483647;
      const wall=document.createElement('canvas'); wall.width=W; wall.height=H; { const wg=wall.getContext('2d'), id=wg.createImageData(W,H);
        for(let i=0;i<W*H;i++){ const x=i%W,y=(i/W)|0,n=(r()-0.5)*26+8*Math.sin(x/15+y/20)*Math.sin(y/11); id.data[i*4]=214+n; id.data[i*4+1]=212+n; id.data[i*4+2]=206+n; id.data[i*4+3]=255; } wg.putImageData(id,0,0); }
      const card=c=>{ const a=document.createElement('canvas'); a.width=430; a.height=600; const ag=a.getContext('2d'); ag.fillStyle=c; ag.fillRect(0,0,430,600); ag.fillStyle='#7ab0d8'; ag.fillRect(20,20,390,560); ag.fillStyle='#f4e9c8'; ag.fillRect(32,64,366,244);
        for(let i=0;i<50;i++){ ag.fillStyle='hsl('+Math.floor(r()*360)+',70%,45%)'; ag.fillRect(36+r()*330,68+r()*220,10+r()*50,10+r()*50); } ag.fillStyle='#222'; for(let i=0;i<8;i++) ag.fillRect(36,336+i*26,100+r()*250,8); return a; };
      const cards={a:card('#e8cc3a'),b:card('#e85a3a')};
      window.__scena={card:null,dx:0,jitter:0};
      setInterval(()=>{ const sc=window.__scena; g.drawImage(wall,0,0);
        if(sc.card){ const j=sc.jitter?(Math.random()-0.5)*sc.jitter:0; g.save(); g.translate(W/2+sc.dx+j,H/2+j); g.rotate(-0.03); g.beginPath(); g.roundRect(-215,-300,430,600,20); g.clip(); g.drawImage(cards[sc.card],-215,-300); g.restore(); } },100);
      navigator.mediaDevices.getUserMedia=async()=>cv.captureStream(10);
    });
    await page.goto(P.APP_URL); await wait(800);
    await page.evaluate(()=>{ document.getElementById('fab').click(); document.querySelector('[data-ad="quick"]').click(); });
    const rows=()=>page.evaluate(()=>document.querySelectorAll('#q-list .qrow').length);
    const st=()=>page.evaluate(()=>({hint:document.getElementById('q-hint').hidden?'':document.getElementById('q-hint').textContent,live:(()=>{ const e=document.getElementById('q-live'), r=e.getBoundingClientRect(); return !e.hasAttribute('hidden')&&getComputedStyle(e).display!=='none'&&r.width>50; })(),hold:!document.getElementById('q-hold').hidden,
      off:+getComputedStyle(document.querySelector('#q-hold .fg')).strokeDashoffset.replace('px',''),done:document.getElementById('q-hold').classList.contains('done'),okOp:+getComputedStyle(document.querySelector('#q-hold .ok')).opacity,auto:document.getElementById('q-auto').getAttribute('aria-pressed')}));
    let ready=false; for(let i=0;i<40&&!ready;i++){ await wait(100); ready=await page.evaluate(()=>document.getElementById('q-video').videoWidth>0); }
    ok(ready,'fotocamera (finta) accesa');
    console.log('1 muro vuoto: nessuno scatto');
    await wait(1500); let x=await st();
    ok(x.auto==='true','tasto Auto acceso di serie'); ok(/scatto da solo/.test(x.hint),'avviso: '+x.hint); ok(!x.live&&!x.hold,'nessun riquadro senza carta'); ok(await rows()===0,'nessuna foto in coda');

    console.log('2 carta ferma: riquadro, anello che si riempie, scatto da solo');
    await page.evaluate(()=>{ window.__scena.card='a'; });
    let seen=null; for(let i=0;i<20&&!seen;i++){ await wait(100); const y=await st(); if(y.hold) seen=y; }
    ok(seen&&seen.live,'riquadro giallo sulla carta trovata'); ok(/Tieni fermo/.test(seen.hint),'avviso "Tieni fermo…"');
    await wait(400); const mid=await st(); ok(mid.hold&&mid.off<seen.off,'l\'anello avanza ('+seen.off.toFixed(0)+' → '+mid.off.toFixed(0)+')');
    // anello e riquadro campionati a ogni fotogramma dello schermo (per 600 ms): avanzamento senza gradini, riquadro senza salti
    const samp=await page.evaluate(()=>new Promise(res=>{ const out=[], t0=performance.now(), fg=document.querySelector('#q-hold .fg'), pg=document.querySelector('#q-live polygon');
      const f=()=>{ out.push({t:performance.now()-t0,off:parseFloat(fg.style.strokeDashoffset),pts:pg.getAttribute('points')}); if(performance.now()-t0<600) requestAnimationFrame(f); else res(out); }; requestAnimationFrame(f); }));
    const offs=samp.map(s=>s.off).filter(v=>!isNaN(v)), distinct=new Set(offs.map(v=>v.toFixed(1))).size;
    ok(samp.length>=20,'campioni a ogni fotogramma: '+samp.length);
    ok(distinct>=samp.length*0.6,'l\'anello cambia quasi a ogni fotogramma ('+distinct+' valori diversi su '+samp.length+'), non a scatti ogni ricerca');
    const steps=offs.slice(1).map((v,i)=>offs[i]-v), maxStep=Math.max(...steps);
    ok(steps.every(d=>d>=-0.01)&&maxStep<8,'l\'anello avanza sempre, con passi piccoli (massimo '+maxStep.toFixed(1)+' su 113)');
    const PT=s=>s.pts.split(' ').map(p=>p.split(',').map(Number)), jumps=samp.slice(1).map((s,i)=>Math.max(...PT(s).map((p,j)=>Math.hypot(p[0]-PT(samp[i])[j][0],p[1]-PT(samp[i])[j][1]))));
    ok(Math.max(...jumps)<6,'il riquadro non salta (spostamento massimo fra due fotogrammi '+Math.max(...jumps).toFixed(1)+' px)');
    ok(await rows()===0,'non scatta prima del tempo di attesa');
    let shot=false; for(let i=0;i<25&&!shot;i++){ await wait(100); shot=(await rows())===1; }
    ok(shot,'scattata da sola dopo circa 1,2 s di carta ferma');
    x=await st(); ok(x.hold&&x.done,'subito dopo lo scatto l\'anello diventa la spunta'); ok(/Scattata/.test(x.hint),'avviso: '+x.hint);
    await wait(450); x=await st(); ok(x.hold&&x.done&&x.okOp===1,'spunta ancora visibile dopo mezzo secondo');
    let gone=false; for(let i=0;i<15&&!gone;i++){ await wait(100); x=await st(); gone=!x.hold; }
    ok(gone,'dopo circa 1 secondo la spunta sparisce'); ok(/prossima carta/.test(x.hint),'poi: '+x.hint);

    console.log('3 la stessa carta resta: nessun secondo scatto');
    await wait(2500); ok(await rows()===1,'una sola foto finché la carta non cambia');

    console.log('4 carta tolta e un\'altra: secondo scatto');
    await page.evaluate(()=>{ window.__scena.card=null; }); await wait(1000);
    await page.evaluate(()=>{ window.__scena.card='b'; });
    shot=false; for(let i=0;i<40&&!shot;i++){ await wait(100); shot=(await rows())===2; }
    ok(shot,'seconda carta scattata');

    console.log('5 carta che si muove: niente scatto');
    await page.evaluate(()=>{ window.__scena.card=null; }); await wait(1000);
    await page.evaluate(()=>{ window.__scena.card='a'; window.__scena.jitter=60; });
    await wait(3000); ok(await rows()===2,'con la carta mossa non scatta');
    await page.evaluate(()=>{ window.__scena.jitter=0; });
    shot=false; for(let i=0;i<30&&!shot;i++){ await wait(100); shot=(await rows())===3; }
    ok(shot,'appena ferma, scatta');

    console.log('6 tasto Auto spento: si scatta solo col pulsante giallo');
    await page.evaluate(()=>{ window.__scena.card=null; }); await wait(1000);
    await page.evaluate(()=>document.getElementById('q-auto').click());
    x=await st(); ok(x.auto==='false','Auto spento'); ok(!x.hint,'avviso nascosto');
    ok(JSON.parse(await page.evaluate(()=>localStorage.getItem('pkm_cfg'))).autoShot===false,'scelta ricordata');
    await page.evaluate(()=>{ window.__scena.card='b'; }); await wait(2500);
    ok(await rows()===3,'con Auto spento non scatta da solo'); x=await st(); ok(!x.live,'niente riquadro con Auto spento');
    await page.evaluate(()=>document.getElementById('q-shot').click()); await wait(300);
    ok(await rows()===4,'il pulsante giallo scatta ancora');
    await page.evaluate(()=>document.getElementById('q-auto').click()); await wait(200);
    x=await st(); ok(x.auto==='true','Auto riacceso');
    await wait(2500); ok(await rows()===4,'riacceso con la carta già scattata a mano: non la riscatta');
    console.log('7 carta che scorre a scatti nel video: il riquadro la segue senza saltare');
    await page.evaluate(()=>{ window.__scena.card=null; }); await wait(800);
    await page.evaluate(()=>{ window.__scena.card='a'; window.__scena.dx=-120; window.__slide=setInterval(()=>{ window.__scena.dx=Math.min(120,window.__scena.dx+30); },150); });
    let on=false; for(let i=0;i<30&&!on;i++){ await wait(50); on=(await st()).live; }
    ok(on,'riquadro sulla carta che si muove');
    const sl=await page.evaluate(()=>new Promise(res=>{ const out=[], t0=performance.now(), pg=document.querySelector('#q-live polygon');
      const f=()=>{ const v=pg.getAttribute('points'); if(v) out.push(v.split(' ').map(p=>p.split(',').map(Number))); if(performance.now()-t0<700) requestAnimationFrame(f); else res(out); }; requestAnimationFrame(f); }));
    await page.evaluate(()=>clearInterval(window.__slide));
    const jm=sl.slice(1).map((q,i)=>Math.max(...q.map((p,j)=>Math.hypot(p[0]-sl[i][j][0],p[1]-sl[i][j][1])))), tot=Math.hypot(sl[sl.length-1][0][0]-sl[0][0][0],sl[sl.length-1][0][1]-sl[0][0][1]);
    // la scena salta di 30 px del video (~15 px a schermo) ogni 150 ms: il riquadro deve muoversi a piccoli passi
    ok(tot>25,'il riquadro segue la carta ('+tot.toFixed(0)+' px)');
    ok(Math.max(...jm)<9,'passo massimo fra due fotogrammi '+Math.max(...jm).toFixed(1)+' px (la scena salta di ~15 px)');
    ok(!errs.length,'nessun errore nella pagina '+errs.join(' | '));
    console.log('scatto_auto: '+checks+' controlli superati, errori: nessuno');
    await browser.close(); process.exit(0);
  } catch(e){ console.log(e.message||e); console.log('scatto_auto: '+checks+' controlli superati, errori: 1'); if(browser) await browser.close(); process.exit(1); }
})();
