const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const now=Date.now();
const mk=(n,name,o={})=>({key:`c${n}|${o.lang||'IT'}|${o.variant||'Normale'}|${o.cond||'NM'}`,cardId:'c'+n,name,setName:'Set',number:String(n),total:'10',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:10,priceManual:null,pr:{normal:10,reverse:25,avg30:10},added:now-n,...o});
const seed=()=>[mk(1,'Uno'),mk(2,'Due',{qty:2}),mk(3,'Tre'),mk(4,'Quattro',{lang:'EN'}),mk(5,'Cinque',{cond:'PL',priceManual:7})];
function boot(){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
   beforeParse(w){ w.localStorage.setItem('pkm_catalog',JSON.stringify(seed())); w.localStorage.setItem('pkm_cfg',JSON.stringify({catView:'list'})); w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=async()=>({ok:false,status:500,json:async()=>({})}); }});
  return {w:dom.window,d:dom.window.document,errors,ls:dom.window.localStorage}; }
const vis=(t,id)=>!t.d.getElementById(id).hidden;
const txt=(t,sel)=>{const el=t.d.querySelector(sel);return el?el.textContent.replace(/\s+/g,' ').trim():null};
const cat=t=>JSON.parse(t.ls.getItem('pkm_catalog'));
const fire=(t,id,v)=>{const el=t.d.getElementById(id); el.value=v; el.dispatchEvent(new t.w.Event('change',{bubbles:true}));};
const names=t=>[...t.d.querySelectorAll('#list .item .nm')].map(x=>x.textContent).join(',');
(async()=>{
 const t=boot(); await wait(250); t.d.querySelector('nav button[data-go="cat"]').click();
 console.log('1 pulsanti:',txt(t,'.fbar'),'| barra selezione nascosta:',!vis(t,'selbar'));
 t.d.getElementById('btn-select').click();
 console.log('2 modalità selezione: barra:',vis(t,'selbar'),'| pulsante:',txt(t,'#btn-select'),'| caselle:',t.d.querySelectorAll('#list .chk').length,'| pulsante giallo nascosto:',!vis(t,'fab'),'|',txt(t,'#sel-n'));
 const rows=[...t.d.querySelectorAll('#list .item')]; rows[0].click(); rows[2].click();
 console.log('3 tocco = seleziona (non apre):',!vis(t,'v-card'),'|',txt(t,'#sel-n'),'| evidenziate:',t.d.querySelectorAll('#list .item.picked').length);
 rows[2].click(); console.log('3 deseleziona:',txt(t,'#sel-n'));
 t.d.getElementById('sel-all').click(); console.log('4 Tutte:',txt(t,'#sel-n'));
 t.d.getElementById('sel-edit').click(); console.log('5 foglio di modifica:',vis(t,'bulk-sheet'),'|',txt(t,'#be-title'),'| condizione:',[...t.d.getElementById('be-cond').options].map(o=>o.value||'(invariata)').join(','));
 // 6) cambio condizione + lingua per tutte: Uno e Quattro (EN->IT) non collidono, Cinque PL -> EX
 fire(t,'be-cond','EX'); fire(t,'be-lang','IT'); t.d.getElementById('be-apply').click();
 const c1=cat(t); console.log('6 dopo modifica:',c1.map(e=>e.name+':'+e.lang+'/'+e.cond+'x'+e.qty+(e.priceManual!=null?'(€'+e.priceManual+')':'')).join(' | '));
 console.log('6 uscito dalla selezione:',!vis(t,'selbar'),'| foglio chiuso:',!vis(t,'bulk-sheet'),'| avviso Annulla:',vis(t,'undo'),'|',txt(t,'#undo-t'));
 // 7) annulla
 t.d.getElementById('undo-b').click(); console.log('7 annullato:',cat(t).map(e=>e.name+':'+e.lang+'/'+e.cond).join(' | '),'| avviso nascosto:',!vis(t,'undo'));
 // 8) unione di doppioni: porto Quattro (EN) a IT e imposto solo il prezzo
 t.d.getElementById('btn-select').click(); [...t.d.querySelectorAll('#list .item')].find(r=>r.textContent.includes('Quattro')).click(); t.d.getElementById('sel-edit').click();
 fire(t,'be-lang','IT'); fire(t,'be-priceop','set'); console.log('8 campo prezzo visibile:',!t.d.getElementById('be-pricewrap').hidden);
 t.d.getElementById('be-price').value='abc'; t.d.getElementById('be-apply').click(); console.log('8 prezzo non valido: foglio ancora aperto:',vis(t,'bulk-sheet'));
 t.d.getElementById('be-price').value='3,5'; t.d.getElementById('be-apply').click(); const q=cat(t).find(e=>e.name==='Quattro'); console.log('8 Quattro:',q.lang,'prezzo mio',q.priceManual,'| chiave:',q.key);
 // 9) unione: porto Uno in EX e Due... crea collisione: Due(NM,x2) -> stessa chiave di Uno dopo che Uno ha la stessa lingua? seleziono Uno e Due e li porto a Reverse holo
 t.d.getElementById('btn-select').click(); const r2=[...t.d.querySelectorAll('#list .item')]; r2.find(r=>r.textContent.includes('Uno')).click(); r2.find(r=>r.textContent.includes('Due')).click(); t.d.getElementById('sel-edit').click(); fire(t,'be-var','Reverse holo'); t.d.getElementById('be-apply').click();
 const rv=cat(t).filter(e=>e.variant==='Reverse holo'); console.log('9 reverse holo: prezzo preso dai dati della carta:',rv.map(e=>e.name+' €'+e.price).join(', '));
 // 10) eliminazione multipla con Annulla
 t.d.getElementById('btn-select').click(); const r3=[...t.d.querySelectorAll('#list .item')]; r3[0].click(); r3[1].click(); const before=cat(t).length;
 t.d.getElementById('sel-del').click(); console.log('10 eliminate:',before,'->',cat(t).length,'|',txt(t,'#undo-t')); t.d.getElementById('undo-b').click(); console.log('10 annullata:',cat(t).length);
 // 11) eliminazione dalla pagina carta con Annulla
 t.d.querySelector('#list .item').click(); const nm=txt(t,'#v-card .ttl'); const n0=cat(t).length; t.d.querySelector('#v-card [data-a="del"]').click(); await wait(150);
 console.log('11 eliminata',nm,':',n0,'->',cat(t).length,'| catalogo visibile:',vis(t,'v-cat'),'|',txt(t,'#undo-t')); t.d.getElementById('undo-b').click(); console.log('11 annullata:',cat(t).length,'| nell\'elenco:',names(t).includes(nm));
 // 12) svuota il catalogo con Annulla
 t.d.getElementById('hm-gear').click(); t.d.getElementById('btn-reset').click(); console.log('12 svuotato:',cat(t).length,'|',txt(t,'#undo-t')); t.d.getElementById('undo-b').click(); console.log('12 annullato:',cat(t).length);
 console.log('errori:',t.errors.length?t.errors:'nessuno'); process.exit(0);
})();
