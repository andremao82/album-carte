const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8'); const wait=ms=>new Promise(r=>setTimeout(r,ms)); const now=Date.now();
const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
const mk=(id,variant,price,pr,o={})=>({key:`tcgdex:it:${id}|IT|${variant}|NM`,cardId:`tcgdex:it:${id}`,name:'Carta '+id,setName:'Set',number:'1',total:'10',img:'x',lang:'IT',variant,cond:'NM',qty:1,price,priceManual:null,pr,added:now,src:'tcgdex',srcId:id,srcLang:'it',setId:'s1',...o});
const rich={normal:2,reverse:5,avg30:2,tcg:{normal:3,holo:8,reverse:6,first:100},fx:0.9,vars:{normal:true,reverse:true,holo:false,first:true}};
const seed=()=>[mk('s1-001','Normale',2,rich), mk('s1-002','Reverse holo',5,{normal:1,reverse:5,avg30:1,tcg:{normal:3,reverse:6},fx:0.9,vars:{normal:true,reverse:true,holo:false,first:false}}), mk('s1-003','Normale',4,{normal:4,reverse:null,avg30:4}), mk('s1-004','Holo',7,{normal:7,avg30:7,vars:{normal:false,reverse:false,holo:true,first:false}})];
const cardDetail={id:'s1-009',localId:'009',name:'Solo Holo',rarity:'Rara',image:'https://x/9',set:{id:'s1',name:'Set',cardCount:{official:10,total:10}},
  variants:{normal:false,reverse:false,holo:true,firstEdition:false},
  pricing:{cardmarket:{trend:6.5,avg30:6},tcgplayer:{updated:'x',unit:'USD',normal:{marketPrice:null},'reverse-holofoil':{marketPrice:9},holofoil:{marketPrice:10,midPrice:11},'1st-edition-holofoil':{marketPrice:200},'unlimited-holofoil':{marketPrice:50}}}};
function boot(fxRate){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
 const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,beforeParse(w){ w.localStorage.setItem('pkm_catalog',JSON.stringify(seed())); w.localStorage.setItem('pkm_fx',JSON.stringify({t:Date.now(),r:0.9,d:'2026-10-16'}));
  w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true});
  w.fetch=async(u)=>{u=String(u); if(u.includes('frankfurter')) return J({base:'USD',date:'2026-10-17',rates:{EUR:fxRate||0.9}}); if(/\/it\/sets$/.test(u)) return J([{id:'s1',name:'Set',cardCount:{official:10,total:10}}]);
    if(/\/it\/sets\/s1$/.test(u)) return J({id:'s1',cards:[{id:'s1-009',localId:'009',name:'Solo Holo'}]}); if(/\/it\/cards\/s1-009$/.test(u)) return J(cardDetail); return J({},404)}; }});
 return {w:dom.window,d:dom.window.document,errors}; }
const cat=t=>JSON.parse(t.w.localStorage.getItem('pkm_catalog'));
const txt=(t,sel)=>{const el=t.d.querySelector(sel);return el?el.textContent.replace(/\s+/g,' ').trim():null};
const fire=(t,id,v)=>{const el=t.d.getElementById(id); el.value=v; el.dispatchEvent(new t.w.Event('change',{bubbles:true}));};
const open=(t,name)=>{ t.d.querySelector('nav button[data-go="cat"]').click(); [...t.d.querySelectorAll('#list .item')].find(r=>r.getAttribute('aria-label').includes(name)).click(); };
(async()=>{
 const t=boot(); await wait(250); open(t,'s1-001');
 const vv=[...t.d.querySelectorAll('#v-card [data-ed="variant"]')]; console.log('1 varianti offerte (manca Holo, non esiste):',vv.map(b=>b.dataset.v).join(', '));
 if(vv.some(b=>b.dataset.v==='Holo')) throw new Error('Holo non dovrebbe esserci');
 console.log('1 prezzi per variante nelle pillole:',vv.map(r=>r.textContent.replace(/\s+/g,' ').trim()+(r.getAttribute('aria-pressed')==='true'?' *':'')).join(' | '));
 t.d.querySelector('#v-card [data-ed="variant"][data-v="1st edition"]').click(); console.log('2 variante 1st edition: prezzo:',txt(t,'#v-card .cd-price .v'),'(atteso 100 $ × 0,9 = 90,00 €) | fonte:',txt(t,'#v-card .cd-price .cap'),'| salvato:',cat(t).find(e=>e.name==='Carta s1-001').price);
 if(cat(t).find(e=>e.name==='Carta s1-001').price!==90) throw new Error('prezzo 1st edition');
 t.d.querySelector('#v-card [data-ed="variant"][data-v="Reverse holo"]').click(); console.log('2 reverse holo (Cardmarket):',txt(t,'#v-card .cd-price .v'));
 // 3) cambio di fonte
 t.d.querySelector('#v-card [data-a="back"]').click(); await wait(100); t.d.getElementById('hm-gear').click();
 console.log('3 impostazione:',t.d.getElementById('s-psrc').value,'| cambio:',txt(t,'#fxstate'));
 fire(t,'s-psrc','tcg'); const c1=cat(t); console.log('3 TCGplayer: prezzi ricalcolati:',c1.map(e=>e.name+' '+e.variant+' '+e.price.toFixed(2)).join(' | ')); console.log('3 avviso:',txt(t,'#toast'));
 fire(t,'s-psrc','cm'); const c2=cat(t); console.log('3 di nuovo Cardmarket:',c2.map(e=>e.price.toFixed(2)).join(', '));
 // 4) carta senza prezzi TCGplayer: la 1st edition usa il prezzo base segnalato
 t.d.querySelector('nav button[data-go="cat"]').click(); open(t,'s1-003'); console.log('4 carta senza TCGplayer né varianti note: varianti offerte:',t.d.querySelectorAll('#v-card [data-ed="variant"]').length);
 // 5) aggiunta dal set: carta che esiste solo in holo
 t.d.querySelector('#v-card [data-a="back"]').click(); await wait(100);
 t.d.querySelector('nav button[data-go="sets"]').click(); await wait(200); t.d.querySelector('#sets-list [data-set]').click(); await wait(300);
 t.d.querySelector('#v-setd .scell[data-n="009"]').click(); await wait(400);
 const n=cat(t).find(e=>e.srcId==='s1-009'); console.log('5 aggiunta dal set: variante scelta:',n&&n.variant,'| prezzo:',n&&n.price,'| varianti esistenti:',JSON.stringify(n&&n.pr.vars));
 console.log('5 prezzi TCGplayer letti:',JSON.stringify(n&&n.pr.tcg),'(unlimited ignorato, normal nullo ignorato)');
 // 6) cambio dollaro-euro aggiornato dalla rete
 const t2=boot(0.5); t2.w.localStorage.setItem('pkm_fx',JSON.stringify({t:0,r:0.9,d:'2026-10-01'})); await wait(100);
 const t3=boot(0.5); await wait(100);
 console.log('errori:',[t,t2,t3].flatMap(x=>x.errors).length?'ci sono errori':'nessuno'); process.exit(0);
})();
