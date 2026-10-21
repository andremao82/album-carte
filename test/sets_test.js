const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const now=Date.now();
const mk=(id,num,name,set,setId,extra={})=>({key:`tcgdex:it:${id}|IT|Normale|NM`,cardId:`tcgdex:it:${id}`,name,setName:set,number:num,total:'6',img:`https://assets.tcgdex.net/it/me/${setId}/${num}/low.webp`,lang:'IT',variant:'Normale',cond:'NM',qty:1,price:0.5,pr:{normal:0.5,avg30:0.4},added:now,src:'tcgdex',srcId:id,srcLang:'it',...extra});
const seed=[mk('me01-001','001','Carta uno','Megaevoluzione','me01',{setId:'me01'}), mk('me01-003','003','Carta tre','Megaevoluzione','me01',{qty:2}), // il secondo senza setId: lo ricava da srcId
  mk('sv01-010','010','Altra','Scarlatto e Violetto','sv01',{setId:'sv01'}),
  {key:'old|IT|Normale|NM',cardId:'sv3pt5-58',name:'Pikachu',setName:'Base',number:'58',total:'102',img:'x.png',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:1.5,added:1}];
const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
const setsList=[{id:'me01',name:'Megaevoluzione',logo:'https://assets.tcgdex.net/it/me/me01/logo',cardCount:{official:6,total:8}},{id:'sv01',name:'Scarlatto e Violetto',cardCount:{official:198,total:258}},{id:'sv02',name:'Evoluzioni a Paldea',cardCount:{official:193,total:279}}];
const cardsOfMe01=[1,2,3,4,5,6,7,8].map(n=>({id:'me01-'+String(n).padStart(3,'0'),localId:String(n).padStart(3,'0'),name:'Carta '+n,image:'https://assets.tcgdex.net/it/me/me01/'+String(n).padStart(3,'0')}));
let fetched=[];
const api=async(url)=>{url=String(url); fetched.push(url.replace('https://api.tcgdex.net/v2/',''));
  if(url.endsWith('/it/sets')) return J(setsList);
  if(url.endsWith('/it/sets/me01')) return J({id:'me01',name:'Megaevoluzione',logo:'https://assets.tcgdex.net/it/me/me01/logo',cardCount:{official:6,total:8},cards:cardsOfMe01});
  if(url.endsWith('/it/sets/sv02')) return J({id:'sv02',name:'Evoluzioni a Paldea',cardCount:{total:3,official:3},cards:[{id:'sv02-001',localId:'001',name:'P1'},{id:'sv02-002',localId:'002',name:'P2'},{id:'sv02-003',localId:'003',name:'P3'}]});
  let m=url.match(/\/it\/cards\/([^/?]+)$/); if(m){ const lid=m[1].split('-')[1]; return J({id:m[1],localId:lid,name:'Carta '+parseInt(lid),rarity:'Comune',image:'https://assets.tcgdex.net/it/me/me01/'+lid,set:{id:'me01',name:'Megaevoluzione',cardCount:{official:6,total:8}},pricing:{cardmarket:{trend:0.3,avg30:0.2}}}); }
  return J({},404); };
function boot(){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.detail&&e.detail.stack||e.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
   beforeParse(w){ w.localStorage.setItem('pkm_catalog',JSON.stringify(seed)); w.confirm=()=>true; w.prompt=()=>null; w.scrollTo=()=>{}; w.Element.prototype.scrollIntoView=()=>{};
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=api; }});
  return {w:dom.window,d:dom.window.document,errors,ls:dom.window.localStorage}; }
