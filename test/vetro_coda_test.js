// Ridisegno web (20/10/2026): numero delle carte da controllare sul tasto giallo della barra e riga
// "carte da controllare nella coda" in Aggiungi una carta, con la coda ricaricata dopo un riavvio.
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const {IDBFactory}=require('fake-indexeddb');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let checks=0; function ok(c,m){ checks++; if(!c) throw new Error('NON SUPERATO: '+m); console.log('  ok  '+m); }
async function until(fn,ms=5000){ const t0=Date.now(); while(Date.now()-t0<ms){ if(fn()) return true; await wait(40);} return false; }
async function seedQueue(idb,jobs){
  await new Promise((res,rej)=>{ const o=idb.open('pkm_queue',1); o.onupgradeneeded=()=>o.result.createObjectStore('jobs',{keyPath:'id'});
    o.onsuccess=()=>{ const tx=o.result.transaction('jobs','readwrite'); jobs.forEach(j=>tx.objectStore('jobs').put(j)); tx.oncomplete=()=>{o.result.close();res();}; tx.onerror=()=>rej(tx.error); }; o.onerror=()=>rej(o.error); });
}
function boot(idb){
  const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.detail&&e.detail.stack||e.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
    beforeParse(w){ w.indexedDB=idb; w.confirm=()=>true; w.scrollTo=()=>{}; w.Element.prototype.scrollIntoView=()=>{};
      w.localStorage.setItem('pkm_catalog',JSON.stringify([{key:'k|IT|Normale|NM',cardId:'k',name:'Pikachu',setName:'Base',number:'58',total:'102',img:'',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:1,added:1}]));
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=async()=>{throw new TypeError('Load failed')}; }});
  return {w:dom.window,d:dom.window.document,errors};
}
const $=(t,s)=>t.d.querySelector(s);
const job=(id,status,t)=>({id,t,status,msg:status==='review'?'2 proposte':status==='error'?'rete':'',crop:'data:image/jpeg;base64,AAAA',photo:null,quad:null});
(async()=>{
 console.log('1 coda vuota');
 const t0=boot(new IDBFactory()); await wait(300);
 ok($(t0,'#fab-n').hidden,'nessun numero sul tasto');
 $(t0,'#fab').click(); await wait(50);
 ok(!$(t0,'#add-sheet').hidden,'il tasto giallo apre il pannello Aggiungi');
 ok($(t0,'#add-queue').innerHTML==='','coda vuota: nessuna riga nel pannello');
 $(t0,'#add-back').click();

 console.log('2 coda ricaricata dopo il riavvio: 1 bordi, 1 da controllare, 1 errore, 1 aggiunta, 1 in coda');
 const idb=new IDBFactory();
 await seedQueue(idb,[job('a','edges',1),job('b','review',2),job('c','error',3),job('d','added',4),job('e','queued',5)]);
 const t=boot(idb);
 ok(await until(()=>!$(t,'#fab-n').hidden),'il numero compare da solo dopo il caricamento della coda');
 ok($(t,'#fab-n').textContent==='3','conta bordi + da controllare + con errore = 3 (non le aggiunte né quelle in coda)');
 ok($(t,'#fab').getAttribute('aria-label')==='Scansiona una carta, 3 da controllare','etichetta per la voce con il numero');
 $(t,'#fab').click(); await wait(80);
 ok(/1 in lettura · 3 da controllare · 1 aggiunta/.test($(t,'#add-queue').textContent),'riga della coda nel pannello: '+$(t,'#add-queue').textContent);
 ok($(t,'#add-queue button').textContent==='Controlla','tasto Controlla');
 $(t,'#add-queue button').click(); await wait(120);
 ok(!$(t,'#v-quick').hidden&&t.d.body.classList.contains('inquick'),'la riga apre la coda (barra nascosta)');
 ok(/Fotocamera|Apro|In coda|Da controllare/.test($(t,'#v-quick').textContent),'pagina della coda visibile');
 ok($(t,'#q-msg').hidden||!/Apro la fotocamera/.test($(t,'#q-msg').textContent),'aperta senza accendere la fotocamera');
 // eliminando una foto da controllare il numero scende
 const rv=[...t.d.querySelectorAll('#q-list .qrow')].find(r=>/Da controllare/.test(r.textContent)); const del=rv&&rv.querySelector('[data-q="drop"]');
 ok(!!del,'tasto Elimina sulla riga "Da controllare"');
 del.click(); await wait(150);
 ok($(t,'#fab-n').textContent==='2','dopo Elimina il numero scende a 2');
 console.log('3 una sola carta: singolare');
 const idb2=new IDBFactory(); await seedQueue(idb2,[job('z','review',1)]); const t2=boot(idb2);
 ok(await until(()=>$(t2,'#fab-n').textContent==='1'),'numero 1');
 $(t2,'#fab').click(); await wait(80);
 ok(/^1 da controllare/.test($(t2,'#add-queue').textContent),'riga "1 da controllare"');
 const all=[t0,t,t2].flatMap(x=>x.errors);
 console.log('verifiche superate:',checks); console.log('errori:',all.length?all:'nessuno'); process.exit(all.length?1:0);
})().catch(e=>{ console.log(e.message); console.log('errori: test interrotto'); process.exit(1); });
