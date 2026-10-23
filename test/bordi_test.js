// 23/10/2026: riconoscimento dei bordi della carta, ritaglio non più capovolto, lati trascinabili dal centro, Gemini che non risponde.
// - Chromium vero: il codice del rilevatore preso da app/index.html su scene disegnate (sfondi, ombra della mano, ombra portata,
//   carta storta o capovolta). Il vecchio rilevatore (per colore) partiva spesso dall'angolo in basso a destra: ritaglio a testa in giù.
// - JSDOM: nell'editor dei bordi si trascina anche il centro di un lato; Gemini che non risponde passa al modello successivo.
// Verifiche vere: il test si ferma al primo errore.
const {launch}=require(require('./percorsi').SHOT+'/browser.js');
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const {IDBFactory}=require('fake-indexeddb');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
let checks=0;
function ok(c,m){ checks++; if(!c) throw new Error('NON SUPERATO: '+m); console.log('  ok  '+m); }
async function until(fn,ms=8000){ const t0=Date.now(); while(Date.now()-t0<ms){ if(fn()) return true; await wait(40);} return false; }

// codice del rilevatore, così com'è nell'app
const a=html.indexOf('let REFINE = true;'), b=html.indexOf('// miglioramento della carta raddrizzata');
if(a<0||b<0) throw new Error('codice del rilevatore non trovato in index.html');
const DET=html.slice(a,b);

