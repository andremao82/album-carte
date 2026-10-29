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
    if(opts.catalog) w.localStorage.setItem('pkm_catalog',JSON.stringify(opts.catalog)); w.indexedDB=idb; w.confirm=()=>true; w.scrollTo=()=>{}; w.createImageBitmap=async()=>({width:900,height:1200,close(){}});
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
let checks=0; const ok=(c,m)=>{ if(!c){ console.log('FALLITO:',m); process.exit(1);} checks++; };
const rows=t=>[...t.d.querySelectorAll('#q-list .qrow')];
const rowOf=(t,re)=>rows(t).find(r=>re.test(r.textContent));
(async()=>{
 // 22/10 → 28/10/2026: nella Scansione rapida le carte aggiunte si potevano solo annullare, una alla volta.
 // Ora ogni riga ha Conferma (esce dalla lista, resta in collezione) e, con più carte, Conferma tutte / Annulla tutte.
 const recs=[rec({}),rec({}),rec({})];
 const t=boot(recs,new IDBFactory()); await wait(250);
 t.d.getElementById('fab').click(); t.d.querySelector('[data-ad="search"]').click();
 for(let i=0;i<3;i++){ await sendFiles(t,1); ok(await until(()=>rows(t).filter(r=>r.querySelector('[data-q="undo"]')).length>=i+1),'carta '+(i+1)+' aggiunta'); await wait(150); }
 const qty=()=>{ const e=cat(t).find(x=>x.cond==='EX'); return e?e.qty:0; };
 const addedRows=()=>rows(t).filter(r=>r.querySelector('[data-q="undo"]'));
 const bar=()=>t.d.querySelector('#q-list .qall');
 ok(qty()===3,'tre copie in collezione');
 ok(addedRows().every(r=>{ const k=r.querySelector('[data-q="keep"]'); return k&&k.getAttribute('aria-label')==='Conferma'; }),'ogni riga aggiunta ha Conferma');
 ok(addedRows().every(r=>r.querySelector('[data-q="undo"]').getAttribute('aria-label')==='Annulla'),'ogni riga aggiunta ha ancora Annulla');
 ok(bar()&&/Conferma tutte \(3\)/.test(bar().textContent),'barra con 3 carte aggiunte: '+(bar()&&bar().textContent));
 ok(bar().querySelector('[data-q="keepall"]').textContent==='Conferma tutte (3)','tasto Conferma tutte');
 ok(bar().querySelector('[data-q="undoall"]').textContent==='Annulla tutte (3)','tasto Annulla tutte');
 // Conferma singola: la riga sparisce, la carta resta
 addedRows()[0].querySelector('[data-q="keep"]').click(); await wait(100);
 ok(addedRows().length===2,'dopo Conferma restano 2 righe');
 ok(qty()===3,'Conferma non tocca la collezione');
 ok(/Aggiunte 2/.test(txt(t,'#q-stats')),'contatore aggiornato: '+txt(t,'#q-stats'));
 ok(/Annulla tutte \(2\)/.test(bar().textContent),'barra aggiornata');
 // Annulla tutte, ma l'utente risponde No: nulla cambia
 t.w.confirm=()=>false; bar().querySelector('[data-q="undoall"]').click(); await wait(100);
 ok(addedRows().length===2&&qty()===3,'Annulla tutte rifiutato: nulla cambia');
 // Annulla tutte confermato: tolte le due copie, resta quella confermata
 let asked=''; t.w.confirm=m=>{ asked=m; return true; }; bar().querySelector('[data-q="undoall"]').click(); await wait(100);
 ok(/Annullare le 2 carte aggiunte/.test(asked),'chiede conferma: '+asked);
 ok(qty()===1,'Annulla tutte toglie le 2 copie: '+qty());
 ok(addedRows().length===0&&!bar(),'lista e barra vuote');
 // altre due carte, poi Conferma tutte
 t.calls.claude=0; for(let i=0;i<2;i++){ await sendFiles(t,1); ok(await until(()=>addedRows().length>=i+1),'nuova carta '+(i+1)); await wait(150); }
 ok(qty()===3,'di nuovo tre copie');
 ok(bar()&&/Conferma tutte \(2\)/.test(bar().textContent),'barra con 2');
 bar().querySelector('[data-q="keepall"]').click(); await wait(100);
 ok(addedRows().length===0&&!bar(),'Conferma tutte svuota la lista');
 ok(qty()===3,'Conferma tutte lascia le carte in collezione');
 ok(/Aggiunte 0/.test(txt(t,'#q-stats')),'contatore a zero');
 ok(t.d.querySelector('#q-list .empty'),'torna il messaggio iniziale');
 // con una sola carta aggiunta niente barra (basta la riga)
 await sendFiles(t,1); ok(await until(()=>addedRows().length===1),'una carta');
 ok(!bar(),'una carta: niente barra');
 if(t.errors.length){ console.log('errori:',t.errors); process.exit(1); }
 console.log('conferma_scansioni_test: '+checks+' controlli superati, errori: nessuno'); process.exit(0);
})();
