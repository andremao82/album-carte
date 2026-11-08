// 08/11/2026: Scansione rapida ed editor dei bordi in stile pulito (scelte dell'utente: variante B senza pulsanti sotto il video).
// Niente pulsante di scatto, tasto Auto, Galleria e Fotocamera: lo scatto è solo automatico, l'icona della galleria sta nella barra in alto a destra, fuori dal video (dall'08/11/2026)
// (in alto a destra); senza fotocamera accesa (coda aperta da Aggiungi, o fotocamera che non parte) un tocco sul video la apre.
// Elenco senza riquadri né gialli, editor dei bordi con le azioni a parole e Conferma bianco, "Un'altra foto in attesa".
// Chromium vero, entrambi i temi.
const {launch}=require(require('./percorsi').SHOT+'/browser.js');
const P=require('./percorsi'), path=require('path'), fs=require('fs');
let checks=0;
function ok(c,m){ checks++; if(!c) throw new Error('NON SUPERATO: '+m); console.log('  ok  '+m); }
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const transparent=c=>c==='rgba(0, 0, 0, 0)'||c==='transparent';

(async()=>{
  let browser;
  try {
    browser=await launch();
    // immagine di prova per la galleria: carta su muro chiaro (bordi trovati, poi editor con conferma dei bordi)
    const blank=await browser.newPage(); await blank.goto('about:blank');
    const png=await blank.evaluate(()=>{ const W=900,H=1600,c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
      g.fillStyle='#d6d4ce'; g.fillRect(0,0,W,H); g.save(); g.translate(W/2,H/2); g.rotate(-0.04); g.fillStyle='#e8cc3a'; g.fillRect(-286,-400,572,800); g.fillStyle='#7ab0d8'; g.fillRect(-260,-374,520,748); g.restore();
      return c.toDataURL('image/jpeg',0.9); });
    await blank.close();
    fs.mkdirSync(P.WORK,{recursive:true}); const IMG=path.join(P.WORK,'scansione_pulita_test.jpg'); fs.writeFileSync(IMG,Buffer.from(png.split(',')[1],'base64'));

    for (const theme of ['dark','light']){
      console.log('— tema '+theme);
      // contesto separato per tema: la coda salvata in IndexedDB dal tema precedente non deve esserci
      const ctx=await browser.createBrowserContext();
      const page=await ctx.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
      const errs=[]; page.on('pageerror',e=>errs.push(e.message));
      await page.evaluateOnNewDocument(th=>{
        localStorage.setItem('pkm_cfg',JSON.stringify({appearance:th,provider:'claude',key:'',confirmEdges:true,bkSheet:false}));
        localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
        // fotocamera finta: window.__gumFail decide se si accende; conta le richieste
        window.__gum=0; window.__gumFail=false;
        const cv=document.createElement('canvas'); cv.width=480; cv.height=640; const g=cv.getContext('2d'); setInterval(()=>{ g.fillStyle='#d6d4ce'; g.fillRect(0,0,480,640); },100);
        navigator.mediaDevices.getUserMedia=async()=>{ window.__gum++; if(window.__gumFail){ const e=new Error('negato'); e.name='NotAllowedError'; throw e; } return cv.captureStream(10); };
      },theme);
      await page.goto(P.APP_URL); await wait(500);

      console.log('1 fotocamera senza pulsanti, icona della galleria in alto a destra fuori dal video');
      await page.evaluate(()=>{ document.getElementById('fab').click(); document.querySelector('[data-ad="quick"]').click(); });
      let ready=false; for(let i=0;i<30&&!ready;i++){ await wait(100); ready=await page.evaluate(()=>document.getElementById('q-video').videoWidth>0); }
      ok(ready,'fotocamera (finta) accesa');
      const ui=await page.evaluate(()=>{ const top=document.querySelector('#v-quick > .cd-top'), back=top.querySelector('[data-q="back"]').getBoundingClientRect(), ttl=document.getElementById('q-title').getBoundingClientRect(), cam=document.getElementById('q-cam'), gal=document.querySelector('#v-quick [data-q="gallery"]'), cr=cam.getBoundingClientRect(), gr=gal?gal.getBoundingClientRect():null;
        return {shot:!!document.getElementById('q-shot')||!!document.querySelector('#v-quick .shutter,#v-quick [data-q="shot"]'), auto:!!document.getElementById('q-auto')||!!document.querySelector('#v-quick [data-q="auto"]'),
          cam:!!document.querySelector('#v-quick [data-q="cam"]'), row:!!document.querySelector('#v-quick .qbtns'), galN:document.querySelectorAll('#v-quick [data-q="gallery"]').length,
          inCam:!!gal&&cam.contains(gal), inTop:!!gal&&top.contains(gal), below:gr&&cr.top-gr.bottom, sameRow:gr&&Math.abs((gr.top+gr.bottom)/2-(back.top+back.bottom)/2), centre:Math.abs((ttl.left+ttl.right)/2-innerWidth/2), sameSize:gr&&gr.width===back.width, label:gal&&gal.getAttribute('aria-label'), text:gal&&gal.textContent.trim(), svg:!!gal&&!!gal.querySelector('svg'),
          dx:gr&&cr.right-gr.right, dy:gr&&gr.top-cr.top, w:gr&&gr.width, h:gr&&gr.height, disp:gal&&getComputedStyle(gal).display,
          statTop:document.getElementById('q-stats').getBoundingClientRect().top, camBottom:cr.bottom, camBorder:getComputedStyle(cam).borderTopWidth}; });
      ok(!ui.shot,'niente pulsante di scatto'); ok(!ui.auto,'niente tasto Auto'); ok(!ui.cam,'niente tasto Fotocamera'); ok(!ui.row,'niente fila di tasti sotto il video');
      ok(ui.galN===1&&!ui.inCam&&ui.inTop,'una sola icona Galleria, nella barra in alto e non nel video');
      ok(ui.svg&&!ui.text&&/galleria/i.test(ui.label||''),'icona senza scritta, con nome per VoiceOver ('+ui.label+')');
      ok(ui.dx>=-1&&ui.dx<=1&&ui.below>=0,'in alto a destra, allineata al bordo destro del video e sopra il video ('+ui.dx+', '+ui.below+')');
      ok(ui.sameRow<=1&&ui.sameSize,'sulla stessa riga e grande come il tasto Indietro');
      ok(ui.centre<=2,'titolo ancora centrato ('+ui.centre+' px)');
      ok(ui.w>=44&&ui.h>=44&&ui.disp!=='none','grande abbastanza per il dito ('+ui.w+'×'+ui.h+')');
      ok(ui.statTop-ui.camBottom<=24,'i conteggi seguono subito il video ('+Math.round(ui.statTop-ui.camBottom)+' px)');
      ok(ui.camBorder==='0px','video senza bordo');
      const picked=await page.evaluate(()=>{ const f=document.getElementById('q-file'); let n=0; const o=f.click; f.click=()=>n++; document.getElementById('q-gal').click(); f.click=o; return n; });
      ok(picked===1,'l’icona apre la galleria (più foto)');
      const hint=await page.evaluate(()=>document.getElementById('q-hint').textContent);
      ok(/scatto da solo/.test(hint),'avviso dello scatto automatico: '+hint);
      const empty=await page.evaluate(()=>document.querySelector('#q-list .empty').textContent);
      ok(!/pulsante giallo/.test(empty)&&/tienila ferma/.test(empty),'testo dell’elenco vuoto senza "pulsante giallo"');

      console.log('2 elenco in stile pulito');
      await page.evaluate(()=>{ const x='<svg viewBox="0 0 24 24"><path d="M6 6l12 12"/></svg>';
        document.getElementById('q-stats').innerHTML='<span>Aggiunte 2</span><span>Da controllare 1</span><span>In coda 0</span>';
        document.getElementById('q-list').innerHTML='<div class="qall"><button class="btn small" type="button">Annulla tutte (2)</button><button class="btn small solid" type="button">Conferma tutte (2)</button></div>'+
          '<div class="qrow wide"><img alt=""><div class="body"><div class="nm">Da controllare</div></div><div class="acts"><button class="btn small solid" type="button">Controlla</button><button class="btn small danger" type="button">Elimina</button></div></div>'+
          '<div class="qrow"><img alt=""><div class="body"><div class="nm">Mew</div><div class="meta">151</div><span class="qdup">Ce l’hai già: ne avevi 1</span></div><div class="acts two"><button class="btn qic" type="button">'+x+'</button><button class="btn solid qic" type="button">'+x+'</button></div></div>'; });
      const L=await page.evaluate(()=>{ const cs=s=>getComputedStyle(document.querySelector(s)), probe=v=>{ const d=document.createElement('div'); d.style.color='var('+v+')'; document.body.appendChild(d); const c=getComputedStyle(d).color; d.remove(); return c; };
        const st=cs('#q-stats span'), all=cs('#q-list .qall .btn.solid'), row=cs('#q-list .qrow:not(.wide)'), keep=cs('#q-list .qic.solid'), dup=cs('#q-list .qdup'), ctl=cs('#q-list .wide .btn.solid'), del=cs('#q-list .wide .btn.danger');
        return {stBg:st.backgroundColor, stBorder:st.borderTopWidth, sep:getComputedStyle(document.querySelectorAll('#q-stats span')[1],'::before').content,
          allBg:all.backgroundColor, allW:all.fontWeight, rowBg:row.backgroundColor, rowRad:row.borderTopLeftRadius, rowLine:row.borderBottomWidth, rowTop:row.borderTopWidth,
          keepBg:keep.backgroundColor, keepColor:keep.color, dupBg:dup.backgroundColor, dupBorder:dup.borderTopWidth, dupColor:dup.color, ctlBg:ctl.backgroundColor, delColor:del.color,
          ink:probe('--ink'), orange:probe('--orange'), danger:probe('--danger'), fill:probe('--accent-fill')}; });
      ok(transparent(L.stBg)&&L.stBorder==='0px'&&/·/.test(L.sep),'conteggi come testo, separati da "·"');
      ok(transparent(L.allBg)&&+L.allW>=600,'Conferma tutte a parole, in grassetto');
      ok(transparent(L.rowBg)&&L.rowRad==='0px'&&L.rowTop==='0px'&&L.rowLine==='1px','righe senza riquadro, con una linea sotto');
      ok(transparent(L.keepBg)&&L.keepColor===L.ink&&L.keepColor!==L.fill,'✓ non giallo, del colore del testo');
      ok(transparent(L.dupBg)&&L.dupBorder==='0px'&&L.dupColor===L.orange,'"Ce l’hai già" in arancione senza pillola');
      ok(transparent(L.ctlBg)&&L.delColor===L.danger,'Controlla / Elimina a parole (Elimina in rosso)');

      console.log('3 coda senza fotocamera: un tocco sul video la apre');
      await page.evaluate(()=>{ document.querySelector('#v-quick [data-q="back"]').click(); }); await wait(300);
      await page.evaluate(()=>{ document.getElementById('fab').click(); document.querySelector('[data-ad="search"]').click(); }); await wait(300);
      // il link "Apri" della coda c'è solo con carte in coda: lo si mette a mano (stesso data-a dell'app)
      const g0=await page.evaluate(()=>{ document.getElementById('scan-queue').innerHTML='<button type="button" data-a="openq">Apri</button>'; const n=window.__gum; document.querySelector('#scan-queue [data-a="openq"]').click(); return n; });
      await wait(400);
      let q=await page.evaluate(()=>({vis:!document.getElementById('v-quick').hidden, msg:document.getElementById('q-msg').hidden?'':document.getElementById('q-msg').textContent, gum:window.__gum, v:!!document.getElementById('q-video').srcObject}));
      ok(q.vis&&q.gum===g0&&!q.v,'coda aperta senza accendere la fotocamera');
      ok(/Tocca per aprire la fotocamera/.test(q.msg),'nel video: '+q.msg);
      await page.evaluate(()=>document.getElementById('q-msg').click());
      ready=false; for(let i=0;i<30&&!ready;i++){ await wait(100); ready=await page.evaluate(()=>document.getElementById('q-video').videoWidth>0); }
      ok(ready&&await page.evaluate(g=>window.__gum===g+1&&document.getElementById('q-msg').hidden,g0),'tocco sul video: fotocamera accesa');
      const g1=await page.evaluate(()=>{ const n=window.__gum; document.getElementById('q-video').click(); return n; }); await wait(300);
      ok(await page.evaluate(g=>window.__gum===g,g1),'con la fotocamera accesa il tocco sul video non la riapre');

      console.log('4 fotocamera che non parte: "Tocca per riprovare"');
      await page.evaluate(()=>{ document.querySelector('#v-quick [data-q="back"]').click(); }); await wait(300);
      await page.evaluate(()=>{ window.__gumFail=true; document.getElementById('fab').click(); document.querySelector('[data-ad="quick"]').click(); }); await wait(500);
      q=await page.evaluate(()=>document.getElementById('q-msg').textContent);
      ok(/non disponibile/.test(q)&&/Tocca per riprovare/.test(q)&&/galleria/.test(q)&&!/"Galleria"/.test(q),'messaggio: '+q);
      await page.evaluate(()=>{ window.__gumFail=false; document.getElementById('q-cam').click(); });
      ready=false; for(let i=0;i<30&&!ready;i++){ await wait(100); ready=await page.evaluate(()=>document.getElementById('q-video').videoWidth>0); }
      ok(ready,'riprova col tocco: fotocamera accesa');

      console.log('5 editor dei bordi: azioni a parole, Conferma bianco, "Un’altra foto in attesa"');
      await (await page.$('#q-file')).uploadFile(IMG,IMG);
      await page.waitForSelector('#qedge:not([hidden])',{timeout:15000}); await wait(500);
      const E=await page.evaluate(()=>{ const cs=s=>getComputedStyle(document.querySelector(s));
        const ok_=cs('#qedge [data-qe="ok"]'), dis=cs('#qe-discard'), res=cs('#qedge [data-qe="reset"]'), lat=cs('#qe-later');
        return {okBg:ok_.backgroundColor, okColor:ok_.color, disBg:dis.backgroundColor, disColor:dis.color, resBg:res.backgroundColor, resBorder:res.borderTopWidth, latBg:lat.backgroundColor,
          more:document.getElementById('qe-more').hidden?'':document.getElementById('qe-more').textContent, edBg:cs('#qedge').backgroundColor}; });
      ok(E.okBg==='rgb(255, 255, 255)'&&E.okColor==='rgb(0, 0, 0)','Conferma: pillola bianca, testo nero');
      ok(transparent(E.disBg)&&E.disColor==='rgb(255, 107, 98)','Scarta: testo rosso senza pulsante');
      ok(transparent(E.resBg)&&E.resBorder==='0px'&&transparent(E.latBg),'Ripristina e Più tardi a parole');
      ok(E.edBg==='rgb(0, 0, 0)','editor sempre nero (anche in tema chiaro)');
      ok(E.more==='Un’altra foto in attesa','una foto in attesa al singolare: '+E.more);

      ok(!errs.length,'nessun errore nella pagina '+errs.join(' | '));
      await ctx.close();
    }
    await browser.close();
    console.log('scansione_pulita: '+checks+' controlli superati, errori: nessuno');
  } catch(e){ console.log(e.message||e); console.log('scansione_pulita: '+checks+' controlli superati, errori: 1'); if(browser) await browser.close(); process.exit(1); }
})();
