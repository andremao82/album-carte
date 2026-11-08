const OUT=require('path').resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
// Home con "2 carte senza prezzo ›" e Collezione aperta da quel tasto (filtro Senza prezzo acceso). Uso: node shot_senza_prezzo.js [dark|light]
const {launch}=require('./browser');
const theme=process.argv[2]||'light';
(async()=>{ const browser=await launch();
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  await page.evaluateOnNewDocument(th=>{
    const DAY=864e5;
    const mk=(n,name,price,o={})=>({key:`c${n}|IT|Normale|NM`,cardId:'c'+n,name,setName:'Megaevoluzione',number:String(n),total:'132',img:'',lang:'IT',variant:'Normale',cond:'NM',qty:1,price,priceManual:null,added:Date.now()-n*DAY,...o});
    localStorage.setItem('pkm_catalog',JSON.stringify([mk(1,'Charizard ex',25),mk(2,'Pikachu',3.4),mk(3,'Archer del Team Rocket',null),mk(4,'Palazzo di N',null)]));
    localStorage.setItem('pkm_cfg',JSON.stringify({appearance:th,gkey:'x',bkSheet:false}));
    localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now())); localStorage.setItem('pkm_bksheet',JSON.stringify(Date.now()));
  },theme);
  await page.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,800));
  const hide=()=>page.evaluate(()=>{ for(const id of ['prevwarn','bk-sheet','bk-back']){ const s=document.getElementById(id); if(s) s.hidden=true; } window.scrollTo(0,0); });
  const p=OUT+'senza_prezzo_'+theme+'_';
  await hide(); await new Promise(r=>setTimeout(r,300)); await page.screenshot({path:p+'home.png'});
  await page.evaluate(()=>document.querySelector('#v-home [data-a="noprice"]').click()); await new Promise(r=>setTimeout(r,300));
  await hide(); await new Promise(r=>setTimeout(r,300)); await page.screenshot({path:p+'cat.png'});
  await browser.close(); console.log('fatto: '+p+'*.png');
})();
