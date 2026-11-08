// Aggiunta a mano di una carta che non è in nessun catalogo (08/11/2026, es. Energia cinese CS6bC 131/131):
// tasto nella pagina Controlla la carta / Cerca e aggiungi, modulo precompilato con la lettura (sigla del set compresa),
// voce src 'man' con la foto della scansione, niente prezzo di mercato né richieste ai cataloghi, dati modificabili nella scheda.
// Verifiche vere: il test si ferma al primo errore.
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const {IDBFactory}=require('fake-indexeddb');
const html0=fs.readFileSync(require('./percorsi').APP,'utf8');
const END=html0.lastIndexOf('\n})();'); if(END<0) throw new Error('fine dello script non trovata');
const html=html0.slice(0,END)+'\nwindow.__t={reviewJob,openScan,openCard,buildPrompt,normalizeEntry,get qJobs(){return qJobs;},get catalog(){return catalog;}};'+html0.slice(END);
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
let checks=0;
function ok(c,m){ checks++; if(!c) throw new Error('NON SUPERATO: '+m); console.log('  ok  '+m); }
function eq(a,b,m){ checks++; if(a!==b) throw new Error('NON SUPERATO: '+m+' (atteso '+JSON.stringify(b)+', letto '+JSON.stringify(a)+')'); console.log('  ok  '+m+': '+a); }
async function until(fn,ms=6000){ const t0=Date.now(); while(Date.now()-t0<ms){ if(fn()) return true; await wait(50);} return false; }
const PIKA={id:'base1-58',name:'Pikachu',number:'58',set:{name:'Base',printedTotal:102},images:{small:'https://x/p'},cardmarket:{prices:{trendPrice:5}}};
function boot(o={}){
  const log=[], errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.detail&&e.detail.stack||e.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.pages.dev/',virtualConsole:vc,beforeParse(w){
    if(o.cat) w.localStorage.setItem('pkm_catalog',JSON.stringify(o.cat));
    w.localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',bkSheet:false}));
    w.indexedDB=new IDBFactory(); w.confirm=()=>true; w.scrollTo=()=>{}; w.Element.prototype.scrollIntoView=()=>{};
    w.fetch=async u=>{ u=decodeURIComponent(String(u)); log.push(u);
      if(o.pika&&u.includes('pokemontcg')&&/Pikachu/.test(u)) return J({data:[PIKA]});
      if(u.includes('pokemontcg')) return J({data:[]});
      if(u.includes('frankfurter')) return J({rates:{USD:1.1}});
      if(u.includes('tcgdex')) return J([]);
      return J({},404); };
  }});
  return {w:dom.window,d:dom.window.document,log,errors};
}
const $=(t,id)=>t.d.getElementById(id);
const txt=(t,s)=>{ const el=t.d.querySelector(s); return el?el.textContent.replace(/\s+/g,' ').trim():null; };
const setv=(t,id,v)=>{ const el=$(t,id); el.value=v; el.dispatchEvent(new t.w.Event('change',{bubbles:true})); };

