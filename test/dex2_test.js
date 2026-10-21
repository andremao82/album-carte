const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const now=Date.now();
const mk=(srcId,name,o={})=>({key:`tcgdex:it:${srcId}|IT|Normale|NM`,cardId:`tcgdex:it:${srcId}`,name,setName:'Set',number:srcId.split('-')[1],total:'100',img:'x/low.webp',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:1,added:now,src:'tcgdex',srcId,srcLang:'it',cat:'Pokemon',tt:'',ill:'',dex:[],...o});
const seed=()=>[
 mk('a-1','Bulbasaur',{dex:[1],ill:'Mitsuhiro Arita'}), mk('a-2','Pikachu',{dex:[25],qty:2,ill:'Atsuko Nishida'}), mk('a-3','Pikachu',{dex:[25],ill:'Mitsuhiro Arita'}),
 mk('t-1',"Professor's Research",{cat:'Trainer',tt:'Aiuto',ill:'Ken Sugimori'}), mk('t-2','Ball',{cat:'Trainer',tt:'Oggetto',ill:'Ken Sugimori'}), mk('e-1','Fire Energy',{cat:'Energy',ill:'Ken Sugimori'}),
 {key:'z-9|IT|Normale|NM',cardId:'tcgdex:it:z-9',name:'Charmander',setName:'Set',number:'9',total:'100',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:1,added:now,src:'tcgdex',srcId:'z-9',srcLang:'it'}];  // senza dati: da leggere
const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
const rc=(ids)=>ids.map(id=>({id,localId:id.split('-')[1],name:'C '+id,image:'https://img/'+id}));
const species={results:Array.from({length:1025},(_,i)=>({name:i===0?'bulbasaur':i===24?'pikachu':i===3?'charmander':'pokemon-'+(i+1),url:`https://pokeapi.co/api/v2/pokemon-species/${i+1}/`}))};
const details={'a-1':{dexId:[1],category:'Pokémon',illustrator:'Mitsuhiro Arita'},'z-9':{dexId:[4],category:'Pokémon',illustrator:'Atsuko Nishida'},'a-4':{dexId:[25],category:'Pokémon',illustrator:'Atsuko Nishida'},'k-1':{dexId:[],category:'Allenatore',trainerType:'Aiuto',illustrator:'Kenji X'}};
let fail=false, calls=[];
const api=async(url)=>{url=String(url); calls.push(url.replace('https://api.tcgdex.net/v2/','')); 
  if(url.includes('pokeapi')) return J(species);
  let m=url.match(/\/(it|en)\/cards\/([^/?]+)$/); if(m){ const d=details[m[2]]||{dexId:[],category:'Pokémon',illustrator:''}; return J({id:m[2],localId:m[2].split('-')[1],name:'Carta '+m[2],image:'https://img/'+m[2],set:{id:'s',name:'S',cardCount:{official:100,total:100}},pricing:{cardmarket:{trend:2,avg30:2}},...d}); }
  m=url.match(/\/(it|en)\/dex-ids\/(\d+)$/); if(m){ if(fail) return J({},500); const n=+m[2], l=m[1]; if(n===25) return J({name:'25',cards:rc(l==='en'?['a-2','a-3','a-4','a-5','a-6','a-7','a-8','a-9','a-10']:['a-2','a-3','a-4','a-5','a-6'])}); if(n===1) return J({name:'1',cards:rc(['a-1','b-1','b-2'])}); return J({name:String(n),cards:rc(Array.from({length:n%5+1},(_,i)=>'d'+n+'-'+(i+1)))}); }
  if(/\/it\/illustrators$/.test(url)) return J(['Mitsuhiro Arita','Atsuko Nishida','Ken Sugimori','Kenji X','Tomokazu Komiya']);
  m=url.match(/\/it\/illustrators\/(.+)$/); if(m){ const nm=decodeURIComponent(m[1]); if(nm==='Mitsuhiro Arita') return J({name:nm,cards:rc(['a-1','a-3','c-1','c-2','c-3','c-4'])}); if(nm==='Kenji X') return J({name:nm,cards:rc(['k-1','k-2'])}); return J({name:nm,cards:rc(['q-1'])}); }
  if(url.includes('api.pokemontcg.io')) return J({data:[]});
  return J({},404)};
