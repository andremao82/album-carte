// Pagina Trend (al posto della pagina Valore): riepilogo del periodo, Salite e Scese in euro con mini grafico,
// Set in rialzo / in ribasso, Massimi e minimi di sempre; si apre da "Trend ›" e da "Si sono mossi" in Home.
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8'); const wait=ms=>new Promise(r=>setTimeout(r,ms)); const DAY=864e5;
const clock=Date.UTC(2026,9,23,12), D=Math.floor(clock/DAY);
const mk=(n,name,price,set,o={})=>({key:`c${n}|IT|Normale|NM`,cardId:'c'+n,name,setName:set,number:String(n),total:'50',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty:1,price,priceManual:null,added:clock,...o});
const extra=[...Array(10)].map((_,i)=>mk(10+i,'Piccola '+i,1.1,'Set C'));
const seedCat=()=>[mk(1,'Salita grande',20,'Set A'),mk(2,'Salita piccola',6,'Set A'),mk(3,'Scesa',3,'Set B'),mk(4,'Ferma',4,'Set B'),
 mk(5,'Manuale',9,'Set B',{priceManual:30}),mk(6,'Crollata',1.5,'Set B'),...extra];
const seedHist=()=>{ const h={'c1|n':[[D-30,1000],[D,2000]],'c2|n':[[D-5,500],[D,600]],'c3|n':[[D-30,500],[D,300]],'c4|n':[[D-30,400],[D-10,300],[D,400]],
 'c5|n':[[D-30,100],[D,900]],'c6|n':[[D-60,900],[D-30,400],[D,150]]}; for(let i=0;i<10;i++) h['c'+(10+i)+'|n']=[[D-30,100],[D,110]]; return h; };
function boot(opts={}){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
 const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,beforeParse(w){ const R=w.Date; w.Date=class extends R{constructor(...a){a.length?super(...a):super(clock)} static now(){return clock}};
  w.localStorage.setItem('pkm_catalog',JSON.stringify(opts.cat||seedCat())); if(!opts.noHist){ w.localStorage.setItem('pkm_hist',JSON.stringify({v:1,s:seedHist()})); w.localStorage.setItem('pkm_vhist',JSON.stringify({v:1,s:[[D-30,3000,16],[D,4000,16]]})); }
  w.localStorage.setItem('pkm_fx',JSON.stringify({t:clock,r:0.9,d:'x'})); w.localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'k'}));
  w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=async()=>({ok:false,status:500,json:async()=>({})}); }});
 return {w:dom.window,d:dom.window.document,errors}; }
