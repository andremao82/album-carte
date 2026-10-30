// 29/10/2026: scorrendo una pagina (scheda carta, Cerca e aggiungi, dettaglio set, Trend, dettaglio Pokédex)
// la barra col tasto Indietro spariva verso l'alto; era fissa solo in Scansione rapida.
// Verifica nel browser vero (Chromium): in ogni pagina, dopo lo scorrimento, la barra resta in cima, piena e cliccabile.
const {launch}=require(require('./percorsi').SHOT+'/browser.js');
let checks=0; const ok=(c,m)=>{ if(!c){ console.log('FALLITO:',m); process.exit(1);} checks++; };
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const now=Date.UTC(2026,9,29,12);
const mk=(n,name,set)=>({key:`c${n}|IT|Normale|NM`,cardId:'c'+n,name,setName:set,number:String(n),total:'50',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:2+n,priceManual:null,added:now,dex:[25],cat:'Pokemon',ill:'',types:[]});
// cat/ill/types già letti: altrimenti la lettura in sottofondo (rete) può svuotare dex prima del tocco (successo su GitHub il 30/10)
const K='c1|IT|Normale|NM';
const clk=sel=>{ const b=document.querySelector(sel); if(!b) throw new Error('manca '+sel); b.click(); };
// ogni pagina si apre coi tocchi veri, partendo dall'app appena caricata
const PAGES=[
  ['scan',  ["#fab", '[data-ad="search"]']],
  ['card',  ['nav [data-go="cat"]', '#list [data-open="'+K+'"]']],
  ['setd',  ['nav [data-go="cat"]', '#list [data-open="'+K+'"]', '#v-card [data-a="set"]']],
  ['value', ['nav [data-go="home"]', '#v-home [data-a="value"]']],
  ['dexd',  ['nav [data-go="cat"]', '#list [data-open="'+K+'"]', '#v-card [data-dex="25"]']],
];
(async()=>{ const browser=await launch(); const errs=[];
  try {
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
  page.on('pageerror',e=>errs.push(e.message));
  await page.evaluateOnNewDocument(cat=>{ localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x'})); localStorage.setItem('pkm_catalog',JSON.stringify(cat)); },
    Array.from({length:8},(_,i)=>mk(i+1,'Carta '+(i+1),'Set Prova')));
  for (const [name,taps] of PAGES){
    await page.goto(require('./percorsi').APP_URL); await wait(800);
    await page.evaluate(()=>{ const w=document.getElementById('prevwarn'); if(w) w.hidden=true; });
    for (const sel of taps){ await page.evaluate(clk,sel); await wait(300); }
    const id='v-'+name;
    ok(await page.evaluate(id=>!document.getElementById(id).hidden,id),name+': pagina aperta');
    // contenuto lungo, per poter scorrere
    await page.evaluate(id=>{ const d=document.createElement('div'); d.className='__lungo'; d.style.height='2400px'; document.getElementById(id).appendChild(d); },id);
    await page.evaluate(()=>window.scrollTo(0,1200)); await wait(200);
    ok(await page.evaluate(()=>window.scrollY)>800,name+': la pagina è scorsa');
    const r=await page.evaluate(id=>{ const bar=document.querySelector('#'+id+' > .cd-top'), b=bar.querySelector('[aria-label="Indietro"]').getBoundingClientRect();
      const hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2); return {top:b.top,bottom:b.bottom,hit:!!(hit&&hit.closest('[aria-label="Indietro"]')),bg:getComputedStyle(bar).backgroundColor,pos:getComputedStyle(bar).position}; },id);
    console.log(name+':',JSON.stringify(r));
    ok(r.pos==='sticky',name+': barra fissa');
    ok(r.top>=0&&r.bottom<=80,name+': tasto Indietro in cima dopo lo scorrimento');
    ok(r.hit,name+': tasto Indietro cliccabile (non coperto dal contenuto)');
    ok(r.bg!=='rgba(0, 0, 0, 0)',name+': barra con sfondo pieno');
    await page.evaluate(id=>document.querySelector('#'+id+' > .cd-top [aria-label="Indietro"]').click(),id); await wait(300);
    ok(await page.evaluate(id=>document.getElementById(id).hidden,id),name+': Indietro chiude la pagina');
  }
  } finally { await browser.close(); }
  if(errs.length){ console.log('errori:',errs); process.exit(1); }
  console.log('barra_fissa_pagine_test: '+checks+' controlli superati, errori: nessuno'); process.exit(0);
})();
