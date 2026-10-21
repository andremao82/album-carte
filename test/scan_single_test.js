// Aggiunta delle carte come l'app nativa: pannello a tre scelte dal tasto giallo, galleria multipla, ricerca a mano, icone della barra.
const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync(require('./percorsi').APP,'utf-8');
const d=new JSDOM(html,{runScripts:'outside-only'}).window.document;
let ok=true; const chk=(n,c)=>{console.log((c?'ok  ':'KO  ')+n); if(!c){ok=false;}};
const scan=d.getElementById('v-scan');
chk('nella pagina Cerca e aggiungi nessun tasto fotocamera', !d.getElementById('btn-quick') && scan.querySelectorAll(':scope > button.btn').length===0);
chk('pannello con Scansione rapida, Da foto, Cerca e aggiungi', [...d.querySelectorAll('#add-sheet [data-ad]')].map(b=>b.dataset.ad).join(',')==='close,quick,photos,search');
chk('ricerca a mano presente e aperta', !!d.getElementById('manual') && d.getElementById('manual').hasAttribute('open') && ['f-name','f-num','f-tot','f-lang'].every(i=>!!d.getElementById(i)));
chk('galleria multipla disponibile (Da foto usa lo stesso campo)', !!d.querySelector('#v-quick [data-q="gallery"]') && d.getElementById('q-file').multiple);
const set=d.querySelector('nav button[data-go="sets"] svg');
chk('icona Progressi a libri (books.vertical)', set.querySelectorAll('rect').length===2 && set.querySelectorAll('path').length===1);
chk('etichette della barra', [...d.querySelectorAll('nav button[data-go] span')].map(s=>s.textContent).join(',')==='Home,Collezione,Progressi,Pokédex');
console.log('errori:', ok?'nessuno':'presenti'); process.exit(ok?0:1);
