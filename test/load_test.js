const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const errors=[]; const vc=new VirtualConsole();
vc.on('jsdomError',e=>errors.push('jsdomError: '+(e.detail&&e.detail.stack||e.message).split('\n').slice(0,3).join(' | ')));
vc.on('error',e=>errors.push('console.error: '+e));
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.netlify.app/',virtualConsole:vc,
  beforeParse(w){ w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='canvas'?{width:1,height:1}:(()=>({data:new Uint8ClampedArray(4)})),set:()=>true}); w.scrollTo=()=>{}; w.Element.prototype.scrollIntoView=()=>{}; w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){}})); }});
const w=dom.window,d=w.document;
setTimeout(()=>{
  console.log('errori al caricamento:',errors.length?errors:'nessuno');
  const vis=id=>!d.getElementById(id).hidden;
  console.log('vista iniziale -> catalogo visibile:',vis('v-cat'),'| scansiona visibile:',vis('v-scan'),'| impostazioni:',vis('v-set'));
  console.log('tab attivo:',[...d.querySelectorAll('nav button')].find(b=>b.getAttribute('aria-current')==='true').dataset.go,'| fab visibile:',vis('fab'));
  console.log('anteprima carta nascosta:',d.getElementById('preview').hidden,'| pulsanti ritaglio nascosti:',d.getElementById('cropact').hidden,'| editor nascosto:',d.getElementById('editbox').hidden);
  // navigazione
  d.getElementById('fab').click(); d.querySelector('[data-ad="search"]').click();
  console.log('dopo "Aggiungi carta" -> scan:',vis('v-scan'),'cat:',vis('v-cat'),'fab:',vis('fab'));
  d.getElementById('hm-gear').click();
  console.log('dopo tap Impostazioni -> set:',vis('v-set'),'| motore:',d.getElementById('s-prov').value,'| box Gemini visibile:',vis('g-box'),'box Claude visibile:',vis('c-box'),'| modelli:',[...d.getElementById('s-gmodel').options].map(o=>o.value).join(','));
  d.getElementById('s-prov').value='claude'; d.getElementById('s-prov').dispatchEvent(new w.Event('change'));
  console.log('scelta Claude -> box Gemini:',vis('g-box'),'box Claude:',vis('c-box'));
  console.log('stato chiavi:',d.getElementById('keystate').textContent);
  console.log('errori dopo interazioni:',errors.length?errors:'nessuno');
  process.exit(0);
},300);
