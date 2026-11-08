// Scansione rapida in stile pulito (08/11/2026): video senza pulsanti sotto, icona Galleria nel video, elenco senza riquadri,
// ed editor dei bordi con le azioni a parole.
// Uso: node screenshot/shot_scansione.js dark|light → .work/shot/scansione_<tema>.png, scansione_<tema>_giu.png,
// scansione_bordi.png
const path=require('path'), fs=require('fs');
const OUT=path.resolve(__dirname,'../.work/shot')+'/'; fs.mkdirSync(OUT,{recursive:true});
const {launch}=require('./browser'); const theme=process.argv[2]||'dark';
const APP='file://'+path.resolve(__dirname,'../app/index.html'), CARD='file://'+path.resolve(__dirname,'card.jpg');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
// scena disegnata (muro chiaro, carta, ombra della mano): la stessa di shot_bordi.js
const scena=()=>{ const W=1125,H=2000,c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d'); let s=7; const r=()=>(s=(s*16807)%2147483647)/2147483647;
  const id=g.createImageData(W,H); for(let i=0;i<W*H;i++){ const x=i%W,y=(i/W)|0,n=(r()-0.5)*30+10*Math.sin(x/23+y/31)*Math.sin(y/17),l=1-0.2*y/H; id.data[i*4]=(214+n)*l; id.data[i*4+1]=(212+n)*l; id.data[i*4+2]=(206+n)*l; id.data[i*4+3]=255; }
  g.putImageData(id,0,0); const ch=1000,cw=716; g.save(); g.translate(W/2,H/2-60); g.rotate(-0.04); g.beginPath(); g.roundRect(-cw/2,-ch/2,cw,ch,32); g.clip();
  g.fillStyle='#e8cc3a'; g.fillRect(-cw/2,-ch/2,cw,ch); g.fillStyle='#7ab0d8'; g.fillRect(-cw/2+32,-ch/2+32,cw-64,ch-64); g.fillStyle='#f4e9c8'; g.fillRect(-cw/2+54,-ch/2+105,cw-108,400);
  for(let i=0;i<70;i++){ g.fillStyle='hsl('+Math.floor(r()*360)+',70%,'+(30+r()*40)+'%)'; g.fillRect(-cw/2+60+r()*560,-ch/2+110+r()*360,15+r()*80,15+r()*80); }
  g.fillStyle='#222'; for(let i=0;i<9;i++) g.fillRect(-cw/2+60,60+i*38,150+r()*420,12); g.fillStyle='#c33'; g.font='bold 52px sans-serif'; g.fillText('Charizard ex',-cw/2+60,-ch/2+85); g.restore();
  g.save(); g.filter='blur(20px)'; g.fillStyle='rgba(0,0,0,0.42)'; g.beginPath(); g.ellipse(W/2-180,H/2+500,400,450,0.2,0,7); g.fill(); g.restore(); return c.toDataURL('image/jpeg',0.9); };
// righe come le genera renderQuick (il codice dell'app è chiuso in una funzione e non si raggiunge da qui)
const righe=img=>{ const x='<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>', v='<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const add=(n,m,d)=>'<div class="qrow"><img src="'+img+'" alt=""><div class="body"><div class="nm">'+n+'</div><div class="meta">'+m+'</div>'+(d?'<span class="qdup">'+d+'</span>':'')+'</div><div class="acts two"><button class="btn qic" type="button">'+x+'</button><button class="btn solid qic" type="button">'+v+'</button></div></div>';
  document.getElementById('q-stats').innerHTML='<span>Aggiunte 3</span><span>Da controllare 1</span><span>In coda 1</span>';
  document.getElementById('q-list').innerHTML='<div class="qall"><button class="btn small" type="button">Annulla tutte (3)</button><button class="btn small solid" type="button">Conferma tutte (3)</button></div>'+
    '<div class="qrow"><img src="'+img+'" alt=""><div class="body"><div class="nm">In lettura…</div></div><div class="acts"></div></div>'+
    '<div class="qrow wide"><img src="'+img+'" alt=""><div class="body"><div class="nm">Da controllare: più carte possibili</div><div class="meta">Pikachu, 027</div><span class="qdup">Forse ce l’hai già: 1 copia</span></div><div class="acts"><button class="btn small solid" type="button">Controlla</button><button class="btn small" type="button">Correggi bordi</button><button class="btn small danger" type="button">Elimina</button></div></div>'+
    add('Charizard ex','Ossidiana Infuocata, 125/197, NM','Ce l’hai già: ne avevi 1')+add('Cranidos','Buio Pesto, 044/84, NM')+add('Mew','151, 151/165, NM'); };
(async()=>{ let browser; try{
  browser=await launch();
  const blank=await browser.newPage(); await blank.goto('about:blank'); const png=await blank.evaluate(scena); await blank.close();
  const IMG=path.resolve(__dirname,'../.work/scena_bordi.jpg'); fs.writeFileSync(IMG,Buffer.from(png.split(',')[1],'base64'));
  const open=async cfg=>{ const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
    page.on('pageerror',e=>console.log('ERRORE PAGINA',e.message));
    await page.evaluateOnNewDocument(c=>{ localStorage.setItem('pkm_cfg',JSON.stringify(c)); localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
      navigator.mediaDevices.getUserMedia=()=>new Promise(()=>{}); },Object.assign({appearance:theme,gkey:'x',bkSheet:false},cfg));
    await page.goto(APP); await wait(600); await page.evaluate(()=>{ const w=document.getElementById('prevwarn'); if(w) w.hidden=true; }); return page; };
  // 1 fotocamera: al posto del video la scena fissa
  let page=await open({});
  await page.evaluate(()=>{ document.getElementById('fab').click(); document.querySelector('[data-ad="quick"]').click(); }); await wait(400);
  await page.evaluate((card,img,righe)=>{ const q=document.getElementById('q-cam'); q.style.background='#000 url("'+img+'") center/cover';
    document.getElementById('q-msg').hidden=true; document.getElementById('q-video').style.opacity=0;
    const h=document.getElementById('q-hint'); h.hidden=false; h.textContent='Inquadra una carta: scatto da solo'; eval('('+righe+')')(card); },CARD,'file://'+IMG,righe.toString());
  await wait(300); await page.screenshot({path:OUT+'scansione_'+theme+'.png'});
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight)); await wait(250); await page.screenshot({path:OUT+'scansione_'+theme+'_giu.png'}); await page.close();
  // 3 editor dei bordi (foto dalla galleria con conferma dei bordi)
  if(theme==='dark'){ page=await open({confirmEdges:true,provider:'claude',key:''});
    await page.evaluate(()=>{ document.getElementById('fab').click(); document.querySelector('[data-ad="quick"]').click(); }); await wait(400);
    await (await page.$('#q-file')).uploadFile(IMG);
    await page.waitForSelector('#qedge:not([hidden])',{timeout:15000}); await wait(700);
    await page.screenshot({path:OUT+'scansione_bordi.png'}); await page.close(); }
  console.log('ok '+OUT+'scansione_'+theme+'*.png');
}catch(e){ console.log('non disponibile:',String(e.message).slice(0,400)); } finally { if(browser) await browser.close(); } })();
