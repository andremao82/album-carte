const OUT=require('path').resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
const chromium=require('@sparticuz/chromium').default; const puppeteer=require('puppeteer-core');
(async()=>{ const browser=await puppeteer.launch({args:[...chromium.args,'--no-sandbox'],executablePath:process.env.CHROME_PATH||await chromium.executablePath(),headless:'shell'});
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  await page.evaluateOnNewDocument(()=>{
    const DAY=864e5, D=Math.floor(Date.now()/DAY);
    const mk=(n,name,price,o={})=>({key:`c${n}|IT|Normale|NM`,cardId:'c'+n,name,setName:'Megaevoluzione',number:String(n),total:'132',img:'',lang:'IT',variant:'Normale',cond:'NM',qty:1,price,priceManual:null,added:Date.now()-n*DAY,...o});
    const cat=[mk(1,'Charizard ex',25,{qty:1}),mk(2,'Pikachu',3.4,{qty:3}),mk(3,'Rovine Insidiose',0.6,{qty:2}),mk(4,'Mewtwo',12),mk(5,'Eevee',1.2)];
    cat[0].pr={normal:25,reverse:30,avg30:21,tcg:{normal:27,holo:30,reverse:31,first:900},fx:0.9,vars:{normal:true,reverse:true,holo:true,first:true}}; cat[0].variant='Holo';
    const h={'c1|n':[[D-60,1800],[D-30,2100],[D-10,2300],[D,2500]],'c2|n':[[D-40,200],[D-10,300],[D,340]],'c3|n':[[D-30,90],[D,60]],'c4|n':[[D-20,900],[D,1200]],'c5|n':[[D-30,200],[D,120]]};
    const v=[[D-60,4200,5],[D-45,4300,5],[D-30,4800,5],[D-20,5100,6],[D-10,5600,7],[D-3,5900,8],[D,6200,8]];
    localStorage.setItem('pkm_catalog',JSON.stringify(cat)); localStorage.setItem('pkm_hist',JSON.stringify({v:1,s:h})); localStorage.setItem('pkm_vhist',JSON.stringify({v:1,s:v}));
    localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',provider:'gemini'})); localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()-4*DAY)); localStorage.setItem('pkm_bkstat',JSON.stringify({sig:'x',n:7})); localStorage.setItem('pkm_fx',JSON.stringify({t:Date.now(),r:0.9,d:'2026-10-17'}));
  });
  await page.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,700));
  await page.evaluate(()=>{ const w=document.getElementById('prevwarn'); if(w) w.hidden=true; window.scrollTo(0,0); }); await new Promise(r=>setTimeout(r,200));
  await page.screenshot({path:OUT+'b1.png'});
  await browser.close(); })();
