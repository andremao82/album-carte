// Collezione: filtri Tipo e Rarità, lettura del tipo dalle carte (TCGdex e Pokémon TCG API), tutti i filtri in una fila di pillole
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const now=Date.now();
const e=(n,name,o={})=>({key:`c${n}|IT|Normale|NM`,cardId:'c'+n,name,setName:'Set',number:String(n),total:'100',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:1,priceManual:null,added:now-n*1000,src:'tcgdex',srcId:'sv01-'+n,srcLang:'it',setId:'sv01',dex:[],ill:'',...o});
let n=0; const ok=(c,msg)=>{ if(!c) throw new Error('NON SUPERATO: '+msg); n++; console.log('  ok  '+msg); };
const eq=(a,b,msg)=>ok(a===b,msg+' (atteso '+JSON.stringify(b)+', letto '+JSON.stringify(a)+')');
function boot(seed,fetch){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
  const calls=[];
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.pages.dev/',virtualConsole:vc,
   beforeParse(w){ w.localStorage.setItem('pkm_catalog',JSON.stringify(seed)); w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true});
     w.fetch=async(u)=>{ u=String(u); calls.push(u); const r=fetch?fetch(u):null; return r?{ok:true,status:200,json:async()=>r}:{ok:false,status:500,json:async()=>({})}; }; }});
  return {w:dom.window,d:dom.window.document,errors,calls,ls:dom.window.localStorage}; }
