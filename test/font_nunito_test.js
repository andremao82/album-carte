// 07/11/2026: font dell'app Nunito (scelta dell'utente fra 7 proposte), incluso nell'app per funzionare offline.
// Verifica: file del font presente e valido, @font-face e --font, precaricamento, file nella cache del service worker
// e nel pacchetto di riserva; nel browser vero (Chromium) il testo usa davvero Nunito, in tema chiaro e scuro.
const P=require('./percorsi'), fs=require('fs'), path=require('path'), assert=require('assert');
const {launch}=require(P.SHOT+'/browser.js');
let n=0; const ok=(c,m)=>{ assert.ok(c,m); n++; };
const html=fs.readFileSync(P.APP,'utf8'), sw=fs.readFileSync(path.join(P.SITE,'sw.js'),'utf8');
const FONT=path.join(P.SITE,'fonts','nunito.woff2');
ok(fs.existsSync(FONT),'manca app/fonts/nunito.woff2');
const buf=fs.readFileSync(FONT); ok(buf.slice(0,4).toString('latin1')==='wOF2','nunito.woff2 non è un woff2');
ok(buf.length<80000,'font troppo pesante: '+buf.length);
ok(fs.existsSync(path.join(P.SITE,'fonts','OFL.txt')),'manca la licenza OFL del font');
ok(/@font-face\{font-family:"Nunito";[^}]*src:url\("fonts\/nunito\.woff2"\)/.test(html),'@font-face di Nunito mancante');
ok(/--font:"Nunito",-apple-system/.test(html),'--font non comincia con Nunito (con il font di sistema come riserva)');
ok(html.includes('<link rel="preload" href="fonts/nunito.woff2" as="font" type="font/woff2" crossorigin>'),'precaricamento del font mancante');
ok(!/fonts\.googleapis|fonts\.gstatic/.test(html),'il font non deve venire da Google in rete');
ok(/SHELL = \[[^\]]*'\.\/fonts\/nunito\.woff2'/.test(sw),'il font non è nella cache del service worker');
ok(fs.readFileSync(P.PACCHETTO,'utf8').includes('fonts/nunito.woff2'),'il font non è nel pacchetto di riserva');
(async()=>{ const browser=await launch(); const errs=[];
  try {
    for (const theme of ['light','dark']){
      const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
      page.on('pageerror',e=>errs.push(e.message));
      await page.evaluateOnNewDocument(t=>{ localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',appearance:t})); localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now())); },theme);
      await page.goto(P.APP_URL,{waitUntil:'load'}); await new Promise(r=>setTimeout(r,800));
      const r=await page.evaluate(async()=>{ await document.fonts.ready;
        const f=[...document.fonts].find(x=>x.family.replace(/"/g,'')==='Nunito');
        if (f && f.status!=='loaded') { try{ await f.load(); }catch(e){} }
        const h=document.querySelector('h1');
        return {status:f&&f.status, fam:getComputedStyle(document.body).fontFamily, h1:h&&getComputedStyle(h).fontFamily,
          check:document.fonts.check('700 20px Nunito','Album 916,60 €')}; });
      ok(r.status==='loaded',theme+': Nunito non caricato ('+r.status+')');
      ok(/^"?Nunito"?,/.test(r.fam),theme+': il testo non usa Nunito: '+r.fam);
      ok(/^"?Nunito"?,/.test(r.h1||''),theme+': i titoli non usano Nunito: '+r.h1);
      ok(r.check,theme+': Nunito non disponibile per testo con accenti ed euro');
      await page.close();
    }
  } finally { await browser.close(); }
  assert.deepStrictEqual(errs,[],'errori della pagina');
  console.log('font_nunito_test: '+n+' controlli superati, errori: nessuno');
})().catch(e=>{ console.error(e); process.exit(1); });
