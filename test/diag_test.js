const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8'); const errors=[];
const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.detail&&e.detail.stack||e.message).split('\n')[0]));
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
 beforeParse(w){ w.localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'AIzaTEST',gmodel:'gemini-flash-latest'}));
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/jpeg;base64,AAAA'; w.scrollTo=()=>{};
  w.fetch=async(url,opt)=>{ if(url.includes('pokemontcg')) return {ok:true,status:200,json:async()=>({})};
    if(url.includes('/models?')) return {ok:true,status:200,json:async()=>({})};
    if(opt&&opt.body&&opt.body.includes('inline_data')) throw new TypeError('Load failed');
    return {ok:true,status:200,json:async()=>({})}; }; }});
const d=dom.window.document;
setTimeout(async()=>{ d.getElementById('hm-gear').click(); d.getElementById('btn-diag').click();
  await new Promise(r=>setTimeout(r,300)); console.log(d.getElementById('diag').textContent); console.log('errori:',errors.length?errors:'nessuno'); process.exit(0)},300);
