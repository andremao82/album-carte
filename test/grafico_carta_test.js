// Grafico del prezzo nella scheda carta: storico più fitto, medie Cardmarket come primi punti, periodi, tutto schermo
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const DAY=864e5;
const T0=Date.UTC(2026,9,1,12); let clock=T0;   // 1 ottobre 2026
const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
let trend=10;
const api=async(url)=>{url=String(url); if(/cards\/me01-127$/.test(url)) return J({id:'me01-127',localId:'127',name:'Rovine',rarity:'Comune',image:'https://x/127',set:{id:'me01',name:'Mega',cardCount:{official:132,total:188}},pricing:{cardmarket:{trend,avg7:9.5,avg30:9}},dexId:[]}); if(url.endsWith('/it/sets')) return J([]); return J({},404)};
const entry=(o={})=>({key:'tcgdex:it:me01-127|IT|Normale|NM',cardId:'tcgdex:it:me01-127',name:'Rovine',setName:'Mega',number:'127',total:'132',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:10,priceT:clock,pr:{normal:10,avg7:9.5,avg30:9},added:clock,src:'tcgdex',srcId:'me01-127',srcLang:'it',setId:'me01',...o});
function boot(seed,histSeed){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
   beforeParse(w){ const R=w.Date; w.Date=class extends R{constructor(...a){a.length?super(...a):super(clock)} static now(){return clock}};
    w.localStorage.setItem('pkm_catalog',JSON.stringify(seed)); if(histSeed) w.localStorage.setItem('pkm_hist',JSON.stringify({v:1,s:histSeed}));
    w.confirm=()=>true; w.prompt=()=>null; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=api; }});
  return {w:dom.window,d:dom.window.document,errors,ls:dom.window.localStorage}; }
