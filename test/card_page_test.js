const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const seed=[
 {key:'tcgdex:it:me01-127|IT|Normale|NM',cardId:'tcgdex:it:me01-127',name:'Rovine Insidiose',setName:'Megaevoluzione',number:'127',total:'132',img:'https://assets.tcgdex.net/it/me/me01/127/low.webp',lang:'IT',variant:'Normale',cond:'NM',qty:2,price:0.21,pr:{normal:0.21,reverse:0.55,avg1:0.2,avg7:0.18,avg30:0.16},priceT:Date.now(),rarity:'Comune',priceManual:null,added:Date.now(),src:'tcgdex',srcId:'me01-127',srcLang:'it'},
 {key:'old-1|IT|Normale|NM',cardId:'old-1',name:'Pikachu',setName:'Base',number:'58',total:'102',img:'https://images.pokemontcg.io/base1/58.png',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:1.5,added:1},
 {key:'tcgdex:it:me01-127|IT|Reverse holo|NM',cardId:'tcgdex:it:me01-127',name:'Rovine Insidiose',setName:'Megaevoluzione',number:'127',total:'132',img:'x/low.webp',lang:'IT',variant:'Reverse holo',cond:'NM',qty:1,price:0.55,pr:{normal:0.21,reverse:0.55},added:2,src:'tcgdex',srcId:'me01-127',srcLang:'it'}];
function boot(fetchImpl,promptVal,confirmVal=true){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.detail&&e.detail.stack||e.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
   beforeParse(w){ w.localStorage.setItem('pkm_catalog',JSON.stringify(seed)); w.confirm=()=>confirmVal; w.prompt=()=>promptVal; w.scrollTo=()=>{}; w.Element.prototype.scrollIntoView=()=>{};
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=fetchImpl||(async()=>({ok:false,status:500,json:async()=>({})})); }});
  return {w:dom.window,d:dom.window.document,errors,ls:dom.window.localStorage}; }
