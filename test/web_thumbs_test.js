// 21/10/2026: nel sito le miniature della Home (maggior valore, ultime aggiunte, si sono mossi) erano ingrandite:
// l'immagine restava alla misura originale e .art ne mostrava solo l'angolo. Verifica nel browser vero (Chromium):
// ogni immagine di carta deve stare dentro la sua casella, in ogni schermata.
const R=m=>require(require.resolve(m,{paths:[require('./percorsi').SHOT]}));
const chromium=R('@sparticuz/chromium').default, puppeteer=R('puppeteer-core'), assert=require('assert');
(async()=>{ const browser=await puppeteer.launch({args:[...chromium.args,'--no-sandbox'],executablePath:process.env.CHROME_PATH||await chromium.executablePath(),headless:'shell'});
  let n=0; const errs=[];
  try {
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
  page.on('pageerror',e=>errs.push(e.message));
  await page.evaluateOnNewDocument(()=>{
    const DAY=864e5, D=Math.floor(Date.now()/DAY), IMG='../screenshot/card.jpg';
    const mk=(k,name,price,o={})=>({key:`c${k}|IT|Normale|NM`,cardId:'c'+k,name,setName:'Base',number:String(k),total:'102',img:IMG,lang:'IT',variant:'Normale',cond:'NM',qty:1,price,priceManual:null,added:Date.now()-k*DAY,imgFrom:'IT',...o});
    const cat=[mk(1,'Mew',428),mk(2,'Dragonair',265,{variant:'Holo',key:'c2|IT|Holo|NM'}),mk(3,'Kadabra',154),mk(4,'Gengar',69),mk(5,'Pelipper',0.88,{img:''})];
    const h={'c1|n':[[D-20,30000],[D,42806]],'c3|n':[[D-20,20000],[D,15474]]};
    localStorage.setItem('pkm_catalog',JSON.stringify(cat)); localStorage.setItem('pkm_hist',JSON.stringify({v:1,s:h}));
    localStorage.setItem('pkm_vhist',JSON.stringify({v:1,s:[[D-5,90000,5],[D,100000,5]]}));
    localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x'})); localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
  });
  await page.goto(require('./percorsi').APP_URL); await new Promise(r=>setTimeout(r,1200));
  const check=async(where,sel)=>{
    const r=await page.evaluate(s=>[...document.querySelectorAll(s)].filter(i=>i.complete&&i.naturalWidth>0&&i.offsetParent).map(i=>{
      const a=i.getBoundingClientRect(), b=i.parentElement.getBoundingClientRect();
      return {iw:a.width,ih:a.height,bw:b.width,bh:b.height,dx:a.left-b.left,dy:a.top-b.top};}),sel);
    assert.ok(r.length>0,where+': nessuna immagine trovata'); n++;
    for (const x of r){ assert.ok(x.iw<=x.bw+1&&x.ih<=x.bh+1&&x.dx>=-1&&x.dy>=-1,where+': immagine fuori dalla casella '+JSON.stringify(x)); n++; }
  };
  await check('Home (strisce)','#v-home .st .art img');
  const mv=await page.evaluate(()=>document.querySelectorAll('#v-home .mrow .art img').length);
  if (mv) await check('Home (si sono mossi)','#v-home .mrow .art img');
  await page.evaluate(()=>document.querySelector('nav button[data-go="cat"]').click()); await new Promise(r=>setTimeout(r,500));
  await check('Collezione griglia','#list .art img');
  await page.evaluate(()=>document.querySelector('#v-list').click()); await new Promise(r=>setTimeout(r,500));
  await check('Collezione elenco','#list .art img');
  } finally { await browser.close(); }
  assert.deepStrictEqual(errs,[],'errori della pagina');
  console.log('web_thumbs_test: '+n+' verifiche superate, errori: nessuno');
})().catch(e=>{ console.error(e); process.exit(1); });
