// 21/10/2026: nel riquadro "Valore della collezione" della Home carte / diverse / set stavano in una colonna alta a destra
// e sotto al valore restava uno spazio vuoto. Ora stanno in una fascia a tre colonne sotto il valore, a tutta larghezza.
// Verifica nel browser vero (Chromium): posizioni e misure reali, valore normale e valore lungo, tema scuro e chiaro.
const {launch}=require(require('./percorsi').SHOT+'/browser.js'), assert=require('assert');
(async()=>{ const browser=await launch();
  let n=0; const errs=[];
  const ok=(c,m)=>{ assert.ok(c,m); n++; };
  try {
  for (const [theme,big] of [['dark',false],['light',false],['dark',true]]){
    const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
    page.on('pageerror',e=>errs.push(e.message));
    await page.evaluateOnNewDocument((theme,big)=>{
      const DAY=864e5, D=Math.floor(Date.now()/DAY);
      const mk=(k,set,price)=>({key:`c${k}|IT|Normale|NM`,cardId:'c'+k,name:'Carta '+k,setName:set,number:String(k),total:'102',img:'',lang:'IT',variant:'Normale',cond:'NM',qty:1,price,priceManual:null,added:Date.now()-k*DAY,imgFrom:'IT'});
      const cat=[mk(1,'Base',big?98765.43:428),mk(2,'Base',265),mk(3,'Jungle',154),mk(4,'Fossil',69)];
      localStorage.setItem('pkm_catalog',JSON.stringify(cat));
      localStorage.setItem('pkm_hist',JSON.stringify({v:1,s:{'c1|n':[[D-40,30000],[D,42800]]}}));
      localStorage.setItem('pkm_vhist',JSON.stringify({v:1,s:[[D-5,90000,4],[D,100000,4]]}));
      localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',appearance:theme})); localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
    },theme,big);
    await page.goto(require('./percorsi').APP_URL); await new Promise(r=>setTimeout(r,900));
    const w=theme+(big?' (valore lungo)':'');
    const r=await page.evaluate(()=>{
      const box=e=>{ const b=e.getBoundingClientRect(); return {l:b.left,r:b.right,t:b.top,b:b.bottom,w:b.width}; };
      const q=s=>document.querySelector(s);
      const side=q('#v-home .vside');
      return {card:box(q('#v-home .vcard')), row:box(q('#v-home .vrow')), vl:box(q('#v-home .vl')), big:box(q('#v-home .vbig')),
        side:side&&box(side), cols:side?[...side.children].map(c=>({...box(c),bl:getComputedStyle(c).borderLeftWidth})):[],
        nums:side?[...side.querySelectorAll('b')].map(b=>b.textContent):[], labs:side?[...side.querySelectorAll('span')].map(s=>s.textContent):[],
        bt:side&&getComputedStyle(side).borderTopWidth, ta:side&&getComputedStyle(side).textAlign,
        theme:document.documentElement.dataset.theme||'dark'};
    });
    ok(r.side,w+': fascia carte / diverse / set presente');
    ok(r.theme===theme,w+': tema '+theme+' (letto '+r.theme+')');
    ok(r.nums.join('|')==='4|4|3'&&r.labs.join('|')==='carte|diverse|set',w+': numeri ed etichette nell\'ordine giusto ('+r.nums.join('|')+' / '+r.labs.join('|')+')');
    ok(r.side.t>=r.vl.b-1,w+': la fascia sta sotto il valore, non accanto ('+JSON.stringify([r.side.t,r.vl.b])+')');
    ok(r.side.t-r.vl.b<30,w+': niente spazio vuoto fra valore e fascia ('+(r.side.t-r.vl.b)+' px)');
    ok(Math.abs(r.side.w-r.row.w)<=1,w+': fascia a tutta larghezza ('+r.side.w+' su '+r.row.w+')');
    ok(Math.abs(r.vl.w-r.row.w)<=1,w+': valore a tutta larghezza ('+r.vl.w+' su '+r.row.w+')');
    ok(r.cols.length===3,w+': tre colonne');
    ok(r.cols.every(c=>Math.abs(c.t-r.cols[0].t)<=1),w+': le tre colonne sulla stessa riga');
    ok(r.cols[0].r<=r.cols[1].l+1&&r.cols[1].r<=r.cols[2].l+1,w+': colonne affiancate da sinistra a destra');
    ok(r.cols.every(c=>Math.abs(c.w-r.side.w/3)<=2),w+': colonne di larghezza uguale ('+r.cols.map(c=>Math.round(c.w)).join(',')+')');
    ok(r.cols[0].bl==='0px'&&r.cols[1].bl!=='0px'&&r.cols[2].bl!=='0px',w+': linee di separazione fra le colonne');
    ok(r.bt!=='0px'&&r.ta==='center',w+': linea sopra la fascia e testo centrato');
    ok(r.big.r<=r.card.r-1&&r.big.l>=r.card.l,w+': il valore sta dentro il riquadro ('+JSON.stringify([r.big.l,r.big.r,r.card.r])+')');
    await page.close();
  }
  } finally { await browser.close(); }
  assert.deepStrictEqual(errs,[],'errori della pagina');
  console.log('home_value_layout_test: '+n+' controlli superati, errori: nessuno');
})().catch(e=>{ console.error(e); process.exit(1); });
