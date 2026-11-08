// Scanner e carte giapponesi (08/11/2026): su TCGdex in giapponese si cerca col nome stampato (ピカチュウ),
// non con quello inglese (Pikachu, che lì non esiste); la Pokémon TCG API (solo inglese) non vale mai come risultato
// sicuro per una giapponese e una carta inglese non viene mai aggiunta da sola al posto di una giapponese.
// Verifiche vere: il test si ferma al primo errore.
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html0=fs.readFileSync(require('./percorsi').APP,'utf8');
// le funzioni dell'app stanno dentro (() => { ... })(): si espongono per il test prima della chiusura
const END=html0.lastIndexOf('\n})();'); if(END<0) throw new Error('fine dello script non trovata');
const html=html0.slice(0,END)+'\nwindow.__t={lookupCandidates,autoPick};'+html0.slice(END);
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
let checks=0;
function ok(c,m){ checks++; if(!c) throw new Error('NON SUPERATO: '+m); console.log('  ok  '+m); }
function eq(a,b,m){ checks++; if(a!==b) throw new Error('NON SUPERATO: '+m+' (atteso '+JSON.stringify(b)+', letto '+JSON.stringify(a)+')'); console.log('  ok  '+m+': '+a); }

const PIKA_JA={id:'SV2a-025',localId:'025',name:'ピカチュウ',category:'Pokemon',set:{id:'SV2a',name:'ポケモンカード151',cardCount:{official:165,total:210}},variants:{normal:true}};
const PIKA_EN={id:'sv3pt5-25',name:'Pikachu',number:'25',set:{name:'151',printedTotal:165},images:{small:'https://x/p'}};
// tdOk = false: TCGdex non ha la carta giapponese
function api(log,{tdOk=true}={}){
  return async u=>{
    u=decodeURIComponent(String(u)); log.push(u);
    if(u.includes('api.pokemontcg.io')) return J({data:/Pikachu|printedTotal:165/.test(u)?[PIKA_EN]:[]});
    if(!u.includes('api.tcgdex.net')) return J({},404);
    if(u.endsWith('/ja/sets')) return J([{id:'SV2a',name:'ポケモンカード151',cardCount:{official:165,total:210}}]);
    if(u.endsWith('/ja/sets/SV2a')) return J({id:'SV2a',cards:tdOk?[{id:'SV2a-025',localId:'025',name:'ピカチュウ'}]:[]});
    if(u.includes('/ja/cards?name=')){ const n=u.split('name=')[1]; return J(tdOk&&n==='ピカチュウ'?[{id:'SV2a-025',localId:'025',name:'ピカチュウ'}]:[]); }
    if(u.endsWith('/ja/cards/SV2a-025')) return J(PIKA_JA);
    if(u.includes('/it/')||u.includes('/en/')) return J([]);
    return J([],200);
  };
}
function boot(opt){
  const log=[], errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.detail&&e.detail.stack||e.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.pages.dev/',virtualConsole:vc,beforeParse(w){
    w.confirm=()=>true; w.scrollTo=()=>{}; w.Element.prototype.scrollIntoView=()=>{};
    w.fetch=api(log,opt);
  }});
  return {w:dom.window,log,errors};
}
const rec=(o={})=>Object.assign({name_en:'Pikachu',name_printed:'ピカチュウ',number:'025',printed_total:'165',language:'ja',variant_hint:'normal',confidence:0.95},o);

(async()=>{
  console.log('1 giapponese con numero e totale: trovata su TCGdex in giapponese');
  let t=boot(); await wait(300);
  let found=await t.w.__t.lookupCandidates(rec());
  eq(found.length,1,'un solo risultato');
  eq(found[0].id,'tcgdex:ja:SV2a-025','la carta giapponese di TCGdex, non quella inglese di 151');
  eq(found[0].srcLang,'ja','lingua della fonte giapponese');
  ok(!t.log.some(u=>u.includes('/ja/cards?name=Pikachu')),'nessuna ricerca su TCGdex giapponese col nome inglese');
  ok(!t.log.some(u=>u.includes('api.pokemontcg.io')),'non serve la Pokémon TCG API');
  eq(t.w.__t.autoPick(rec(),found)&&t.w.__t.autoPick(rec(),found).id,'tcgdex:ja:SV2a-025','aggiunta automatica della giapponese');

  console.log('2 giapponese senza totale: ricerca per nome stampato');
  t.log.length=0;
  found=await t.w.__t.lookupCandidates(rec({printed_total:null}));
  eq(found.map(c=>c.id).join(','),'tcgdex:ja:SV2a-025','trovata col nome giapponese');
  ok(t.log.some(u=>u.includes('/ja/cards?name=ピカチュウ')),'cercata con ピカチュウ');

  console.log('3 nome giapponese diverso: niente aggiunta automatica');
  eq(t.w.__t.autoPick(rec({name_printed:'ライチュウ'}),found),null,'ライチュウ letta, ピカチュウ trovata: da controllare');
  eq(t.w.__t.autoPick(rec({name_printed:'ピカチュウ',confidence:0.5}),found),null,'lettura poco sicura: da controllare');

  console.log('4 TCGdex non ha la giapponese: la carta inglese resta da controllare');
  t=boot({tdOk:false}); await wait(300);
  found=await t.w.__t.lookupCandidates(rec());
  eq(found.map(c=>c.id).join(','),'sv3pt5-25','proposta la carta inglese della Pokémon TCG API');
  eq(t.w.__t.autoPick(rec(),found),null,'ma non aggiunta da sola come giapponese');

  console.log('5 italiane e inglesi invariate');
  const itCard={id:'tcgdex:it:x-1',srcLang:'it',name:'Pikachu',number:'25'};
  eq(t.w.__t.autoPick({name_en:'Pikachu',name_printed:'Pikachu',number:'025',language:'it',confidence:0.9},[itCard]),itCard,'italiana aggiunta come prima');
  eq(t.w.__t.autoPick({name_en:'Pikachu',name_printed:'Pikachu',number:'25',language:'en',confidence:0.9},[PIKA_EN]),PIKA_EN,'inglese della Pokémon TCG API aggiunta come prima');
  eq(t.w.__t.autoPick({name_en:'Raichu',name_printed:'Raichu',number:'25',language:'en',confidence:0.9},[PIKA_EN]),null,'nome diverso: da controllare come prima');

  ok(!t.errors.length,'nessun errore JavaScript'+(t.errors.length?': '+t.errors.join(' | '):''));
  console.log('giapponesi_test: '+checks+' controlli superati, errori: nessuno');
})().catch(e=>{ console.error(e.message); process.exit(1); });