function boot(){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
   beforeParse(w){ w.localStorage.setItem('pkm_catalog',JSON.stringify(seed())); w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=api; }});
  return {w:dom.window,d:dom.window.document,errors,ls:dom.window.localStorage}; }
const vis=(t,id)=>!t.d.getElementById(id).hidden;
const txt=(t,sel)=>{const el=t.d.querySelector(sel);return el?el.textContent.replace(/\s+/g,' ').trim():null};
const cell=(t,n)=>{const c=t.d.querySelector(`#dex-body .dcell[data-n="${n}"]`);return c?c.querySelector('.b, b').textContent+' → '+c.querySelector('.cn').textContent:null};
const fire=(t,id,v)=>{const el=t.d.getElementById(id); el.value=v; el.dispatchEvent(new t.w.Event('change',{bubbles:true}));};
(async()=>{
 const t=boot(); await wait(250);
 t.d.querySelector('nav button[data-go="dex"]').click(); await wait(800);
 const sv=JSON.parse(t.ls.getItem('pkm_catalog')); const z=sv.find(e=>e.srcId==='z-9');
 console.log('1 selettore:',[...t.d.querySelectorAll('#v-dex [data-cat]')].map(b=>b.textContent+(b.getAttribute('aria-pressed')==='true'?'*':'')).join(' | '));
 console.log('1 dati letti per la carta senza dati:',JSON.stringify({dex:z.dex,cat:z.cat,ill:z.ill}),'| nota:',JSON.stringify(txt(t,'#dex-note')));
 console.log('2 celle (carte possedute/esistenti):',[cell(t,1),cell(t,4),cell(t,25),cell(t,2)].join(' || '));
 console.log('2 attesi: Bulbasaur 1/3, Charmander 1/(n%5+1=5)=1/5, Pikachu 2/5 (a-2,a-3 su 5), #2 0/3');
 const tot=JSON.parse(t.ls.getItem('pkm_dextot')||'null'); console.log('3 totali conservati per lingua:',tot?Object.keys(tot).join(','):'(ancora in attesa di salvataggio)');
 fire(t,'dex-lang','en'); await wait(900); console.log('4 lingua inglese: Pikachu →',cell(t,25));
 fire(t,'dex-lang','it'); await wait(100);
 // dettaglio Pokémon
 t.d.querySelector('#dex-body .dcell[data-n="25"]').click(); await wait(300);
 const lh=()=>[...t.d.querySelectorAll('#v-dexd .lhead')].map(x=>x.textContent).join(' | ');
 console.log('5 dettaglio:',txt(t,'#v-dexd .ttl'),'|',lh(),'| caselle:',t.d.querySelectorAll('#v-dexd .scell').length,'(possedute',t.d.querySelectorAll('#v-dexd .scell.own').length+')');
 if(t.d.querySelectorAll('#v-dexd .scell.own').length!==2) throw new Error('possedute attese: 2');
 const order=[...t.d.querySelectorAll('#v-dexd .scell')].map(c=>c.classList.contains('own')?'P':'m').join(''); console.log('5 ordine (prima le possedute):',order); if(order!=='PPmmm') throw new Error('ordine sbagliato');
 t.d.querySelector('#v-dexd .scell[data-cid="a-4"]').click(); await wait(400);
 const added=JSON.parse(t.ls.getItem('pkm_catalog')).find(e=>e.srcId==='a-4'); console.log('6 aggiunta dalla lista:',added&&JSON.stringify({lang:added.lang,dex:added.dex,cat:added.cat,ill:added.ill}),'| ora:',lh());
 if(!added) throw new Error('carta non aggiunta');
 t.d.querySelector('#v-dexd .scell.own').click(); console.log('7 tocco su carta posseduta -> pagina carta:',vis(t,'v-card'));
 t.d.querySelector('#v-card [data-a="back"]').click(); await wait(100); console.log('7 indietro -> dettaglio:',vis(t,'v-dexd'));
 t.d.querySelector('#v-dexd [data-a="back"]').click(); await wait(100); console.log('7 indietro -> Pokédex:',vis(t,'v-dex'),'| cella Pikachu ora:',cell(t,25));
 const rows=()=>[...t.d.querySelectorAll('#dex-body .lrow')].map(r=>r.textContent.replace(/\s+/g,' ').trim()).join(' | ');
 t.d.querySelector('#v-dex [data-cat="trainer"]').click();
 console.log('8 Allenatori:',txt(t,'#v-dex .dstat'),'|',rows());
 t.d.querySelector('#dex-body [data-grp][data-tt="Aiuto"]').click(); await wait(100);
 console.log('8 dettaglio gruppo:',vis(t,'v-dexd'),txt(t,'#v-dexd .ttl'),'| carte:',t.d.querySelectorAll('#v-dexd .item').length);
 t.d.querySelector('#v-dexd [data-a="back"]').click(); await wait(100); console.log('8 indietro: categoria mantenuta:',[...t.d.querySelectorAll('#v-dex [data-cat]')].find(b=>b.getAttribute('aria-pressed')==='true').textContent);
 t.d.querySelector('#v-dex [data-cat="energy"]').click(); console.log('9 Energie:',txt(t,'#v-dex .dstat'),'|',rows());
 t.d.querySelector('#v-dex [data-cat="artist"]').click(); await wait(300);
 console.log('10 Artisti:',rows());
 const q=t.d.getElementById('dex-q'); q.value='ken'; q.dispatchEvent(new t.w.Event('input',{bubbles:true}));
 console.log('10 ricerca "ken":',rows());
 q.value=''; q.dispatchEvent(new t.w.Event('input',{bubbles:true}));
 t.d.querySelector('#dex-body [data-art="Mitsuhiro Arita"]').click(); await wait(300);
 console.log('11 artista:',txt(t,'#v-dexd .ttl'),'|',lh(),'| caselle:',t.d.querySelectorAll('#v-dexd .scell').length);
 t.d.querySelector('#v-dexd [data-a="back"]').click(); await wait(100);
 const q2=t.d.getElementById('dex-q'); q2.value='kenji'; q2.dispatchEvent(new t.w.Event('input',{bubbles:true})); t.d.querySelector('#dex-body [data-art="Kenji X"]').click(); await wait(300);
 console.log('12 artista non posseduto:',lh(),'| aggiungo k-1...'); t.d.querySelector('#v-dexd .scell[data-cid="k-1"]').click(); await wait(400);
 const k=JSON.parse(t.ls.getItem('pkm_catalog')).find(e=>e.srcId==='k-1'); console.log('12 voce:',k&&JSON.stringify({cat:k.cat,tt:k.tt,ill:k.ill}),'|',lh());
 // lista non raggiungibile
 fail=true; const t2=boot(); await wait(250); t2.d.querySelector('nav button[data-go="dex"]').click(); await wait(600);
 console.log('13 senza elenco: cella Pikachu →',cell(t2,25));
 t2.d.querySelector('#dex-body .dcell[data-n="25"]').click(); await wait(300); console.log('13 dettaglio:',(txt(t2,'#v-dexd p.cap')||'').slice(0,90),'| carte tue elencate:',t2.d.querySelectorAll('#v-dexd .item').length);
 console.log('errori:',[t,t2].flatMap(x=>x.errors).length?[t,t2].flatMap(x=>x.errors):'nessuno'); process.exit(0);
})();
