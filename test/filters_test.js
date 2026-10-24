const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const now=Date.now();
const e=(n,name,set,sid,o={})=>({key:`c${n}|${o.lang||'IT'}|${o.variant||'Normale'}|${o.cond||'NM'}`,cardId:'c'+n,name,setName:set,number:String(n),total:'100',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:1,priceManual:null,added:now-n*1000,src:'tcgdex',srcId:sid+'-'+n,srcLang:'it',setId:sid,...o});
const seed=[e(1,'Alfa','Mega','me01',{price:5}),e(2,'Beta','Mega','me01',{qty:3,price:0.5,variant:'Reverse holo'}),e(3,'Gamma','Scarlatto','sv01',{lang:'EN',srcLang:'en',cond:'EX',price:null}),e(4,'Delta','Scarlatto','sv01',{cond:'LP',price:2,priceManual:9}),e(11,'Omega','Mega','me01',{price:1})];
function boot(){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
   beforeParse(w){ w.localStorage.setItem('pkm_catalog',JSON.stringify(seed)); w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=async()=>({ok:false,status:500,json:async()=>({})}); }});
  return {w:dom.window,d:dom.window.document,errors,ls:dom.window.localStorage}; }
const names=t=>[...t.d.querySelectorAll('#list .item .nm')].map(x=>x.textContent).join(',');
const set=(t,id,v)=>{const el=t.d.getElementById(id); el.value=v; el.dispatchEvent(new t.w.Event('change',{bubbles:true}));};
const txt=(t,id)=>t.d.getElementById(id).textContent.replace(/\s+/g,' ').trim();
const chip=(t,k)=>t.d.querySelector('#c-chips [data-qf="'+k+'"]');
function eq(a,b,msg){ if(a!==b) throw new Error('NON SUPERATO: '+msg+' (atteso '+b+', letto '+a+')'); console.log('  ok  '+msg+': '+a); }
(async()=>{
 const t=boot(); await wait(200); t.d.querySelector('nav button[data-go="cat"]').click(); t.d.getElementById('v-list').click();
 eq(names(t),'Alfa,Beta,Gamma,Delta,Omega','1 tutte (più recenti)');
 eq(txt(t,'c-foot'),'5 voci','1 piede');
 eq([...t.d.querySelectorAll('#c-chips .pb')].map(b=>(b.querySelector('span')||b).textContent).join('|'),'Tutte|Lingua|Set|Tipo|Rarità|Sigla|Variante|Condizione|Doppioni|Senza prezzo|Prezzo mio','1 tutti i filtri in una fila di pillole');
 eq(chip(t,'all').getAttribute('aria-pressed'),'true','1 Tutte attiva');
 eq([...t.d.getElementById('cf-lang').options].map(o=>o.textContent).join('|'),'Tutte le lingue|Italiano|Inglese','2 menu lingua');
 eq([...t.d.getElementById('cf-set').options].map(o=>o.textContent).join('|'),'Tutti i set|Mega · IT|Scarlatto · EN|Scarlatto · IT','2 menu set');
 set(t,'cf-lang','IT'); eq(names(t),'Alfa,Beta,Delta,Omega','3 lingua IT'); eq(txt(t,'c-foot'),'4 di 5 voci','3 piede filtrato');
 eq(t.d.querySelector('#cf-lang').parentElement.textContent.startsWith('Italiano'),true,'3 la pillola mostra la lingua scelta');
 eq(t.d.getElementById('fpanel'),null,'4 niente pannello Altri filtri');
 set(t,'cf-var','Reverse holo'); eq(names(t),'Beta','4 + reverse holo'); eq(t.d.querySelector('#cf-var').parentElement.getAttribute('aria-pressed'),'true','4 pillola Variante evidenziata'); eq(t.d.querySelector('#cf-var').parentElement.textContent.startsWith('Reverse holo'),true,'4 la pillola mostra la variante');
 chip(t,'all').click(); eq(names(t),'Alfa,Beta,Gamma,Delta,Omega','5 Tutte azzera'); eq(t.d.querySelector('#cf-var').parentElement.getAttribute('aria-pressed'),'false','5 variante azzerata');
 chip(t,'noprice').click(); eq(names(t),'Gamma','6 senza prezzo');
 chip(t,'noprice').click(); chip(t,'dup').click(); eq(names(t),'Beta','6 doppioni');
 chip(t,'dup').click(); chip(t,'manual').click(); eq(names(t),'Delta','6 solo prezzo mio'); eq(chip(t,'manual').getAttribute('aria-pressed'),'true','6 Prezzo mio acceso');
 set(t,'cf-cond','LP'); eq(names(t),'Delta','6 + condizione LP'); eq([...t.d.getElementById('cf-cond').options].map(o=>o.textContent).join('|'),'Tutte le condizioni|NM – Near Mint (5)|EX – Excellent (1)|LP – Light Played (1)','6 menu condizione');
 chip(t,'all').click();
 const key=[...t.d.getElementById('cf-set').options].find(o=>o.textContent.startsWith('Scarlatto · IT')).value; set(t,'cf-set',key); eq(names(t),'Delta','7 set Scarlatto IT');
 chip(t,'all').click();
 t.d.getElementById('c-q').value='gam'; t.d.getElementById('c-q').dispatchEvent(new t.w.Event('input')); eq(names(t),'Gamma','8 ricerca per nome');
 eq(t.d.getElementById('c-qx').hidden,false,'8 tasto per cancellare la ricerca');
 t.d.getElementById('c-qx').click(); eq(names(t),'Alfa,Beta,Gamma,Delta,Omega','8 ricerca cancellata');
 t.d.getElementById('c-q').value='11'; t.d.getElementById('c-q').dispatchEvent(new t.w.Event('input')); eq(names(t),'Omega','8 numero esatto');
 t.d.getElementById('c-q').value=''; t.d.getElementById('c-q').dispatchEvent(new t.w.Event('input'));
 set(t,'cf-lang','EN'); chip(t,'dup').click(); eq(t.d.querySelector('#list .empty2 b').textContent,'Nessuna carta trovata','9 nessun risultato');
 chip(t,'all').click();
 const exp={value:'Delta,Alfa,Beta,Omega,Gamma',name:'Alfa,Beta,Delta,Gamma,Omega',set:'Alfa,Beta,Omega,Gamma,Delta',recent:'Alfa,Beta,Gamma,Delta,Omega'};
 for (const so of ['value','name','set','recent']){ set(t,'c-sort',so); eq(names(t),exp[so],'10 ordine '+so); }
 set(t,'c-sort','value'); eq(JSON.parse(t.ls.getItem('pkm_cfg')).albumSort,'value','11 ordinamento ricordato');
 set(t,'cf-lang','EN'); t.d.querySelector('nav button[data-go="home"]').click(); t.d.querySelector('nav button[data-go="cat"]').click(); eq(names(t),'Gamma','12 filtro mantenuto cambiando pagina');
 console.log('errori:',t.errors.length?t.errors:'nessuno'); process.exit(0);
})();
