// Esporta per Collectr (24/10/2026): CSV nel formato dell'app TCGplayer, abbinato col Product ID, con riepilogo
// delle carte che restano fuori. Si ferma al primo errore.
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const vm=require('vm'); const P=require('./percorsi');
const html=fs.readFileSync(P.APP,'utf8'); const wait=ms=>new Promise(r=>setTimeout(r,ms));
let checks=0; const ok=(c,m)=>{ if(!c){ console.log('FALLITO:',m); process.exit(1);} checks++; };
const TAB={updated:'2026-10-24', sets:{
  sv3pt5:{n:'SV: Scarlet & Violet 151', p:{'6':502558,'25':502577}},
  swsh12:{n:'SWSH12: Silver Tempest', p:{'1':451000}},
  swsh12tg:{n:'SWSH12: Silver Tempest Trainer Gallery', p:{'TG5':451805}},
  base1:{n:'Base Set', p:{'4':42382}}},
  td:{'sv03.5':['sv3pt5'], swsh12:['swsh12','swsh12tg'], xx9:['nonce']}};
let n=0; const card=(o)=>Object.assign({key:'k'+(++n), cardId:'c'+n, name:'C'+n, setName:'S', number:'1', total:'99', img:'x', lang:'IT', variant:'Normale', cond:'NM', qty:1, price:2, priceManual:null, added:Date.now()-n}, o);
const CAT=[
  card({cardId:'sv3pt5-6', name:'Ivysaur', setName:'151', number:'6', total:'165', qty:2, rarity:'Uncommon', pr:{normal:1, tcg:{holo:8}}}),           // 1 solo holo su TCGplayer → Holofoil
  card({cardId:'tcgdex:it:sv03.5-006', src:'tcgdex', srcId:'sv03.5-006', srcLang:'it', name:'Ivysaur', setName:'151', number:'006', total:'165', variant:'Reverse holo', cond:'EX'}), // 2 italiana da TCGdex
  card({cardId:'sv3pt5-6', name:'Ivysaur', setName:'151', number:'6', total:'165', cond:'MT', qty:1, pr:{normal:1, tcg:{holo:8}}}),              // 3 MT = Near Mint: si somma alla 1
  card({cardId:'sv3pt5-25', name:'Pikachu, "special"', setName:'151', number:'25', total:'165', lang:'JP'}),                                      // 4 giapponese → fuori
  card({cardId:'tcgdex:it:me99-001', src:'tcgdex', srcId:'me99-001', srcLang:'it', name:'Nuova', setName:'Set nuovo', number:'001', total:'80'}),   // 5 set assente
  card({cardId:'sv3pt5-999', name:'Fantasma', setName:'151', number:'999', total:'165'}),                                                         // 6 numero assente
  card({cardId:'manuale', name:'Scritta a mano', setName:'?', number:'', total:''}),                                                               // 7 senza codice
  card({cardId:'sv3pt5-25', name:'Pikachu, "special"', setName:'151', number:'25', total:'165', lang:'EN', variant:'Holo', cond:'PO'}),            // 8 virgole e virgolette
  card({cardId:'tcgdex:it:swsh12-TG05', src:'tcgdex', srcId:'swsh12-TG05', srcLang:'it', name:'Dialga', setName:'Tempesta Argentata', number:'TG05', total:'TG30', cond:'LP'}), // 9 Trainer Gallery
  card({cardId:'base1-4', name:'Charizard', setName:'Base', number:'4', total:'102', variant:'1st edition', lang:'Altro', pr:{tcg:{firstNormal:300}}}), // 10 1st edition senza holo
  card({cardId:'tcgdex:it:xx9-001', src:'tcgdex', srcId:'xx9-001', srcLang:'it', name:'Orfana', setName:'X', number:'1', total:'9'}),               // 11 set TCGdex abbinato a un set senza tabella
];
function boot({cat=CAT, table=TAB}={}){ const errors=[], log={fetch:[], blobs:[], dl:[]};
 const vc=new VirtualConsole(); vc.on('jsdomError',x=>{const m=String(x.detail&&x.detail.stack||x.message).split('\n')[0]; if(!/Not implemented/.test(m)) errors.push(m);});
 const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://carte-pokemon-5vf.pages.dev/',virtualConsole:vc,beforeParse(w){
  w.localStorage.setItem('pkm_catalog',JSON.stringify(cat)); w.localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true});
  w.fetch=async(u)=>{ u=String(u); if(/tcgplayer-ids\.json/.test(u)){ log.fetch.push(u); if(table==='down') throw new TypeError('offline'); return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(table))}; } return {ok:false,status:500,json:async()=>({})}; };
  const B=w.Blob; w.Blob=class extends B{ constructor(parts,o){ super(parts,o); log.blobs.push(parts.join('')); } };
  w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{}; w.scrollTo=()=>{}; w.HTMLAnchorElement.prototype.click=function(){ if(this.download) log.dl.push(this.download); };
 }});
 const w=dom.window,d=w.document,$=id=>d.getElementById(id);
 return {w,d,$,errors,log, open:()=>!$('cx-sheet').hidden && !$('cx-back').hidden, toast:()=>$('toast').textContent};
}
// CSV semplice con virgolette
function parseCSV(s){ const rows=[]; let row=[], f='', q=false;
 for(let i=0;i<s.length;i++){ const c=s[i];
  if(q){ if(c==='"'&&s[i+1]==='"'){f+='"';i++;} else if(c==='"') q=false; else f+=c; }
  else if(c==='"') q=true; else if(c===','){row.push(f);f='';} else if(c==='\r'){} else if(c==='\n'){row.push(f);rows.push(row);row=[];f='';} else f+=c; }
 if(f||row.length){row.push(f);rows.push(row);} return rows; }
