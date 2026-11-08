// Carte giapponesi con il nome in italiano (08/11/2026). Scelte dell'utente: titolo in italiano con sotto, in piccolo,
// il nome giapponese stampato; set come "SV7a · 楽園ドラゴーナ". Pokémon: nome dal Pokédex (anche per quelle già in
// collezione); Allenatori ed Energie: nome italiano letto da Gemini (name_it) o scritto a mano nella scheda.
// Verifiche vere: il test si ferma al primo errore.
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html0=fs.readFileSync(require('./percorsi').APP,'utf8');
const END=html0.lastIndexOf('\n})();'); if(END<0) throw new Error('fine dello script non trovata');
const html=html0.slice(0,END)+'\nwindow.__t={addEntryFromCandidate,openCard,normalizeEntry,buildPrompt,get catalog(){return catalog;}};'+html0.slice(END);
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
let checks=0;
function ok(c,m){ checks++; if(!c) throw new Error('NON SUPERATO: '+m); console.log('  ok  '+m); }
function eq(a,b,m){ checks++; if(a!==b) throw new Error('NON SUPERATO: '+m+' (atteso '+JSON.stringify(b)+', letto '+JSON.stringify(a)+')'); console.log('  ok  '+m+': '+a); }
async function until(fn,ms=6000){ const t0=Date.now(); while(Date.now()-t0<ms){ if(fn()) return true; await wait(50);} return false; }

// nomi del Pokédex come li dà PokéAPI
const species=[]; for(let i=1;i<=1025;i++) species.push({name:i===25?'pikachu':i===6?'charizard':i===448?'lucario':'poke'+i,url:'https://pokeapi.co/api/v2/pokemon-species/'+i+'/'});
const base={img:'',variant:'Normale',cond:'NM',qty:1,price:0.02,priceManual:null,src:'tcgdex',srcLang:'ja'};
const CAT=[
  Object.assign({},base,{key:'tcgdex:ja:SV7a-062|JP|Normale|NM',cardId:'tcgdex:ja:SV7a-062',name:'ドラセナ',setName:'楽園ドラゴーナ',setId:'SV7a',number:'062',total:'64',lang:'JP',cat:'Trainer',dex:[],added:Date.now()-1000}),
  Object.assign({},base,{key:'tcgdex:ja:SV7a-062|JP|Normale|EX',cardId:'tcgdex:ja:SV7a-062',name:'ドラセナ',setName:'楽園ドラゴーナ',setId:'SV7a',number:'062',total:'64',lang:'JP',cond:'EX',cat:'Trainer',dex:[],added:Date.now()-2000}),
  Object.assign({},base,{key:'tcgdex:ja:SV2a-025|JP|Normale|NM',cardId:'tcgdex:ja:SV2a-025',name:'ピカチュウex',setName:'ポケモンカード151',setId:'SV2a',number:'025',total:'165',lang:'JP',cat:'Pokemon',dex:[25],added:Date.now()-3000}),
  Object.assign({},base,{key:'tcgdex:ja:M1-003|JP|Normale|NM',cardId:'tcgdex:ja:M1-003',name:'メガルカリオex',setName:'メガブレイブ',setId:'M1L',number:'003',total:'63',lang:'JP',cat:'Pokemon',dex:[448],added:Date.now()-4000}),
  Object.assign({},base,{key:'tcgdex:it:sv03.5-006|IT|Normale|NM',cardId:'tcgdex:it:sv03.5-006',name:'Charizard-ex',setName:'151',setId:'sv03.5',number:'006',total:'165',lang:'IT',srcLang:'it',cat:'Pokemon',dex:[6],added:Date.now()-5000})
];
function boot(){
  const log=[], errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.detail&&e.detail.stack||e.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.pages.dev/',virtualConsole:vc,beforeParse(w){
    w.localStorage.setItem('pkm_catalog',JSON.stringify(CAT));
    w.confirm=()=>true; w.scrollTo=()=>{}; w.Element.prototype.scrollIntoView=()=>{};
    w.fetch=async u=>{ u=String(u); log.push(u); if(u.includes('pokeapi.co')) return J({results:species}); return J([],200); };
  }});
  return {w:dom.window,d:dom.window.document,log,errors};
}
const byKey=(t,k)=>t.w.__t.catalog.find(e=>e.key===k);
const txt=(t,s)=>{ const el=t.d.querySelector(s); return el?el.textContent.replace(/\s+/g,' ').trim():null; };