(async()=>{
  console.log('1 lettura della sigla del set');
  let t=boot(); await wait(200);
  ok(/"set_code"/.test(t.w.__t.buildPrompt()),'Gemini legge anche la sigla del set (set_code)');

  console.log('2 carta della coda non trovata: aggiunta a mano precompilata con la lettura');
  const rec={name_it:null,name_en:'Nourishing Energy',name_printed:'滋养能量',number:'131',printed_total:'131',set_code:'CS6bC',language:'other',variant_hint:'normal',confidence:0.9,condition:'EX',condition_confidence:0.8,condition_notes:'angolo bianco'};
  const job={id:'j1',t:Date.now(),status:'review',msg:'carta non trovata',rec,crop:'data:image/jpeg;base64,QUFB',raw:'data:image/jpeg;base64,QkJC',photo:null};
  t.w.__t.qJobs.push(job); t.w.__t.reviewJob(job);
  ok(await until(()=>$(t,'man-open')),'tasto Aggiungi a mano dopo la ricerca');
  ok(await until(()=>/aggiungila a mano/.test(txt(t,'#status'))),'il messaggio "nessuna carta" lo suggerisce');
  ok($(t,'man-open').classList.contains('btn'),'senza risultati è un tasto vero');
  $(t,'man-open').click(); await wait(50);
  eq($(t,'m-name').value,'Nourishing Energy','nome (inglese, manca quello italiano)');
  eq($(t,'m-printed').value,'滋养能量','nome stampato');
  eq($(t,'m-set').value,'CS6bC','sigla del set');
  eq($(t,'m-num').value,'131','numero'); eq($(t,'m-tot').value,'131','totale');
  eq($(t,'m-lang').value,'Altro','lingua Altro (cinese)');
  eq($(t,'m-var').value,'Normale','variante'); eq($(t,'m-cond').value,'EX','condizione stimata');
  $(t,'m-name').value='Energia Nutriente'; $(t,'m-pm').value='0,50';
  $(t,'m-add').click(); await wait(300);
  const e=t.w.__t.catalog.find(x=>x.src==='man');
  ok(!!e,'carta aggiunta al catalogo');
  ok(/^man:/.test(e.cardId),'codice proprio man:…');
  eq(e.name,'Energia Nutriente','nome scelto'); eq(e.nameJp,'滋养能量','nome stampato conservato');
  eq(e.setName,'CS6bC','set'); eq(e.number,'131','numero salvato'); eq(String(e.total),'131','totale salvato');
  eq(e.lang,'Altro','lingua'); eq(e.cond,'EX','condizione'); eq(e.condEst,1,'segnata come stimata dalla foto');
  eq(e.priceManual,0.5,'prezzo mio'); eq(e.price,null,'niente prezzo di mercato');
  ok(await until(()=>!!t.w.__t.catalog.find(x=>x.src==='man').photo),'la foto della scansione diventa l\'immagine');
  ok(!t.w.__t.qJobs.some(j=>j.id==='j1'),'tolta dalla coda');
  ok(JSON.parse(t.w.localStorage.getItem('pkm_catalog')).some(x=>x.src==='man'&&x.name==='Energia Nutriente'),'salvata');

  console.log('3 scheda della carta a mano');
  t.log.length=0;
  t.w.__t.openCard(e.key); await wait(80);
  eq(txt(t,'#v-card .cd-name'),'Energia Nutriente','titolo');
  ok(/Aggiunta a mano/.test(txt(t,'#v-card .cd-price .cap')),'indicazione "Aggiunta a mano": '+txt(t,'#v-card .cd-price .cap'));
  ok(/0,50/.test(txt(t,'#v-card .cd-price')),'prezzo mio mostrato');
  ok(!t.d.querySelector('#v-card [data-a="refresh"]'),'niente "Aggiorna il prezzo"');
  t.d.querySelector('#v-card [data-a="menu"]').click(); await wait(30);
  ok(!/Aggiorna il prezzo/.test(txt(t,'#act-sheet')),'menu senza "Aggiorna il prezzo": '+txt(t,'#act-sheet'));
  ok(!/prezzo di mercato/.test(txt(t,'#act-sheet')),'menu senza "Torna al prezzo di mercato"');
  t.d.querySelector('#act-sheet [data-act="x"]').click(); await wait(30);
  eq($(t,'cd-mn').value,'Energia Nutriente','campo Nome'); eq($(t,'cd-ms').value,'CS6bC','campo Set'); eq($(t,'cd-mnum').value,'131/131','campo Numero');
  setv(t,'cd-mn','Energia Ristoratrice'); await wait(30);
  eq(t.w.__t.catalog.find(x=>x.src==='man').name,'Energia Ristoratrice','nome modificato');
  setv(t,'cd-ms','Ombre del Mare'); await wait(30);
  eq(t.w.__t.catalog.find(x=>x.src==='man').setName,'Ombre del Mare','set modificato');
  setv(t,'cd-mnum','130/131'); await wait(30);
  const e2=t.w.__t.catalog.find(x=>x.src==='man'); eq(e2.number+'/'+e2.total,'130/131','numero modificato');
  setv(t,'cd-mn',''); await wait(30);
  eq(t.w.__t.catalog.find(x=>x.src==='man').name,'Energia Ristoratrice','nome vuoto rifiutato');
  ok(!t.d.getElementById('cd-it'),'niente riga "Nome italiano" in più');

  console.log('4 nessuna richiesta ai cataloghi per la carta a mano');
  t.log.length=0;
  $(t,'btn-refresh').click(); await wait(400);
  ok(!t.log.some(u=>u.includes('man:')),'"Aggiorna tutti i prezzi" la salta');

  console.log('5 Cerca e aggiungi senza foto, con risultati');
  t=boot({pika:true}); await wait(200);
  t.w.__t.openScan(); $(t,'f-name').value='Pikachu'; $(t,'f-lang').value='en'; $(t,'btn-search').click();
  ok(await until(()=>t.d.querySelectorAll('#cands .cand').length===1),'un risultato');
  ok(await until(()=>$(t,'man-open')&&$(t,'man-open').classList.contains('lnk')),'c\'è comunque l\'aggiunta a mano');
  ok($(t,'man-open').classList.contains('lnk'),'con risultati è un link discreto');
  $(t,'man-open').click(); await wait(50);
  ok(!$(t,'ap-add'),'il pannello del risultato si chiude');
  eq($(t,'m-name').value,'Pikachu','nome dalla ricerca'); eq($(t,'m-lang').value,'EN','lingua dalla ricerca');
  $(t,'m-cancel').click(); await wait(30);
  ok(!$(t,'m-add')&&$(t,'man-open'),'Annulla richiude il modulo');
  $(t,'man-open').click(); await wait(30); $(t,'m-name').value=''; $(t,'m-add').click(); await wait(50);
  ok(!t.w.__t.catalog.length,'senza nome non aggiunge');
  $(t,'m-name').value='Pikachu Promo cinese'; $(t,'m-pm').value='abc'; $(t,'m-add').click(); await wait(50);
  ok(!t.w.__t.catalog.length,'prezzo non valido: non aggiunge');
  $(t,'m-pm').value=''; $(t,'m-num').value='SM-P 001'; $(t,'m-add').click(); await wait(100);
  const e3=t.w.__t.catalog[0]; ok(e3&&e3.src==='man','aggiunta senza foto');
  ok(!e3.photo,'nessuna foto'); eq(e3.price,null,'senza prezzo');
  eq(t.w.__t.normalizeEntry(JSON.parse(JSON.stringify(e3))).src,'man','resta "a mano" dopo backup e ripristino');

  ok(!t.errors.length,'nessun errore JavaScript'+(t.errors.length?': '+t.errors.join(' | '):''));
  console.log('aggiunta_mano_test: '+checks+' controlli superati, errori: nessuno');
})().catch(e=>{ console.error(e.message); process.exit(1); });
