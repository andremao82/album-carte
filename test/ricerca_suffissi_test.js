// Ricerca su TCGdex dei nomi con suffisso (24/10/2026): in italiano TCGdex scrive "Charizard-ex", la foto e la ricerca a mano
// danno "Charizard ex". Caso reale: Charizard ex SVP 161 (promo, numero senza totale) non veniva trovata.
// Verifiche vere: il test si ferma al primo errore.
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const js=fs.readFileSync(require('./percorsi').APPJS,'utf8');
// funzioni pure estratte dal codice dell'app
const pick=name=>{ const m=js.match(new RegExp('(?:const '+name+' = [^\\n]*;|function '+name+'\\([^\\n]*?\\)\\{[\\s\\S]*?\\n\\})')); if(!m) throw new Error('manca '+name); return m[0]; };
const pure=new Function([pick('normNum'),pick('cleanNum'),pick('tdNameVariants'),pick('autoPick'),'return {tdNameVariants,autoPick};'].join('\n'))();
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
let checks=0;
function ok(c,m){ checks++; if(!c) throw new Error('NON SUPERATO: '+m); console.log('  ok  '+m); }
function eq(a,b,m){ checks++; if(a!==b) throw new Error('NON SUPERATO: '+m+' (atteso '+JSON.stringify(b)+', letto '+JSON.stringify(a)+')'); console.log('  ok  '+m+': '+a); }
async function until(fn,ms=8000){ const t0=Date.now(); while(Date.now()-t0<ms){ if(fn()) return true; await wait(50);} return false; }
function boot(api){
  const errors=[], log={fetch:[]}; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.detail&&e.detail.stack||e.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,beforeParse(w){
    w.confirm=()=>true; w.scrollTo=()=>{}; w.Element.prototype.scrollIntoView=()=>{};
    w.fetch=async u=>{ u=String(u); log.fetch.push(decodeURIComponent(u)); return api(u); };
  }});
  return {w:dom.window,d:dom.window.document,errors,log};
}
const $=(t,s)=>t.d.querySelector(s), $$=(t,s)=>[...t.d.querySelectorAll(s)];
const txt=(t,s)=>{const el=$(t,s);return el?el.textContent.replace(/\s+/g,' ').trim():null};
const names=t=>$$(t,'#cands .cand b').map(b=>b.textContent).join(',');

// come risponde TCGdex in italiano (la ricerca per nome è "contiene", senza distinguere maiuscole)
const XY=[{id:'xy2-11',localId:'11',name:'Charizard EX'},{id:'xy2-13',localId:'13',name:'M Charizard EX'}];
const EXS=[{id:'svp-056',localId:'056',name:'Charizard-ex'},{id:'svp-161',localId:'161',name:'Charizard-ex'},{id:'sv03-125',localId:'125',name:'Charizard-ex'}];
const ASTRO=[{id:'swsh9-018',localId:'018',name:'Charizard V ASTRO'}];
const PLAIN=[{id:'base1-4',localId:'4',name:'Charizard'},{id:'xx-161',localId:'161',name:'Charizard'}];
const detail=id=>{ const c=[...XY,...EXS,...PLAIN,...ASTRO].find(x=>x.id===id); return c&&Object.assign({},c,{image:'https://x/'+id,set:{id:id.split('-')[0],name:id.startsWith('svp')?'SVP Black Star Promos':'Set',cardCount:{official:225}},pricing:{cardmarket:{trend:20}}}); };
const api=(o={})=>async u=>{
  const d=decodeURIComponent(u);
  if(d.endsWith('/it/sets')) return J([{id:'svp',name:'SVP Black Star Promos',cardCount:{official:225,total:225}}]);
  let m=d.match(/\/it\/cards\?name=(.*)$/);
  if(m){ const q=m[1];
    if(q==='Charizard ex') return J(XY);
    if(q==='Charizard-ex') return J(o.noHyphen?[]:EXS);
    if(q==='Charizard V ASTRO') return J(ASTRO);
    if(q==='Charizard') return J([...PLAIN,...XY,...EXS,...ASTRO]);
    return J([]); }
  m=d.match(/\/it\/cards\/([^/?]+)$/); if(m){ const c=detail(m[1]); return c?J(c):J({},404); }
  if(d.includes('pokemontcg')) return J({data:[]});
  return J({},404); };
async function cerca(t,name,num,tot){
  $(t,'#fab').click(); $(t,'[data-ad="search"]').click(); await wait(50);
  t.d.getElementById('f-name').value=name; t.d.getElementById('f-num').value=num; t.d.getElementById('f-tot').value=tot||'';
  t.log.fetch.length=0; t.d.getElementById('btn-search').click();
  ok(await until(()=>$$(t,'#cands .cand').length>0||/Nessuna carta/.test(txt(t,'#status')||'')),'ricerca finita');
}