const H=t=>{const h=JSON.parse(t.ls.getItem('pkm_hist')||'null'); return h&&h.s};
const day=ms=>Math.floor(ms/DAY);
let n=0; const ok=(c,m)=>{ if(!c) throw new Error('FALLITO: '+m); n++; console.log('ok',m); };
const openCard=t=>{ t.d.querySelector('nav button[data-go="cat"]').click(); t.d.querySelector('#list .item').click(); };
const svgOf=(t,root='#v-card')=>t.d.querySelector(root+' .hist svg.vch');
const ticks=svg=>[...svg.querySelectorAll(':scope > text')].map(x=>x.textContent);
const K='tcgdex:it:me01-127|n';
(async()=>{
 // 1) storico più fitto: una piccola variazione in un altro giorno è un punto nuovo; stesso prezzo no; stesso giorno sostituisce
 let t=boot([entry()]); await wait(300); openCard(t);
 const refresh=async(days,tr)=>{ clock=T0+days*DAY; trend=tr; t.d.querySelector('#v-card [data-a="refresh"]').click(); await wait(1300); return H(t)[K]; };
 let s=await refresh(1,10.1); ok(s.length===2&&s[1][1]===1010,'1 +1% il giorno dopo: nuovo punto ('+JSON.stringify(s)+')');
 s=await refresh(2,10.1); ok(s.length===2,'1 prezzo uguale: nessun punto');
 s=await refresh(3,10.05); ok(s.length===3&&s[2][1]===1005,'1 -0,05 €: nuovo punto');
 s=await refresh(3,10.2); ok(s.length===3&&s[2][1]===1020,'1 stesso giorno: sostituisce');

 // 2) medie Cardmarket come primi punti, vuoti, con la nota e il nome al tocco
 clock=T0; const t2=boot([entry()]); await wait(300); openCard(t2);
 let svg=svgOf(t2); ok(!!svg,'2 grafico anche con una sola rilevazione, grazie alle medie');
 ok(svg.querySelectorAll('circle.dt').length===3,'2 tre punti: media 30 gg, media 7 gg, prezzo');
 ok(svg.querySelectorAll('circle.dt.es').length===2,'2 le due medie sono punti vuoti');
 ok(/medie Cardmarket/.test(t2.d.querySelector('#v-card .hist .hnote').textContent),'2 nota delle medie sotto il grafico');
 ok(ticks(svg).includes('16 set')&&ticks(svg).includes('1 ott'),'2 date: media 30 gg a metà mese (16 set), prezzo il 1 ott ('+ticks(svg).join(' - ')+')');
 svg.dispatchEvent(new t2.w.MouseEvent('click',{bubbles:true,clientX:0}));
 ok(/Media Cardmarket 30 gg/.test(svg.querySelector('.sel').textContent)&&/9,00/.test(svg.querySelector('.sel').textContent),'2 tocco sul primo punto: "Media Cardmarket 30 gg" e 9,00 €');
 ok(/▲\s\+1,00\s€\sin 15 gg/.test(t2.d.querySelector('#v-card .hist .hh').textContent),'2 variazione dalla media 30 gg ('+t2.d.querySelector('#v-card .hist .hh span').textContent+')');

 // 3) niente medie per Reverse holo, né prima di uno storico già lungo
 const t3=boot([entry({key:'k|IT|Reverse holo|NM',variant:'Reverse holo',pr:{normal:10,reverse:12,avg7:9.5,avg30:9},price:12})]); await wait(300); openCard(t3);
 ok(!svgOf(t3),'3 Reverse holo: le medie (della carta normale) non si usano');
 const t3b=boot([entry()],{[K]:[[day(clock)-40,800],[day(clock),1000]]}); await wait(300); openCard(t3b);
 ok(svgOf(t3b).querySelectorAll('circle.dt.es').length===0&&!t3b.d.querySelector('#v-card .hist .hnote'),'3 storico più vecchio delle medie: niente medie');

 // 4) prezzo attuale in fondo se l'ultimo punto salvato è più vecchio
 const t4=boot([entry({pr:{normal:10}})],{[K]:[[day(clock)-20,800]]}); await wait(300); openCard(t4);
 svg=svgOf(t4); ok(svg&&svg.querySelectorAll('circle.dt').length===2&&ticks(svg).includes('1 ott'),'4 linea fino al prezzo di oggi');

 // 5) periodi: 1 mese / 3 mesi / 1 anno / Tutto
 const long=Array.from({length:200},(_,i)=>[day(clock)-199+i,1000+i*5]);
 const t5=boot([entry({price:19.95})],{[K]:long}); await wait(300); openCard(t5);
 const pills=[...t5.d.querySelectorAll('#v-card .hist [data-cr]')];
 ok(pills.map(b=>b.textContent).join('|')==='1 mese|3 mesi|1 anno|Tutto','5 pillole dei periodi');
 ok(pills[3].getAttribute('aria-pressed')==='true','5 predefinito: Tutto');
 ok(svgOf(t5).getAttribute('aria-label').includes('19,95'),'5 Tutto: ultimo valore 19,95 €');
 ok(ticks(svgOf(t5)).includes('16 mar'),'5 Tutto: parte da metà marzo ('+ticks(svgOf(t5)).join(' - ')+')');
 pills[0].click(); svg=svgOf(t5);
 ok(t5.d.querySelector('#v-card .hist [data-cr="30"]').getAttribute('aria-pressed')==='true','5 1 mese selezionato');
 ok(ticks(svg).includes('1 set')&&ticks(svg).includes('1 ott'),'5 1 mese: dal 1 set al 1 ott ('+ticks(svg).join(' - ')+')');
 ok(/in 30 gg/.test(t5.d.querySelector('#v-card .hist .hh span').textContent),'5 variazione sui 30 giorni ('+t5.d.querySelector('#v-card .hist .hh span').textContent+')');
 t5.d.querySelector('#v-card .hist [data-cr="0"]').click(); ok(ticks(svgOf(t5)).includes('16 mar'),'5 di nuovo Tutto');

 // 6) periodo senza variazioni: linea piatta dal prezzo che valeva all'inizio
 const t6=boot([entry({pr:{normal:10},priceT:clock-100*DAY})],{[K]:[[day(clock)-120,700],[day(clock)-100,1000]]}); await wait(300); openCard(t6);
 t6.d.querySelector('#v-card .hist [data-cr="30"]').click(); svg=svgOf(t6);
 ok(svg&&svg.querySelectorAll('circle.dt').length===2&&/\+0,00\s€/.test(t6.d.querySelector('#v-card .hist .hh span').textContent),'6 1 mese senza cambi: linea piatta a 10 €');

 // 7) tutto schermo: si apre, grafico più largo, periodo condiviso, si chiude (anche tornando indietro)
 const fb=t5.d.querySelector('#v-card .hist [data-a="chfull"]'); ok(!!fb,'7 tasto tutto schermo');
 fb.click(); const f=t5.d.getElementById('chfull');
 ok(!f.hidden&&/Rovine/.test(f.textContent),'7 aperto, col nome della carta');
 const fsvg=f.querySelector('svg.vch'), vb=fsvg.getAttribute('viewBox').split(' ').map(Number);
 ok(vb[2]>340&&vb[3]>150,'7 grafico più grande ('+vb[2]+'×'+vb[3]+')');
 f.querySelector('[data-cr="90"]').click();
 ok(f.querySelector('[data-cr="90"]').getAttribute('aria-pressed')==='true'&&t5.d.querySelector('#v-card .hist [data-cr="90"]').getAttribute('aria-pressed')==='true','7 3 mesi scelto a tutto schermo vale anche nella scheda');
 ok(ticks(f.querySelector('svg.vch')).includes('3 lug'),'7 3 mesi: dal 3 luglio');
 fsvg.ownerDocument; f.querySelector('[data-a="close"]').click(); ok(f.hidden&&!f.innerHTML,'7 chiuso col tasto');
 t5.d.querySelector('#v-card .hist [data-a="chfull"]').click(); t5.d.dispatchEvent(new t5.w.KeyboardEvent('keydown',{key:'Escape'})); ok(f.hidden,'7 chiuso con Esc');
 t5.d.querySelector('#v-card .hist [data-a="chfull"]').click(); t5.d.querySelector('#v-card [data-a="back"]').click(); await wait(100);
 ok(f.hidden&&t5.d.getElementById('v-card').hidden,'7 Indietro chiude anche il tutto schermo');
 const t7=boot([entry({pr:{normal:10}})]); await wait(300); openCard(t7);
 ok(!t7.d.querySelector('#v-card .hist [data-a="chfull"]')&&!t7.d.querySelector('#v-card .hist [data-cr]'),'7 senza storico: niente tasto né periodi');

 // 8) diradamento: fino a 160 punti, ultimi 90 giorni intatti
 const lots=Array.from({length:400},(_,i)=>[day(clock)-399+i,1000+(i%7)]);
 const t8=boot([entry()],{[K]:lots}); await wait(300); openCard(t8);
 clock+=DAY; trend=20; t8.d.querySelector('#v-card [data-a="refresh"]').click(); await wait(1300);
 const s8=H(t8)[K], d8=day(clock);
 ok(s8.length<=160&&s8.length>130,'8 punti dopo il diradamento: '+s8.length);
 ok(s8.filter(p=>d8-p[0]<=90).length===91&&s8[0][0]===lots[0][0],'8 ultimi 90 giorni tutti presenti e primo punto conservato');

 const errs=[t,t2,t3,t3b,t4,t5,t6,t7,t8].flatMap(x=>x.errors); if(errs.length) throw new Error('errori: '+errs.join('; '));
 console.log('grafico_carta_test: '+n+' controlli superati, errori: nessuno'); process.exit(0);
})().catch(e=>{ console.error(e.message); process.exit(1); });