const vis=(t,id)=>!t.d.getElementById(id).hidden;
const txt=(t,sel)=>{const el=t.d.querySelector(sel);return el?el.textContent.replace(/\s+/g,' ').trim():null};
(async()=>{
 let t=boot(); await wait(200); t.d.querySelector('nav button[data-go="cat"]').click();
 console.log('1 righe nel catalogo:',t.d.querySelectorAll('#list .item').length,'| pulsanti azione nelle righe:',t.d.querySelectorAll('#list .acts').length);
 t.d.querySelector('#list .item').click();
 console.log('2 pagina carta visibile:',vis(t,'v-card'),'| catalogo nascosto:',!vis(t,'v-cat'),'| tab attivo:',[...t.d.querySelectorAll('nav button')].find(b=>b.getAttribute('aria-current')==='true').dataset.go,'| fab:',vis(t,'fab'));
 const pressed=k=>{const b=t.d.querySelector('#v-card [data-ed="'+k+'"][aria-pressed="true"]');return b?b.dataset.v:null;};
 console.log('2 nome:',txt(t,'#v-card .cd-name'),'| set:',txt(t,'#v-card .cd-set'),'| prezzo grande:',txt(t,'#v-card .cd-price .v'),'| fonte:',txt(t,'#v-card .cd-price .cap'));
 console.log('2 storico:',txt(t,'#v-card .hist .cap'),'| immagine alta qualità:',t.d.getElementById('cd-img').getAttribute('src'));
 console.log('2 pillole:',['lang','variant','cond'].map(pressed).join(', '),'| quantità:',txt(t,'#v-card .qctl b'),'| totale:',txt(t,'#v-card .cd-price .q'));
 if(!t.d.getElementById('cd-img').getAttribute('src').endsWith('/high.webp')) throw new Error('immagine non in alta qualità');
 t.d.querySelector('#v-card [data-a="qplus"]').click(); console.log('3 dopo +:',txt(t,'#v-card .qctl b'),'| salvato:',JSON.parse(t.ls.getItem('pkm_catalog'))[0].qty);
 if(JSON.parse(t.ls.getItem('pkm_catalog'))[0].qty!==3) throw new Error('quantità non salvata');
 // prezzo mio (campo nella scheda, come la nativa)
 const pm=t.d.getElementById('cd-pm'); pm.value='0,50'; pm.dispatchEvent(new t.w.Event('change',{bubbles:true}));
 console.log('4 prezzo mio:',txt(t,'#v-card .cd-price .v'),'|',txt(t,'#v-card .cd-price .cap'));
 if(JSON.parse(t.ls.getItem('pkm_catalog'))[0].priceManual!==0.5) throw new Error('prezzo mio non salvato');
 const pm2=t.d.getElementById('cd-pm'); pm2.value=''; pm2.dispatchEvent(new t.w.Event('change',{bubbles:true})); console.log('4 torna al mercato:',txt(t,'#v-card .cd-price .v'));
 if(JSON.parse(t.ls.getItem('pkm_catalog'))[0].priceManual!=null) throw new Error('prezzo mio non tolto');
 const note=t.d.getElementById('cd-note'); note.value='raccoglitore 2'; note.dispatchEvent(new t.w.Event('change',{bubbles:true}));
 console.log('5 nota salvata:',JSON.parse(t.ls.getItem('pkm_catalog'))[0].note);
 // variante -> reverse: esiste già una voce uguale -> unione
 t.w.confirm=()=>true; t.d.querySelector('#v-card [data-ed="variant"][data-v="Reverse holo"]').click();
 const cat=JSON.parse(t.ls.getItem('pkm_catalog')); console.log('6 dopo unione: voci',cat.length,'| quantità reverse:',cat.find(x=>x.variant==='Reverse holo').qty,'| pagina mostra:',txt(t,'#v-card .qctl b'),txt(t,'#v-card .cd-price .v'));
 if(cat.length!==2||cat.find(x=>x.variant==='Reverse holo').qty!==4) throw new Error('unione non riuscita');
 t.d.querySelector('#v-card [data-ed="cond"][data-v="EX"]').click();
 console.log('7 condizione cambiata:',JSON.parse(t.ls.getItem('pkm_catalog')).map(x=>x.cond+'|'+x.variant).join(' ; '));
 t.d.querySelector('#v-card [data-a="back"]').click(); await wait(100);
 console.log('8 dopo Indietro -> catalogo visibile:',vis(t,'v-cat'),'| pagina carta nascosta:',!vis(t,'v-card'));
 [...t.d.querySelectorAll('#list .item')].find(x=>x.getAttribute('aria-label').startsWith('Pikachu')).click();
 console.log('9 carta vecchia:',txt(t,'#v-card .cd-name'),'| prezzo:',txt(t,'#v-card .cd-price .v'),'| storico:',txt(t,'#v-card .hist .cap'));
 // aggiorna prezzo singolo (TCGdex)
 t.d.querySelector('#v-card [data-a="back"]').click(); await wait(100);
 let t2=boot(async(url)=>({ok:true,status:200,json:async()=>({id:'me01-127',localId:'127',name:'Rovine Insidiose',set:{name:'Megaevoluzione',cardCount:{official:132}},pricing:{cardmarket:{trend:0.4,avg:0.3,avg1:0.39,avg7:0.35,avg30:0.2,'trend-holo':0.9}}})})); await wait(200); t2.d.querySelector('nav button[data-go="cat"]').click();
 t2.d.querySelector('#list .item').click(); t2.d.querySelector('#v-card [data-a="refresh"]').click(); await wait(300);
 console.log('10 dopo aggiorna prezzo:',txt(t2,'#v-card .cd-price .v'));
 // elimina
 t2.d.querySelector('#v-card [data-a="del"]').click(); await wait(100);
 console.log('11 dopo eliminazione: voci',JSON.parse(t2.ls.getItem('pkm_catalog')).length,'| catalogo visibile:',vis(t2,'v-cat'));
 // filtro per set
 let t3=boot(); await wait(200); t3.d.querySelector('nav button[data-go="cat"]').click(); t3.d.querySelector('#list .item').click(); t3.d.querySelector('#v-card [data-a="set"]').click(); await wait(150);
 console.log('12 Set -> dettaglio del set:',vis(t3,'v-setd'));
 console.log('errori:',[t,t2,t3].flatMap(x=>x.errors).length?[t,t2,t3].flatMap(x=>x.errors):'nessuno');
 process.exit(0);
})();
