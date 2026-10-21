// Ridisegno "Vetro olografico" del sito web (20/10/2026). Verifiche vere: il test si ferma al primo errore.
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const manifest=JSON.parse(fs.readFileSync(require('./percorsi').SITE+'/manifest.webmanifest','utf8'));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let checks=0;
function ok(cond,msg){ checks++; if(!cond) throw new Error('NON SUPERATO: '+msg); console.log('  ok  '+msg); }
const DAY=864e5;
const mk=(n,name,price,o={})=>Object.assign({key:`c${n}|IT|Normale|NM`,cardId:'c'+n,name,setName:'Megaevoluzione',number:String(n),total:'132',img:'',lang:'IT',variant:'Normale',cond:'NM',qty:1,price,priceManual:null,added:Date.now()-n*DAY},o);
const seed=()=>[
  mk(1,'Charizard ex',25,{variant:'Holo',key:'c1|IT|Holo|NM',img:'https://x/a.png',pr:{normal:25,reverse:30,avg30:21,vars:{normal:true,reverse:true,holo:true}}}),
  mk(2,'Pikachu',3.4,{qty:3}),
  mk(58,'Gengar',4.8,{variant:'Reverse holo',key:'c58|IT|Reverse holo|NM'}),
  mk(143,'Snorlax',2.1,{setName:'151',total:'165',lang:'EN',key:'c143|EN|Normale|NM'}),
  mk(3,'Rovine Insidiose',0.6,{qty:2,priceManual:0.5})
];
function boot(cat,opts={}){
  const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.detail&&e.detail.stack||e.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
    beforeParse(w){
      if(opts.store) for(const [k,v] of Object.entries(opts.store)) w.localStorage.setItem(k,v);
      if(cat) w.localStorage.setItem('pkm_catalog',JSON.stringify(cat));
      w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true});
      w.fetch=async()=>{throw new TypeError('Load failed')};
      if(opts.reduce) w.matchMedia=q=>({matches:/reduce/.test(q),media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
    }});
  return {w:dom.window,d:dom.window.document,errors,dom};
}
const $=(t,sel)=>t.d.querySelector(sel), $$=(t,sel)=>[...t.d.querySelectorAll(sel)];
const txt=(t,sel)=>{const el=$(t,sel);return el?el.textContent.replace(/\s+/g,' ').trim():null};
const go=async(t,tab)=>{ $(t,`nav button[data-go="${tab}"]`).click(); await wait(80); };
(async()=>{
 console.log('1 palette Notte blu, barra a 5 posti');
 ok(/--bg:#0B1426;/.test(html)&&/--accent:#FFCB05;/.test(html)&&/--surface:#16233D;/.test(html),'palette Notte blu nelle variabili');
 ok(/<meta name="theme-color" content="#0B1426">/.test(html),'colore della barra di sistema Notte blu');
 ok(manifest.theme_color==='#0B1426'&&manifest.background_color==='#0B1426','manifest con i colori Notte blu');
 ok(!/#FFD60A/.test(html)&&!/rgba\(255,214,10,/.test(html),'nessun residuo del giallo vecchio');
 const t=boot(seed()); await wait(250);
 ok(!$(t,'#orb'),'la lente fluttuante non c’è più');
 const navKids=[...$(t,'nav.bar').children]; ok(navKids.length===5,'barra a 5 posti');
 ok(navKids[2].classList.contains('scan')&&navKids[2].querySelector('#fab'),'tasto giallo al centro della barra');
 ok($$(t,'nav button[data-go]').map(b=>b.dataset.go).join(',')==='home,cat,sets,dex','4 schede con data-go nell’ordine giusto');
 for(const tab of ['home','cat','sets','dex']){ await go(t,tab); ok(!$(t,'#fab').hidden&&!t.d.body.classList.contains('inquick'),'tasto giallo visibile nella scheda '+tab); }
 ok($(t,'#fab-n').hidden&&$(t,'#fab').getAttribute('aria-label')==='Scansiona una carta','senza carte da controllare il numero sul tasto è nascosto');
 $(t,'#fab').click(); await wait(60); ok(!$(t,'#add-sheet').hidden,'il tasto apre il pannello Aggiungi carte');
 $(t,'#add-sheet [data-ad="quick"]').click(); await wait(120);
 ok(!$(t,'#v-quick').hidden&&t.d.body.classList.contains('inquick')&&$(t,'#add-sheet').hidden,'Scansione rapida: pannello chiuso, barra nascosta');
 ok(/\.inquick \.dock\{display:none\}/.test(html)&&/\.dock\{z-index:20\}/.test(html),'regole: barra nascosta in scansione, barra sopra i badge');
 t.w.history.back(); await wait(120); await go(t,'home');
 ok(!t.d.body.classList.contains('inquick'),'uscendo dalla scansione la barra torna');

 console.log('2 Home: riquadro del valore a due colonne');
 ok(/^\d[\d.]*,\d\d\s€$/.test(txt(t,'#v-home .vbig')),'valore della collezione ('+txt(t,'#v-home .vbig')+')');
 const hv=$$(t,'#v-home .vside b').map(b=>b.textContent); ok(hv.join('|')==='8|5|2','colonna a destra: carte 8, diverse 5, set 2 (letto: '+hv.join('|')+')');
 ok($(t,'#v-home .vside b').classList.contains('a'),'numero delle carte in giallo');
 ok(!/senza prezzo/.test(txt(t,'#v-home .vcard')),'nessuna nota "senza prezzo" se tutte le carte hanno un prezzo');
 ok($(t,'#hm-gear')&&!$(t,'#hm-search'),'icona delle Impostazioni in alto (la ricerca sta nella Collezione, come la nativa)');
 const big=seed(); big[1].qty=500; big[0].price=1500;
 const tb=boot(big); await wait(250);
 const tv=$(tb,'#v-home .vbig'); ok(tv.classList.contains('l')||tv.classList.contains('xl'),'importo lungo in Home ('+tv.textContent+') con carattere ridotto');
 await go(tb,'cat'); const cv=$(tb,'#tag .v.a'); ok(cv.classList.contains('l')||cv.classList.contains('xl'),'importo lungo nella Collezione ('+cv.textContent+') con carattere ridotto');
 const t0=boot(seed()); await wait(200); ok(!$(t0,'#v-home .vbig').classList.contains('l'),'importo corto in Home a grandezza piena');

 console.log('3 Collezione: fascia, griglia, riflessi, iniziali');
 await go(t,'cat');
 ok($$(t,'#tag > div').length===3,'fascia a tre colonne');
 ok($$(t,'#tag .k').map(x=>x.textContent).join('|')==='Valore stimato|Carte|Diverse','etichette Valore stimato / Carte / Diverse');
 ok($$(t,'#tag .v').slice(1).map(x=>x.textContent).join('|')==='8|5','carte 8 e diverse 5');
 ok(t.d.getElementById('list').classList.contains('grid')&&$(t,'#v-grid').getAttribute('aria-pressed')==='true','griglia come vista predefinita');
 const items=$$(t,'#list .item'); ok(items.length===5,'una casella per ogni voce');
 const byName=n=>items.find(i=>i.getAttribute('aria-label').includes(n));
 ok(byName('Pikachu').querySelector('.qty').textContent==='×3','badge ×3 sulle copie multiple');
 ok(!byName('Snorlax').querySelector('.qty'),'nessun badge con una copia sola');
 ok(byName('Charizard').querySelector('.art').classList.contains('holo'),'riflesso olografico sulle Holo');
 ok(byName('Gengar').querySelector('.art').classList.contains('rev'),'riflesso leggero sulle Reverse holo');
 ok(byName('Pikachu').querySelector('.art').dataset.ini==='PI'&&!byName('Pikachu').querySelector('img'),'senza immagine: iniziali');
 ok(byName('Pikachu').querySelector('.art .nn').textContent==='2','e il numero sotto le iniziali (come la nativa)');
 ok(byName('Rovine').querySelector('.art').dataset.ini==='RO','iniziali dal nome (Rovine Insidiose = RO)');
 ok(byName('Charizard').querySelector('.meta').textContent==='IT · Holo','sotto la carta: lingua · variante');
 ok(byName('Pikachu').querySelector('.meta').textContent==='IT · NM','con variante normale: lingua · condizione');
 const im=byName('Charizard').querySelector('.art img'); ok(!!im,'immagine presente se c’è l’indirizzo');
 im.dispatchEvent(new t.w.Event('error')); await wait(20);
 ok(!byName('Charizard').querySelector('.art img'),'immagine rotta tolta, restano le iniziali');
 byName('Snorlax').click(); await wait(80); ok(!$(t,'#v-card').hidden&&txt(t,'#v-card .cd-name')==='Snorlax','dalla griglia si apre la scheda');
 $(t,'#v-card [data-a="back"]').click(); await wait(80);
 $(t,'#btn-select').click(); await wait(30);
 ok($$(t,'#list .item .art .chk').length===5,'in selezione ogni casella ha il segno di spunta');
 $$(t,'#list .item')[0].click(); await wait(20);
 ok($$(t,'#list .item.picked').length===1&&/1 selezionata/.test(txt(t,'#sel-n')),'tocco in selezione = seleziona');
 $(t,'#btn-select').click(); await wait(30);
 $(t,'#v-list').click(); await wait(30);
 ok(!t.d.getElementById('list').classList.contains('grid')&&$(t,'#v-list').getAttribute('aria-pressed')==='true','vista a elenco');
 ok($$(t,'#list .item .art.sm').length===5&&/Megaevoluzione · 2\/132/.test(txt(t,'#list')),'elenco con miniatura e riga del set');
 ok(JSON.parse(t.w.localStorage.getItem('pkm_cfg')).catView==='list','scelta salvata');
 const t2=boot(seed(),{store:{pkm_cfg:t.w.localStorage.getItem('pkm_cfg')}}); await wait(200); await go(t2,'cat');
 ok(!t2.d.getElementById('list').classList.contains('grid'),'al riavvio resta l’elenco');
 $(t2,'#v-grid').click(); await wait(30); ok(t2.d.getElementById('list').classList.contains('grid'),'si torna alla griglia');

 console.log('4 Scheda carta: pillole, quantità, inclinazione col dito');
 await go(t,'cat'); $(t,'#v-grid').click(); await wait(20); $$(t,'#list .item').find(i=>i.getAttribute('aria-label').includes('Charizard')).click(); await wait(80);
 ok($(t,'#cd-tilt.cd-card.art.holo'),'carta grande con riflesso olografico');
 ok($(t,'#cd-tilt').classList.contains('tilt')&&$(t,'.cd-hint'),'inclinazione attiva con l’indicazione sotto la carta');
 const pills=k=>$$(t,`#v-card [data-ed="${k}"]`);
 ok(pills('lang').map(b=>b.textContent).join('|')==='IT|EN|JP|Altro','pillole della lingua');
 ok(pills('lang').find(b=>b.textContent==='IT').getAttribute('aria-pressed')==='true','lingua attuale evidenziata');
 ok(pills('lang').find(b=>b.textContent==='EN').getAttribute('aria-label')==='Inglese','nome per esteso per chi usa la voce');
 ok(pills('cond').length===7&&pills('cond').find(b=>b.textContent==='NM').getAttribute('aria-pressed')==='true','7 pillole della condizione, NM scelta');
 ok(pills('variant').find(b=>b.dataset.v==='Holo').getAttribute('aria-pressed')==='true','pillole della variante, Holo scelta');
 ok(/Near Mint/.test($$(t,'#v-card .lbl2').find(x=>/CONDIZIONE/.test(x.textContent)).textContent),'nome della condizione accanto al titolo');
 const cat=()=>JSON.parse(t.w.localStorage.getItem('pkm_catalog'));
 pills('cond').find(b=>b.textContent==='EX').click(); await wait(40);
 ok(cat().some(e=>e.name==='Charizard ex'&&e.cond==='EX'),'pillola EX: condizione salvata');
 ok(/Excellent/.test(txt(t,'#v-card'))&&/Con la condizione EX/.test(txt(t,'#v-card .mine')),'condizione EX: prezzo con la percentuale');
 pills('lang').find(b=>b.textContent==='EN').click(); await wait(40);
 ok(cat().some(e=>e.name==='Charizard ex'&&e.lang==='EN'),'pillola EN: lingua salvata');
 pills('variant').find(b=>b.dataset.v==='Reverse holo').click(); await wait(40);
 ok(cat().some(e=>e.name==='Charizard ex'&&e.variant==='Reverse holo'),'pillola Reverse holo: variante salvata');
 ok($(t,'#cd-tilt').classList.contains('rev')&&!$(t,'#cd-tilt').classList.contains('holo'),'riflesso aggiornato alla variante');
 const before=cat().find(e=>e.name==='Charizard ex').qty; $(t,'#v-card [data-a="qplus"]').click(); await wait(30);
 ok(cat().find(e=>e.name==='Charizard ex').qty===before+1&&txt(t,'#v-card .qctl b')==='2','quantità + dal pannello');
 const card=$(t,'#cd-tilt'); card.getBoundingClientRect=()=>({left:0,top:0,width:200,height:280,right:200,bottom:280,x:0,y:0});
 card.dispatchEvent(new t.w.MouseEvent('pointerdown',{bubbles:true,clientX:200,clientY:0}));
 ok(/rotateY\(14\.0deg\) rotateX\(11\.0deg\)/.test(card.style.transform),'angolo in alto a destra: carta ruotata verso il dito ('+card.style.transform+')');
 ok(card.style.getPropertyValue('--hx')==='0%'&&card.style.getPropertyValue('--hy')==='100%','il riflesso si sposta dalla parte opposta');
 card.dispatchEvent(new t.w.MouseEvent('pointermove',{bubbles:true,clientX:0,clientY:280}));
 ok(/rotateY\(-14\.0deg\) rotateX\(-11\.0deg\)/.test(card.style.transform),'trascinando in basso a sinistra la carta segue il dito');
 card.dispatchEvent(new t.w.MouseEvent('pointerup',{bubbles:true}));
 ok(card.style.transform===''&&card.style.getPropertyValue('--hx')==='','lasciando il dito la carta torna dritta');
 ok($(t,'#zoom').hidden,'dopo un trascinamento non si apre il tutto schermo');
 ok(/\.cd-card\.tilt\{touch-action:none/.test(html),'trascinare sulla carta non fa scorrere la pagina');
 const tr=boot(seed(),{reduce:true}); await wait(200); await go(tr,'cat');
 $$(tr,'#list .item').find(i=>i.getAttribute('aria-label').includes('Charizard')).click(); await wait(80);
 const rc=$(tr,'#cd-tilt'); ok(!rc.classList.contains('tilt')&&!$(tr,'.cd-hint'),'con "Riduci movimento" niente inclinazione né indicazione');
 rc.getBoundingClientRect=()=>({left:0,top:0,width:200,height:280});
 rc.dispatchEvent(new tr.w.MouseEvent('pointerdown',{bubbles:true,clientX:200,clientY:0}));
 ok(rc.style.transform==='','con "Riduci movimento" la carta resta ferma');
 rc.dispatchEvent(new tr.w.MouseEvent('pointerup',{bubbles:true,clientX:200,clientY:0}));
 ok(!$(tr,'#zoom').hidden,'con "Riduci movimento" il tocco apre comunque il tutto schermo');
 ok(rc.classList.contains('holo'),'il riflesso statico resta');

 console.log('5 Progressi, Pokédex');
 await go(t,'sets');
 ok($(t,'#sets-global .ssum .ring2')&&$(t,'#ss-filter'),'Progressi: anello e pillole');
 await go(t,'dex');
 ok($(t,'#v-dex .dstat .n b')&&$(t,'#dex-note'),'Pokédex: numero grande e avviso "Leggi ora"');

 const all=[t,t0,t2,tb,tr].flatMap(x=>x.errors);
 console.log('verifiche superate:',checks);
 console.log('errori:',all.length?all:'nessuno'); process.exit(all.length?1:0);
})().catch(e=>{ console.log(e.message); console.log('errori: test interrotto'); process.exit(1); });
