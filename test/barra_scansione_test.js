// 07/11/2026: il tasto di scansione al centro della barra non è più giallo (si confondeva con la sezione attiva):
// cerchio neutro (colore delle superfici secondarie) con bordo sottile e icona del colore del testo, in tema scuro e chiaro.
// Il pallino arancione delle carte da controllare resta. Verifica nel browser vero (Chromium).
const {launch}=require(require('./percorsi').SHOT+'/browser.js'), assert=require('assert');
(async()=>{ const browser=await launch();
  let n=0; const errs=[];
  const ok=(c,m)=>{ assert.ok(c,m); n++; };
  try {
  for (const theme of ['dark','light']){
    const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
    page.on('pageerror',e=>errs.push(e.message));
    await page.evaluateOnNewDocument(th=>{
      const cat=[{key:'c1|IT|Normale|NM',cardId:'c1',name:'Pikachu',setName:'Base',number:'58',total:'102',img:'',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:3,priceManual:null,added:Date.now(),imgFrom:'IT'}];
      localStorage.setItem('pkm_catalog',JSON.stringify(cat));
      localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',appearance:th,bkSheet:false}));
      localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
    },theme);
    await page.goto(require('./percorsi').APP_URL); await new Promise(r=>setTimeout(r,800));
    const T=theme+': ';
    const s=await page.evaluate(()=>{
      const root=getComputedStyle(document.documentElement), b=document.getElementById('fab'), cs=getComputedStyle(b);
      // colori delle variabili del tema, risolti dal browser
      const probe=v=>{ const d=document.createElement('div'); d.style.color='var('+v+')'; document.body.appendChild(d); const c=getComputedStyle(d).color; d.remove(); return c; };
      // il pallino dipende dalla coda delle scansioni: qui lo si accende a mano per controllarne lo stile
      const badge=document.getElementById('fab-n'); badge.hidden=false; badge.textContent='2';
      return {bg:cs.backgroundColor, color:cs.color, border:cs.borderTopWidth, borderStyle:cs.borderTopStyle,
        surface2:probe('--surface2'), ink:probe('--ink'), accentFill:probe('--accent-fill'),
        shadow:cs.boxShadow, w:b.getBoundingClientRect().width,
        badgeShown:!!badge&&!badge.hidden, badgeBg:badge?getComputedStyle(badge).backgroundColor:null};
    });
    ok(s.bg!==s.accentFill&&s.bg!=='rgb(255, 203, 5)',T+'tasto di scansione non giallo ('+s.bg+')');
    ok(s.bg===s.surface2,T+'tasto di scansione del colore delle superfici secondarie ('+s.bg+' / '+s.surface2+')');
    ok(s.color===s.ink,T+'icona della scansione del colore del testo ('+s.color+' / '+s.ink+')');
    ok(parseFloat(s.border)>=1&&s.borderStyle==='solid',T+'tasto di scansione con bordo sottile ('+s.border+' '+s.borderStyle+')');
    ok(s.shadow==='none',T+'tasto di scansione senza alone giallo ('+s.shadow+')');
    ok(s.w>=44,T+'tasto di scansione ancora grande abbastanza da toccare ('+s.w+' px)');
    ok(s.badgeShown,T+'pallino delle carte da controllare visibile');
    ok(s.badgeBg==='rgb(255, 149, 0)',T+'pallino delle carte da controllare ancora arancione ('+s.badgeBg+')');
    await page.close();
  }
  ok(errs.length===0,'nessun errore nella pagina ('+errs.join(' | ')+')');
  } catch(e){ console.error(e.message); await browser.close(); process.exit(1); }
  await browser.close();
  console.log('barra_scansione: '+n+' controlli superati, errori: nessuno');
})();