async function chromium(){
  const browser=await launch();
  try {
    const page=await browser.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.goto('about:blank');
    const res=await page.evaluate(DET=>{
      const A=new Function(DET+';return {detectFromPixels, orderQuad, sortCorners};')();
      let seed=1; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
      // carta finta: cornice, riquadro dell'illustrazione a macchie colorate, righe di testo
      function art(border){
        const c=document.createElement('canvas'); c.width=476; c.height=664; const g=c.getContext('2d');
        g.fillStyle=border; g.fillRect(0,0,476,664); g.fillStyle='#7ab0d8'; g.fillRect(22,22,432,620); g.fillStyle='#f4e9c8'; g.fillRect(36,70,404,270);
        for(let i=0;i<60;i++){ g.fillStyle='hsl('+Math.floor(rnd()*360)+',70%,'+(30+rnd()*40)+'%)'; g.fillRect(40+rnd()*380,74+rnd()*250,10+rnd()*60,10+rnd()*60); }
        g.fillStyle='#222'; for(let i=0;i<9;i++) g.fillRect(40,370+i*26,100+rnd()*280,8);
        return c;
      }
      const W=1125,H=2000;
      function scene(o){
        const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
        const base={wall:[214,212,206],white:[240,240,238],wood:[120,80,50],grey:[128,128,130],black:[25,25,28]}[o.bg];
        const id=g.createImageData(W,H), d=id.data;
        for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const i=(y*W+x)*4; let n=(rnd()-0.5)*30; if(o.bg==='wood') n+=18*Math.sin(x/9+Math.sin(y/80)*3); if(o.bg==='wall') n+=10*Math.sin(x/23+y/31)*Math.sin(y/17);
          const l=1-0.25*(y/H); d[i]=(base[0]+n)*l; d[i+1]=(base[1]+n)*l; d[i+2]=(base[2]+n)*l; d[i+3]=255; }
        g.putImageData(id,0,0);
        const ch=H*o.size, cw=ch*0.716, cx=W/2+o.dx*W, cy=H/2+o.dy*H, M=new DOMMatrix().translate(cx,cy).rotate(o.rot);
        const gt=[[-cw/2,-ch/2],[cw/2,-ch/2],[cw/2,ch/2],[-cw/2,ch/2]].map(([x,y])=>{const p=M.transformPoint({x,y}); return [p.x,p.y];});
        if(o.drop){ g.save(); g.filter='blur(14px)'; g.fillStyle='rgba(0,0,0,0.45)'; g.beginPath(); gt.forEach((p,i)=>i?g.lineTo(p[0]+18,p[1]+22):g.moveTo(p[0]+18,p[1]+22)); g.fill(); g.restore(); }
        g.save(); g.translate(cx,cy); g.rotate(o.rot*Math.PI/180); g.beginPath(); g.roundRect(-cw/2,-ch/2,cw,ch,cw*0.045); g.clip(); g.drawImage(art(o.border),-cw/2,-ch/2,cw,ch); g.restore();
        // ombra della mano che regge il telefono: macchia scura sfumata sotto la carta, come nella foto dell'utente
        if(o.hand){ g.save(); g.filter='blur('+o.hand+'px)'; g.fillStyle='rgba(0,0,0,0.42)'; g.beginPath(); g.ellipse(cx-cw*0.25,cy+ch*0.55,cw*0.55,ch*0.45,0.2,0,Math.PI*2); g.fill(); g.restore(); }
        return {c,gt,ch};
      }
      const cases=[
        {bg:'wall',border:'#e8cc3a',rot:0,size:0.5,dx:0,dy:0,hand:20},
        {bg:'wall',border:'#e8cc3a',rot:3,size:0.6,dx:0.05,dy:-0.05},
        {bg:'white',border:'#e8cc3a',rot:-8,size:0.45,dx:-0.05,dy:0.08,hand:20},
        {bg:'white',border:'#e8cc3a',rot:2,size:0.55,dx:0,dy:0,drop:true},
        {bg:'wood',border:'#e8cc3a',rot:0,size:0.5,dx:0,dy:0,hand:20},
        {bg:'wood',border:'#cfcfcc',rot:-3,size:0.55,dx:0,dy:0.05},
        {bg:'grey',border:'#e8cc3a',rot:15,size:0.4,dx:0,dy:0},
        {bg:'grey',border:'#e8cc3a',rot:183,size:0.55,dx:0,dy:0,hand:8},
        {bg:'black',border:'#cfcfcc',rot:1,size:0.65,dx:0,dy:0},
        {bg:'black',border:'#e8cc3a',rot:-2,size:0.33,dx:0.1,dy:-0.15,drop:true},
      ];
      const out=[];
      for(const [k,o] of cases.entries()){
        seed=1000+k*7;
        const {c,gt,ch}=scene(o), S=480/Math.max(W,H), w=Math.round(W*S), h=Math.round(H*S);
        const sc=document.createElement('canvas'); sc.width=w; sc.height=h; const sg=sc.getContext('2d',{willReadFrequently:true}); sg.drawImage(c,0,0,w,h);
        const px=sg.getImageData(0,0,w,h).data, t0=performance.now(), r=A.detectFromPixels(px,w,h), ms=performance.now()-t0;
        const q=r.quad?r.quad.map(p=>[p[0]/S,p[1]/S]):null;
        const err=q?Math.max(...gt.map(g0=>Math.min(...q.map(p=>Math.hypot(p[0]-g0[0],p[1]-g0[1])))))/ch:9;
        // ritaglio: il primo angolo dopo orderQuad deve essere quello in alto a sinistra nella foto (carta dritta, non capovolta)
        const oq=q&&A.orderQuad(q,false), tl=gt.slice().sort((p1,p2)=>(p1[0]+p1[1])-(p2[0]+p2[1]))[0];
        out.push({name:o.bg+' '+o.border+' rot '+o.rot+(o.hand?' mano':'')+(o.drop?' ombra':''),ok:r.ok,err:+err.toFixed(3),upright:!!oq&&Math.hypot(oq[0][0]-tl[0],oq[0][1]-tl[1])<ch*0.15,ms:Math.round(ms)});
      }
      // ordine degli angoli: qualunque ordine in ingresso, orderQuad parte dall'alto a sinistra e va in senso orario
      const R=[[100,100],[400,110],[390,520],[95,510]], perms=[[0,1,2,3],[2,3,0,1],[1,2,3,0],[3,2,1,0],[0,3,2,1]];
      const orders=perms.map(p=>JSON.stringify(A.orderQuad(p.map(i=>R[i]),false))), flip=JSON.stringify(A.orderQuad(R,true));
      return {out,orders,flip,R:JSON.stringify(R),Rflip:JSON.stringify([R[2],R[3],R[0],R[1]])};
    },DET);
    ok(!errs.length,'nessun errore nella pagina '+errs.join(' | '));
    for(const r of res.out) console.log('     '+r.name.padEnd(34)+' errore '+(r.err*100).toFixed(1)+'%  '+(r.upright?'dritta':'CAPOVOLTA')+'  ok='+r.ok+'  '+r.ms+' ms');
    const good=res.out.filter(r=>r.err<0.06);
    ok(good.length>=9,'bordi trovati (errore < 6% dell\'altezza) in '+good.length+' scene su '+res.out.length);
    ok(good.every(r=>r.upright),'ritaglio mai capovolto quando i bordi sono giusti');
    ok(res.out.filter(r=>/mano/.test(r.name)).every(r=>r.err<0.06),'ombra della mano sotto la carta: bordi giusti (il vecchio rilevatore allungava la carta nell\'ombra)');
    ok(res.out.filter(r=>r.ok).every(r=>r.err<0.08),'quando dice "sicuro" (niente conferma) i bordi sono giusti');
    ok(good.filter(r=>r.ok).length>=8,'nella maggior parte delle scene non serve correggere a mano');
    ok(Math.max(...res.out.map(r=>r.ms))<400,'veloce: al massimo '+Math.max(...res.out.map(r=>r.ms))+' ms per foto (Mac)');
    ok(res.orders.every(o=>o===res.R),'angoli in qualunque ordine: ritaglio dall\'alto a sinistra in senso orario');
    ok(res.flip===res.Rflip,'"Capovolgi" ruota ancora di 180°');
  } finally { await browser.close(); }
}

