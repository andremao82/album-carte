// Editor dei bordi (23/10/2026): carta su muro chiaro con l'ombra della mano, bordi trovati da soli, maniglie su angoli e lati,
// trascinamento del lato alto con la lente. Immagini in .work/shot/bordi1.png (editor) e bordi2.png (lato preso).
const path=require('path'), fs=require('fs');
const OUT=path.resolve(__dirname,'../.work/shot')+'/'; fs.mkdirSync(OUT,{recursive:true});
const {launch}=require('./browser');
(async()=>{ try{
  const browser=await launch();
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:false});
  // scena disegnata: muro chiaro a grana, carta gialla con illustrazione, ombra sfumata della mano sotto la carta
  await page.goto('about:blank');
  const png=await page.evaluate(()=>{
    const W=1125,H=2000,c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d'); let s=7; const r=()=>(s=(s*16807)%2147483647)/2147483647;
    const id=g.createImageData(W,H); for(let i=0;i<W*H;i++){ const x=i%W,y=(i/W)|0,n=(r()-0.5)*30+10*Math.sin(x/23+y/31)*Math.sin(y/17),l=1-0.2*y/H; id.data[i*4]=(214+n)*l; id.data[i*4+1]=(212+n)*l; id.data[i*4+2]=(206+n)*l; id.data[i*4+3]=255; }
    g.putImageData(id,0,0);
    const ch=1000,cw=716; g.save(); g.translate(W/2,H/2-60); g.rotate(-0.04); g.beginPath(); g.roundRect(-cw/2,-ch/2,cw,ch,32); g.clip();
    g.fillStyle='#e8cc3a'; g.fillRect(-cw/2,-ch/2,cw,ch); g.fillStyle='#7ab0d8'; g.fillRect(-cw/2+32,-ch/2+32,cw-64,ch-64); g.fillStyle='#f4e9c8'; g.fillRect(-cw/2+54,-ch/2+105,cw-108,400);
    for(let i=0;i<70;i++){ g.fillStyle='hsl('+Math.floor(r()*360)+',70%,'+(30+r()*40)+'%)'; g.fillRect(-cw/2+60+r()*560,-ch/2+110+r()*360,15+r()*80,15+r()*80); }
    g.fillStyle='#222'; for(let i=0;i<9;i++) g.fillRect(-cw/2+60,60+i*38,150+r()*420,12); g.fillStyle='#c33'; g.font='bold 52px sans-serif'; g.fillText('Charizard ex',-cw/2+60,-ch/2+85); g.restore();
    g.save(); g.filter='blur(20px)'; g.fillStyle='rgba(0,0,0,0.42)'; g.beginPath(); g.ellipse(W/2-180,H/2+500,400,450,0.2,0,7); g.fill(); g.restore();
    return c.toDataURL('image/jpeg',0.9);
  });
  const IMG=path.resolve(__dirname,'../.work/scena_bordi.jpg'); fs.writeFileSync(IMG,Buffer.from(png.split(',')[1],'base64'));
  await page.evaluateOnNewDocument(()=>{ localStorage.setItem('pkm_cfg',JSON.stringify({confirmEdges:true,provider:'claude',key:''})); localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now())); });
  page.on('pageerror',e=>console.log('ERRORE PAGINA',e.message));
  await page.goto('file://'+path.resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,700));
  await page.evaluate(()=>{ document.getElementById('fab').click(); document.querySelector('[data-ad="quick"]').click(); }); await new Promise(r=>setTimeout(r,400));
  const inp=await page.$('#q-file'); await inp.uploadFile(IMG);
  await page.waitForSelector('#qedge:not([hidden])',{timeout:15000}); await new Promise(r=>setTimeout(r,800));
  await page.screenshot({path:OUT+'bordi1.png'});
  // lato alto: il centro del lato è a metà fra i due angoli in alto (bordi trovati sulla carta, ~25% dall'alto)
  const b=await (await page.$('#qe-cv')).boundingBox();
  const top=await page.evaluate(()=>{ const m=document.getElementById('qe-msg').textContent; return m; }); console.log('messaggio:',top);
  const mx=b.x+b.width*0.5, my=b.y+b.height*0.25;
  await page.mouse.move(mx,my); await page.mouse.down(); await page.mouse.move(mx,my+25,{steps:4});
  await page.screenshot({path:OUT+'bordi2.png'}); await page.mouse.up();
  await browser.close(); console.log('ok', OUT+'bordi1.png', OUT+'bordi2.png');
}catch(e){ console.log('non disponibile:',String(e.message).slice(0,400)); } })();
