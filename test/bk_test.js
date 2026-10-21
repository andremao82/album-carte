const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8'); const wait=ms=>new Promise(r=>setTimeout(r,ms));
const D=864e5, card=(i)=>({key:'c'+i+'|IT|Normale|NM',cardId:'c'+i,name:'C'+i,setName:'S',number:String(i),total:'99',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:2,priceManual:null,added:Date.now()-i});
function boot({n=12, ls={}, ios=true, share}={}){ const errors=[], log={shared:[],dl:0};
 const vc=new VirtualConsole(); vc.on('jsdomError',x=>{const m=String(x.detail&&x.detail.stack||x.message).split('\n')[0]; if(!/Not implemented/.test(m)) errors.push(m);});
 const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,beforeParse(w){
  w.localStorage.setItem('pkm_catalog',JSON.stringify(Array.from({length:n},(_,i)=>card(i+1))));
  for (const k in ls) w.localStorage.setItem(k,JSON.stringify(ls[k]));
  Object.defineProperty(w.navigator,'userAgent',{value: ios?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)':'Mozilla/5.0 (Windows NT 10.0)'});
  if (share){ w.navigator.canShare=()=>true; w.navigator.share=async(d)=>{ log.shared.push(d.files[0].name+' '+d.files[0].type); return share(); }; }
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=async()=>({ok:false,status:500,json:async()=>({})});
  w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{}; w.scrollTo=()=>{}; w.HTMLAnchorElement.prototype.click=function(){ if(this.download) log.dl++; };
 }});
 const w=dom.window,d=w.document; return {w,d,errors,log, note:()=>{const x=d.querySelector('#v-home .bknote'); return x?x.querySelector('p').textContent:'(nessun promemoria)';}, get:k=>JSON.parse(w.localStorage.getItem(k)||'null'), toast:()=>{const t=d.getElementById('toast'); return t?t.textContent:'';}};
}
(async()=>{
 const all=[];
 let t=boot({n:12}); all.push(t); await wait(150); console.log('1 mai fatto, 12 carte:',t.note());
 t=boot({n:5}); all.push(t); await wait(150); console.log('2 mai fatto, 5 carte:',t.note());
 t=boot({ls:{pkm_lastbackup:Date.now()-5*D, pkm_bkstat:null}}); all.push(t); await wait(150); console.log('3 5 giorni fa, primo avvio della nuova versione:',t.note());
 t=boot({ls:{pkm_lastbackup:Date.now()-5*D, pkm_bkstat:{sig:'x',n:0}}}); all.push(t); await wait(150); console.log('3b 5 giorni fa, nessuna modifica da allora:',t.note());
 t=boot({ls:{pkm_lastbackup:Date.now()-1*D}}); all.push(t); await wait(150);
 const ok=t.get('pkm_bkstat'); console.log('4 ieri, conteggio iniziale:',ok&&ok.n);
 // modifiche dall'utente: quantità +1 per 3 volte dalla pagina carta, poi un aggiornamento solo del prezzo di mercato
 for (let i=0;i<3;i++){ t.d.querySelector('#v-home [data-open]').click(); await wait(30); t.d.querySelector('[data-a="qplus"]').click(); await wait(30); t.d.querySelector('#v-card [data-a="back"]').click(); await wait(30); }
 console.log('4 dopo 3 modifiche:',t.get('pkm_bkstat').n);
 const cat=t.get('pkm_catalog'); cat[0].price=9; t.w.localStorage.setItem('pkm_catalog',JSON.stringify(cat));
 t=boot({ls:{pkm_lastbackup:Date.now()-1*D, pkm_bkstat:{sig:'x',n:30}}}); all.push(t); await wait(150); console.log('5 ieri ma 30 modifiche:',t.note());
 t=boot({ls:{pkm_lastbackup:Date.now()-4*D, pkm_bkstat:{sig:'x',n:2}}}); all.push(t); await wait(150); console.log('6 4 giorni fa, 2 modifiche:',t.note());
 t.d.querySelector('[data-a="bklater"]').click(); await wait(50); console.log('6 dopo "Più tardi":',t.note(),'| chip in Home:',t.d.querySelector('#v-home .bkchip').textContent);
 // backup su iPhone con il foglio di condivisione
 t=boot({ls:{pkm_lastbackup:Date.now()-4*D, pkm_bkstat:{sig:'x',n:2}}, share:async()=>{}}); all.push(t); await wait(150);
 t.d.querySelector('.bknote [data-a="backup"]').click(); await wait(80);
 console.log('7 condiviso:',t.log.shared.join(),'| download:',t.log.dl,'| ultimo backup oggi:',Date.now()-t.get('pkm_lastbackup')<5000,'| modifiche azzerate:',t.get('pkm_bkstat').n===0,'| messaggio:',t.toast(),'| promemoria:',t.note());
 t=boot({ls:{pkm_lastbackup:Date.now()-4*D, pkm_bkstat:{sig:'x',n:2}}, share:async()=>{const e=new Error('x');e.name='AbortError';throw e;}}); all.push(t); await wait(150);
 const before=t.get('pkm_lastbackup'); t.d.querySelector('[data-a="backup"]').click(); await wait(80);
 console.log('8 foglio chiuso senza salvare: data invariata:',t.get('pkm_lastbackup')===before,'| messaggio:',t.toast(),'| promemoria resta:',t.note()!=='(nessun promemoria)');
 t=boot({share:async()=>{const e=new Error('x');e.name='NotAllowedError';throw e;}}); all.push(t); await wait(150);
 t.d.querySelector('[data-a="backup"]').click(); await wait(80); console.log('9 condivisione rifiutata dal sistema -> download:',t.log.dl,'| registrato:',!!t.get('pkm_lastbackup'));
 t=boot({ios:false, share:async()=>{}}); all.push(t); await wait(150);
 t.d.querySelector('[data-a="backup"]').click(); await wait(80); console.log('10 computer: download',t.log.dl,'| condivisioni',t.log.shared.length);
 t=boot({share:async()=>{}}); all.push(t); await wait(150); t.d.getElementById('btn-csv').click(); await wait(50); console.log('11 CSV su iPhone:',t.log.shared.join());
 t.d.getElementById('hm-gear').click(); await wait(30); console.log('12 Impostazioni:',t.d.getElementById('bakstate').textContent);
 const errs=all.flatMap(x=>x.errors); console.log('errori:',errs.length?errs:'nessuno'); process.exit(0);
})();