(async()=>{
 const all=[];
 // 1. pulsante in Impostazioni → Dati e backup
 let t=boot(); all.push(t); await wait(300);
 const b=t.$('btn-collectr'); ok(b && /Esporta per Collectr/.test(b.textContent),'1 pulsante');
 ok(b.closest('.sgroup') && b.closest('.sgroup').contains(t.$('btn-csv')),'1 accanto a Esporta CSV');
 ok(!t.open(),'1 foglio chiuso all’avvio');
 // 2. tocco → tabella scaricata, foglio con riepilogo
 b.click(); await wait(100);
 ok(t.log.fetch.length===1 && /^tcgplayer-ids\.json/.test(t.log.fetch[0]),'2 tabella chiesta al sito: '+t.log.fetch);
 ok(t.open(),'2 foglio aperto'); ok(t.$('cx-sheet').getAttribute('role')==='dialog','2 accessibilità');
 const p=t.$('cx-p').textContent;
 ok(p==='6 carte (7 copie) pronte nel formato TCGplayer. 5 restano fuori perché non hanno una corrispondenza su TCGplayer:','2 testo: '+p);
 const groups=[...t.d.querySelectorAll('#cx-miss h3')].map(h=>h.textContent);
 ok(groups.includes('Giapponesi (su TCGplayer sono prodotti diversi) · 1'),'2 gruppo giapponesi: '+groups);
 ok(groups.includes('Set non presente su TCGplayer · 2'),'2 gruppo set assente: '+groups);
 ok(groups.includes('Carta non presente su TCGplayer · 1'),'2 gruppo numero assente: '+groups);
 ok(groups.includes('Senza codice del catalogo · 1'),'2 gruppo senza codice: '+groups);
 ok(groups.length===4,'2 quattro gruppi');
 const items=[...t.d.querySelectorAll('#cx-miss li')].map(l=>l.textContent);
 ok(items.length===5,'2 cinque carte elencate: '+items.length);
 ok(items.some(x=>x==='Pikachu, "special" · 151 25/165 · JP'),'2 riga giapponese con lingua: '+items);
 ok(items.some(x=>x==='Nuova · Set nuovo 001/80'),'2 riga italiana senza lingua');
 ok(items.some(x=>x==='Scritta a mano · ?'),'2 riga senza numero: '+items);
 ok(!t.$('cx-save').hidden && !t.$('cx-how').hidden,'2 tasto Salva e spiegazione');
 ok(/per email/.test(t.$('cx-how').textContent),'2 spiega l’invio per email');
 ok(t.log.dl.length===0,'2 nessun file prima del tocco su Salva');
 // 3. Salva → file CSV nel formato TCGplayer
 t.$('cx-save').click(); await wait(50);
 ok(!t.open(),'3 foglio chiuso'); ok(t.log.dl.length===1 && /^collectr-tcgplayer-\d{4}-\d\d-\d\d\.csv$/.test(t.log.dl[0]),'3 nome file: '+t.log.dl);
 const csv=t.log.blobs[t.log.blobs.length-1]; ok(csv.charCodeAt(0)!==0xFEFF,'3 senza BOM'); ok(/\r\n$/.test(csv),'3 righe CRLF');
 const rows=parseCSV(csv), H=rows[0];
 ok(H.join(',')==='Quantity,Name,Simple Name,Set,Card Number,Set Code,Printing,Condition,Language,Rarity,Product ID,SKU','3 intestazione: '+H);
 ok(rows.length===6,'3 cinque righe di carte: '+rows.length);
 const R=Object.fromEntries(rows.slice(1).map(r=>[r[10]+'|'+r[6]+'|'+r[7]+'|'+r[8], Object.fromEntries(H.map((h,i)=>[h,r[i]]))]));
 const a=R['502558|Holofoil|Near Mint|Italian']; ok(a,'3 riga Ivysaur NM: '+Object.keys(R));
 ok(a.Quantity==='3','3 MT e NM sommate: '+a.Quantity); ok(a.Name==='Ivysaur' && a['Simple Name']==='Ivysaur','3 nome');
 ok(a.Set==='SV: Scarlet & Violet 151' && a['Card Number']==='6/165' && a.Rarity==='Uncommon' && a.SKU==='' && a['Set Code']==='','3 set, numero, rarità');
 const r2=R['502558|Reverse Holofoil|Lightly Played|Italian']; ok(r2 && r2.Quantity==='1' && r2['Card Number']==='006/165','3 italiana TCGdex reverse EX');
 const r8=R['502577|Holofoil|Damaged|English']; ok(r8 && r8.Name==='Pikachu, "special"','3 virgole e virgolette: '+JSON.stringify(r8));
 ok(csv.includes('"Pikachu, ""special"""'),'3 campo tra virgolette');
 const r9=R['451805|Normal|Moderately Played|Italian']; ok(r9 && r9.Set==='SWSH12: Silver Tempest Trainer Gallery' && r9['Card Number']==='TG05/TG30','3 Trainer Gallery dal set TCGdex principale: '+JSON.stringify(r9));
 const r10=R['42382|1st Edition|Near Mint|English']; ok(r10,'3 1st edition senza holo, lingua Altro → English: '+Object.keys(R));
 ok(t.errors.length===0,'3 nessun errore: '+t.errors);
 // 4. un secondo tocco usa la tabella già letta; Chiudi e tocco fuori chiudono senza file
 t.$('btn-collectr').click(); await wait(50); ok(t.log.fetch.length===1,'4 tabella non richiesta di nuovo'); ok(t.open(),'4 aperto');
 t.$('cx-close').click(); ok(!t.open(),'4 Chiudi'); t.$('btn-collectr').click(); await wait(50); t.$('cx-back').click(); ok(!t.open(),'4 tocco fuori');
 ok(t.log.dl.length===1,'4 nessun altro file');
 // 5. tutto abbinato: niente elenco
 n=0; t=boot({cat:[card({cardId:'base1-4', name:'Charizard', number:'4', total:'102', variant:'Holo', qty:1})]}); all.push(t); await wait(300);
 t.$('btn-collectr').click(); await wait(100);
 ok(t.$('cx-p').textContent==='1 carta (1 copia) pronte nel formato TCGplayer.','5 testo singolare: '+t.$('cx-p').textContent);
 ok(t.$('cx-miss').innerHTML==='','5 elenco vuoto');
 // 6. nessuna carta abbinabile: niente file
 t=boot({cat:[card({cardId:'manuale'})]}); all.push(t); await wait(300); t.$('btn-collectr').click(); await wait(100);
 ok(t.$('cx-p').textContent==='Nessuna carta del catalogo ha una corrispondenza su TCGplayer.','6 testo: '+t.$('cx-p').textContent);
 ok(t.$('cx-save').hidden && t.$('cx-how').hidden,'6 niente tasto Salva'); ok(t.d.querySelectorAll('#cx-miss li').length===1,'6 elenco');
 // 7. senza rete: messaggio, niente foglio; catalogo vuoto: messaggio
 t=boot({table:'down'}); all.push(t); await wait(300); t.$('btn-collectr').click(); await wait(100);
 ok(!t.open() && /serve la connessione/.test(t.toast()),'7 offline: '+t.toast()); ok(!t.$('btn-collectr').disabled,'7 pulsante riattivato');
 t=boot({cat:[]}); all.push(t); await wait(300); t.$('btn-collectr').click(); await wait(50); ok(!t.open() && t.toast()==='Il catalogo è vuoto','7 vuoto');
 for (const x of all) ok(x.errors.length===0,'errori della pagina: '+x.errors);
 // 8. tabella vera (app/tcgplayer-ids.json): formato e carte note
 const real=JSON.parse(fs.readFileSync(P.SITE+'/tcgplayer-ids.json','utf8'));
 ok(/^\d{4}-\d\d-\d\d$/.test(real.updated),'8 data'); ok(Object.keys(real.sets).length>150,'8 set: '+Object.keys(real.sets).length);
 ok(real.sets.sv3pt5 && real.sets.sv3pt5.p['6']===502558,'8 Ivysaur 151 = 502558');
 ok((real.td['sv03.5']||[]).includes('sv3pt5'),'8 TCGdex sv03.5 → sv3pt5');
 ok((real.td.swsh12||[]).includes('swsh12tg'),'8 Trainer Gallery collegata al set TCGdex principale: '+real.td.swsh12);
 const nCards=Object.values(real.sets).reduce((a,s)=>a+Object.keys(s.p).length,0); ok(nCards>15000,'8 carte: '+nCards);
 ok(Object.values(real.sets).every(s=>typeof s.n==='string' && Object.entries(s.p).every(([k,v])=>k===k.toUpperCase() && !/^0\d/.test(k) && Number.isInteger(v))),'8 numeri normalizzati e id interi');
 ok(fs.statSync(P.SITE+'/tcgplayer-ids.json').size<1.5e6,'8 dimensione');
 // 9. service worker: la tabella passa sempre dalla rete; pacchetto: la tabella è inclusa
 const sw=fs.readFileSync(P.SITE+'/sw.js','utf8'), handlers={};
 const ctx={self:{addEventListener:(t,f)=>handlers[t]=f, location:{origin:'https://x.pages.dev'}}, caches:{}, URL, Promise, setTimeout, fetch:()=>Promise.reject(new Error('no'))};
 vm.createContext(ctx); vm.runInContext(sw,ctx);
 let responded=false; handlers.fetch({request:{url:'https://x.pages.dev/tcgplayer-ids.json',mode:'cors',method:'GET'}, respondWith:()=>{responded=true;}});
 ok(!responded,'9 tabella non intercettata dal service worker');
 ok(/tcgplayer-ids\.json/.test(fs.readFileSync(P.PACCHETTO,'utf8')),'9 tabella nel pacchetto');
 console.log('collectr_test: '+checks+' controlli superati, errori: nessuno'); process.exit(0);
})();
