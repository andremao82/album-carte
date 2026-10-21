// Foglio "È ora del backup" all'apertura (21/10/2026). Si ferma al primo errore.
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8'); const wait=ms=>new Promise(r=>setTimeout(r,ms));
const D=864e5, card=(i)=>({key:'c'+i+'|IT|Normale|NM',cardId:'c'+i,name:'C'+i,setName:'S',number:String(i),total:'99',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:2,priceManual:null,added:Date.now()-i});
let checks=0; const ok=(c,m)=>{ if(!c){ console.log('FALLITO:',m); process.exit(1);} checks++; };
function boot({n=12, ls={}, share}={}){ const errors=[], log={shared:[],dl:0};
 const vc=new VirtualConsole(); vc.on('jsdomError',x=>{const m=String(x.detail&&x.detail.stack||x.message).split('\n')[0]; if(!/Not implemented/.test(m)) errors.push(m);});
 const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://carte-pokemon-5vf.pages.dev/',virtualConsole:vc,beforeParse(w){
  w.localStorage.setItem('pkm_catalog',JSON.stringify(Array.from({length:n},(_,i)=>card(i+1))));
  for (const k in ls) w.localStorage.setItem(k,JSON.stringify(ls[k]));
  Object.defineProperty(w.navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'});
  if (share){ w.navigator.canShare=()=>true; w.navigator.share=async(d)=>{ log.shared.push(d.files[0].name); return share(); }; }
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=async()=>({ok:false,status:500,json:async()=>({})});
  w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{}; w.scrollTo=()=>{}; w.HTMLAnchorElement.prototype.click=function(){ if(this.download) log.dl++; };
  let vis='visible'; Object.defineProperty(w.document,'visibilityState',{get:()=>vis}); w.__setVis=v=>{vis=v; w.document.dispatchEvent(new w.Event('visibilitychange'));};
  const realNow=w.Date.now.bind(w.Date); let shift=0; w.Date.now=()=>realNow()+shift; w.__shift=ms=>{shift+=ms;};
 }});
 const w=dom.window,d=w.document;
 return {w,d,errors,log, open:()=>!d.getElementById('bk-sheet').hidden && !d.getElementById('bk-back').hidden,
  note:()=>!!d.querySelector('#v-home .bknote'), get:k=>JSON.parse(w.localStorage.getItem(k)||'null'), toast:()=>d.getElementById('toast').textContent};
}
const due={pkm_lastbackup:Date.now()-4*D, pkm_bkstat:{sig:'x',n:2}};
(async()=>{
 const all=[]; let t;
 // 1. scaduto: 4 giorni con 2 modifiche → foglio aperto dopo l'avvio
 t=boot({ls:due}); all.push(t); await wait(200); ok(!t.open(),'1 non subito (attesa dopo il primo disegno)');
 await wait(500); ok(t.open(),'1 foglio aperto');
 ok(t.d.getElementById('bks-t').textContent==='È ora del backup','1 titolo');
 ok(/Ultimo backup: 4 giorni fa, 2 modifiche da allora\./.test(t.d.getElementById('bks-p').textContent),'1 testo: '+t.d.getElementById('bks-p').textContent);
 ok(t.d.getElementById('bks-n').textContent==='12 carte da salvare in un file.','1 conteggio: '+t.d.getElementById('bks-n').textContent);
 ok(t.d.getElementById('bk-sheet').getAttribute('role')==='dialog' && t.d.getElementById('bk-sheet').getAttribute('aria-modal')==='true','1 accessibilità');
 ok(t.note(),'1 promemoria in Home resta sotto');
 // 2. backup di ieri, poche modifiche → niente
 t=boot({ls:{pkm_lastbackup:Date.now()-1*D, pkm_bkstat:{sig:'x',n:3}}}); all.push(t); await wait(700); ok(!t.open(),'2 non scaduto');
 // 3. 5 giorni ma nessuna modifica → niente (stesse regole del promemoria)
 t=boot({ls:{pkm_lastbackup:Date.now()-5*D, pkm_bkstat:{sig:'x',n:0}}}); all.push(t); await wait(700); ok(!t.open(),'3 nessuna modifica');
 // 4. ieri ma 30 modifiche → sì
 t=boot({ls:{pkm_lastbackup:Date.now()-1*D, pkm_bkstat:{sig:'x',n:30}}}); all.push(t); await wait(700); ok(t.open(),'4 molte modifiche');
 // 5. mai fatto: 12 carte sì, 5 no, catalogo vuoto no
 t=boot({}); all.push(t); await wait(700); ok(t.open(),'5 mai fatto con 12 carte'); ok(/Non hai ancora fatto un backup/.test(t.d.getElementById('bks-p').textContent),'5 testo');
 t=boot({n:5}); all.push(t); await wait(700); ok(!t.open(),'5 mai fatto con 5 carte');
 t=boot({n:0}); all.push(t); await wait(700); ok(!t.open(),'5 catalogo vuoto');
 // 6. "Più tardi" di prima → niente
 t=boot({ls:Object.assign({pkm_bksnooze:Date.now()+3600e3},due)}); all.push(t); await wait(700); ok(!t.open(),'6 rimandato');
 // 7. opzione "Solo promemoria"
 t=boot({ls:Object.assign({pkm_cfg:{bkSheet:false}},due)}); all.push(t); await wait(700); ok(!t.open(),'7 disattivato'); ok(t.note(),'7 promemoria in Home resta');
 // 8. Salva backup → foglio di condivisione, data aggiornata, foglio e promemoria chiusi
 t=boot({ls:due, share:async()=>{}}); all.push(t); await wait(700); ok(t.open(),'8 aperto');
 t.d.getElementById('bks-save').click(); ok(!t.open(),'8 si chiude al tocco'); await wait(150);
 ok(t.log.shared.length===1 && /^backup-carte-\d{4}-\d\d-\d\d\.json$/.test(t.log.shared[0]),'8 condiviso: '+t.log.shared);
 ok(Date.now()-t.get('pkm_lastbackup')<5000,'8 data del backup'); ok(t.get('pkm_bkstat').n===0,'8 modifiche azzerate');
 ok(!t.note(),'8 promemoria sparito'); ok(t.toast()==='Backup salvato','8 messaggio');
 ok(/Backup oggi/.test(t.d.querySelector('#v-home .bkchip').textContent),'8 chip');
 // 9. foglio di condivisione annullato → nulla registrato, promemoria resta, il foglio non torna da solo
 t=boot({ls:due, share:async()=>{const e=new Error('x');e.name='AbortError';throw e;}}); all.push(t); await wait(700);
 const before=t.get('pkm_lastbackup'); t.d.getElementById('bks-save').click(); await wait(150);
 ok(t.get('pkm_lastbackup')===before,'9 data invariata'); ok(t.note(),'9 promemoria resta'); ok(!t.open(),'9 foglio chiuso');
 // 10. condivisione rifiutata da iOS → scarica il file
 t=boot({ls:due, share:async()=>{const e=new Error('x');e.name='NotAllowedError';throw e;}}); all.push(t); await wait(700);
 t.d.getElementById('bks-save').click(); await wait(150); ok(t.log.dl===1,'10 scaricato'); ok(Date.now()-t.get('pkm_lastbackup')<5000,'10 registrato');
 // 11. Più tardi → rimandato di un giorno, promemoria nascosto
 t=boot({ls:due}); all.push(t); await wait(700); t.d.getElementById('bks-later').click(); await wait(50);
 const sn=t.get('pkm_bksnooze')-Date.now(); ok(!t.open(),'11 chiuso'); ok(sn>23*3600e3 && sn<=D,'11 rimandato di un giorno'); ok(!t.note(),'11 promemoria nascosto');
 ok(t.get('pkm_lastbackup')===due.pkm_lastbackup,'11 nessun backup');
 // 12. tocco fuori → chiude solo questa volta (niente rimando), non torna con un ritorno breve, torna dopo 30 minuti
 t=boot({ls:due}); all.push(t); await wait(700); t.d.getElementById('bk-back').click(); await wait(30);
 ok(!t.open(),'12 chiuso'); ok(!t.get('pkm_bksnooze'),'12 niente rimando'); ok(t.note(),'12 promemoria resta');
 t.w.__setVis('hidden'); t.w.__shift(5*60e3); t.w.__setVis('visible'); await wait(600); ok(!t.open(),'12 ritorno dopo 5 minuti: no');
 t.w.__setVis('hidden'); t.w.__shift(31*60e3); t.w.__setVis('visible'); await wait(200); ok(!t.open(),'12 attesa breve dopo il ritorno'); await wait(400); ok(t.open(),'12 ritorno dopo 31 minuti: sì');
 // 13. dopo "Più tardi" un ritorno lungo non lo ripropone
 t.d.getElementById('bks-later').click(); t.w.__setVis('hidden'); t.w.__shift(40*60e3); t.w.__setVis('visible'); await wait(600); ok(!t.open(),'13 rimandato resta chiuso');
 // 14. non sopra un altro foglio o la fotocamera: si riprova al ritorno successivo
 t=boot({ls:due}); all.push(t); await wait(700); t.d.getElementById('bk-back').click();
 t.d.getElementById('add-sheet').hidden=false; t.w.__setVis('hidden'); t.w.__shift(31*60e3); t.w.__setVis('visible'); await wait(600); ok(!t.open(),'14 Aggiungi aperto: no');
 t.d.getElementById('add-sheet').hidden=true; t.d.getElementById('v-quick').hidden=false; t.w.__setVis('hidden'); t.w.__shift(31*60e3); t.w.__setVis('visible'); await wait(600); ok(!t.open(),'14 Scansione rapida: no');
 t.d.getElementById('v-quick').hidden=true; t.d.getElementById('zoom').hidden=false; t.w.__setVis('hidden'); t.w.__shift(31*60e3); t.w.__setVis('visible'); await wait(600); ok(!t.open(),'14 tutto schermo: no');
 t.d.getElementById('zoom').hidden=true; t.w.__setVis('hidden'); t.w.__shift(31*60e3); t.w.__setVis('visible'); await wait(600); ok(t.open(),'14 poi sì');
 // 15. Impostazioni: opzione letta e salvata
 t=boot({ls:{pkm_lastbackup:Date.now()-1*D}}); all.push(t); await wait(300);
 t.d.getElementById('hm-gear').click(); await wait(50);
 const sel=t.d.getElementById('s-bksheet'); ok(sel && sel.value==='yes','15 predefinito: Proponi');
 ok(/All’apertura/.test(sel.closest('.srow2').textContent),'15 etichetta');
 sel.value='no'; sel.dispatchEvent(new t.w.Event('change')); await wait(30); ok(t.get('pkm_cfg').bkSheet===false,'15 salvato');
 sel.value='yes'; sel.dispatchEvent(new t.w.Event('change')); await wait(30); ok(t.get('pkm_cfg').bkSheet===true,'15 riattivato');
 t=boot({ls:{pkm_cfg:{bkSheet:false}}}); all.push(t); await wait(300); t.d.getElementById('hm-gear').click(); await wait(50); ok(t.d.getElementById('s-bksheet').value==='no','15 riletto');
 // 16. un backup già fatto in questa apertura non fa riapparire il foglio al ritorno
 t=boot({ls:due, share:async()=>{}}); all.push(t); await wait(700); t.d.getElementById('bks-save').click(); await wait(150);
 t.w.__setVis('hidden'); t.w.__shift(31*60e3); t.w.__setVis('visible'); await wait(600); ok(!t.open(),'16 dopo il backup no');
 const errs=all.flatMap(x=>x.errors); console.log('verifiche superate:',checks); console.log('errori:',errs.length?errs:'nessuno'); process.exit(0);
})();
