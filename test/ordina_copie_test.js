// Collezione: ordinamento per numero di copie (08/11/2026). Più copie prima; a parità, le più recenti.
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const now=Date.now();
const e=(n,name,qty)=>({key:`c${n}|IT|Normale|NM`,cardId:'c'+n,name,setName:'Mega',number:String(n),total:'100',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty,price:1,priceManual:null,added:now-n*1000,src:'tcgdex',srcId:'me01-'+n,srcLang:'it',setId:'me01'});
const seed=[e(1,'Alfa',1),e(2,'Beta',4),e(3,'Gamma',2),e(4,'Delta',4),e(5,'Epsilon',1)];
let n=0; function eq(a,b,msg){ if(a!==b) throw new Error('NON SUPERATO: '+msg+' (atteso '+b+', letto '+a+')'); n++; console.log('  ok  '+msg+': '+a); }
function boot(cfg){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.pages.dev/',virtualConsole:vc,
   beforeParse(w){ w.localStorage.setItem('pkm_catalog',JSON.stringify(seed)); if(cfg) w.localStorage.setItem('pkm_cfg',JSON.stringify(cfg)); w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=async()=>({ok:false,status:500,json:async()=>({})}); }});
  return {w:dom.window,d:dom.window.document,errors,ls:dom.window.localStorage}; }
const names=t=>[...t.d.querySelectorAll('#list .item .nm')].map(x=>x.textContent).join(',');
const gridNames=t=>[...t.d.querySelectorAll('#list .item')].map(x=>x.getAttribute('aria-label')||'').join('|');
(async()=>{
 const t=boot(); await wait(200); t.d.querySelector('nav button[data-go="cat"]').click();
 const opts=[...t.d.getElementById('c-sort').options];
 eq(opts.map(o=>o.textContent).join('|'),'Più recenti|Nome|Valore|Set|Copie','1 voce Copie nel menu Ordina');
 eq(opts[4].value,'qty','1 valore qty');
 t.d.getElementById('v-list').click();
 const s=t.d.getElementById('c-sort'); s.value='qty'; s.dispatchEvent(new t.w.Event('change',{bubbles:true}));
 eq(names(t),'Beta,Delta,Gamma,Alfa,Epsilon','2 più copie prima, a parità le più recenti');
 eq(JSON.parse(t.ls.getItem('pkm_cfg')).albumSort,'qty','3 scelta ricordata');
 t.d.getElementById('v-grid').click();
 const g=gridNames(t); eq(g.indexOf('Beta')<g.indexOf('Delta')&&g.indexOf('Delta')<g.indexOf('Gamma')&&g.indexOf('Gamma')<g.indexOf('Alfa'),true,'4 stesso ordine in griglia');
 const t2=boot({albumSort:'qty',catView:'list'}); await wait(200); t2.d.querySelector('nav button[data-go="cat"]').click();
 eq(t2.d.getElementById('c-sort').value,'qty','5 riaprendo l’app il menu mostra Copie');
 eq(names(t2),'Beta,Delta,Gamma,Alfa,Epsilon','5 riaprendo l’app resta per copie');
 const errs=t.errors.concat(t2.errors); if(errs.length) throw new Error('errori: '+errs.join('; '));
 console.log('ordina_copie: '+n+' controlli superati, errori: nessuno'); process.exit(0);
})().catch(err=>{ console.error(err.message); process.exit(1); });
