const OUT=require('path').resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
// Grafico del prezzo nella scheda carta (24/10/2026): pannello, tocco, periodi, tutto schermo verticale e orizzontale. Uso: node shot_grafico.js [dark|light]
const {launch}=require('./browser');
const theme=process.argv[2]||'dark';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{ const browser=await launch();
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  await page.evaluateOnNewDocument(th=>{
    const DAY=864e5, D=Math.floor(Date.now()/DAY);
    const mk=(n,name,price,o={})=>({key:`c${n}|IT|Normale|NM`,cardId:'c'+n,name,setName:'Megaevoluzione',number:String(n),total:'132',img:'',lang:'IT',variant:'Normale',cond:'NM',qty:1,price,priceManual:null,priceT:Date.now(),added:Date.now()-n*DAY,...o});
    // Charizard: storico di 300 giorni con alti e bassi; Pikachu: aggiunto da poco, solo medie Cardmarket e prezzo di oggi
    const ch=[]; let v=1800; for(let i=300;i>=0;i-=(i>90?7:1)){ v=Math.max(900,v+Math.round(Math.sin(i/17)*60+(i%5-2)*25)); ch.push([D-i,v]); }
    const cat=[mk(1,'Charizard ex',ch[ch.length-1][1]/100,{variant:'Holo',key:'c1|IT|Holo|NM',dex:[6],cat:'Pokemon',rarity:'Rara doppia',pr:{normal:ch[ch.length-1][1]/100,avg7:20,avg30:21}}),
      mk(2,'Pikachu',3.4,{dex:[25],cat:'Pokemon',pr:{normal:3.4,avg7:3.1,avg30:2.6}})];
    localStorage.setItem('pkm_catalog',JSON.stringify(cat)); localStorage.setItem('pkm_hist',JSON.stringify({v:1,s:{'c1|n':ch,'c2|n':[[D,340]]}}));
    localStorage.setItem('pkm_cfg',JSON.stringify({appearance:th,gkey:'x'})); localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
  },theme);
  await page.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await wait(800);
  const p=OUT+'g_'+theme+'_';
  const panel=async n=>{ await wait(300); const r=await page.evaluate(()=>{ const el=document.querySelector('#v-card .hist'); el.scrollIntoView({block:'center'}); const b=el.getBoundingClientRect(); return {x:0,y:Math.max(0,b.top+scrollY-12),width:390,height:b.height+24}; }); await wait(150); await page.screenshot({path:p+n+'.png',clip:r}); };
  const open=async name=>{ await page.evaluate(nm=>{ document.querySelector('nav button[data-go="cat"]').click(); [...document.querySelectorAll('#list .item')].find(r=>r.getAttribute('aria-label').includes(nm)).click(); },name); await wait(300); };
  await open('Charizard'); await panel('charizard');
  await page.evaluate(()=>document.querySelector('#v-card .hist [data-cr="30"]').click()); await panel('charizard_1mese');
  await page.evaluate(()=>{ const s=document.querySelector('#v-card .hist svg.vch'), r=s.getBoundingClientRect(); s.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+r.width*0.45})); }); await panel('charizard_tocco');
  await page.evaluate(()=>document.querySelector('#v-card .hist [data-cr="0"]').click());
  await page.evaluate(()=>document.querySelector('#v-card [data-a="chfull"]').click()); await wait(300); await page.screenshot({path:p+'full.png'});
  await page.setViewport({width:844,height:390,deviceScaleFactor:2,isMobile:true}); await wait(400); await page.screenshot({path:p+'full_orizz.png'});
  await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true}); await page.evaluate(()=>document.querySelector('#chfull [data-a="close"]').click());
  await page.evaluate(()=>history.back()); await wait(300);
  await open('Pikachu'); await page.evaluate(()=>{ const s=document.querySelector('#v-card .hist svg.vch'), r=s.getBoundingClientRect(); s.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+2})); }); await panel('pikachu_medie');
  await browser.close(); })();
