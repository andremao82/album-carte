// Impostazioni riordinate (24/10/2026): ogni controllo nel suo gruppo, gruppi nell'ordine scelto, niente controlli persi.
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8'); const wait=ms=>new Promise(r=>setTimeout(r,ms));
let n=0; const ok=(c,m)=>{ if(!c){ console.log('NON SUPERATO: '+m); process.exit(1); } n++; };
const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.message).split('\n')[0]));
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.pages.dev/',virtualConsole:vc,beforeParse(w){ w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=async()=>({ok:false,status:404,json:async()=>({})}); }});
const w=dom.window, d=w.document;
(async()=>{
  await wait(250);
  const v=d.getElementById('v-set'); ok(v,'pagina Impostazioni');
  const heads=[...v.children].filter(e=>e.classList.contains('sh')).map(e=>e.textContent);
  ok(heads.join('|')==='Generali|Scansione|Riconoscimento delle carte|Prezzi|Prezzo per condizione|Backup|Esporta|Avanzate|Zona delicata','ordine dei gruppi: '+heads.join('|'));
  ok(!heads.some(h=>/^(Aspetto|Diagnostica|Fonti dei dati|Dati e backup|Installazione|Fonte dei prezzi)$/.test(h)),'vecchi gruppi spariti');
  // gruppo (titolo .sh di primo livello che precede) di ogni controllo
  const sec=id=>{ let e=d.getElementById(id); while(e.parentElement!==v) e=e.parentElement; while(e&&!(e.classList.contains('sh')&&e.parentElement===v)) e=e.previousElementSibling; return e&&e.textContent; };
  const want={'Generali':['s-appear','s-start'],'Scansione':['s-edges','s-enh','s-cest'],
    'Riconoscimento delle carte':['s-prov','s-gkey','btn-save-g','s-gmodel','btn-gmodels','s-key','btn-save-c','s-model','keystate','usage','btn-diag','diag'],
    'Prezzi':['s-psrc','fxstate','pxstate','btn-refresh'],'Prezzo per condizione':['cc-MT','cc-NM','cc-EX','cc-GD','cc-LP','cc-PL','cc-PO','btn-ccdef'],
    'Backup':['btn-bak','s-bksheet','restore','btn-autobak','bakstate'],'Esporta':['btn-csv','btn-collectr'],
    'Avanzate':['s-tcg','btn-save-t','pwa-state','persist-state','clip-note'],'Zona delicata':['btn-histdel','btn-delkey','btn-reset','histstate']};
  for(const [h,ids] of Object.entries(want)) for(const id of ids){ ok(d.querySelectorAll('#'+id).length===1,id+' presente una volta'); ok(sec(id)===h,id+' in "'+h+'" (ora in "'+sec(id)+'")'); }
  ok(d.querySelector('label[for="restore"]')&&sec('restore')==='Backup','Ripristina da backup nel gruppo Backup');
  // le azioni pericolose sono tutte in fondo e solo lì
  const danger=[...v.querySelectorAll('.srow2.danger')]; ok(danger.length===3&&danger.every(b=>sec(b.id)==='Zona delicata'),'azioni rosse solo in Zona delicata');
  // Aspetto e Pagina iniziale nello stesso riquadro
  ok(d.getElementById('s-appear').closest('.sgroup')===d.getElementById('s-start').closest('.sgroup'),'Aspetto e Pagina iniziale nello stesso riquadro');
  ok(!v.querySelector('.sgroup .sgroup'),'nessun riquadro dentro un riquadro');
  // apertura dal tasto in Home e funzioni invariate
  d.getElementById('hm-gear').click(); await wait(50); ok(!v.hidden,'Impostazioni si aprono');
  ok(d.querySelectorAll('#s-appear button').length===3,'pillole Aspetto disegnate');
  const sel=d.getElementById('s-prov'); sel.value='claude'; sel.dispatchEvent(new w.Event('change',{bubbles:true}));
  ok(!d.getElementById('c-box').hidden&&d.getElementById('g-box').hidden,'cambio motore mostra il riquadro Claude');
  ok(/Ultimo backup manuale/.test(d.getElementById('bakstate').textContent),'stato del backup sotto Backup');
  ok(/Storico prezzi/.test(d.getElementById('histstate').textContent),'stato dello storico vicino a "Cancella lo storico"');
  ok(/salvano da sole/.test(v.textContent)&&/da soli una volta al giorno/.test(v.textContent),'note principali conservate');
  console.log('impostazioni_ordine_test: '+n+' controlli superati, errori: '+(errors.length?errors.join(' / '):'nessuno'));
})();
