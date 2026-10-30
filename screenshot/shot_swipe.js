// Scheda carta mentre si scorre di lato: a metà strada verso la carta dopo e all'ultima carta (rimbalzo).
// Uso: node screenshot/shot_swipe.js dark|light   → .work/shot/swipe_meta_<tema>.png, swipe_bordo_<tema>.png
const {launch}=require('./browser'), path=require('path'), fs=require('fs');
const ROOT=path.resolve(__dirname,'..'), OUT=path.join(ROOT,'.work','shot'); fs.mkdirSync(OUT,{recursive:true});
const tema=process.argv[2]==='light'?'light':'dark';
(async()=>{ const browser=await launch();
  try {
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  await page.evaluateOnNewDocument(t=>{
    const mk=(k,name)=>({key:`c${k}|IT|Holo|NM`,cardId:'c'+k,name,setName:'Base',number:String(k),total:'102',img:'../screenshot/card.jpg',lang:'IT',variant:'Holo',cond:'NM',qty:1,price:k*1.5,priceManual:null,added:Date.now()-k*1000,imgFrom:'IT'});
    localStorage.setItem('pkm_catalog',JSON.stringify([mk(1,'Koraidon'),mk(2,'Pikachu')]));
    localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',appearance:t})); localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
  },tema);
  await page.goto('file://'+path.join(ROOT,'app','index.html')); await new Promise(r=>setTimeout(r,1000));
  await page.evaluate(()=>document.querySelector('nav button[data-go="cat"]').click()); await new Promise(r=>setTimeout(r,500));
  const dito=async(key,dx)=>{
    await page.evaluate(k=>document.querySelector('#list [data-open="'+k+'"]').click(),key); await new Promise(r=>setTimeout(r,800));
    await page.evaluate(dx=>{ const el=document.querySelector('#v-card .cd-name'), b=el.getBoundingClientRect(), x=b.left+b.width/2, y=b.top+10;
      const ev=(t,x)=>el.dispatchEvent(new PointerEvent(t,{bubbles:true,pointerId:7,pointerType:'touch',isPrimary:true,clientX:x,clientY:y}));
      ev('pointerdown',x); for(let i=1;i<=6;i++) ev('pointermove',x+dx*i/6); },dx);
    await new Promise(r=>setTimeout(r,200));
  };
  await dito('c1|IT|Holo|NM',-170); await page.screenshot({path:path.join(OUT,'swipe_meta_'+tema+'.png')});
  await page.evaluate(()=>history.back()); await new Promise(r=>setTimeout(r,500));
  await dito('c2|IT|Holo|NM',-200); await page.screenshot({path:path.join(OUT,'swipe_bordo_'+tema+'.png')});
  } finally { await browser.close(); }
  console.log('ok: '+OUT);
})().catch(e=>{ console.error(e); process.exit(1); });
