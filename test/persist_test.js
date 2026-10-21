const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8'); const wait=ms=>new Promise(r=>setTimeout(r,ms));
function boot(storage){ const errors=[],calls=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
 const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,beforeParse(w){
  w.localStorage.setItem('pkm_catalog',JSON.stringify([{key:'a|IT|Normale|NM',cardId:'a',name:'A',setName:'S',number:'1',total:'9',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:3,priceManual:null,added:Date.now()}]));
  if (storage) Object.defineProperty(w.navigator,'storage',{value:storage(calls)});
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=async()=>({ok:false,status:500,json:async()=>({})}); w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{}; w.scrollTo=()=>{}; w.HTMLAnchorElement.prototype.click=function(){}; }});
 return {w:dom.window,d:dom.window.document,errors,calls}; }
const state=t=>{ t.d.getElementById('hm-gear').click(); return t.d.getElementById('persist-state').textContent; };
(async()=>{
 const a=boot(c=>({persisted:async()=>{c.push('persisted');return false}, persist:async()=>{c.push('persist');return true}})); await wait(200);
 console.log('1 concessa:',state(a),'| chiamate:',a.calls.join(','));
 const b=boot(c=>({persisted:async()=>{c.push('persisted');return true}, persist:async()=>{c.push('persist');return true}})); await wait(200);
 console.log('2 già attiva:',state(b),'| chiamate:',b.calls.join(','));
 let n=0; const c=boot(cl=>({persisted:async()=>false, persist:async()=>{cl.push('persist');return ++n>1}})); await wait(200);
 console.log('3 rifiutata:',state(c)); c.d.getElementById('btn-bak').click(); await wait(100); console.log('3 dopo un backup (nuovo tentativo con il tocco):',c.d.getElementById('persist-state').textContent.slice(0,40),'| richieste:',c.calls.length);
 const d=boot(null); await wait(200); console.log('4 browser senza supporto:',state(d));
 const e=boot(c=>({persisted:async()=>{throw new Error('x')}, persist:async()=>true})); await wait(200); console.log('5 errore del sistema:',state(e).slice(0,45));
 console.log('errori:',[a,b,c,d,e].flatMap(x=>x.errors).length?[a,b,c,d,e].flatMap(x=>x.errors):'nessuno'); process.exit(0);
})();
