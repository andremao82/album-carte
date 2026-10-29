// 29/10/2026: scheda carta.
// 1) Sotto l'anteprima restava una striscia grigia: il riquadro era sempre 63:88 e le immagini web (600×825) sono un po'
//    più larghe. Ora il riquadro prende le proporzioni dell'immagine; senza immagine resta 63:88.
// 2) Menu Foto: "Scatta con la fotocamera" apre la fotocamera dell'app con i bordi riconosciuti dal vivo e lo scatto
//    automatico (come la Scansione rapida, ma senza coda); dopo lo scatto si torna alla scheda con l'editor dei bordi.
//    "Scegli dalla galleria" resta il selettore di iOS.
// Chromium vero, fotocamera finta (canvas.captureStream) come scatto_auto_test.js.
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
      // immagine "web" 600×825 (come TCGdex), con il fondo nero per vedere se resta una striscia
      const im=document.createElement('canvas'); im.width=600; im.height=825; const ig=im.getContext('2d'); ig.fillStyle='#d9a03a'; ig.fillRect(0,0,600,825);
      const IMG=im.toDataURL('image/png');
      const mk=(k,name,img)=>({key:`c${k}|IT|Normale|NM`,cardId:'c'+k,name,setName:'Base',number:String(k),total:'102',img,lang:'IT',variant:'Normale',cond:'NM',qty:1,price:1,priceManual:null,added:Date.now()-k*1000,imgFrom:'IT'});
      localStorage.setItem('pkm_catalog',JSON.stringify([mk(1,'Toedscool',IMG),mk(2,'Senza immagine','')]));
      localStorage.setItem('pkm_cfg',JSON.stringify({provider:'claude',key:'',confirmEdges:false}));
      localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
      // fotocamera finta 720×1280: muro con una carta ferma quando window.__carta è vero
      const W=720,H=1280, cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d');
      let s=3; const r=()=>(s=(s*16807)%2147483647)/2147483647;
      const wall=document.createElement('canvas'); wall.width=W; wall.height=H; { const wg=wall.getContext('2d'), id=wg.createImageData(W,H);
        for(let i=0;i<W*H;i++){ const x=i%W,y=(i/W)|0,n=(r()-0.5)*26+8*Math.sin(x/15+y/20)*Math.sin(y/11); id.data[i*4]=214+n; id.data[i*4+1]=212+n; id.data[i*4+2]=206+n; id.data[i*4+3]=255; } wg.putImageData(id,0,0); }
      const a=document.createElement('canvas'); a.width=430; a.height=600; { const ag=a.getContext('2d'); ag.fillStyle='#e8cc3a'; ag.fillRect(0,0,430,600); ag.fillStyle='#7ab0d8'; ag.fillRect(20,20,390,560); ag.fillStyle='#f4e9c8'; ag.fillRect(32,64,366,244);
        for(let i=0;i<50;i++){ ag.fillStyle='hsl('+Math.floor(r()*360)+',70%,45%)'; ag.fillRect(36+r()*330,68+r()*220,10+r()*50,10+r()*50); } ag.fillStyle='#222'; for(let i=0;i<8;i++) ag.fillRect(36,336+i*26,100+r()*250,8); }
      window.__carta=false; window.__gum=0;
      setInterval(()=>{ g.drawImage(wall,0,0); if(window.__carta){ g.save(); g.translate(W/2,H/2); g.rotate(-0.03); g.beginPath(); g.roundRect(-215,-300,430,600,20); g.clip(); g.drawImage(a,-215,-300); g.restore(); } },100);
      navigator.mediaDevices.getUserMedia=async()=>{ window.__gum++; return cv.captureStream(10); };
    });
    await page.goto(P.APP_URL); await wait(900);
    await page.evaluate(()=>document.querySelector('nav button[data-go="cat"]').click()); await wait(400);
    const open=k=>page.evaluate(k=>document.querySelector('#list [data-open="'+k+'"]').click(),k);
    const vis=id=>page.evaluate(id=>{ const e=document.getElementById(id); return !!e&&!e.hidden&&getComputedStyle(e).display!=='none'; },id);
    const entry=k=>page.evaluate(k=>JSON.parse(localStorage.getItem('pkm_catalog')).find(e=>e.key===k),k);

    console.log('1 anteprima senza striscia grigia');
    await open('c1|IT|Normale|NM'); await wait(500);
    const b=await page.evaluate(()=>{ const t=document.getElementById('cd-tilt').getBoundingClientRect(), i=document.getElementById('cd-img');
      return {w:t.width,h:t.height,nw:i.naturalWidth,nh:i.naturalHeight,ar:document.getElementById('cd-tilt').style.aspectRatio}; });
    ok(b.nw===600&&b.nh===825,'immagine web 600×825 caricata');
    ok(/600\s*\/\s*825/.test(b.ar),'il riquadro prende le proporzioni dell’immagine ('+b.ar+')');
    // l'immagine (contain) occupa tutto il riquadro: nessuna striscia sopra o sotto
    const imgH=b.w*b.nh/b.nw; ok(Math.abs(imgH-b.h)<0.6,'altezza riquadro '+b.h.toFixed(1)+' = altezza immagine '+imgH.toFixed(1)+' (prima '+(b.w*88/63).toFixed(1)+')');
    await page.evaluate(()=>history.back()); await wait(400);
    await open('c2|IT|Normale|NM'); await wait(400);
    const p=await page.evaluate(()=>{ const t=document.getElementById('cd-tilt').getBoundingClientRect(); return t.height/t.width; });
    ok(Math.abs(p-88/63)<0.01,'senza immagine il segnaposto resta 63:88');

    console.log('2 menu Foto: fotocamera o galleria');
    await page.evaluate(()=>document.querySelector('#v-card [data-a="photo"]').click()); await wait(100);
    let menu=await page.evaluate(()=>[...document.querySelectorAll('#act-sheet .actbtn')].map(b=>b.textContent).join('|'));
    ok(menu==='Scatta con la fotocamera|Scegli dalla galleria|Annulla','menu senza foto: '+menu);
    // galleria: apre il selettore di iOS (input senza capture)
    const picked=await page.evaluate(()=>{ const f=document.getElementById('ph-file'); let n=0; const o=f.click; f.click=()=>n++; document.querySelectorAll('#act-sheet .actbtn')[1].click(); f.click=o; return {n,cap:f.hasAttribute('capture')}; });
    ok(picked.n===1&&!picked.cap,'"Scegli dalla galleria" apre il selettore (senza capture)');

    console.log('3 "Scatta con la fotocamera": fotocamera dell’app in modalità foto');
    await page.evaluate(()=>document.querySelector('#v-card [data-a="photo"]').click()); await wait(100);
    await page.evaluate(()=>document.querySelectorAll('#act-sheet .actbtn')[0].click());
    let ready=false; for(let i=0;i<40&&!ready;i++){ await wait(100); ready=await page.evaluate(()=>document.getElementById('q-video').videoWidth>0); }
    ok(ready,'fotocamera (finta) accesa');
    ok(await vis('v-quick')&&!(await vis('v-card')),'vista fotocamera aperta');
    const ui=await page.evaluate(()=>({t:document.getElementById('q-title').textContent,cls:document.body.classList.contains('qphoto'),
      list:getComputedStyle(document.getElementById('q-list')).display,stats:getComputedStyle(document.getElementById('q-stats')).display,
      gal:getComputedStyle(document.querySelector('#v-quick [data-q="gallery"]')).visibility,cam:getComputedStyle(document.querySelector('#v-quick [data-q="cam"]')).visibility,
      shot:getComputedStyle(document.getElementById('q-shot')).visibility,auto:document.getElementById('q-auto').getAttribute('aria-pressed')}));
    ok(ui.t==='Foto della carta','titolo "Foto della carta"'); ok(ui.cls,'classe qphoto sul body');
    ok(ui.list==='none'&&ui.stats==='none','niente coda né conteggi');
    ok(ui.gal==='hidden'&&ui.cam==='hidden'&&ui.shot==='visible','solo il pulsante di scatto (Galleria e Fotocamera nascosti)');
    ok(ui.auto==='true','scatto automatico acceso');
    await wait(1200); ok(await vis('v-quick')&&!(await vis('qedge')),'muro vuoto: nessuno scatto');

    console.log('4 carta ferma: riquadro dal vivo, scatto da solo, editor dei bordi sulla scheda');
    await page.evaluate(()=>{ window.__carta=true; });
    let live=false; for(let i=0;i<20&&!live;i++){ await wait(100); live=await page.evaluate(()=>!document.getElementById('q-live').hasAttribute('hidden')); }
    ok(live,'riquadro giallo sulla carta mentre si inquadra');
    let ed=false; for(let i=0;i<40&&!ed;i++){ await wait(100); ed=await vis('qedge'); }
    ok(ed,'scattata da sola: si apre l’editor dei bordi');
    await wait(400);
    ok(await vis('v-card')&&!(await vis('v-quick')),'sotto l’editor c’è di nuovo la scheda della carta');
    ok(await page.evaluate(()=>!document.body.classList.contains('qphoto')&&document.getElementById('q-video').srcObject===null),'fotocamera spenta e modalità foto chiusa');
    const ed1=await page.evaluate(()=>({d:document.getElementById('qe-discard').textContent,later:document.getElementById('qe-later').hidden}));
    ok(ed1.d==='Annulla'&&ed1.later,'editor con "Annulla", senza "Più tardi"');
    await page.evaluate(()=>document.querySelector('#qedge [data-qe="ok"]').click());
    let saved=null; for(let i=0;i<30&&!saved;i++){ await wait(100); const e=await entry('c2|IT|Normale|NM'); if(e.photo) saved=e; }
    ok(saved&&saved.photoPref==='own','Conferma: foto salvata sulla carta');
    // bordi salvati (0-1 sul fotogramma 720×1280): la carta finta occupa 430×600 al centro
    const q=saved.photoQuad, cx=(q[0]+q[2]+q[4]+q[6])/4, cy=(q[1]+q[3]+q[5]+q[7])/4, qw=Math.hypot(q[2]-q[0],q[3]-q[1]);
    ok(Math.abs(cx-0.5)<0.03&&Math.abs(cy-0.5)<0.03&&Math.abs(qw-430/720)<0.05,'bordi trovati sulla carta (centro '+cx.toFixed(2)+','+cy.toFixed(2)+', larghezza '+qw.toFixed(2)+')');
    ok(await page.evaluate(()=>/^data:image\/jpeg/.test(document.getElementById('cd-img').getAttribute('src'))),'la scheda mostra la foto');
    ok(await page.evaluate(()=>/Foto/.test(document.querySelector('#v-card .cd-ph').textContent)),'tasto "Foto"');

    console.log('5 Riscatta e Annulla: la foto resta quella di prima');
    await page.evaluate(()=>{ window.__carta=false; document.querySelector('#v-card [data-a="photo"]').click(); }); await wait(100);
    menu=await page.evaluate(()=>[...document.querySelectorAll('#act-sheet .actbtn')].map(b=>b.textContent).join('|'));
    ok(menu==='Ritaglia la foto|Riscatta con la fotocamera|Scegli dalla galleria|Elimina la foto|Annulla','menu con foto: '+menu);
    await page.evaluate(()=>document.querySelectorAll('#act-sheet .actbtn')[1].click());
    ready=false; for(let i=0;i<40&&!ready;i++){ await wait(100); ready=await page.evaluate(()=>document.getElementById('q-video').videoWidth>0&&!document.getElementById('v-quick').hidden); }
    ok(ready,'fotocamera riaperta');
    await wait(300); await page.evaluate(()=>document.getElementById('q-shot').click());
    ed=false; for(let i=0;i<20&&!ed;i++){ await wait(100); ed=await vis('qedge'); }
    ok(ed,'pulsante giallo: scatta e apre l’editor (anche senza bordi trovati)');
    await page.evaluate(()=>document.querySelector('#qedge [data-qe="discard"]').click()); await wait(300);
    ok(!(await vis('qedge'))&&await vis('v-card'),'Annulla: di nuovo sulla scheda');
    ok((await entry('c2|IT|Normale|NM')).photo===saved.photo,'foto invariata');

    console.log('6 la Scansione rapida normale non cambia');
    await page.evaluate(()=>{ document.getElementById('fab').click(); document.querySelector('[data-ad="quick"]').click(); }); await wait(600);
    const sq=await page.evaluate(()=>({t:document.getElementById('q-title').textContent,cls:document.body.classList.contains('qphoto'),gal:getComputedStyle(document.querySelector('#v-quick [data-q="gallery"]')).visibility}));
    ok(sq.t==='Scansione rapida'&&!sq.cls&&sq.gal==='visible','titolo, Galleria e coda come prima');
    await page.evaluate(()=>{ window.__carta=true; });
    let rows=0; for(let i=0;i<40&&!rows;i++){ await wait(100); rows=await page.evaluate(()=>document.querySelectorAll('#q-list .qrow').length); }
    ok(rows===1&&!(await vis('qedge')),'lo scatto automatico va in coda, non nell’editor della foto');
    ok((await entry('c2|IT|Normale|NM')).photo===saved.photo,'la foto della carta non cambia');

    ok(!errs.length,'nessun errore nella pagina '+errs.join(' | '));
    console.log('foto_fotocamera: '+checks+' controlli superati, errori: nessuno');
    await browser.close(); process.exit(0);
  } catch(e){ console.log(e.message||e); console.log('foto_fotocamera: '+checks+' controlli superati, errori: 1'); if(browser) await browser.close(); process.exit(1); }
})();
