const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8'); const wait=ms=>new Promise(r=>setTimeout(r,ms)); const DAY=864e5;
let clock=Date.UTC(2026,9,17,12); const D=()=>Math.floor(clock/DAY);
const mk=(n,name,price,o={})=>({key:`c${n}|IT|Normale|NM`,cardId:'c'+n,name,setName:'Set',number:String(n),total:'10',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty:1,price,priceManual:null,added:clock,...o});
const seedCat=()=>[mk(1,'Salita',10,{qty:2}),mk(2,'Scesa',3),mk(3,'Manuale',2,{priceManual:7}),mk(4,'Solo oggi',2),mk(5,'Recente',5)];
const seedHist=()=>({'c1|n':[[D()-30,800],[D()-10,900],[D(),1000]],'c2|n':[[D()-30,500],[D(),300]],'c3|n':[[D()-30,100],[D(),200]],'c4|n':[[D(),200]],'c5|n':[[D()-5,400],[D(),500]]});
const seedV=()=>[[D()-30,3000,5],[D()-10,3300,5],[D(),3700,6]];
function boot(opts={}){ const errors=[],bak=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
 const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,beforeParse(w){ const R=w.Date; w.Date=class extends R{constructor(...a){a.length?super(...a):super(clock)} static now(){return clock}};
  w.localStorage.setItem('pkm_catalog',JSON.stringify(opts.cat||seedCat())); if(!opts.noHist){ w.localStorage.setItem('pkm_hist',JSON.stringify({v:1,s:seedHist()})); w.localStorage.setItem('pkm_vhist',JSON.stringify({v:1,s:opts.v||seedV()})); }
  w.localStorage.setItem('pkm_fx',JSON.stringify({t:clock,r:0.9,d:'x'}));
  w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=async()=>({ok:false,status:500,json:async()=>({})});
  w.Capacitor={isNativePlatform:()=>true,Plugins:{Filesystem:{writeFile:async o=>{bak.push(o);return{uri:'file:///x'}}},Share:{share:async()=>{}}}}; }});
 return {w:dom.window,d:dom.window.document,errors,bak}; }
const txt=(t,sel)=>{const el=t.d.querySelector(sel);return el?el.textContent.replace(/\s+/g,' ').trim():null};
const rail=(t,title)=>{ const h=[...t.d.querySelectorAll('#v-home .sec h2')].find(x=>x.textContent===title); if(!h) return null; const r=h.closest('.sec').nextElementSibling; return [...r.querySelectorAll('.tile')].map(x=>x.querySelector('.t').textContent+' '+x.querySelector('.p').textContent).join(' | '); };
const vh=t=>JSON.parse(t.w.localStorage.getItem('pkm_vhist')||'null');
(async()=>{
 let t=boot(); await wait(300);
 console.log('1 sezione Andamento:',!!t.d.querySelector('#v-home svg.chart'),'| periodi:',[...t.d.querySelectorAll('#v-home [data-r]')].map(b=>b.textContent+(b.getAttribute('aria-pressed')==='true'?'*':'')).join(' / '));
 console.log('1 riepilogo (30 giorni):',[...t.d.querySelectorAll('#v-home .vk div')].map(r=>r.textContent.replace(/\s+/g,' ').trim()).join(' || '));
 console.log('1 attesi: valore +7,00 € (+23,3%) da 30,00 a 37,00; prezzi +3,00 € (+12,0%) = +4 −2 +1 su base 25');
 console.log('2 carte salite:',rail(t,'Carte salite')); console.log('2 carte scese:',rail(t,'Carte scese'));
 t.d.querySelector('#v-home [data-r="7"]').click(); console.log('3 periodo 7 giorni:',[...t.d.querySelectorAll('#v-home .vk div')].map(r=>r.textContent.replace(/\s+/g,' ').trim()).join(' || '),'| salite:',rail(t,'Carte salite'),'| scese:',rail(t,'Carte scese'));
 t.d.querySelector('#v-home [data-r="0"]').click(); console.log('3 periodo Tutto:',txt(t,'#v-home .vk div'),'| selezionato:',txt(t,'#v-home [data-r][aria-pressed="true"]'));
 // il punto di oggi segue il valore reale
 console.log('4 punti del valore:',JSON.stringify(vh(t).s.map(p=>p.join(','))));
 // giorno dopo: aprendo la Home si aggiunge un punto, senza modificare nulla
 clock+=DAY; t.d.querySelector('nav button[data-go="cat"]').click(); t.d.querySelector('nav button[data-go="home"]').click(); await wait(1300);
 console.log('5 il giorno dopo:',JSON.stringify(vh(t).s.map(p=>p.join(','))));
 // modifica di una quantità: il punto di oggi si aggiorna (non se ne aggiunge un altro)
 t.d.querySelector('nav button[data-go="cat"]').click(); t.d.querySelector('#list .item').click(); t.d.querySelector('#v-card [data-a="qplus"]').click(); await wait(1300);
 console.log('6 +1 copia: punti:',vh(t).s.length,'| ultimo:',vh(t).s[vh(t).s.length-1].join(','));
 // backup e cancellazione
 t.d.getElementById('hm-gear').click(); t.d.getElementById('btn-bak').click(); await wait(100); const j=JSON.parse(t.bak[0].data); console.log('7 backup contiene storico valore:',Array.isArray(j.vhist),j.vhist.length,'punti | storico prezzi:',Object.keys(j.hist).length,'serie');
 console.log('7 stato:',txt(t,'#histstate'));
 t.d.getElementById('btn-histdel').click(); console.log('7 dopo cancellazione:',txt(t,'#histstate'),'|',JSON.stringify(vh(t).s));
 // senza storico
 const t2=boot({noHist:true}); await wait(300); console.log('8 senza storico:',txt(t2,'#v-home .status')?.slice(0,70),'| grafico:',!!t2.d.querySelector('#v-home svg.chart'),'| salite/scese:',rail(t2,'Carte salite'),rail(t2,'Carte scese'));
 console.log('errori:',[t,t2].flatMap(x=>x.errors).length?[t,t2].flatMap(x=>x.errors):'nessuno'); process.exit(0);
})();
