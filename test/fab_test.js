const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function boot(url,fetchImpl){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.detail&&e.detail.stack||e.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url,virtualConsole:vc,
   beforeParse(w){ w.localStorage.setItem('pkm_catalog',JSON.stringify([{key:'k|IT|Normale|NM',cardId:'k',name:'Pikachu',setName:'Base',number:'58',total:'102',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:1,added:1}]));
    w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=fetchImpl; }});
  return {w:dom.window,d:dom.window.document,errors}; }
const vis=(t,id)=>!t.d.getElementById(id).hidden;
(async()=>{
 let t=boot('https://x.netlify.app/',async()=>{throw new TypeError('Load failed')}); await wait(200);
 const out=[]; for (const [tab,label] of [['home','Home'],['cat','Catalogo'],['sets','Set'],['dex','Pokédex']]){ t.d.querySelector(`nav button[data-go="${tab}"]`).click(); await wait(80); out.push(label+': '+(vis(t,'fab')?'SÌ':'no')); }
 console.log('pulsante giallo per scheda ->',out.join(' | '));
 t.d.querySelector('nav button[data-go="cat"]').click(); t.d.querySelector('#list .item').click(); console.log('dentro la pagina carta:',vis(t,'fab')?'SÌ':'no');
 t.d.querySelector('#v-card [data-a="back"]').click(); await wait(100); console.log('tornato al catalogo:',vis(t,'fab')?'SÌ':'no','| banner anteprima:',vis(t,'prevwarn'));
 // pagina Set con rete bloccata: messaggio chiaro
 t.d.querySelector('nav button[data-go="sets"]').click(); t.d.getElementById('btn-browse').click(); await wait(300);
 console.log('Sfoglia con rete bloccata ->',t.d.getElementById('browse-list').textContent.trim());
 // in anteprima (nessun dominio http)
 const p=boot('https://abc.claudeusercontent.com/',async()=>{throw new DOMException('The object can not be found here.','NotFoundError')}); await wait(200);
 console.log('anteprima: banner visibile:',vis(p,'prevwarn'));
 p.d.querySelector('nav button[data-go="sets"]').click(); p.d.getElementById('btn-browse').click(); await wait(300);
 console.log('anteprima, Sfoglia ->',p.d.getElementById('browse-list').textContent.trim().slice(0,200));
 console.log('errori:',[...t.errors,...p.errors].length?[...t.errors,...p.errors]:'nessuno'); process.exit(0);
})();