// ---------- JSDOM: editor e Gemini ----------
const stats={arcs:[],lines:[]};
let lineBuf=[];
function boot(o){
  const errors=[], log={models:[]}; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.detail&&e.detail.stack||e.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,beforeParse(w){
    w.localStorage.setItem('pkm_cfg',JSON.stringify(o.cfg)); w.indexedDB=new IDBFactory();
    w.confirm=()=>true; w.scrollTo=()=>{}; w.Element.prototype.scrollIntoView=()=>{}; w.createImageBitmap=async()=>({width:900,height:1200,close(){}});
    // i 45 s di attesa di Gemini diventano 30 ms
    const st=w.setTimeout.bind(w); w.setTimeout=(f,ms,...x)=>st(f,ms>=45000?30:ms,...x);
    w.Image=class{ constructor(){ this.width=0; this.height=0; } set src(v){ this._s=v; setTimeout(()=>{ this.width=this.naturalWidth=900; this.height=this.naturalHeight=1200; this.onload&&this.onload(); },5); } get src(){ return this._s; } };
    w.HTMLCanvasElement.prototype.getContext=function(){const c=this;return {canvas:c,drawImage(){},clearRect(){stats.arcs=[];stats.lines=[]},fillRect(){},beginPath(){lineBuf=[]},moveTo(x,y){lineBuf=[[x,y]]},lineTo(x,y){lineBuf.push([x,y])},closePath(){},stroke(){ if(lineBuf.length===2) stats.lines.push(lineBuf.map(p=>p.map(Math.round))); },fill(){},
      arc(x,y,rr){stats.arcs.push([Math.round(x),Math.round(y),Math.round(rr)])},save(){},restore(){},clip(){},
      getImageData:(x,y,ww,hh)=>{ const px=new Uint8ClampedArray(ww*hh*4); for(let i=0;i<ww*hh;i++){ px[i*4]=o.card&&Math.abs(i%ww-ww/2)<ww*0.22&&Math.abs(((i/ww)|0)-hh/2)<ww*0.31?235:90; px[i*4+1]=110; px[i*4+2]=85; px[i*4+3]=255; } return {data:px,width:ww,height:hh}; },
      createImageData:(ww,hh)=>({data:new Uint8ClampedArray(ww*hh*4),width:ww,height:hh}),putImageData(){},set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){},set lineCap(v){}}};
    w.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/jpeg;base64,QUFB';
    w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:300,height:400,right:300,bottom:400});
    w.fetch=async(u,opt)=>{ u=String(u); return o.api?o.api(u,opt,log):J({},404); };
  }});
  return {w:dom.window,d:dom.window.document,errors,log};
}
const txt=(t,sel)=>{const el=t.d.querySelector(sel);return el?el.textContent.replace(/\s+/g,' ').trim():''};
const cat=t=>JSON.parse(t.w.localStorage.getItem('pkm_catalog')||'[]');
const send=async(t,n=1)=>{ const input=t.d.getElementById('q-file'); Object.defineProperty(input,'files',{value:Array.from({length:n},(_,i)=>new t.w.File(['x'],'f'+i+'.jpg',{type:'image/jpeg'})),configurable:true}); input.dispatchEvent(new t.w.Event('change',{bubbles:true})); };
const ptr=(t,el,type,x,y)=>el.dispatchEvent(new t.w.MouseEvent(type,{bubbles:true,clientX:x,clientY:y}));
// maniglie: angoli = cerchi di raggio 12 (6 se presi); lati = trattini di due punti disegnati due volte (bordo scuro e giallo)
const corners=()=>stats.arcs.filter(a=>a[2]===12||a[2]===6).map(a=>[a[0],a[1]]);
const sideBars=()=>{ const seen=new Set(); return stats.lines.filter(l=>{ const k=JSON.stringify(l); if(seen.has(k)) return false; seen.add(k); return true; }); };
const close=(a,b,tol=1.5)=>Math.abs(a-b)<=tol;

