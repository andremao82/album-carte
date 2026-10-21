const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8'); const wait=ms=>new Promise(r=>setTimeout(r,ms));
const seed=[{key:'k|IT|Normale|NM',cardId:'k',name:'Pikachu',setName:'Base',number:'58',total:'102',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:2,added:1}];
function boot(native,shareFail){ const log={write:[],share:[],a:0}; const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
 const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,beforeParse(w){
  w.localStorage.setItem('pkm_catalog',JSON.stringify(seed)); w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=async()=>({ok:false,status:500,json:async()=>({})});
  w.URL.createObjectURL=()=>{log.a++;return 'blob:x'}; w.URL.revokeObjectURL=()=>{}; w.HTMLAnchorElement.prototype.click=function(){log.a++};
  if(native) w.Capacitor={isNativePlatform:()=>true,Plugins:{Filesystem:{writeFile:async o=>{log.write.push(o);return {uri:'file:///cache/'+o.path}}},Share:{share:async o=>{log.share.push(o); if(shareFail) throw new Error('Share canceled');}}}}; }});
 return {w:dom.window,d:dom.window.document,errors,log}; }
(async()=>{
 let t=boot(true); await wait(250); t.d.getElementById('hm-gear').click(); t.d.getElementById('btn-bak').click(); await wait(100);
 console.log('1 app nativa: file scritto:',t.log.write[0]&&t.log.write[0].path,'| cartella:',t.log.write[0]&&t.log.write[0].directory,'| contiene catalogo:',/"catalog"/.test(t.log.write[0].data),'| condiviso:',t.log.share[0]&&t.log.share[0].url,'| download del browser usato:',t.log.a>0);
 t.d.getElementById('btn-csv').click(); await wait(100); console.log('1 CSV:',t.log.write[1].path,'| inizia con BOM:',t.log.write[1].data.charCodeAt(0)===0xFEFF);
 console.log('1 Impostazioni:',t.d.getElementById('pwa-state').textContent);
 t=boot(true,true); await wait(250); t.d.getElementById('hm-gear').click(); t.d.getElementById('btn-bak').click(); await wait(100); console.log('2 condivisione annullata dall\'utente: nessun errore mostrato:',!/non riuscito/.test(t.d.getElementById('toast').textContent));
 t=boot(false); await wait(250); t.d.getElementById('hm-gear').click(); t.d.getElementById('btn-bak').click(); await wait(100); console.log('3 browser: download normale usato:',t.log.a>0,'| nessun accesso ai componenti nativi:',t.log.write.length===0);
 console.log('errori:',t.errors.length?t.errors:'nessuno'); process.exit(0);
})();
