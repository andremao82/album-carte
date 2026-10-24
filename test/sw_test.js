const vm=require('vm'),fs=require('fs');
const store=new Map(); // nome cache -> Map(chiave -> Response)
const mkCache=name=>({
  async addAll(urls){ for(const u of urls){ const m=store.get(name); m.set(new URL(u,'https://x.netlify.app/').href,new Response('shell '+u)); } },
  async put(k,res){ const key=typeof k==='string'?new URL(k,'https://x.netlify.app/').href:k.url; store.get(name).set(key,res); },
  async match(k){ const key=typeof k==='string'?new URL(k,'https://x.netlify.app/').href:k.url; const r=store.get(name).get(key); return r?r.clone():undefined; }});
const caches={ async open(n){ if(!store.has(n)) store.set(n,new Map()); return mkCache(n); }, async keys(){ return [...store.keys()]; }, async delete(n){ return store.delete(n); },
  async match(k){ for(const n of store.keys()){ const r=await mkCache(n).match(k); if(r) return r; } } };
const handlers={}; let netMode='ok', claimed=false, skipped=false;
const ctx={ self:{addEventListener:(t,f)=>handlers[t]=f, location:{origin:'https://x.netlify.app'}, skipWaiting:async()=>{skipped=true}, clients:{claim:async()=>{claimed=true}}}, caches, Response, URL, Promise, setTimeout,
  fetch:(req)=>netMode==='ok'?Promise.resolve(new Response('rete '+req.url,{status:200})):netMode==='503'?Promise.resolve(new Response('Sito sospeso',{status:503})):netMode==='down'?Promise.reject(new TypeError('offline')):new Promise(()=>{}) };
ctx.location=ctx.self.location;
vm.createContext(ctx); vm.runInContext(fs.readFileSync(require('./percorsi').SITE+'/sw.js','utf8'),ctx);
const ev=(req)=>{ let p=null; const e={request:req,respondWith:x=>{p=x}, waitUntil:x=>{p=x}}; return {e,get p(){return p}}; };
const req=(url,mode='cors',method='GET')=>({url,mode,method});
(async()=>{
 let x=ev(); handlers.install(x.e); await x.p; console.log('1 installazione: file conservati:',[...store.get('album-v4').keys()].map(u=>u.replace('https://x.netlify.app','')).join(' '),'| skipWaiting:',skipped);
 store.set('vecchia',new Map()); x=ev(); handlers.activate(x.e); await x.p; console.log('2 attivazione: cache vecchia tolta:',!store.has('vecchia'),'| clients.claim:',claimed);
 let f=ev(req('https://x.netlify.app/','navigate')); handlers.fetch(f.e); let r=await f.p; console.log('3 pagina con rete:',await r.text(),'| copia aggiornata:',await (await store.get('album-v4').get('https://x.netlify.app/index.html')).clone().text());
 netMode='down'; f=ev(req('https://x.netlify.app/','navigate')); handlers.fetch(f.e); r=await f.p; console.log('4 pagina senza rete -> copia conservata:',await r.text());
 netMode='hang'; const t0=Date.now(); f=ev(req('https://x.netlify.app/','navigate')); handlers.fetch(f.e); r=await f.p; console.log('5 rete che non risponde -> copia dopo',Math.round((Date.now()-t0)/1000),'s:',await r.text());
 netMode='503'; f=ev(req('https://x.netlify.app/','navigate')); handlers.fetch(f.e); r=await f.p; console.log('5b sito sospeso (errore 503) -> copia conservata:',await r.text());
 netMode='ok'; f=ev(req('https://api.tcgdex.net/v2/it/sets')); handlers.fetch(f.e); console.log('6 richiesta verso altro sito ignorata:',f.p===null);
 f=ev(req('https://x.netlify.app/','navigate','POST')); handlers.fetch(f.e); console.log('7 richiesta non GET ignorata:',f.p===null);
 f=ev(req('https://x.netlify.app/carte.mobileconfig','navigate')); handlers.fetch(f.e); console.log('7b profilo scaricato: non intercettato:',f.p===null);
 netMode='ok'; f=ev(req('https://x.netlify.app/icon-192.png')); handlers.fetch(f.e); r=await f.p; console.log('8 icona dalla copia:',await r.text());
 process.exit(0);
})();
