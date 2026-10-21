const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function boot(fetchImpl){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.detail&&e.detail.stack||e.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
   beforeParse(w){ w.confirm=()=>true; w.scrollTo=()=>{}; w.Element.prototype.scrollIntoView=()=>{};
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=fetchImpl; }});
  return {w:dom.window,d:dom.window.document,errors,ls:dom.window.localStorage}; }
const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
const setsList=[{id:'me01',name:'Megaevoluzione',cardCount:{official:132,total:188}},{id:'sv01',name:'Scarlatto e Violetto',cardCount:{official:198,total:258}},{id:'zz',name:'Altro',cardCount:{official:132,total:140}}];
const setDetail={me01:{cards:[{id:'me01-126',localId:'126',name:'Altra',image:'https://assets.tcgdex.net/it/me/me01/126'},{id:'me01-127',localId:'127',name:'Rovine Insidiose',image:'https://assets.tcgdex.net/it/me/me01/127'}]},zz:{cards:[{id:'zz-001',localId:'001',name:'X'}]}};
const cardDetail={'me01-127':{id:'me01-127',localId:'127',name:'Rovine Insidiose',rarity:'Comune',image:'https://assets.tcgdex.net/it/me/me01/127',set:{name:'Megaevoluzione',cardCount:{official:132,total:188}},pricing:{cardmarket:{unit:'EUR',avg:0.2,trend:0.21,'trend-holo':0.55}}}};
const tdOk=async(url)=>{ url=String(url);
  if(url.endsWith('/it/sets')) return J(setsList);
  let m=url.match(/\/it\/sets\/([^/?]+)$/); if(m) return setDetail[m[1]]?J(setDetail[m[1]]):J(null,404);
  m=url.match(/\/it\/cards\/([^/?]+)$/); if(m) return cardDetail[m[1]]?J(cardDetail[m[1]]):J(null,404);
  if(url.includes('/it/cards?name=')) return J([{id:'me01-127',localId:'127',name:'Rovine Insidiose'}]);
  if(url.includes('pokemontcg')) return J({},500);
  return J({},404); };
(async()=>{
 // 1) ricerca per numero + totale (carta italiana)
 let t=boot(tdOk); await wait(200);
 {const _x=t; _x.d.querySelector('nav button[data-go="cat"]').click(); _x.d.getElementById('fab').click(); _x.d.querySelector('[data-ad="search"]').click();};
 t.d.getElementById('f-num').value='127'; t.d.getElementById('f-tot').value='132'; t.d.getElementById('f-lang').value='it';
 t.d.getElementById('btn-search').click(); await wait(300);
 console.log('1 stato:',t.d.getElementById('status').textContent);
 console.log('1 candidati:',t.d.querySelectorAll('#cands .cand').length,'|',t.d.querySelector('#cands .cand')&&t.d.querySelector('#cands .cand').textContent.replace(/\s+/g,' ').trim());
 console.log('1 immagine:',t.d.querySelector('#cands img').getAttribute('src'));
 console.log('1 pannello aggiunta:',!!t.d.getElementById('ap-add'),'| prezzo:',t.d.getElementById('ap-price')&&t.d.getElementById('ap-price').textContent);
 t.d.getElementById('ap-var').value='Reverse holo'; t.d.getElementById('ap-var').dispatchEvent(new t.w.Event('change'));
 console.log('1 prezzo reverse:',t.d.getElementById('ap-price').textContent);
 t.d.getElementById('ap-add').click();
 const e=JSON.parse(t.ls.getItem('pkm_catalog'))[0]; console.log('1 voce in catalogo:',JSON.stringify({name:e.name,set:e.setName,n:e.number+'/'+e.total,price:e.price,src:e.src,srcId:e.srcId,srcLang:e.srcLang}));
 // 2) aggiornamento prezzi della voce TCGdex
 cardDetail['me01-127'].pricing.cardmarket['trend-holo']=0.77;
 t.d.querySelector('nav button[data-go="cat"]').click(); t.d.getElementById('btn-refresh').click(); await wait(400);
 console.log('2 prezzo dopo aggiornamento:',JSON.parse(t.ls.getItem('pkm_catalog'))[0].price);
 // 3) TCGdex giù -> ripiego sulla Pokémon TCG API
 const ptcgCard={id:'mep-127',name:'Lurking Ruins',number:'127',set:{name:'Mega Evolution',printedTotal:132},images:{small:'x'},cardmarket:{prices:{trendPrice:0.4}}};
 t=boot(async(url)=>{url=String(url); if(url.includes('tcgdex')) throw new TypeError('Load failed'); if(url.includes('pokemontcg')) return J({data:[ptcgCard]}); return J({},404)}); await wait(200);
 t.d.getElementById('f-num').value='127'; t.d.getElementById('f-tot').value='132'; t.d.getElementById('btn-search').click(); await wait(300);
 console.log('3 stato:',t.d.getElementById('status').textContent,'| candidati:',t.d.querySelectorAll('#cands .cand').length);
 // 4) tutte e due giù
 t=boot(async(url)=>{url=String(url); if(url.includes('tcgdex')) throw new TypeError('Load failed'); return J({},500)}); await wait(200);
 t.d.getElementById('f-num').value='127'; t.d.getElementById('f-tot').value='132'; t.d.getElementById('btn-search').click(); await wait(300);
 console.log('4 stato:',t.d.getElementById('status').textContent);
 // 5) TCGdex senza set corrispondente -> ricerca per nome
 t=boot(async(url)=>{url=String(url); if(url.endsWith('/it/sets')) return J([{id:'a',name:'A',cardCount:{official:10}}]); if(/\/it\/sets\/a$/.test(url)) return J({cards:[]}); return tdOk(url)}); await wait(200);
 t.d.getElementById('f-name').value='Rovine Insidiose'; t.d.getElementById('f-num').value='127'; t.d.getElementById('f-tot').value='999'; t.d.getElementById('btn-search').click(); await wait(300);
 console.log('5 stato:',t.d.getElementById('status').textContent);
 console.log('errori:',[t.errors].flat().length?t.errors:'nessuno');
 process.exit(0);
})();
