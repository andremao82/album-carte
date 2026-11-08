// 08/11/2026: per alcune carte italiane TCGdex ha l'immagine grande (high.webp) ma non la miniatura (low.webp risponde 404),
// es. Allenamento di Cinturanera, Avventure Insieme 143/159. La griglia della Collezione mostrava le iniziali ("AL 143")
// mentre la pagina della carta aveva l'immagine. Ora, se low.webp non si carica, la griglia prova high.webp;
// solo se manca anche quella restano le iniziali. Verifica nel browser vero (Chromium) con risposte finte del server immagini.
const {launch}=require(require('./percorsi').SHOT+'/browser.js'), assert=require('assert');
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const B='https://assets.tcgdex.net/it/sv/sv09/';
// a: low mancante, high presente · b: low presente · c: mancano entrambe
const entry=(id,name,num)=>({key:id+'|IT|Normale|NM',cardId:id,name,setName:'Avventure Insieme',number:num,total:'159',img:B+num+'/low.webp',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:0.05,added:Date.now()});
(async()=>{ const browser=await launch();
  let n=0; const errs=[], asked=[];
  const ok=(c,m)=>{ assert.ok(c,m); n++; };
  try {
    const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
    page.on('pageerror',e=>errs.push(e.message));
    await page.setRequestInterception(true);
    page.on('request',r=>{ const u=r.url();
      if (!u.startsWith(B)) return r.continue();
      asked.push(u.slice(B.length));
      const exists=u.endsWith('/143/high.webp')||u.endsWith('/100/low.webp');
      if (exists) r.respond({status:200,contentType:'image/png',body:PNG}); else r.respond({status:404,contentType:'text/plain',body:'Not found'}); });
    await page.evaluateOnNewDocument(cat=>{
      localStorage.setItem('pkm_catalog',JSON.stringify(cat));
      localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',bkSheet:false,catView:'grid'}));
    },[entry('a','Allenamento di Cinturanera','143'),entry('b','Pikachu','100'),entry('c','Zzz Mancante','150')]);
    await page.goto(require('./percorsi').APP_URL); await new Promise(r=>setTimeout(r,600));
    await page.evaluate(()=>document.querySelector('nav button[data-go="cat"]').click()); await page.waitForFunction(()=>{ const a=[...document.querySelectorAll('#list .art')]; return a.length===3&&a.every(x=>{ const i=x.querySelector('img'); return !i||(i.complete&&i.naturalWidth>0); }); },{timeout:10000}).catch(()=>{});
    await new Promise(r=>setTimeout(r,400));
    const cells=await page.evaluate(()=>[...document.querySelectorAll('#list .art')].map(a=>{ const im=a.querySelector('img');
      const nn=a.querySelector('.nn'); return {nn:nn&&nn.textContent, ini:a.dataset.ini, src:im?im.getAttribute('src'):null, loaded:!!(im&&im.complete&&im.naturalWidth>0)}; }));
    const by=num=>cells.find(c=>c.nn===num)||{};
    ok(cells.length===3,'tre carte nella griglia ('+cells.length+')');
    ok(by('143').src===B+'143/high.webp','Cinturanera: dopo il 404 della miniatura usa l\'immagine grande ('+by('143').src+')');
    ok(by('143').loaded,'Cinturanera: immagine grande caricata, niente iniziali');
    ok(asked.includes('143/low.webp')&&asked.includes('143/high.webp'),'Cinturanera: prima la miniatura, poi la grande');
    ok(by('100').src===B+'100/low.webp'&&by('100').loaded,'Pikachu: la miniatura che esiste resta quella piccola');
    ok(!asked.includes('100/high.webp'),'Pikachu: l\'immagine grande non viene scaricata');
    ok(cells.filter(c=>c.src===null).length===1&&by('150').src===null,'carta senza nessuna immagine: restano le iniziali');
    // all'avvio la griglia si ridisegna qualche volta (ogni volta ritenta); poi le richieste devono fermarsi, niente ciclo low↔high
    let last=asked.length, quiet=0; for (let k=0;k<30&&quiet<6;k++){ await new Promise(r=>setTimeout(r,500)); if (asked.length===last) quiet++; else { quiet=0; last=asked.length; } }
    ok(quiet>=6,'carta senza immagini: le richieste si fermano, nessun ciclo ('+asked.length+' in tutto)');
    ok(!asked.some(u=>u.endsWith('/high.webp/high.webp')),'nessun indirizzo sbagliato');
    ok(errs.length===0,'nessun errore nella pagina ('+errs.join(' | ')+')');
    await page.close();
  } catch(e){ console.error(e.message); await browser.close(); process.exit(1); }
  await browser.close();
  console.log('miniatura_ripiego: '+n+' controlli superati, errori: nessuno');
})();