async function editor(){
  console.log('2 editor dei bordi: lati trascinabili dal centro');
  const t=boot({cfg:{provider:'claude',key:'sk-x',model:'claude-haiku-4-5'}});
  await wait(250); t.d.getElementById('fab').click(); t.d.querySelector('[data-ad="quick"]').click(); await wait(50);
  await send(t);
  ok(await until(()=>!t.d.getElementById('qedge').hidden),'foto senza bordi: editor aperto');
  ok(/angoli o lati/.test(txt(t,'#qe-msg')),'il messaggio dice che si trascinano anche i lati: '+txt(t,'#qe-msg'));
  const cv=t.d.getElementById('qe-cv'), f=300/cv.width;           // pixel della tela -> coordinate del dito
  let c0=corners(); ok(c0.length===4,'4 angoli');
  let bars=sideBars(); ok(bars.length===4,'4 maniglie al centro dei lati');
  for(let i=0;i<4;i++){ const m=[(c0[i][0]+c0[(i+1)%4][0])/2,(c0[i][1]+c0[(i+1)%4][1])/2]; ok(bars.some(l=>close((l[0][0]+l[1][0])/2,m[0])&&close((l[0][1]+l[1][1])/2,m[1])),'maniglia al centro del lato '+i); }
  // lato alto trascinato in giù di 30: i due angoli in alto scendono insieme, quelli in basso restano
  const mx=(c0[0][0]+c0[1][0])/2*f, my=(c0[0][1]+c0[1][1])/2*f;
  ptr(t,cv,'pointerdown',mx,my); ptr(t,cv,'pointermove',mx+12,my+30);
  ok(stats.arcs.some(a=>a[2]===58),'lente aperta mentre si sposta il lato');
  let c1=corners(); const dy=30/f;
  ok(close(c1[0][1],c0[0][1]+dy)&&close(c1[1][1],c0[1][1]+dy),'angoli in alto scesi di 30 (anche se il dito va un po\' di lato)');
  ok(close(c1[0][0],c0[0][0])&&close(c1[1][0],c0[1][0]),'il lato si sposta solo perpendicolarmente');
  ok(JSON.stringify(c1[2])===JSON.stringify(c0[2])&&JSON.stringify(c1[3])===JSON.stringify(c0[3]),'angoli in basso fermi');
  ptr(t,cv,'pointerup',mx+12,my+30); ok(!stats.arcs.some(a=>a[2]===58),'lente chiusa al rilascio');
  // un angolo spostato rende obliquo il lato sinistro; poi il lato alto: l'angolo scorre lungo il lato sinistro
  const cA=corners(); ptr(t,cv,'pointerdown',cA[0][0]*f,cA[0][1]*f); ptr(t,cv,'pointermove',cA[0][0]*f+40,cA[0][1]*f); ptr(t,cv,'pointerup',cA[0][0]*f+40,cA[0][1]*f);
  const cB=corners(); ok(close(cB[0][0],cA[0][0]+40/f),'angolo alto-sinistro spostato a destra');
  const tx=(cB[0][0]+cB[1][0])/2*f, ty=(cB[0][1]+cB[1][1])/2*f;
  ptr(t,cv,'pointerdown',tx,ty); ptr(t,cv,'pointermove',tx,ty+25); ptr(t,cv,'pointerup',tx,ty+25);
  const cC=corners(), cross=(o,p,q)=>(p[0]-o[0])*(q[1]-o[1])-(p[1]-o[1])*(q[0]-o[0]);
  ok(Math.abs(cross(cB[3],cB[0],cC[0]))/Math.hypot(cB[0][0]-cB[3][0],cB[0][1]-cB[3][1])<1.5,'l\'angolo è scivolato lungo il lato sinistro (obliquo)');
  ok(Math.abs(cross(cB[0],cB[1],[cB[0][0]+(cC[1][0]-cC[0][0]),cB[0][1]+(cC[1][1]-cC[0][1])]))/Math.hypot(cB[1][0]-cB[0][0],cB[1][1]-cB[0][1])<1.5,'il lato alto resta parallelo a prima');
  ok(cC[0][1]>cB[0][1]&&cC[1][1]>cB[1][1],'lato alto sceso');
  // il dito vicino a un angolo prende ancora l'angolo
  ptr(t,cv,'pointerdown',cC[2][0]*f+3,cC[2][1]*f+3); ok(stats.arcs.some(a=>a[2]===6),'vicino all\'angolo si prende l\'angolo'); ptr(t,cv,'pointerup',cC[2][0]*f,cC[2][1]*f);
  t.d.querySelector('#qedge [data-qe="reset"]').click(); ok(JSON.stringify(corners())===JSON.stringify(c0),'Ripristina');
  ok(!t.errors.length,'nessun errore '+t.errors.join(' | '));
}

