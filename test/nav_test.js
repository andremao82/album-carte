const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const now=Date.now();
const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
const seed=[{key:'k1|IT|Normale|NM',cardId:'k1',name:'Pikachu',setName:'Base',number:'58',total:'102',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:2,added:now,dex:[25]}];
function boot(){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
   beforeParse(w){ w.localStorage.setItem('pkm_catalog',JSON.stringify(seed)); w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true});
    w.fetch=async(u)=>{u=String(u); if(u.includes('pokeapi')) return J({results:[]}); return J({},500)}; }});
  return {w:dom.window,d:dom.window.document,errors}; }
const vis=(t,id)=>!t.d.getElementById(id).hidden;
const tab=t=>{const b=[...t.d.querySelectorAll('nav button')].find(b=>b.getAttribute('aria-current')==='true');return b&&b.dataset.go};
const txt=(t,sel)=>{const el=t.d.querySelector(sel);return el?el.textContent.replace(/\s+/g,' ').trim():null};
(async()=>{
 const t=boot(); await wait(250);
 console.log('1 barra:',[...t.d.querySelectorAll('nav button')].map(b=>b.textContent.trim()).join(' | '),'| nessuna voce Scansiona:',![...t.d.querySelectorAll('nav button')].some(b=>/Scansiona/.test(b.textContent)));
 console.log('2 Home senza Pokédex:',!(txt(t,'#v-home')||'').includes('Pokédex'),'| Set senza Pokédex:',(()=>{t.d.querySelector('nav button[data-go="sets"]').click(); return !(txt(t,'#v-sets')||'').includes('Pokédex')})());
 t.d.querySelector('nav button[data-go="cat"]').click();
 console.log('3 Collezione: niente tasto Aggiungi (si usa il tasto giallo):',!t.d.getElementById('btn-addcard'),'| pulsante giallo:',vis(t,'fab'));
 t.d.getElementById('fab').click(); console.log('4 tasto giallo -> pannello Aggiungi carte:',vis(t,'add-sheet'),'| scelte:',[...t.d.querySelectorAll('#add-sheet .aopt b')].map(b=>b.textContent).join(' / '));
 if([...t.d.querySelectorAll('#add-sheet .aopt b')].map(b=>b.textContent).join('/')!=='Scansione rapida/Da foto/Cerca e aggiungi') throw new Error('scelte del pannello');
 t.d.querySelector('[data-ad="search"]').click();
 console.log('4 Cerca e aggiungi:',vis(t,'v-scan'),'| titolo:',txt(t,'#v-scan .ttl'),'| ricerca aperta:',t.d.getElementById('manual').open,'| pannello chiuso:',!vis(t,'add-sheet'));
 if(txt(t,'#v-scan .ttl')!=='Cerca e aggiungi') throw new Error('titolo');
 t.d.querySelector('#v-scan [data-a="back"]').click(); await wait(100);
 console.log('5 Indietro -> Collezione:',vis(t,'v-cat'),'| tab:',tab(t));
 t.d.getElementById('fab').click(); t.d.querySelector('[data-ad="quick"]').click(); await wait(100); console.log('6 Scansione rapida:',vis(t,'v-quick'));
 t.w.history.back(); await wait(100);
 t.d.getElementById('fab').click(); t.d.getElementById('add-back').click(); console.log('6 tocco fuori chiude il pannello:',!vis(t,'add-sheet'));
 t.d.querySelector('nav button[data-go="dex"]').click(); await wait(300);
 console.log('8 Pokédex dalla barra:',vis(t,'v-dex'),'| tab:',tab(t),'| titolo:',txt(t,'#v-dex h1'),'| avanzamento:',txt(t,'#v-dex .dstat'));
 t.d.querySelector('#v-dex .dcell[data-n="25"]').click(); console.log('9 dettaglio:',vis(t,'v-dexd'),txt(t,'#v-dexd .ttl'),'| tab:',tab(t));
 t.d.querySelector('#v-dexd [data-a="back"]').click(); await wait(100); console.log('9 Indietro -> Pokédex:',vis(t,'v-dex'),'| tab:',tab(t));
 // Home: "Riprendi" scansione e pagina di aggiunta dopo una scansione (file scelto)
 console.log('errori:',t.errors.length?t.errors:'nessuno'); process.exit(0);
})();
