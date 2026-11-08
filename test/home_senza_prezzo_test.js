// Home: la riga "N carte senza prezzo" apre Collezione col solo filtro Senza prezzo acceso
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const mk=(id,name,o={})=>({key:`tcgdex:it:${id}|IT|Normale|NM`,cardId:`tcgdex:it:${id}`,name,setName:'Megaevoluzione',number:id.slice(-3),total:'6',img:'x.png',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:1,priceManual:null,pr:{normal:1,avg30:1},added:Date.now(),src:'tcgdex',srcId:id,srcLang:'it',setId:'me01',...o});
const seed=[mk('me01-001','Con prezzo',{price:5,pr:{normal:5,avg30:5}}),mk('me01-002','Senza A',{price:null,pr:null}),mk('me01-003','Senza B',{price:null,pr:null,lang:'EN',key:'tcgdex:it:me01-003|EN|Normale|NM'})];
function boot(s){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.detail&&e.detail.stack||e.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.pages.dev/',virtualConsole:vc,
   beforeParse(w){ w.localStorage.setItem('pkm_catalog',JSON.stringify(s)); w.localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'k'}));
    w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=async()=>({ok:false,status:404,json:async()=>({})}); }});
  return {w:dom.window,d:dom.window.document,errors}; }
let n=0; const nb=v=>typeof v==='string'?v.replace(/ /g,' '):v;
function eq(a,b,m){ a=nb(a); if(a!==b) throw new Error('NON SUPERATO: '+m+' (atteso '+JSON.stringify(b)+', letto '+JSON.stringify(a)+')'); n++; console.log('  ok  '+m+': '+a); }
function ok(c,m){ if(!c) throw new Error('NON SUPERATO: '+m); n++; console.log('  ok  '+m); }
const names=t=>[...t.d.querySelectorAll('#list [data-open]')].map(b=>b.getAttribute('data-open').includes('002')?'Senza A':b.getAttribute('data-open').includes('003')?'Senza B':'Con prezzo').sort().join(',');
(async()=>{
 const t=boot(seed); await wait(300);
 const b=t.d.querySelector('#v-home .vcard [data-a="noprice"]');
 ok(b&&b.tagName==='BUTTON','1 la riga senza prezzo è un tasto');
 eq(b.textContent,'2 carte senza prezzo ›','1 testo con freccia');
 // prima metto un altro filtro e una ricerca in Collezione: devono sparire
 t.d.querySelector('nav button[data-go="cat"]').click(); await wait(50);
 t.d.querySelector('#c-chips [data-qf="dup"]').click(); t.d.getElementById('c-q').value='zzz';
 t.d.querySelector('nav button[data-go="home"]').click(); await wait(50);
 t.d.querySelector('#v-home [data-a="noprice"]').click(); await wait(50);
 ok(!t.d.getElementById('v-cat').hidden,'2 si apre Collezione');
 eq(t.d.querySelector('#c-chips [data-qf="noprice"]').getAttribute('aria-pressed'),'true','2 filtro Senza prezzo acceso');
 eq(t.d.querySelector('#c-chips [data-qf="dup"]').getAttribute('aria-pressed'),'false','2 altri filtri spenti');
 eq(t.d.getElementById('c-q').value,'','2 ricerca svuotata');
 eq(names(t),'Senza A,Senza B','2 elenco: solo le carte senza prezzo');
 eq(t.d.getElementById('c-foot').textContent,'2 di 3 voci','2 piede dell’elenco');
 t.d.querySelector('#c-chips [data-qf="all"]').click(); await wait(20);
 eq(names(t),'Con prezzo,Senza A,Senza B','3 "Tutte" toglie il filtro');
 const t2=boot([seed[0]]); await wait(300);
 ok(!t2.d.querySelector('#v-home [data-a="noprice"]'),'4 tutte con prezzo: niente riga');
 const errs=[t,t2].flatMap(x=>x.errors);
 console.log('home_senza_prezzo: '+n+' controlli superati, errori: '+(errs.length?errs.join(' | '):'nessuno'));
 process.exit(errs.length?1:0);
})();