async function gemini(){
  console.log('3 Gemini che non risponde: si passa al modello successivo');
  const recOk={name_en:'Pikachu',name_printed:'Pikachu',number:'55',printed_total:'200',language:'it',variant_hint:'normal',confidence:0.95};
  const api=hang=>async(u,opt,log)=>{
    if(u.includes(':generateContent')){ const m=u.match(/models\/([^:]+):/)[1]; log.models.push(m);
      if(hang(m)) return new Promise((res,rej)=>opt.signal.addEventListener('abort',()=>rej(Object.assign(new Error('aborted'),{name:'AbortError'}))));
      return J({candidates:[{content:{parts:[{text:JSON.stringify(recOk)}]}}]}); }
    if(u.includes('generativelanguage')) return J({models:[]});
    if(u.endsWith('/it/sets')) return J([{id:'aa01',name:'Set A',cardCount:{official:200,total:210}}]);
    if(/\/it\/sets\/aa01$/.test(u)) return J({cards:[{id:'aa01-055',localId:'055',name:'Pikachu'}]});
    if(/\/it\/cards\/aa01-055$/.test(u)) return J({id:'aa01-055',localId:'055',name:'Pikachu',image:'https://x/p',set:{id:'aa01',name:'Set A',cardCount:{official:200}},pricing:{cardmarket:{trend:1}},dexId:[25]});
    return J({},404); };
  const cfg={provider:'gemini',gkey:'AIzaX',gmodel:'',gmodels:['m1','m2']};
  let t=boot({cfg,card:true,api:api(m=>m==='m1')}); await wait(250);
  t.d.getElementById('fab').click(); t.d.querySelector('[data-ad="quick"]').click(); await wait(50); await send(t);
  ok(await until(()=>cat(t).length===1),'m1 non risponde: letta con m2 e aggiunta');
  ok(t.log.models.join(',')==='m1,m1,m2','m1 provato due volte, poi m2: '+t.log.models.join(','));
  await send(t);
  ok(await until(()=>t.log.models.length>3,9000),'seconda carta letta');
  ok(t.log.models[3]==='m2','la carta dopo parte da m2 (m1 lento passa in fondo): '+t.log.models.join(','));
  ok(JSON.parse(t.w.localStorage.getItem('pkm_cfg')).gmodel==='','"Automatico" resta automatico');
  t=boot({cfg,card:true,api:api(()=>true)}); await wait(250);
  t.d.getElementById('fab').click(); t.d.querySelector('[data-ad="quick"]').click(); await wait(50); await send(t);
  ok(await until(()=>/Gemini non risponde/.test(txt(t,'#q-list')+txt(t,'#q-banner'))),'nessun modello risponde: errore chiaro');
  ok(t.log.models.join(',')==='m1,m1,m2','al secondo modello muto ci si ferma (un solo tentativo sul secondo): '+t.log.models.join(','));
  ok(/provati m1 e m2/.test(txt(t,'#q-list')+txt(t,'#q-banner')),'il messaggio nomina i modelli provati: '+(txt(t,'#q-banner')||txt(t,'#q-list')).slice(0,140));
}

(async()=>{
  try {
    console.log('1 rilevatore dei bordi su scene disegnate (Chromium)');
    await chromium();
    await editor();
    await gemini();
    console.log('bordi: '+checks+' controlli superati, errori: nessuno');
    process.exit(0);
  } catch(e){ console.log(e.message||e); console.log('bordi: '+checks+' controlli superati, errori: 1'); process.exit(1); }
})();
