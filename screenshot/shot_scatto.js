// Scatto automatico (23/10/2026): fotocamera finta con una carta ferma su muro chiaro; immagini in .work/shot/
// scatto1.png (riquadro e anello a metà) e scatto2.png (dopo lo scatto). Uso: node screenshot/shot_scatto.js [dark|light]
const path=require('path'), fs=require('fs');
const OUT=path.resolve(__dirname,'../.work/shot')+'/'; fs.mkdirSync(OUT,{recursive:true});
const {launch}=require('./browser'); const theme=process.argv[2]||'dark';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{ try{
  const browser=await launch();
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  page.on('pageerror',e=>console.log('ERRORE PAGINA',e.message));
    await page.evaluateOnNewDocument(()=>{
      localStorage.setItem('pkm_cfg',JSON.stringify({provider:'claude',key:'',confirmEdges:false}));
      localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
      // fotocamera finta: una tela 720×1280 ridisegnata 10 volte al secondo; window.__scena decide cosa c'è davanti
      const W=720,H=1280, cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d');
      let s=3; const r=()=>(s=(s*16807)%2147483647)/2147483647;
      const wall=document.createElement('canvas'); wall.width=W; wall.height=H; { const wg=wall.getContext('2d'), id=wg.createImageData(W,H);
        for(let i=0;i<W*H;i++){ const x=i%W,y=(i/W)|0,n=(r()-0.5)*26+8*Math.sin(x/15+y/20)*Math.sin(y/11); id.data[i*4]=214+n; id.data[i*4+1]=212+n; id.data[i*4+2]=206+n; id.data[i*4+3]=255; } wg.putImageData(id,0,0); }
      const card=c=>{ const a=document.createElement('canvas'); a.width=430; a.height=600; const ag=a.getContext('2d'); ag.fillStyle=c; ag.fillRect(0,0,430,600); ag.fillStyle='#7ab0d8'; ag.fillRect(20,20,390,560); ag.fillStyle='#f4e9c8'; ag.fillRect(32,64,366,244);
        for(let i=0;i<50;i++){ ag.fillStyle='hsl('+Math.floor(r()*360)+',70%,45%)'; ag.fillRect(36+r()*330,68+r()*220,10+r()*50,10+r()*50); } ag.fillStyle='#222'; for(let i=0;i<8;i++) ag.fillRect(36,336+i*26,100+r()*250,8); return a; };
      const cards={a:card('#e8cc3a'),b:card('#e85a3a')};
      window.__scena={card:null,dx:0,jitter:0};
      setInterval(()=>{ const sc=window.__scena; g.drawImage(wall,0,0);
        if(sc.card){ const j=sc.jitter?(Math.random()-0.5)*sc.jitter:0; g.save(); g.translate(W/2+sc.dx+j,H/2+j); g.rotate(-0.03); g.beginPath(); g.roundRect(-215,-300,430,600,20); g.clip(); g.drawImage(cards[sc.card],-215,-300); g.restore(); } },100);
      navigator.mediaDevices.getUserMedia=async()=>cv.captureStream(10);
    });
  await page.evaluateOnNewDocument(t=>{ const c=JSON.parse(localStorage.getItem('pkm_cfg')); c.appearance=t; localStorage.setItem('pkm_cfg',JSON.stringify(c)); },theme);
  await page.goto('file://'+path.resolve(__dirname,'../app/index.html')); await wait(800);
  await page.evaluate(()=>{ document.getElementById('fab').click(); document.querySelector('[data-ad="quick"]').click(); }); await wait(1500);
  await page.evaluate(()=>{ window.__scena.card='a'; });
  for(let i=0;i<60;i++){ await wait(40); if(await page.evaluate(()=>!document.getElementById('q-hold').hidden)) break; } await wait(350);
  await page.screenshot({path:OUT+'scatto1.png'});
  await wait(1500); await page.screenshot({path:OUT+'scatto2.png'});
  await browser.close(); console.log('ok',OUT+'scatto1.png',OUT+'scatto2.png');
}catch(e){ console.log('non disponibile:',String(e.message).slice(0,400)); } })();
