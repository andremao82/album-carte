const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8'); const wait=ms=>new Promise(r=>setTimeout(r,ms));
const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
let keyOk=true;
function boot(){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
 const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,beforeParse(w){ w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true});
  w.fetch=async(u)=>{u=String(u); if(u.includes('generativelanguage')&&u.includes('/models?')) return keyOk?J({models:[{name:'models/gemini-3.6-flash',supportedGenerationMethods:['generateContent']},{name:'models/gemini-3.5-flash',supportedGenerationMethods:['generateContent']}]}):J({},400); return J({},404)}; }});
 return {w:dom.window,d:dom.window.document,errors}; }
const cfg=t=>JSON.parse(t.w.localStorage.getItem('pkm_cfg')||'{}');
const fire=(t,id,v)=>{const el=t.d.getElementById(id); el.value=v; el.dispatchEvent(new t.w.Event('change',{bubbles:true}));};
const toast=t=>t.d.getElementById('toast').textContent;
(async()=>{
 const t=boot(); await wait(250); t.d.getElementById('hm-gear').click();
 console.log('1 pulsante Salva generale assente:',!t.d.getElementById('btn-savecfg'),'| pulsanti di salvataggio chiavi:',['btn-save-g','btn-save-c','btn-save-t'].map(id=>{const b=t.d.getElementById(id);return id+' dentro "'+(b.closest('.sgroup').previousElementSibling.textContent||b.closest('#g-box,#c-box')?.querySelector('.sh').textContent)+'" ('+b.textContent.trim()+')';}).join(' | '));
 console.log('2 segnaposto senza chiave:',t.d.getElementById('s-gkey').placeholder,'|',t.d.getElementById('s-key').placeholder);
 // salvataggio automatico delle opzioni
 fire(t,'s-cest','no'); console.log('3 "Stima della condizione" -> Disattivata: salvata subito:',cfg(t).condEstimate===false,'| avviso:',toast(t));
 fire(t,'s-start','sets'); fire(t,'s-edges','yes'); fire(t,'s-enh','no'); console.log('3 pagina iniziale/ritaglio/miglioramento:',cfg(t).startPage,cfg(t).confirmEdges,cfg(t).enhance);
 fire(t,'s-prov','claude'); console.log('3 motore:',cfg(t).provider,'| gruppo Claude visibile:',!t.d.getElementById('c-box').hidden,'| gruppo Gemini nascosto:',t.d.getElementById('g-box').hidden);
 fire(t,'s-prov','gemini');
 fire(t,'cc-PL','50'); fire(t,'cc-GD','abc'); console.log('4 percentuali: PL',cfg(t).condCoef.PL,'| valore non valido ignorato (GD resta):',cfg(t).condCoef.GD,'| campo ripulito:',t.d.getElementById('cc-GD').value);
 // chiavi
 t.d.getElementById('btn-save-g').click(); await wait(50); console.log('5 salva senza aver incollato:',toast(t),'| chiave salvata:',!!cfg(t).gkey);
 keyOk=false; t.d.getElementById('s-gkey').value='AIzaSBAGLIATA1234'; t.d.getElementById('btn-save-g').click(); await wait(100);
 console.log('5 chiave non valida:',toast(t),'| salvata:',!!cfg(t).gkey);
 keyOk=true; t.d.getElementById('s-gkey').value='AIzaSyDEMO-chiave-GzQ'; t.d.getElementById('btn-save-g').click(); await wait(150);
 console.log('5 chiave valida:',toast(t),'| salvata:',cfg(t).gkey,'| modelli letti:',(cfg(t).gmodels||[]).join(','),'| campo svuotato:',t.d.getElementById('s-gkey').value==='');
 console.log('5 segnaposto ora:',t.d.getElementById('s-gkey').placeholder,'| riga di stato:',t.d.getElementById('keystate').textContent);
 t.d.getElementById('s-key').value='sk-ant-prova-ABCD'; t.d.getElementById('btn-save-c').click(); await wait(100); console.log('6 chiave Claude salvata:',cfg(t).key,'| gemini intatta:',!!cfg(t).gkey,'| segnaposto:',t.d.getElementById('s-key').placeholder);
 t.d.getElementById('s-tcg').value='ptcg-1234'; t.d.getElementById('btn-save-t').click(); await wait(100); console.log('6 chiave pokemontcg salvata:',cfg(t).tcgKey);
 // le opzioni sono rimaste dopo il salvataggio delle chiavi
 console.log('7 opzioni invariate dopo le chiavi:',cfg(t).condEstimate===false && cfg(t).startPage==='sets');
 console.log('errori:',t.errors.length?t.errors:'nessuno'); process.exit(0);
})();
