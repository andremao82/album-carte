// Aggiornamento automatico dei prezzi: una volta al giorno (20 ore) all'apertura o al ritorno nell'app, in silenzio, avviso alla fine.
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
const card={id:'me01-127',localId:'127',name:'Rovine Insidiose',rarity:'Comune',image:'https://assets.tcgdex.net/it/me/me01/127',set:{id:'me01',name:'Megaevoluzione',cardCount:{official:132,total:188}},pricing:{cardmarket:{unit:'EUR',avg:0.2,trend:0.21}}};
const entry={key:'tcgdex:it:me01-127|IT|Normale|NM',cardId:'tcgdex:it:me01-127',name:'Rovine Insidiose',setName:'Megaevoluzione',number:'127',total:'132',img:'https://assets.tcgdex.net/it/me/me01/127',
  src:'tcgdex',srcId:'me01-127',srcLang:'it',setId:'me01',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:0.1,added:Date.now()-5*864e5,dex:[],cat:'Allenatore',tt:'',ill:''};
let fails=0, checks=0;
const ok=(c,msg)=>{ checks++; if(!c){ fails++; console.log('ERRORE:',msg); } };
function boot({catalog=[entry], pricesT=null, online=true, fetchImpl}={}){
  const errors=[], calls=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.detail&&e.detail.stack||e.message).split('\n')[0]));
  const f=fetchImpl||(async url=>{ url=String(url); if(/\/it\/cards\/me01-127$/.test(url)) return J(card); if(url.includes('frankfurter')) return J({rates:{EUR:0.9},date:'2026-10-23'}); return J({},404); });
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.pages.dev/',virtualConsole:vc,
    beforeParse(w){ w.confirm=()=>true; w.scrollTo=()=>{}; w.Element.prototype.scrollIntoView=()=>{};
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true});
      Object.defineProperty(w.navigator,'onLine',{configurable:true,get:()=>online});
      w.fetch=async url=>{ calls.push(String(url)); return f(url); };
      w.localStorage.setItem('pkm_catalog',JSON.stringify(catalog));
      w.localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
      if(pricesT!=null) w.localStorage.setItem('pkm_prices_t',JSON.stringify(pricesT)); }});
  const w=dom.window, d=w.document;
  return {w,d,errors,calls,ls:w.localStorage,
    cardCalls:()=>calls.filter(u=>/\/cards\/me01-127$/.test(u)).length,
    price:()=>JSON.parse(w.localStorage.getItem('pkm_catalog'))[0].price,
    t:()=>JSON.parse(w.localStorage.getItem('pkm_prices_t')||'0'),
    toast:()=>d.getElementById('toast').textContent,
    toastOn:()=>d.getElementById('toast').classList.contains('on')};
}
const H=36e5;
(async()=>{
  // 1) mai aggiornati: parte da solo dopo l'apertura, aggiorna prezzo e data, avviso alla fine
  let a=boot();
  await wait(1000);
  ok(a.cardCalls()===0,'1: non deve partire subito all\'apertura');
  ok(a.d.getElementById('pxstate').textContent==='mai','1: Impostazioni mostra "mai" prima del primo aggiornamento ('+a.d.getElementById('pxstate').textContent+')');
  await wait(3800);
  ok(a.cardCalls()===1,'1: una richiesta per la carta ('+a.cardCalls()+')');
  ok(a.price()===0.21,'1: prezzo aggiornato a 0,21 ('+a.price()+')');
  ok(Date.now()-a.t()<10000,'1: data dell\'ultimo aggiornamento salvata');
  ok(a.toast()==='Prezzi aggiornati'&&a.toastOn(),'1: avviso alla fine ('+a.toast()+')');
  ok(/^\d\d\/\d\d \d\d:\d\d$/.test(a.d.getElementById('pxstate').textContent),'1: Impostazioni mostra la data ('+a.d.getElementById('pxstate').textContent+')');
  ok(!a.d.getElementById('btn-refresh').disabled&&a.d.getElementById('refresh-lbl').textContent==='Aggiorna tutti i prezzi','1: tasto di nuovo pronto');
  // 1b) tornando nell'app subito dopo non riparte
  a.d.dispatchEvent(new a.w.Event('visibilitychange')); await wait(1800);
  ok(a.cardCalls()===1,'1b: entro 20 ore non riparte al ritorno ('+a.cardCalls()+')');
  ok(a.errors.length===0,'1: errori JS '+a.errors.join(' | '));

  // 2) aggiornati 1 ora fa: niente
  let b=boot({pricesT:Date.now()-1*H});
  await wait(4600);
  ok(b.cardCalls()===0,'2: aggiornati da poco, nessuna richiesta ('+b.cardCalls()+')');
  ok(b.price()===0.1,'2: prezzo invariato');
  // 2b) ritorno nell'app quando sono passate più di 20 ore: riparte
  b.ls.setItem('pkm_prices_t',JSON.stringify(Date.now()-21*H));
  b.d.dispatchEvent(new b.w.Event('visibilitychange')); await wait(400);
  ok(b.cardCalls()===0,'2b: aspetta un attimo prima di partire');
  await wait(1600);
  ok(b.cardCalls()===1,'2b: al ritorno dopo 21 ore aggiorna ('+b.cardCalls()+')');
  ok(b.price()===0.21,'2b: prezzo aggiornato');
  ok(b.errors.length===0,'2: errori JS '+b.errors.join(' | '));

  // 3) aggiornati 25 ore fa: all'apertura aggiorna
  let c=boot({pricesT:Date.now()-25*H});
  await wait(4600);
  ok(c.cardCalls()===1&&c.price()===0.21,'3: dopo 25 ore aggiorna all\'apertura');

  // 4) senza rete: niente richieste
  let e=boot({online:false});
  await wait(4600);
  ok(e.cardCalls()===0,'4: offline nessuna richiesta');
  ok(e.t()===0,'4: offline nessuna data salvata');

  // 5) tutto irraggiungibile: niente data, niente avviso, prezzo invariato (riproverà alla prossima apertura)
  let f=boot({fetchImpl:async()=>{ throw new TypeError('Load failed'); }});
  await wait(4600);
  ok(f.cardCalls()>=1,'5: ha provato ('+f.cardCalls()+')');
  ok(f.t()===0,'5: nessuna data salvata se fallisce tutto');
  ok(!/Prezzi aggiornati|Load failed/.test(f.toast()),'5: nessun avviso se fallisce in automatico ('+f.toast()+')');
  ok(f.price()===0.1,'5: prezzo invariato');
  ok(f.errors.length===0,'5: errori JS '+f.errors.join(' | '));

  // 6) catalogo vuoto: niente
  let g=boot({catalog:[]});
  await wait(4600);
  ok(g.calls.filter(u=>u.includes('/cards/')).length===0,'6: catalogo vuoto nessuna richiesta');

  // 7) tasto premuto mentre l'automatico lavora: un solo giro di richieste
  let slowRes; const slow=new Promise(r=>slowRes=r);
  let h=boot({fetchImpl:async url=>{ url=String(url); if(/\/cards\/me01-127$/.test(url)){ await slow; return J(card); } return J({},404); }});
  await wait(4400);
  ok(h.cardCalls()===1,'7: automatico partito');
  ok(h.d.getElementById('btn-refresh').disabled,'7: tasto disattivato mentre lavora');
  h.d.getElementById('btn-refresh').click(); await wait(100);
  ok(h.cardCalls()===1,'7: il tasto non fa partire un secondo giro ('+h.cardCalls()+')');
  slowRes(); await wait(300);
  ok(h.price()===0.21&&!h.d.getElementById('btn-refresh').disabled,'7: finito, tasto di nuovo attivo');
  // il tasto a mano funziona sempre, anche se aggiornati da poco
  h.d.getElementById('btn-refresh').click(); await wait(300);
  ok(h.cardCalls()===2,'7: il tasto a mano aggiorna anche entro le 20 ore ('+h.cardCalls()+')');
  ok(h.errors.length===0,'7: errori JS '+h.errors.join(' | '));

  // 8) testo in Impostazioni
  ok(/da soli una volta al giorno/.test(a.d.getElementById('v-set')?a.d.getElementById('v-set').textContent:html),'8: spiegazione in Impostazioni');

  console.log('auto_prezzi_test: '+checks+' controlli superati, errori: '+(fails?fails:'nessuno'));
  process.exit(fails?1:0);
})();
