// 18/10/2026 (web): correzione dei bordi nella scansione rapida con la lente, come nell'app nativa.
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const assert=require('assert'); const {IDBFactory}=require('fake-indexeddb');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
let uniform=true;
function synth(w,h){ const px=new Uint8ClampedArray(w*h*4); const cx=w/2,cy=h/2,cw=w*0.45,ch=cw*1.4;
  for(let i=0;i<w*h;i++){ const x=i%w,y=(i/w)|0; let r=90,g=110,b=85; if(!uniform&&Math.abs(x-cx)<cw/2&&Math.abs(y-cy)<ch/2){ const inner=Math.abs(x-cx)<cw/2-w*0.03&&Math.abs(y-cy)<ch/2-w*0.03; if(inner){r=60;g=100;b=170}else{r=235;g=200;b=60} } const o=i*4; px[o]=r;px[o+1]=g;px[o+2]=b;px[o+3]=255; } return px; }
const setsList=[{id:'me01',name:'Megaevoluzione',cardCount:{official:132,total:188}}];
const detail=id=>({id,localId:'127',name:'Rovine Insidiose',rarity:'Comune',image:'https://x/'+id,set:{id:'me01',name:'Megaevoluzione',cardCount:{official:132,total:188}},pricing:{cardmarket:{trend:10,avg30:10}},dexId:[],category:'Pokémon',illustrator:'Ill'});
const stats={clip:0,arcs:[]};
function boot(recs,idb,cfgx={}){
  const calls={claude:0}; const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
  const api=async(url)=>{url=String(url);
    if(url.includes('api.anthropic.com')){ const i=calls.claude++; const r=recs[Math.min(i,recs.length-1)]; return J({content:[{type:'text',text:JSON.stringify(r)}]}); }
    if(url.endsWith('/it/sets')) return J(setsList);
    let m=url.match(/\/it\/sets\/([^/?]+)$/); if(m) return J({id:'me01',cards:[{id:'me01-127',localId:'127',name:'Rovine Insidiose'}]});
    m=url.match(/\/it\/cards\/([^/?]+)$/); if(m) return J(detail(m[1]));
    if(url.includes('/it/cards?name=')) return J([]);
    if(url.includes('pokemontcg')) return J({data:[]});
    return J({},404)};
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
   beforeParse(w){ w.localStorage.setItem('pkm_cfg',JSON.stringify(Object.assign({provider:'claude',key:'sk-x',model:'claude-haiku-4-5',enhance:true},cfgx)));
    w.indexedDB=idb; w.confirm=()=>true; w.scrollTo=()=>{}; w.Element.prototype.scrollIntoView=()=>{}; w.createImageBitmap=async()=>({width:900,height:1200,close(){}});
    w.Image=class{ constructor(){ this.width=0; this.height=0; } set src(v){ this._s=v; setTimeout(()=>{ this.width=this.naturalWidth=900; this.height=this.naturalHeight=1200; this.onload&&this.onload(); },5); } get src(){ return this._s; } };
    w.HTMLCanvasElement.prototype.getContext=function(){const c=this;return {canvas:c,drawImage(){},clearRect(){stats.arcs=[]},fillRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){},fill(){},arc(x,y,rr){stats.arcs.push([Math.round(x),Math.round(y),Math.round(rr)])},save(){},restore(){},clip(){stats.clip++},
      getImageData:(x,y,ww,hh)=>({data:synth(ww,hh),width:ww,height:hh}),createImageData:(ww,hh)=>({data:new Uint8ClampedArray(ww*hh*4),width:ww,height:hh}),putImageData(){},set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){}}};
    w.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/jpeg;base64,AAAA'; w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:300,height:400,right:300,bottom:400}); w.fetch=api; }});
  return {w:dom.window,d:dom.window.document,errors,calls};
}
const vis=(t,id)=>!t.d.getElementById(id).hidden;
const txt=(t,sel)=>{const el=t.d.querySelector(sel);return el?el.textContent.replace(/\s+/g,' ').trim():''};
const cat=t=>JSON.parse(t.w.localStorage.getItem('pkm_catalog')||'[]');
const rec=o=>Object.assign({name_en:'Lurking Ruins',name_printed:'Rovine Insidiose',number:'127',printed_total:'132',language:'it',variant_hint:'normal',confidence:0.95,condition:'EX',condition_notes:'',condition_confidence:0.8},o);
async function sendFiles(t,n){ const input=t.d.getElementById('q-file'); const files=Array.from({length:n},(_,i)=>new t.w.File(['x'],'f'+i+'.jpg',{type:'image/jpeg'})); Object.defineProperty(input,'files',{value:files,configurable:true}); input.dispatchEvent(new t.w.Event('change',{bubbles:true})); }
async function until(fn,ms=15000){ const t0=Date.now(); while(Date.now()-t0<ms){ if(fn()) return true; await wait(80);} return false; }
const ptr=(t,el,type,x,y)=>el.dispatchEvent(new t.w.MouseEvent(type,{bubbles:true,clientX:x,clientY:y}));
// l'app è chiusa in una funzione: lo stato dell'editor si legge da ciò che disegna (maniglie r 12 o 6 se trascinata, lente r 58)
const handles=()=>JSON.stringify(stats.arcs.filter(a=>a[2]===12||a[2]===6).map(a=>[a[0],a[1]]));
const dragging=()=>stats.arcs.some(a=>a[2]===6), loupeOn=()=>stats.arcs.some(a=>a[2]===58);
const qe=(t,a)=>t.d.querySelector('#qedge [data-qe="'+a+'"]').click();
const row=(t,re)=>[...t.d.querySelectorAll('#q-list .qrow')].find(r=>re.test(r.textContent));

