const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const {IDBFactory}=require('fake-indexeddb');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
let uniform=false;
function synth(w,h){ const px=new Uint8ClampedArray(w*h*4); const cx=w/2,cy=h/2,cw=w*0.45,ch=cw*1.4;
  for(let i=0;i<w*h;i++){ const x=i%w,y=(i/w)|0; let r=90,g=110,b=85; if(!uniform&&Math.abs(x-cx)<cw/2&&Math.abs(y-cy)<ch/2){ const inner=Math.abs(x-cx)<cw/2-w*0.03&&Math.abs(y-cy)<ch/2-w*0.03; if(inner){r=60;g=100;b=170}else{r=235;g=200;b=60} } const o=i*4; px[o]=r;px[o+1]=g;px[o+2]=b;px[o+3]=255; } return px; }
const setsList=[{id:'me01',name:'Megaevoluzione',cardCount:{official:132,total:188}},{id:'aa01',name:'Set A',cardCount:{official:200,total:210}},{id:'bb01',name:'Set B',cardCount:{official:200,total:210}}];
const setCards={me01:[{id:'me01-127',localId:'127',name:'Rovine Insidiose'}],aa01:[{id:'aa01-055',localId:'055',name:'Pikachu'}],bb01:[{id:'bb01-055',localId:'055',name:'Pikachu'}]};
const detail=id=>({id,localId:id.split('-')[1],name:id==='me01-127'?'Rovine Insidiose':'Pikachu',rarity:'Comune',image:'https://x/'+id,set:{id:id.split('-')[0],name:'S '+id.split('-')[0],cardCount:{official:132,total:188}},pricing:{cardmarket:{trend:10,avg30:10}},dexId:[],category:'Pokémon',illustrator:'Ill'});
function boot(recs,idb,opts={}){
  const calls={claude:0}; const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
  const api=async(url)=>{url=String(url);
    if(url.includes('api.anthropic.com')){ const i=calls.claude++; const r=recs[Math.min(i,recs.length-1)]; if(r==='429') return J({error:{message:'rate'}},429); return J({content:[{type:'text',text:JSON.stringify(r)}]}); }
    if(url.endsWith('/it/sets')) return J(setsList);
    let m=url.match(/\/it\/sets\/([^/?]+)$/); if(m) return setCards[m[1]]?J({id:m[1],cards:setCards[m[1]]}):J(null,404);
    m=url.match(/\/it\/cards\/([^/?]+)$/); if(m) return J(detail(m[1]));
    if(url.includes('/it/cards?name=')) return J([]);
    if(url.includes('pokemontcg')) return J({data:[]});
    return J({},404)};
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
   beforeParse(w){ w.localStorage.setItem('pkm_cfg',JSON.stringify({provider:'claude',key:'sk-x',model:'claude-haiku-4-5',enhance:true}));
    w.indexedDB=idb; w.confirm=()=>true; w.scrollTo=()=>{}; w.createImageBitmap=async()=>({width:900,height:1200,close(){}});
    w.HTMLCanvasElement.prototype.getContext=function(){const c=this;return {canvas:c,drawImage(){},clearRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){},fill(){},arc(){},save(){},restore(){},clip(){},
      getImageData:(x,y,ww,hh)=>({data:synth(ww,hh),width:ww,height:hh}),createImageData:(ww,hh)=>({data:new Uint8ClampedArray(ww*hh*4),width:ww,height:hh}),putImageData(){},set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){}}};
    w.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/jpeg;base64,AAAA'; w.fetch=api;
    if(opts.camera){ w.HTMLMediaElement.prototype.play=async()=>{}; Object.defineProperty(w.HTMLVideoElement.prototype,'videoWidth',{get:()=>900}); Object.defineProperty(w.HTMLVideoElement.prototype,'videoHeight',{get:()=>1200});
      Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia:async()=>({getTracks:()=>[{stop(){opts.camera.stopped=(opts.camera.stopped||0)+1}}]})}}); } }});
  return {w:dom.window,d:dom.window.document,errors,calls};
}
const vis=(t,id)=>!t.d.getElementById(id).hidden;
const txt=(t,sel)=>{const el=t.d.querySelector(sel);return el?el.textContent.replace(/\s+/g,' ').trim():null};
const cat=t=>JSON.parse(t.w.localStorage.getItem('pkm_catalog')||'[]');
const rec=(o)=>Object.assign({name_en:'Lurking Ruins',name_printed:'Rovine Insidiose',number:'127',printed_total:'132',language:'it',variant_hint:'normal',confidence:0.95,condition:'EX',condition_notes:'bianco leggero',condition_confidence:0.8},o);
async function sendFiles(t,n){ const input=t.d.getElementById('q-file'); const files=Array.from({length:n},(_,i)=>new t.w.File(['x'],'f'+i+'.jpg',{type:'image/jpeg'})); Object.defineProperty(input,'files',{value:files,configurable:true}); input.dispatchEvent(new t.w.Event('change',{bubbles:true})); }
async function until(fn,ms=15000){ const t0=Date.now(); while(Date.now()-t0<ms){ if(fn()) return true; await wait(100);} return false; }
(async()=>{
 const idb=new IDBFactory();
 const recs=[rec({}),rec({name_en:'Pikachu',name_printed:'Pikachu',number:'127',confidence:0.4}),rec({name_en:'Pikachu',name_printed:'Pikachu',number:'55',printed_total:'200'}),rec({number:'999'}),rec({})];
 const t=boot(recs,idb); await wait(250);
 t.d.getElementById('fab').click(); t.d.querySelector('[data-ad="search"]').click();
 console.log('1 pagina di aggiunta: pulsanti:',[...t.d.querySelectorAll('#v-scan .row .btn')].map(b=>b.textContent).join(' / '));
 await sendFiles(t,5);
 console.log('2 "Più foto" apre la scansione rapida:',vis(t,'v-quick'));
 await until(()=>t.d.querySelectorAll('#q-list .qrow').length>=5 && !/In coda|In lettura/.test(txt(t,'#q-list')));
 await wait(300);
 console.log('3 riepilogo:',txt(t,'#q-stats'));
 console.log('3 righe:'); t.d.querySelectorAll('#q-list .qrow').forEach(r=>console.log('    ',r.querySelector('.nm').textContent,'|',(r.querySelector('.meta')||{textContent:''}).textContent));
 const c=cat(t); console.log('4 catalogo:',c.map(e=>e.name+' ×'+e.qty+' '+e.cond+(e.condEst?' (stimata)':'')+' ['+e.srcId+']').join(' | '));
 // annulla l'ultima aggiunta (doppione): torna a ×1
 const undoBtns=[...t.d.querySelectorAll('#q-list [data-q="undo"]')]; undoBtns[0].click(); await wait(100);
 console.log('5 Annulla un doppione:',cat(t).map(e=>e.name+' ×'+e.qty).join(' | '),'|',txt(t,'#q-stats'));
 // controllo di una carta dubbia: lettura poco sicura -> pagina di aggiunta con i dati
 const rv=[...t.d.querySelectorAll('#q-list [data-q="review"]')]; console.log('6 carte da controllare:',rv.length);
 const ids=rv.map(b=>b.dataset.id);
 [...t.d.querySelectorAll('#q-list .qrow')].find(r=>/lettura poco sicura/.test(r.textContent)).querySelector('[data-q="review"]').click(); await wait(600);
 console.log('6 apre la pagina di aggiunta:',vis(t,'v-scan'),'| campi:',['f-name','f-num','f-tot','f-lang'].map(i=>t.d.getElementById(i).value).join(', '),'| stato:',txt(t,'#status'));
 const n0=cat(t).length; const addBtn=t.d.getElementById('ap-add');
 if(addBtn){ addBtn.click(); await wait(300); console.log('6 aggiunta: voci',n0,'->',cat(t).length,'| tornato alla scansione rapida:',vis(t,'v-quick'),'| carte da controllare ora:',t.d.querySelectorAll('#q-list [data-q="review"]').length); }
 else console.log('6 nessun pannello di aggiunta (candidati:',t.d.querySelectorAll('#cands .cand').length+')');
 // elimina una carta da controllare
 const before=qJobs=t.d.querySelectorAll('#q-list [data-q="drop"]').length; t.d.querySelector('#q-list [data-q="drop"]').click(); console.log('7 elimina una foto: pulsanti Elimina',before,'->',t.d.querySelectorAll('#q-list [data-q="drop"]').length);
 console.log('errori:',t.errors.length?t.errors:'nessuno');
 // 8) limite raggiunto: pausa, foto in coda, salvate e ritrovate dopo il riavvio
 const idb2=new IDBFactory(); const t2=boot(['429'],idb2); await wait(250);
 t2.d.getElementById('fab').click(); t2.d.querySelector('[data-ad="search"]').click(); await sendFiles(t2,3);
 await until(()=>/Limite raggiunto|Riprendi/.test(txt(t2,'#q-banner')||''),8000); await wait(400);
 console.log('8 limite: banner:',txt(t2,'#q-banner'),'| riepilogo:',txt(t2,'#q-stats'));
 await wait(600);
 const t3=boot([rec({})],idb2); await wait(800);
 t3.d.getElementById('fab').click(); console.log('9 dopo il riavvio: riga nel pannello Aggiungi:',txt(t3,'#add-queue'));
 t3.d.querySelector('#add-queue [data-ad="queue"]').click(); await wait(200);
 console.log('9 coda ripristinata:',txt(t3,'#q-stats'),'| in pausa:',txt(t3,'#q-banner'));
 t3.d.querySelector('#q-banner [data-q="resume"]').click(); await until(()=>cat(t3).length>=1,15000); await wait(1500);
 console.log('9 dopo "Riprendi":',txt(t3,'#q-stats'),'| catalogo:',cat(t3).length,'voci');
 console.log('errori:',[t2,t3].flatMap(x=>x.errors).length?[t2,t3].flatMap(x=>x.errors):'nessuno');
 process.exit(0);
})();
