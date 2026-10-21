const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
function make(geminiRec,cfgExtra={}){
  const log={gem:[]}; const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
  const api=async(url,opt)=>{url=String(url);
    if(url.includes('generativelanguage')){ const b=JSON.parse(opt.body); log.gem.push({images:b.contents[0].parts.filter(p=>p.inline_data).length,sys:b.systemInstruction.parts[0].text,text:b.contents[0].parts.filter(p=>p.text).map(p=>p.text).join(' ')}); return J({candidates:[{content:{parts:[{text:JSON.stringify(geminiRec)}]}}]}); }
    if(url.endsWith('/it/sets')) return J([{id:'me01',name:'Mega',cardCount:{official:132,total:188}}]);
    if(url.endsWith('/it/sets/me01')) return J({cards:[{id:'me01-127',localId:'127',name:'Rovine Insidiose'}]});
    if(/\/it\/cards\/me01-127$/.test(url)) return J({id:'me01-127',localId:'127',name:'Rovine Insidiose',rarity:'Comune',image:'https://x/127',category:'Allenatore',trainerType:'Stadio',illustrator:'Ill',set:{id:'me01',name:'Mega',cardCount:{official:132,total:188}},pricing:{cardmarket:{trend:10,avg30:10}},dexId:[]});
    return J({},404)};
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
   beforeParse(w){ w.localStorage.setItem('pkm_cfg',JSON.stringify(Object.assign({provider:'gemini',gkey:'AIzaX',gmodel:'gemini-flash-latest',enhance:true},cfgExtra)));
    w.confirm=()=>true; w.scrollTo=()=>{}; w.createImageBitmap=async()=>({width:900,height:1200,close(){}});
    w.HTMLCanvasElement.prototype.getContext=function(){return {canvas:this,drawImage(){},clearRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){},fill(){},arc(){},save(){},restore(){},clip(){},
      getImageData:(x,y,ww,hh)=>({data:new Uint8ClampedArray(ww*hh*4).fill(120),width:ww,height:hh}),createImageData:(ww,hh)=>({data:new Uint8ClampedArray(ww*hh*4),width:ww,height:hh}),putImageData(){},set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){}}};
    w.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/jpeg;base64,AAAAAAAAAAAAAAAAAAAA'; w.fetch=api; }});
  return {w:dom.window,d:dom.window.document,errors,log,ls:dom.window.localStorage};
}
async function scan(t){
  t.d.querySelector('nav button[data-go="cat"]').click(); t.d.getElementById('fab').click(); t.d.querySelector('[data-ad="search"]').click();
  const input=t.d.getElementById('file'); const file=new t.w.File(['x'],'a.jpg',{type:'image/jpeg'}); Object.defineProperty(input,'files',{value:[file],configurable:true});
  input.dispatchEvent(new t.w.Event('change',{bubbles:true})); await wait(400);
  if(!t.d.getElementById('editbox').hidden){ t.d.getElementById('ed-ok').click(); }   // bordi non trovati su un'immagine uniforme: conferma il ritaglio
  await wait(1500);
}
const txt=(t,sel)=>{const el=t.d.querySelector(sel);return el?el.textContent.replace(/\s+/g,' ').trim():null};
const rec=(o)=>Object.assign({name_en:'Lurking Ruins',name_printed:'Rovine Insidiose',number:'127',printed_total:'132',language:'it',variant_hint:'normal',confidence:0.9},o);
(async()=>{
 // 1) stima attiva: due immagini + prompt con la condizione; EX preselezionata
 let t=make(rec({condition:'EX',condition_notes:'bianco leggero sugli angoli',condition_confidence:0.8})); await wait(250); await scan(t);
 const g=t.log.gem[0]||{};
 console.log('1 richiesta: immagini inviate',g.images,'| prompt chiede la condizione:',/"condition"/.test(g.sys||''),'| testo:',(g.text||'').slice(0,70));
 console.log('1 pannello: condizione preselezionata:',t.d.getElementById('ap-cond')&&t.d.getElementById('ap-cond').value,'|',txt(t,'#ap-cnote'));
 console.log('1 prezzo mostrato (10 × 85%):',txt(t,'#ap-price'));
 t.d.getElementById('ap-add').click();
 const e=JSON.parse(t.ls.getItem('pkm_catalog'))[0]; console.log('2 salvata:',JSON.stringify({cond:e.cond,condEst:e.condEst,condNote:e.condNote,price:e.price}));
 t.d.querySelector('nav button[data-go="cat"]').click(); t.d.querySelector('#list .item').click();
 console.log('3 pagina carta:',txt(t,'#v-card .cd-est'),'| prezzo:',txt(t,'#v-card .cd-price .v'));
 t.d.querySelector('#v-card [data-ed="cond"][data-v="PL"]').click();
 const e2=JSON.parse(t.ls.getItem('pkm_catalog'))[0]; console.log('3 dopo cambio a mano: indicazione sparita:',!txt(t,'#v-card .cd-est'),'| flag:',e2.condEst,e2.condNote,'| cond:',e2.cond);
 // 2) confidenza bassa -> non preseleziona
 t=make(rec({condition:'LP',condition_notes:'foto sfocata',condition_confidence:0.2})); await wait(250); await scan(t);
 console.log('4 confidenza bassa:',t.d.getElementById('ap-cond').value,'|',txt(t,'#ap-cnote'));
 // 3) MT non ammesso, minuscole accettate
 t=make(rec({condition:'MT',condition_confidence:0.9})); await wait(250); await scan(t); console.log('5 MT ignorato:',t.d.getElementById('ap-cond').value,'|',txt(t,'#ap-cnote'));
 t=make(rec({condition:'lp',condition_notes:'bordi consumati',condition_confidence:0.7})); await wait(250); await scan(t); console.log('5 "lp" minuscolo:',t.d.getElementById('ap-cond').value);
 // 4) stima disattivata
 t=make(rec({condition:'EX',condition_confidence:0.9}),{condEstimate:false}); await wait(250); await scan(t);
 const g2=t.log.gem[0]||{}; console.log('6 stima disattivata: immagini',g2.images,'| prompt senza condizione:',!/"condition"/.test(g2.sys||''),'| condizione:',t.d.getElementById('ap-cond').value,'| nota:',txt(t,'#ap-cnote'));
 // 5) miglioramento disattivato: una sola immagine (non serve la versione non elaborata)
 t=make(rec({condition:'NM',condition_confidence:0.8}),{enhance:false}); await wait(250); await scan(t); console.log('7 senza miglioramento: immagini',(t.log.gem[0]||{}).images,'| condizione:',t.d.getElementById('ap-cond').value);
 // 6) impostazione in Impostazioni
 t.d.getElementById('hm-gear').click(); console.log('8 impostazione:',t.d.getElementById('s-cest').value,'| opzioni:',[...t.d.getElementById('s-cest').options].map(o=>o.textContent).join(' / '));
 console.log('errori:',t.errors.length?t.errors:'nessuno'); process.exit(0);
})();
