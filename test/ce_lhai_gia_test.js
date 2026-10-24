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
 // 1) prima carta: entra, nessun avviso; 2) la stessa identica: avviso "ne avevi 1"; 3) ancora: "ne avevi 2"
 // 4) stessa carta in condizione diversa (GD): non è identica, niente avviso
 // 5) stessa carta letta male (poco sicura): resta da controllare con "Forse ce l'hai già: 3 copie"
 // 6) carta non trovata: da controllare, niente avviso
 const recs=[rec({}),rec({}),rec({}),rec({condition:'GD'}),rec({confidence:0.4}),rec({number:'999'})];
 const t=boot(recs,new IDBFactory()); await wait(250);
 t.d.getElementById('fab').click(); t.d.querySelector('[data-ad="search"]').click();
 for(let i=0;i<recs.length;i++){
  await sendFiles(t,1);
  ok(await until(()=>rows(t).length>=i+1 && !/In coda|In lettura/.test(txt(t,'#q-list'))),'carta '+(i+1)+' elaborata');
  await wait(150);
 }
 const c=cat(t);
 ok(c.length===2,'catalogo con due voci (EX e GD): '+c.map(e=>e.key+' ×'+e.qty).join(' | '));
 ok(c.find(e=>e.cond==='EX').qty===3,'tre copie EX');
 ok(c.find(e=>e.cond==='GD').qty===1,'una copia GD');
 const added=rows(t).filter(r=>r.querySelector('[data-q="undo"]'));
 ok(added.length===4,'quattro righe aggiunte: '+added.length);
 // righe dalla più recente: GD, EX (3ª), EX (2ª), EX (1ª)
 const tags=added.map(r=>{ const q=r.querySelector('.qdup'); return q?q.textContent:''; });
 console.log('righe aggiunte:',tags.map(x=>x||'(nessun avviso)').join(' | '));
 ok(tags[0]==='','condizione diversa: nessun avviso');
 ok(tags[1]==='Ce l’hai già: ne avevi 2','terza copia: '+tags[1]);
 ok(tags[2]==='Ce l’hai già: ne avevi 1','seconda copia: '+tags[2]);
 ok(tags[3]==='','prima copia: nessun avviso');
 ok(!/doppione/.test(txt(t,'#q-list')),'tolta la vecchia scritta ", doppione"');
 ok(added.every(r=>r.querySelector('.meta').textContent.trim().endsWith('EX')||r.querySelector('.meta').textContent.trim().endsWith('GD')),'la riga dei dati finisce con la condizione');
 const unsure=rowOf(t,/lettura poco sicura/);
 ok(unsure,'carta poco sicura da controllare');
 ok(unsure.querySelector('.qdup') && unsure.querySelector('.qdup').textContent==='Forse ce l’hai già: 3 copie','avviso sulla carta da controllare: '+(unsure.querySelector('.qdup')||{}).textContent);
 const nf=rowOf(t,/carta non trovata/);
 ok(nf && !nf.querySelector('.qdup'),'carta non trovata: nessun avviso');
 // l'avviso resta dopo il riavvio (salvato con il lavoro in IndexedDB)
 const idb=new IDBFactory();
 const t2=boot([rec({confidence:0.4})],idb,{catalog:c});
 await wait(250); t2.d.getElementById('fab').click(); t2.d.querySelector('[data-ad="search"]').click();
 await sendFiles(t2,1); ok(await until(()=>/lettura poco sicura/.test(txt(t2,'#q-list')||'')),'t2: carta da controllare');
 await wait(600);
 const t3=boot([rec({})],idb,{catalog:c}); await wait(800);
 t3.d.getElementById('fab').click(); const aq=t3.d.querySelector('#add-queue [data-ad="queue"]'); ok(aq,'dopo il riavvio la coda c’è'); aq.click(); await wait(200);
 const r3=rowOf(t3,/lettura poco sicura/); ok(r3&&r3.querySelector('.qdup'),'dopo il riavvio l’avviso c’è ancora');
 console.log('dopo il riavvio:',r3.querySelector('.qdup').textContent);
 // Annulla su una copia identica: torna al numero di prima
 added[1].querySelector('[data-q="undo"]').click(); await wait(100);
 ok(cat(t).find(e=>e.cond==='EX').qty===2,'Annulla toglie una copia');
 const errs=[t,t2,t3].flatMap(x=>x.errors);
 if(errs.length){ console.log('errori:',errs); process.exit(1); }
 console.log('ce_lhai_gia_test: '+checks+' controlli superati, errori: nessuno'); process.exit(0);
})();