const vis=(t,id)=>!t.d.getElementById(id).hidden;
const txt=(t,sel)=>{const el=t.d.querySelector(sel);return el?el.textContent.replace(/\s+/g,' ').trim():null};
const tab=t=>[...t.d.querySelectorAll('nav button')].find(b=>b.getAttribute('aria-current')==='true').dataset.go;
(async()=>{
 const t=boot(); await wait(200);
 console.log('1 voci nella barra:',[...t.d.querySelectorAll('nav button')].map(b=>b.textContent.trim()).join(' | '));
 t.d.querySelector('nav button[data-go="sets"]').click(); await wait(250);
 console.log('2 pagina Progressi visibile:',vis(t,'v-sets'),'| tab:',tab(t),'| riepilogo:',txt(t,'#sets-global'));
 console.log('2 righe:'); t.d.querySelector('#ss-filter [data-sf="all"]').click(); t.d.querySelectorAll('#sets-list .sprow').forEach(r=>console.log('    ',r.textContent.replace(/\s+/g,' ').trim(),'| logo:',!!r.querySelector('img')));
 t.d.getElementById('ss-q').value='mega'; t.d.getElementById('ss-q').dispatchEvent(new t.w.Event('input')); console.log('3 ricerca "mega":',t.d.querySelectorAll('#sets-list .sprow').length,'riga');
 t.d.getElementById('ss-q').value=''; t.d.getElementById('ss-q').dispatchEvent(new t.w.Event('input'));
 // dettaglio set
 t.d.querySelector('#sets-list [data-set^="td|it|me01"]').click(); await wait(250);
 console.log('4 dettaglio visibile:',vis(t,'v-setd'),'| tab:',tab(t),'| titolo:',txt(t,'#v-setd .ttl'),'| avanzamento:',txt(t,'#v-setd .sdr'));
 console.log('4 caselle:',t.d.querySelectorAll('#v-setd .scell').length,'(possedute',t.d.querySelectorAll('#v-setd .scell.own').length+', mancanti',t.d.querySelectorAll('#v-setd .scell.miss').length+')','| badge quantità:',[...t.d.querySelectorAll('#v-setd .qb')].map(x=>x.textContent).join(','),'| filtri:',[...t.d.querySelectorAll('#v-setd .seg button')].map(b=>b.textContent).join(' / '));
 // filtro mancanti
 t.d.querySelector('#v-setd [data-f="miss"]').click(); await wait(50);
 console.log('5 filtro Mancanti ->',t.d.querySelectorAll('#v-setd .scell').length,'caselle, numeri:',[...t.d.querySelectorAll('#v-setd .scell .n')].map(x=>x.textContent).join(','));
 // aggiungo una mancante
 t.d.querySelector('#v-setd .scell[data-n="002"]').click(); await wait(300);
 const cat=JSON.parse(t.ls.getItem('pkm_catalog')); const nuova=cat.find(e=>e.number==='002');
 console.log('6 aggiunta dalla pagina set -> voce:',nuova&&JSON.stringify({name:nuova.name,lang:nuova.lang,variant:nuova.variant,setId:nuova.setId,price:nuova.price}),'| ora mancanti:',t.d.querySelectorAll('#v-setd .scell').length,'|',txt(t,'#v-setd .sdr'));
 // apro una posseduta -> carta -> indietro torna al set
 t.d.querySelector('#v-setd [data-f="own"]').click(); await wait(50);
 t.d.querySelector('#v-setd .scell[data-n="003"]').click();
 console.log('7 carta aperta dal set:',vis(t,'v-card'),'| titolo:',txt(t,'#v-card .cd-name'),'| tab evidenziato:',tab(t));
 t.d.querySelector('#v-card [data-a="back"]').click(); await wait(100);
 console.log('7 indietro -> dettaglio set:',vis(t,'v-setd'),'| filtro ancora:',t.d.querySelector('#v-setd [aria-pressed="true"]').dataset.f);
 t.d.querySelector('#v-setd [data-a="back"]').click(); await wait(100);
 console.log('7 indietro -> elenco set:',vis(t,'v-sets'),'| tab:',tab(t));
 // sfoglia tutti i set
 t.d.getElementById('btn-browse').click(); await wait(250);
 console.log('8 sfoglia:',vis(t,'browse'),'| righe:',t.d.querySelectorAll('#browse-list .sprow').length,'|',[...t.d.querySelectorAll('#browse-list .t1 b')].map(x=>x.textContent).join(', '),'| progresso set non posseduto:',txt(t,'#browse-list [data-set="td|it|sv02"] .t1 span'));
 t.d.querySelector('#browse-list [data-set="td|it|sv02"]').click(); await wait(250);
 console.log('9 set non posseduto:',txt(t,'#v-setd .sdr'),'| caselle mancanti:',t.d.querySelectorAll('#v-setd .scell.miss').length);
 t.d.querySelector('#v-setd [data-a="back"]').click(); await wait(100);
 // set da pokemontcg (senza elenco)
 t.d.querySelector('#sets-list [data-set^="x|"]').click(); await wait(100);
 console.log('10 set senza elenco completo:',txt(t,'#v-setd .sdr'),'|',txt(t,'#v-setd p.cap').slice(0,60)+'…','| righe:',t.d.querySelectorAll('#v-setd .item').length);
 t.d.querySelector('#v-setd [data-a="back"]').click(); await wait(100);
 // dalla pagina carta del catalogo al set e ritorno
 t.d.querySelector('nav button[data-go="cat"]').click();
 const row=[...t.d.querySelectorAll('#list .item')].find(r=>r.getAttribute('aria-label').includes('Carta tre')); row.click();
 t.d.querySelector('#v-card [data-a="set"]').click(); await wait(250);
 console.log('11 dalla carta al set:',vis(t,'v-setd'),'| tab evidenziato:',tab(t),'|',txt(t,'#v-setd .ttl'));
 t.d.querySelector('#v-setd [data-a="back"]').click(); await wait(100);
 console.log('11 indietro -> carta:',vis(t,'v-card'));
 t.d.querySelector('#v-card [data-a="back"]').click(); await wait(100);
 console.log('11 indietro -> catalogo:',vis(t,'v-cat'),'| tab:',tab(t));
 console.log('chiamate di rete:',fetched.length,'| errori:',t.errors.length?t.errors:'nessuno');
 process.exit(0);
})();