const names=t=>[...t.d.querySelectorAll('#list .item .nm')].map(x=>x.textContent).join(',');
const set=(t,id,v)=>{const el=t.d.getElementById(id); el.value=v; el.dispatchEvent(new t.w.Event('change',{bubbles:true}));};
const opts=(t,id)=>[...t.d.getElementById(id).options].map(o=>o.textContent).join('|');
const pill=(t,id)=>t.d.getElementById(id).parentElement;
(async()=>{
 // 1. carte con tipo e rarità già noti (anche rarità inglesi della Pokémon TCG API)
 const seed=[e(1,'Bulbasaur',{cat:'Pokemon',types:['Erba'],rarity:'Comune'}),e(2,'Charmander',{cat:'Pokemon',types:['Fuoco'],rarity:'Common',src:'ptcg',qty:2}),
   e(3,'Squirtle',{cat:'Pokemon',types:['Acqua'],rarity:'Rara doppia'}),e(4,'Professore',{cat:'Trainer',types:[],rarity:'Non comune'}),e(5,'Energia Erba',{cat:'Energy',types:[],rarity:'None'}),
   e(6,'Zapdos',{cat:'Pokemon',types:['Lampo'],rarity:'Holo Rare V'})];
 let t=boot(seed); await wait(200); t.d.querySelector('nav button[data-go="cat"]').click(); t.d.getElementById('v-list').click();
 eq([...t.d.querySelectorAll('#c-chips .pb')].map(b=>(b.querySelector('span')||b).textContent).join('|'),'Tutte|Lingua|Set|Tipo|Rarità|Sigla|Variante|Condizione|Doppioni|Senza prezzo|Prezzo mio','1 fila completa di pillole');
 eq(t.d.getElementById('fpanel'),null,'1 niente pannello Altri filtri');
 eq(t.d.querySelectorAll('#v-cat select:not(#c-chips select):not(#c-sort)').length,0,'1 nessun menu fuori dalle pillole');
 eq(opts(t,'cf-type'),'Tutti i tipi|Erba (1)|Fuoco (2)|Acqua (1)|Lampo (1)|Allenatore (1)|Energia (1)','1 tipi in ordine, in italiano, con le quantità');
 eq(opts(t,'cf-rar'),'Tutte le rarità|Comune (3)|Non comune (1)|Olografica Rara V (1)|Rara doppia (1)','1 rarità: inglesi tradotte, "None" esclusa');
 set(t,'cf-type','Fuoco'); eq(names(t),'Charmander','2 filtro tipo Fuoco');
 eq(pill(t,'cf-type').getAttribute('aria-pressed'),'true','2 pillola Tipo accesa'); ok(pill(t,'cf-type').textContent.startsWith('Fuoco'),'2 la pillola mostra il tipo');
 eq(t.d.querySelector('#c-chips [data-qf="all"]').getAttribute('aria-pressed'),'false','2 Tutte spenta');
 set(t,'cf-type','Allenatore'); eq(names(t),'Professore','2 Allenatori');
 set(t,'cf-type','Energia'); eq(names(t),'Energia Erba','2 Energie');
 set(t,'cf-type',''); set(t,'cf-rar','Comune'); eq(names(t),'Bulbasaur,Charmander','3 rarità Comune (anche "Common")');
 set(t,'cf-type','Erba'); eq(names(t),'Bulbasaur','3 tipo e rarità insieme');
 t.d.querySelector('#c-chips [data-qf="all"]').click(); eq(names(t),'Bulbasaur,Charmander,Squirtle,Professore,Energia Erba,Zapdos','3 Tutte azzera tipo e rarità');
 eq(t.d.getElementById('cf-type').value+t.d.getElementById('cf-rar').value,'','3 menu azzerati');
 set(t,'cf-var','Normale'); set(t,'cf-cond','NM'); t.d.querySelector('#c-chips [data-qf="dup"]').click(); eq(names(t),'Charmander','3 variante, condizione e doppioni insieme');
 t.d.querySelector('#c-chips [data-qf="all"]').click();
 // scheda: rarità con il nome italiano
 t.d.querySelector('#list [data-open^="c6|"]').click(); await wait(50);
 eq(t.d.querySelector('#v-card .cd-rar').textContent,'Olografica Rara V','4 scheda: rarità in italiano');
 ok(!t.errors.length,'4 nessun errore ('+t.errors.join(';')+')');

 // 5. tipo da leggere: TCGdex (italiano) e Pokémon TCG API (inglese), in sottofondo aprendo la Collezione
 const old=[e(1,'Oddish',{rarity:''}),e(2,'Vulpix',{src:'ptcg',cardId:'base1-68'}),e(3,'Pokégear',{srcId:'sv01-3'})];
 old.forEach(x=>{ delete x.dex; delete x.ill; });
 const td={'sv01-1':{id:'sv01-1',category:'Pokémon',types:['Erba'],rarity:'Comune',dexId:[43],illustrator:'A'},'sv01-3':{id:'sv01-3',category:'Allenatore',rarity:'Non comune',illustrator:'B'}};
 t=boot(old,u=>{ const m=u.match(/\/v2\/it\/cards\/([^/?]+)$/); if(m) return td[decodeURIComponent(m[1])]||null;
   if(/pokemontcg\.io/.test(u)) return {data:[{id:'base1-68',supertype:'Pokémon',types:['Fire'],nationalPokedexNumbers:[37],artist:'C'}]}; return null; });
 await wait(200);
 ok(!t.calls.some(u=>/cards\/sv01-1$/.test(u)),'5 nessuna lettura prima di aprire la Collezione');
 t.d.querySelector('nav button[data-go="cat"]').click(); t.d.getElementById('v-list').click();
 ok(t.calls.some(u=>/cards\/sv01-1$/.test(u)),'5 lettura avviata aprendo la Collezione');
 await wait(600);
 const cat=JSON.parse(t.ls.getItem('pkm_catalog')); const by=k=>cat.find(x=>x.name===k);
 eq(JSON.stringify(by('Oddish').types),'["Erba"]','5 tipo da TCGdex'); eq(by('Oddish').rarity,'Comune','5 rarità mancante riempita');
 eq(JSON.stringify(by('Vulpix').types),'["Fuoco"]','5 tipo inglese tradotto (Fire → Fuoco)');
 eq(by('Pokégear').cat,'Trainer','5 allenatore'); eq(JSON.stringify(by('Pokégear').types),'[]','5 allenatore senza tipo (letto)');
 ok(t.calls.some(u=>/pokemontcg\.io/.test(u)&&/types/.test(decodeURIComponent(u))),'5 la Pokémon TCG API chiede anche i tipi');
 eq(opts(t,'cf-type'),'Tutti i tipi|Erba (1)|Fuoco (1)|Allenatore (1)','5 menu aggiornato dopo la lettura');
 set(t,'cf-type','Erba'); eq(names(t),'Oddish','5 filtro sul tipo appena letto');
 const before=t.calls.length; t.d.querySelector('nav button[data-go="home"]').click(); t.d.querySelector('nav button[data-go="cat"]').click(); await wait(100);
 eq(t.calls.filter((u,i)=>i>=before&&/cards\/|pokemontcg/.test(u)).length,0,'5 non rilegge carte già lette');
 ok(!t.errors.length,'5 nessun errore ('+t.errors.join(';')+')');

 // 6. carte non leggibili: avviso nel menu, nessun nuovo tentativo subito
 t=boot([e(1,'Mistero',{})].map(x=>{ delete x.dex; return x; })); await wait(200);
 t.d.querySelector('nav button[data-go="cat"]').click(); await wait(300);
 ok(/1 carta ancora da leggere/.test(opts(t,'cf-type')),'6 avviso "1 carta ancora da leggere"');
 const c0=t.calls.length; t.d.querySelector('nav button[data-go="home"]').click(); t.d.querySelector('nav button[data-go="cat"]').click(); await wait(100);
 eq(t.calls.filter((u,i)=>i>=c0&&/cards\/sv01|pokemontcg/.test(u)).length,0,'6 nessun nuovo tentativo entro 10 minuti');

 // 7b. sigla dal nome: ex/EX distinte, trattino di TCGdex, V ASTRO = VSTAR
 const sig=[e(1,'Charizard ex'),e(2,'Charizard-ex',{qty:2}),e(3,'Charizard EX'),e(4,'Mewtwo-EX'),e(5,'Pikachu V'),e(6,'Pikachu VMAX'),e(7,'Charizard V ASTRO'),e(8,'Arceus VSTAR'),
   e(9,'Pikachu e Zekrom GX'),e(10,'Exeggcute'),e(11,'Alexandra'),e(12,'Rayquaza V-UNION'),e(13,'Greninja BREAK'),e(14,'Infernape LV.X'),e(15,'Vaporeon'),e(16,'Energia Lotta')];
 t=boot(sig); await wait(200); t.d.querySelector('nav button[data-go="cat"]').click(); t.d.getElementById('v-list').click();
 eq(opts(t,'cf-sigla'),'Tutte le sigle|ex (3)|EX (2)|GX (1)|V (1)|VMAX (1)|VSTAR (2)|V-UNION (1)|BREAK (1)|LV.X (1)','7b menu sigle in ordine, con le quantità');
 set(t,'cf-sigla','ex'); eq(names(t),'Charizard ex,Charizard-ex','7b ex (anche col trattino), non Exeggcute');
 ok(pill(t,'cf-sigla').textContent.startsWith('ex'),'7b la pillola mostra la sigla'); eq(pill(t,'cf-sigla').getAttribute('aria-pressed'),'true','7b pillola accesa');
 set(t,'cf-sigla','EX'); eq(names(t),'Charizard EX,Mewtwo-EX','7b EX distinte dalle ex');
 set(t,'cf-sigla','V'); eq(names(t),'Pikachu V','7b V, non VMAX né Vaporeon');
 set(t,'cf-sigla','VSTAR'); eq(names(t),'Charizard V ASTRO,Arceus VSTAR','7b VSTAR anche col nome italiano V ASTRO');
 t.d.querySelector('#c-chips [data-qf="all"]').click(); eq(t.d.getElementById('cf-sigla').value,'','7b Tutte azzera la sigla');
 ok(!t.errors.length,'7b nessun errore');
 // 7. aggiunta: la carta trovata porta con sé il tipo
 const src=html.match(/function fromTcgdex[\s\S]*?\n}/)[0];
 ok(/types:normTypes\(c\.types\)/.test(src),'7 fromTcgdex porta i tipi');
 console.log('filtri_tipo: '+n+' controlli superati, errori: nessuno'); process.exit(0);
})().catch(err=>{ console.error(err.message); process.exit(1); });