(async()=>{
 // 0 posizione della lente (funzione loupePos dell'app)
 const js=fs.readFileSync(require('./percorsi').APPJS,'utf8');
 const lp=new Function(js.match(/function loupePos[\s\S]*?\n\}/)[0]+';return loupePos;')();
 const W=600,H=800,R=58,G=38,M=4, inside=c=>c[0]-R>=M-1e-9&&c[0]+R<=W-M+1e-9&&c[1]-R>=M-1e-9&&c[1]+R<=H-M+1e-9, far=(c,x,y)=>Math.hypot(c[0]-x,c[1]-y)>=R+G-0.5;
 let c=lp(300,600,W,H,R,G,M); assert.deepStrictEqual(c,[300,600-R-G],'in basso: sopra il dito');
 c=lp(40,30,W,H,R,G,M); assert.ok(c[0]>40&&inside(c)&&far(c,40,30),'alto a sinistra: di lato a destra');
 c=lp(560,30,W,H,R,G,M); assert.ok(c[0]<560&&inside(c)&&far(c,560,30),'alto a destra: di lato a sinistra');
 for (const [x,y] of [[2,790],[598,790],[2,300],[598,300],[300,2]]) { c=lp(x,y,W,H,R,G,M); assert.ok(inside(c),'dentro '+x+','+y); assert.ok(far(c,x,y),'non sotto il dito '+x+','+y); }
 assert.ok(!/cy = h\[1\] \+ R \+ 38/.test(js),'la lente non va più sotto il dito');
 console.log('0 lente: posizioni ok');

 // 1 foto senza bordi: niente lettura, editor a schermo intero aperto da solo
 const idb=new IDBFactory(); const t=boot([rec({}),rec({}),rec({})],idb); await wait(250);
 t.d.getElementById('fab').click(); t.d.querySelector('[data-ad="quick"]').click(); await wait(50);
 await sendFiles(t,2);
 assert.ok(await until(()=>vis(t,'qedge')),'editor aperto');
 assert.strictEqual(t.calls.claude,0,'nessuna lettura prima della correzione');
 assert.match(txt(t,'#qe-msg'),/Non trovo bene i bordi/);
 await until(()=>/Altre 1 foto/.test(txt(t,'#qe-more')));
 assert.match(txt(t,'#qe-more'),/Altre 1 foto in attesa/);
 assert.match(txt(t,'#q-stats'),/Da controllare 2/);
 assert.strictEqual(t.d.querySelectorAll('#q-list [data-q="edges"]').length,2,'tasto Correggi bordi sulle righe');
 assert.match(txt(t,'#q-list'),/Bordi da controllare/);
 const cv=t.d.getElementById('qe-cv'); assert.ok(cv.width>0&&cv.height>0&&/px/.test(cv.style.width),'tela dimensionata');
 console.log('1 bordi non trovati: editor aperto,',txt(t,'#qe-more'),'|',txt(t,'#q-stats'));

 // 2 trascinamento: l'angolo si sposta, la lente compare, Ripristina torna indietro
 const q0=handles(); const clip0=stats.clip; assert.ok(JSON.parse(q0).length===4,'4 maniglie');
 ptr(t,cv,'pointerdown',5,5); ptr(t,cv,'pointermove',40,30);
 assert.ok(dragging(),'angolo preso'); assert.ok(loupeOn()&&stats.clip>clip0,'lente disegnata');
 assert.notStrictEqual(handles(),q0,'angolo spostato');
 const clip1=stats.clip; ptr(t,cv,'pointerup',40,30); assert.ok(!dragging()&&!loupeOn(),'rilasciato'); assert.strictEqual(stats.clip,clip1,'lente chiusa al rilascio');
 qe(t,'reset'); assert.strictEqual(handles(),q0,'Ripristina');
 console.log('2 trascinamento con lente, rilascio e Ripristina ok');

 // 3 Più tardi: si chiude, la foto resta da controllare; Conferma sull'altra: lettura e aggiunta
 qe(t,'later'); await wait(50); assert.ok(!vis(t,'qedge'),'chiuso con Più tardi');
 await wait(150); assert.ok(!vis(t,'qedge'),'Più tardi non riapre subito le altre');
 // riapertura dal tasto della riga (prima foto della lista = la più recente)
 row(t,/Bordi da controllare/).querySelector('[data-q="edges"]').click(); assert.ok(await until(()=>vis(t,'qedge')),'riaperto dal tasto della riga');
 ptr(t,cv,'pointerdown',5,5); ptr(t,cv,'pointermove',30,30); ptr(t,cv,'pointerup',30,30);
 qe(t,'ok');
 assert.ok(await until(()=>cat(t).length===1),'confermata, letta e aggiunta');
 assert.strictEqual(t.calls.claude,1,'una sola lettura');
 const stored=await new Promise(r=>{ const o=idb.open('pkm_queue',1); o.onsuccess=()=>{ const g=o.result.transaction('jobs').objectStore('jobs').getAll(); g.onsuccess=()=>r(g.result); }; });
 assert.strictEqual(stored.length,1,'in coda resta solo quella rinviata'); assert.strictEqual(stored[0].status,'edges'); assert.ok(stored[0].photo&&stored[0].quad&&stored[0].quad.length===4,'foto e bordi salvati');
 console.log('3 Più tardi + Conferma: catalogo',cat(t).length,'| salvata in coda:',stored[0].status);

 // 4 dopo il riavvio la foto rinviata ritorna e l'editor si riapre entrando in Scansione rapida; Scarta la elimina
 await wait(300);
 const t2=boot([rec({})],idb); await wait(500);
 assert.strictEqual(t2.d.getElementById('fab-n').textContent,'1','numero sul tasto giallo'); t2.d.getElementById('fab').click(); assert.match(txt(t2,'#add-queue'),/1 da controllare/,'riga della coda nel pannello Aggiungi'); assert.strictEqual(t2.d.querySelector('#add-queue button').textContent,'Controlla'); t2.d.querySelector('[data-ad="close"]').click();
 t2.d.getElementById('fab').click(); t2.d.querySelector('[data-ad=\"quick\"]').click(); assert.ok(await until(()=>vis(t2,'qedge')),'editor riaperto dopo il riavvio');
 qe(t2,'discard'); await wait(100); assert.ok(!vis(t2,'qedge')); assert.strictEqual(t2.d.querySelectorAll('#q-list .qrow').length,0,'Scarta elimina la foto');
 console.log('4 riavvio: editor riaperto, Scarta ok');

 // 5 carta trovata con "Conferma i bordi" attivo: editor con "Controlla i bordi"
 uniform=false;
 const t3=boot([rec({confidence:0.3}),rec({})],new IDBFactory(),{confirmEdges:true}); await wait(250);
 t3.d.getElementById('fab').click(); t3.d.querySelector('[data-ad=\"quick\"]').click(); await sendFiles(t3,1);
 assert.ok(await until(()=>vis(t3,'qedge'))); assert.match(txt(t3,'#qe-msg'),/Controlla i bordi/);
 qe(t3,'ok'); assert.ok(await until(()=>/lettura poco sicura/.test(txt(t3,'#q-list'))),'letta, da controllare');
 // 6 foto da controllare: Controlla + Correggi bordi; dalla riga si rilegge dopo la correzione
 const r6=row(t3,/lettura poco sicura/); assert.ok(r6.querySelector('[data-q="review"]')&&r6.querySelector('[data-q="edges"]'),'Controlla e Correggi bordi'); assert.ok(r6.classList.contains('wide'),'tre pulsanti su una riga sotto il testo');
 r6.querySelector('[data-q="edges"]').click(); assert.ok(await until(()=>vis(t3,'qedge'))); assert.match(txt(t3,'#qe-msg'),/letta di nuovo/);
 qe(t3,'ok'); assert.ok(await until(()=>cat(t3).length===1),'riletta e aggiunta'); assert.strictEqual(t3.calls.claude,2);
 console.log('6 Correggi bordi da una carta da controllare: riletta e aggiunta');

 // 7 pagina di controllo: "Correggi bordi" apre l'editor della pagina (con lente) sulla foto conservata
 uniform=false;
 const t4=boot([rec({confidence:0.3}),rec({})],new IDBFactory()); await wait(250);
 t4.d.getElementById('fab').click(); t4.d.querySelector('[data-ad=\"quick\"]').click(); await sendFiles(t4,1);
 assert.ok(await until(()=>/lettura poco sicura/.test(txt(t4,'#q-list'))),'carta trovata da sola, letta, da controllare');
 assert.ok(!vis(t4,'qedge'),'bordi trovati: nessun editor');
 const st=await new Promise(r=>{ const o=t4.w.indexedDB.open('pkm_queue',1); o.onsuccess=()=>{ const g=o.result.transaction('jobs').objectStore('jobs').getAll(); g.onsuccess=()=>r(g.result); }; });
 assert.ok(st[0].photo,'foto conservata anche se i bordi erano giusti');
 row(t4,/lettura poco sicura/).querySelector('[data-q="review"]').click(); await wait(300);
 assert.ok(vis(t4,'v-scan')); assert.ok(!t4.d.getElementById('btn-edges').hidden&&!t4.d.getElementById('btn-flip').hidden,'tasti visibili');
 await wait(200);
 t4.d.getElementById('btn-edges').click(); assert.ok(vis(t4,'editbox'),'editor della pagina aperto');
 const ecv=t4.d.getElementById('editor'), c4=stats.clip; ptr(t4,ecv,'pointerdown',5,5); assert.ok(stats.clip>c4&&loupeOn(),'lente anche qui'); ptr(t4,ecv,'pointerup',5,5);
 t4.d.getElementById('ed-ok').click(); assert.ok(await until(()=>t4.calls.claude===2),'ritaglio e nuova lettura');
 console.log('7 pagina di controllo: Correggi bordi con lente e nuova lettura');

 // 8 aggiunta automatica: la foto conservata viene buttata
 const t5=boot([rec({})],new IDBFactory()); await wait(250);
 t5.d.getElementById('fab').click(); t5.d.querySelector('[data-ad=\"quick\"]').click(); await sendFiles(t5,1); assert.ok(await until(()=>cat(t5).length===1));
 assert.ok(js.includes("crop:null, raw:null, photo:null, msg:''"),'foto rimossa dopo l\'aggiunta');
 console.log('8 aggiunta automatica: foto conservata rimossa');

 const errs=[t,t2,t3,t4,t5].flatMap(x=>x.errors); console.log('errori:',errs.length?errs:'nessuno');
 process.exit(0);
})().catch(e=>{ console.error(e); process.exit(1); });
