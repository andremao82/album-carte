const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8'); const wait=ms=>new Promise(r=>setTimeout(r,ms));
function boot(url,opts={}){ const errors=[],reg=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
 const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url,virtualConsole:vc,beforeParse(w){ w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=async()=>({ok:false,status:500,json:async()=>({})});
  Object.defineProperty(w.navigator,'serviceWorker',{value:{register:async(u)=>{reg.push(u)}}}); if(opts.offline) Object.defineProperty(w.navigator,'onLine',{value:false});
  if(opts.standalone) Object.defineProperty(w.navigator,'standalone',{value:true}); }}); return {w:dom.window,d:dom.window.document,errors,reg}; }
const txt=(t,s)=>t.d.querySelector(s).textContent.replace(/\s+/g,' ').trim();
(async()=>{
 let t=boot('https://x.netlify.app/'); await wait(250);
 console.log('1 collegamenti nell\'intestazione:',[...t.d.querySelectorAll('head link')].map(l=>l.rel+'='+l.getAttribute('href')).join(' | '));
 console.log('2 service worker registrato:',t.reg.join(','),'| avviso offline nascosto:',t.d.getElementById('offwarn').hidden);
 t.d.getElementById('hm-gear').click(); console.log('3 Impostazioni:',txt(t,'#pwa-state'),'| link al profilo visibile:',!t.d.getElementById('clip-note').hidden,t.d.querySelector('#clip-note a').getAttribute('href'));
 t=boot('https://x.netlify.app/',{offline:true,standalone:true}); await wait(250);
 console.log('4 offline: avviso visibile:',!t.d.getElementById('offwarn').hidden,'|',txt(t,'#offwarn')); t.d.getElementById('hm-gear').click(); console.log('4 installata:',txt(t,'#pwa-state'),'| link al profilo nascosto:',t.d.getElementById('clip-note').hidden);
 t=boot('https://abc.claudeusercontent.com/'); await wait(250); console.log('5 anteprima di Claude: service worker non registrato:',t.reg.length===0);
 console.log('errori:',[t].flatMap(x=>x.errors).length?t.errors:'nessuno'); process.exit(0);
})();