const vis=(t,id)=>!t.d.getElementById(id).hidden;
const norm=s=>s.replace(/\s+/g,' ').replace(/ /g,' ').trim();
const txt=(t,sel)=>{const el=t.d.querySelector(sel);return el?norm(el.textContent):null};
// righe della lista subito dopo un'intestazione (sezione data-sec, eventuale sottotitolo h3)
const rowsAfter=el=>{ let n=el.nextElementSibling; while(n&&!n.classList.contains('vrows')) n=n.nextElementSibling; return n?[...n.querySelectorAll('.vrow2')]:[]; };
const sec=(t,k)=>t.d.querySelector('#v-value [data-sec="'+k+'"]');
const sub=(t,title)=>[...t.d.querySelectorAll('#v-value h3.tsub')].find(h=>h.textContent===title);
const rowTxt=r=>norm(r.querySelector('.t b').textContent)+' '+norm(r.querySelector('.v').textContent);
let n=0;
function eq(a,b,msg){ const nb=v=>typeof v==='string'?norm(v):v; a=nb(a); b=nb(b); if(a!==b) throw new Error('NON SUPERATO: '+msg+' (atteso '+JSON.stringify(b)+', letto '+JSON.stringify(a)+')'); n++; console.log('  ok  '+msg+': '+a); }
function ok(c,msg){ if(!c) throw new Error('NON SUPERATO: '+msg); n++; console.log('  ok  '+msg); }
(async()=>{
 const t=boot(); await wait(300);
 // Home: il collegamento si chiama Trend
 eq(txt(t,'#v-home [data-a="value"]'),'Trend ›','1 collegamento nel riquadro del valore');
 ok(t.d.querySelector('#v-home [data-a="trend"]'),'1 "Trend" accanto a Si sono mossi');
 t.d.querySelector('#v-home [data-a="value"]').click(); await wait(50);
 ok(vis(t,'v-value'),'2 si apre la pagina'); eq(txt(t,'#v-value .ttl'),'Trend','2 titolo Trend');
 eq(txt(t,'#v-value [data-r][aria-pressed="true"]'),'30 giorni','2 periodo predefinito');
 ok(t.d.querySelector('#v-value svg.vch'),'2 grafico del valore');
 // riepilogo: +10 +1 −2 0 −2,5 +10×0,1 = +7,50 € su 38 € (manuale escluso)
 eq(txt(t,'#v-value .tbig'),'+7,50 € +19,7%','3 variazione del periodo');
 eq([...t.d.querySelectorAll('#v-value .tsum .vside div')].map(d=>[...d.children].map(c=>c.textContent).join(' ')).join(' | '),'12 salite | 2 scese | 1 ferme','3 salite / scese / ferme');
 eq(txt(t,'#v-value .tsum .vtop span:last-child'),'rispetto a 30 giorni fa','3 riferimento del periodo');
 // Salite in euro, prime 10, "Tutte (12)"
 let up=rowsAfter(sec(t,'up'));
 eq(up.length,10,'4 Salite: prime 10'); eq(rowTxt(up[0]),'Salita grande +10,00 €','4 in testa la più salita in euro'); eq(rowTxt(up[1]),'Salita piccola +1,00 €','4 seconda');
 eq(norm(up[0].querySelector('.cap').textContent),'+100,0% · 20,00 €','4 percentuale e prezzo sotto il nome');
 { const pl=up[0].querySelector('svg.spk polyline'); ok(pl,'4 mini grafico nella riga'); eq(pl.getAttribute('points').split(' ').length,2,'4 mini grafico: dal punto di partenza a oggi');
   eq(pl.getAttribute('stroke'),'var(--ok)','4 mini grafico verde se sale'); }
 eq(txt(t,'#v-value [data-more="up"]'),'Tutte (12)','4 tasto Tutte');
 t.d.querySelector('#v-value [data-more="up"]').click(); up=rowsAfter(sec(t,'up')); eq(up.length,12,'4 Tutte: 12 righe'); eq(txt(t,'#v-value [data-more="up"]'),'Meno','4 tasto Meno');
 t.d.querySelector('#v-value [data-more="up"]').click(); eq(rowsAfter(sec(t,'up')).length,10,'4 Meno: di nuovo 10');
 // Scese in euro
 const down=rowsAfter(sec(t,'down'));
 ok(!t.d.querySelector('#v-value .vrow2[data-open="c5|IT|Normale|NM"]'),'5 prezzo mio escluso da tutta la pagina');
 eq(down.map(rowTxt).join(' | '),'Crollata −2,50 € | Scesa −2,00 €','5 Scese, la più scesa in testa'); ok(!t.d.querySelector('#v-value [data-more="down"]'),'5 niente Tutte con poche righe');
 eq(down[0].querySelector('svg.spk polyline').getAttribute('stroke'),'var(--danger)','5 mini grafico rosso se scende');
 // Set
 ok(sec(t,'sets'),'6 sezione Set');
 eq(rowsAfter(sub(t,'In rialzo')).map(r=>norm(r.textContent)).join(' | '),'Set A2 carte · +73,3%+11,00 € | Set C10 carte · +10,0%+1,00 €','6 set in rialzo');
 eq(rowsAfter(sub(t,'In ribasso')).map(r=>norm(r.textContent)).join(' | '),'Set B3 carte · −34,6%−4,50 €','6 set in ribasso (manuale escluso)');
 // Massimi e minimi di sempre
 ok(sec(t,'hl'),'7 sezione Massimi e minimi');
 const hi=rowsAfter(sub(t,'Al prezzo più alto')), lo=rowsAfter(sub(t,'Al prezzo più basso'));
 eq(hi.length,5,'7 al massimo: al più 5'); eq(rowTxt(hi[0]),'Salita grande +10,00 €','7 al massimo: in testa'); eq(norm(hi[0].querySelector('.cap').textContent),'+100,0% dal minimo','7 distanza dal minimo');
 eq(lo.map(rowTxt).join(' | '),'Crollata −7,50 € | Scesa −2,00 €','7 al minimo'); eq(norm(lo[0].querySelector('.cap').textContent),'−83,3% dal massimo','7 distanza dal massimo');
 eq(lo[0].querySelector('svg.spk polyline').getAttribute('points').split(' ').length,3,'7 mini grafico con tutto lo storico');
 ok(![...hi,...lo].some(r=>r.dataset.open==='c5|IT|Normale|NM'),'7 prezzo mio escluso');
 // periodo 7 giorni: la Ferma (3 € dieci giorni fa) diventa salita
 t.d.querySelector('#v-value [data-r="7"]').click();
 eq([...t.d.querySelectorAll('#v-value .tsum .vside div')].map(d=>[...d.children].map(c=>c.textContent).join(' ')).join(' | '),'13 salite | 2 scese | 0 ferme','8 7 giorni: conteggi');
 eq(txt(t,'#v-value .tsum .vtop span:last-child'),'rispetto a 7 giorni fa','8 riferimento');
 t.d.querySelector('#v-value [data-r="30"]').click();
 // tocchi: carta -> scheda, set -> dettaglio del set
 rowsAfter(sec(t,'down'))[0].click(); await wait(50); ok(vis(t,'v-card'),'9 riga carta -> scheda');
 t.d.querySelector('#v-card [data-a="back"]').click(); await wait(100); ok(vis(t,'v-value'),'9 indietro -> Trend');
 rowsAfter(sub(t,'In ribasso'))[0].click(); await wait(100); ok(vis(t,'v-setd'),'9 riga set -> dettaglio del set');
 t.d.querySelector('#v-setd [data-a="back"]').click(); await wait(100); ok(vis(t,'v-value'),'9 indietro -> Trend');
 t.d.querySelector('#v-value [data-a="back"]').click(); await wait(100); ok(vis(t,'v-home'),'9 indietro -> Home');
 // "Trend" accanto a Si sono mossi apre la pagina sui 30 giorni
 t.d.querySelector('#v-home [data-a="trend"]').click(); await wait(50); ok(vis(t,'v-value'),'10 Si sono mossi -> Trend'); eq(txt(t,'#v-value [data-r][aria-pressed="true"]'),'30 giorni','10 sui 30 giorni');
 // senza storico: niente classifiche, spiegazione
 const t2=boot({noHist:true}); await wait(300); t2.d.querySelector('#v-home [data-a="value"]').click(); await wait(50);
 ok(!t2.d.querySelector('#v-value [data-sec="up"]')&&!t2.d.querySelector('#v-value .tsum'),'11 senza storico: niente classifiche né riepilogo');
 ok(/Le classifiche si riempiono/.test(t2.d.getElementById('v-value').textContent),'11 spiegazione');
 const errs=[t,t2].flatMap(x=>x.errors); if(errs.length) throw new Error('errori: '+errs.join('; '));
 console.log('trend_page_test: '+n+' controlli superati, errori: nessuno'); process.exit(0);
})().catch(e=>{ console.error(e.message); process.exit(1); });