(async()=>{
  const t=boot();
  console.log('1 dati');
  eq(t.w.__t.normalizeEntry({cardId:'x',name:'A'}).nameJp,'','campo nameJp predefinito vuoto (backup vecchi compatibili)');
  ok(/"name_it"/.test(t.w.__t.buildPrompt()),'Gemini restituisce anche il nome italiano (name_it)');

  console.log('2 giapponesi già in collezione: Pokémon col nome dal Pokédex');
  ok(await until(()=>byKey(t,'tcgdex:ja:SV2a-025|JP|Normale|NM').name==='Pikachu ex'),'ピカチュウex → Pikachu ex');
  eq(byKey(t,'tcgdex:ja:SV2a-025|JP|Normale|NM').nameJp,'ピカチュウex','nome giapponese conservato');
  eq(byKey(t,'tcgdex:ja:M1-003|JP|Normale|NM').name,'Mega Lucario ex','メガルカリオex → Mega Lucario ex');
  eq(byKey(t,'tcgdex:ja:SV7a-062|JP|Normale|NM').name,'ドラセナ','Allenatore senza Pokédex: resta il giapponese finché non si scrive il nome');
  eq(byKey(t,'tcgdex:it:sv03.5-006|IT|Normale|NM').name,'Charizard-ex','italiana invariata');
  eq(byKey(t,'tcgdex:it:sv03.5-006|IT|Normale|NM').nameJp,'','italiana senza nome giapponese');
  ok(JSON.parse(t.w.localStorage.getItem('pkm_catalog')).some(e=>e.name==='Pikachu ex'),'salvato nel catalogo');

  console.log('3 scheda di una giapponese');
  t.w.__t.openCard('tcgdex:ja:SV2a-025|JP|Normale|NM'); await wait(80);
  eq(txt(t,'#v-card .cd-name'),'Pikachu ex','titolo in italiano');
  eq(txt(t,'#v-card .cd-jp'),'ピカチュウex','sotto il nome giapponese stampato');
  eq(t.d.querySelector('#v-card .cd-jp').getAttribute('lang'),'ja','marcato come giapponese');
  ok(/^SV2a · ポケモンカード151 · 0?25\/165$/.test(txt(t,'#v-card .cd-set')),'set con la sigla: '+txt(t,'#v-card .cd-set'));
  eq(t.d.getElementById('cd-it').value,'Pikachu ex','campo Nome italiano con il nome attuale');

  console.log('4 nome italiano scritto a mano');
  t.w.__t.openCard('tcgdex:ja:SV7a-062|JP|Normale|NM'); await wait(80);
  const inp=t.d.getElementById('cd-it');
  eq(inp.value,'','campo vuoto finché il nome è giapponese'); eq(inp.placeholder,'ドラセナ','segnaposto col nome giapponese');
  inp.value='Drasna'; inp.dispatchEvent(new t.w.Event('change',{bubbles:true})); await wait(80);
  eq(byKey(t,'tcgdex:ja:SV7a-062|JP|Normale|NM').name,'Drasna','nome salvato');
  eq(byKey(t,'tcgdex:ja:SV7a-062|JP|Normale|EX').name,'Drasna','vale anche per l\'altra copia della stessa carta');
  eq(byKey(t,'tcgdex:ja:SV7a-062|JP|Normale|NM').nameJp,'ドラセナ','il nome giapponese resta');
  eq(txt(t,'#v-card .cd-name'),'Drasna','titolo aggiornato');
  ok(/^SV7a · 楽園ドラゴーナ · /.test(txt(t,'#v-card .cd-set')),'set SV7a · 楽園ドラゴーナ');
  const inp2=t.d.getElementById('cd-it'); inp2.value=''; inp2.dispatchEvent(new t.w.Event('change',{bubbles:true})); await wait(80);
  eq(byKey(t,'tcgdex:ja:SV7a-062|JP|Normale|NM').name,'ドラセナ','campo svuotato: torna il giapponese');
  const inp3=t.d.getElementById('cd-it'); inp3.value='Drasna'; inp3.dispatchEvent(new t.w.Event('change',{bubbles:true})); await wait(80);

  console.log('5 scheda di un\'italiana invariata');
  t.w.__t.openCard('tcgdex:it:sv03.5-006|IT|Normale|NM'); await wait(80);
  ok(!t.d.querySelector('#v-card .cd-jp'),'niente nome giapponese'); ok(!t.d.getElementById('cd-it'),'niente campo Nome italiano');
  ok(/^151 · /.test(txt(t,'#v-card .cd-set')),'set senza sigla');

  console.log('6 Collezione: elenco e ricerca');
  t.d.querySelector('nav button[data-go="cat"]').click(); await wait(80);
  const v=t.d.getElementById('v-list'); if(v) v.click(); await wait(80);
  const rows=[...t.d.querySelectorAll('#list .item')].map(r=>r.textContent);
  ok(rows.some(r=>r.includes('Drasna')&&r.includes('SV7a · 楽園ドラゴーナ')),'riga in elenco con nome italiano e sigla del set');
  const q=t.d.getElementById('c-q');
  const find=async s=>{ q.value=s; q.dispatchEvent(new t.w.Event('input',{bubbles:true})); await wait(60); return [...t.d.querySelectorAll('#list .item')].length; };
  eq(await find('drasna'),2,'trovata col nome italiano');
  eq(await find('ドラセナ'),2,'trovata col nome giapponese');
  eq(await find('sv7a'),2,'trovata con la sigla del set');
  await find('');

  console.log('7 aggiunta di una giapponese nuova');
  const cJa={id:'tcgdex:ja:SV7a-063',src:'tcgdex',srcId:'SV7a-063',srcLang:'ja',setId:'SV7a',dex:[],cat:'Trainer',name:'リコ',number:'063',set:{name:'楽園ドラゴーナ',printedTotal:64},images:{small:''}};
  t.w.__t.addEntryFromCandidate(cJa,'JP','Normale','NM',1,null,{},{name_it:'Liko',name_en:'Liko',name_printed:'リコ'});
  let e=t.w.__t.catalog.find(x=>x.cardId==='tcgdex:ja:SV7a-063');
  eq(e.name,'Liko','nome italiano da Gemini'); eq(e.nameJp,'リコ','giapponese conservato');
  const cPk={id:'tcgdex:ja:SV2a-006',src:'tcgdex',srcId:'SV2a-006',srcLang:'ja',setId:'SV2a',dex:[6],cat:'Pokemon',name:'リザードンex',number:'006',set:{name:'ポケモンカード151',printedTotal:165},images:{small:''}};
  t.w.__t.addEntryFromCandidate(cPk,'JP','Normale','NM',1,null,{},null);
  e=t.w.__t.catalog.find(x=>x.cardId==='tcgdex:ja:SV2a-006');
  eq(e.name,'Charizard ex','senza lettura (da set o Pokédex): nome dal Pokédex');
  const cX={id:'tcgdex:ja:SV7a-064',src:'tcgdex',srcId:'SV7a-064',srcLang:'ja',setId:'SV7a',dex:[],cat:'Trainer',name:'ゼイユ',number:'064',set:{name:'楽園ドラゴーナ',printedTotal:64},images:{small:''}};
  t.w.__t.addEntryFromCandidate(cX,'JP','Normale','NM',1,null,{},{name_it:'ゼイユ',name_en:'Carmine'});
  eq(t.w.__t.catalog.find(x=>x.cardId==='tcgdex:ja:SV7a-064').name,'Carmine','name_it in giapponese: si usa il nome inglese');

  ok(!t.errors.length,'nessun errore JavaScript'+(t.errors.length?': '+t.errors.join(' | '):''));
  console.log('nomi_giapponesi_test: '+checks+' controlli superati, errori: nessuno');
})().catch(e=>{ console.error(e.message); process.exit(1); });