(async()=>{
 console.log('1 nomi alternativi');

 let t;
 eq(JSON.stringify(pure.tdNameVariants('Charizard ex')),'["Charizard-ex","Charizard"]','"Charizard ex": col trattino e senza suffisso');
 eq(JSON.stringify(pure.tdNameVariants('Pikachu VMAX')),'["Pikachu-VMAX","Pikachu"]','VMAX');
 eq(JSON.stringify(pure.tdNameVariants('Charizard VSTAR')),'["Charizard V ASTRO","Charizard"]','VSTAR: in italiano "V ASTRO"');
 eq(JSON.stringify(pure.tdNameVariants('Mewtwo V-UNION')),'["Mewtwo-V-UNION","Mewtwo"]','V-UNION resta intero');
 eq(JSON.stringify(pure.tdNameVariants('Charizard-ex')),'["Charizard-ex","Charizard"]','già col trattino');
 eq(JSON.stringify(pure.tdNameVariants('Charizard')),'[]','senza suffisso: niente');
 eq(JSON.stringify(pure.tdNameVariants('Cacnea')),'[]','nomi che finiscono con lettere simili non si toccano');

 console.log('2 Charizard ex 161 senza totale (promo): trovata su TCGdex in italiano');
 t=boot(api()); await wait(200);
 await cerca(t,'Charizard ex','161');
 eq(names(t),'Charizard-ex','la carta trovata è Charizard-ex');
 ok(/Trovata una carta/.test(txt(t,'#status')),'una sola carta, risultato sicuro');
 ok(/fonte: TCGdex/.test(txt(t,'#status')),'fonte TCGdex (carta italiana)');
 ok(t.log.fetch.some(u=>u.endsWith('/it/cards/svp-161')),'dettaglio di svp-161 chiesto');
 ok(!t.log.fetch.some(u=>u.includes('pokemontcg')),'non serve la Pokémon TCG API');
 ok(!t.log.fetch.some(u=>u.endsWith('name=Charizard')),'trovata col trattino: niente ricerca col solo nome');
 ok($(t,'#cands .cand.on'),'proposta già scelta');

 console.log('3 senza trattino su TCGdex: si cerca col solo nome e si tiene la carta "ex"');
 t=boot(api({noHyphen:true})); await wait(200);
 await cerca(t,'Charizard ex','161');
 eq(names(t),'Charizard-ex','fra Charizard 161 e Charizard-ex 161 vince la ex');
 ok(t.log.fetch.some(u=>u.endsWith('name=Charizard')),'ricerca col solo nome fatta');

 console.log('4 senza numero: le carte "-ex" compaiono, prima delle EX vecchie');
 t=boot(api()); await wait(200);
 await cerca(t,'Charizard ex','');
 const n=names(t).split(',');
 eq(n[0],'Charizard-ex','prima una Charizard-ex');
 ok(n.includes('Charizard EX'),'restano anche le Charizard EX di XY');
 ok(!n.includes('Charizard'),'niente Charizard senza suffisso');

 console.log('4b Charizard VSTAR 18: in italiano è "Charizard V ASTRO"');
 t=boot(api()); await wait(200);
 await cerca(t,'Charizard VSTAR','18');
 eq(names(t),'Charizard V ASTRO','trovata col nome italiano');
 ok(/Trovata una carta/.test(txt(t,'#status')),'risultato sicuro');

 console.log('5 nome senza suffisso: una sola richiesta per nome come prima');
 t=boot(api()); await wait(200);
 await cerca(t,'Pikachu','25');
 eq(t.log.fetch.filter(u=>/\/it\/cards\?name=/.test(u)).length,1,'richieste per nome a TCGdex');

 console.log('6 dalla foto (coda di Scansione rapida): aggiunta automatica possibile');
 t=boot(api()); await wait(200);
 const rec={name_en:'Charizard ex',name_printed:'Charizard ex',number:'161',printed_total:'',language:'it',confidence:0.95};
 await cerca(t,'Charizard ex','161');
 eq(names(t),'Charizard-ex','stessa ricerca della coda (nome letto dalla foto, numero senza totale)');
 ok(pure.autoPick(rec,[{name:'Charizard-ex',number:'161'}]),'aggiunta automatica (numero e nome coincidono, anche col trattino)');

 ok(!t.errors.length,'nessun errore della pagina'+(t.errors.length?': '+t.errors.join(' | '):''));
 console.log('ricerca_suffissi: '+checks+' controlli superati, errori: nessuno');
 process.exit(0);
})().catch(e=>{ console.error(e.message); console.log('ricerca_suffissi: errori: '+e.message); process.exit(1); });
