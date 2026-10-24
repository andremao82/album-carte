const OUT=require('path').resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
// Esporta per Collectr (24/10/2026): pulsante in Impostazioni e foglio di riepilogo. Uso: node shot_collectr.js [dark|light]
const {launch}=require('./browser');
const theme=process.argv[2]||'dark';
const TAB={updated:'2026-10-24',sets:{sv3pt5:{n:'SV: Scarlet & Violet 151',p:{'6':502558,'25':502577,'143':502695}},me1:{n:'ME01: Mega Evolution',p:{'1':650001,'2':650002,'4':650004}}},td:{'sv03.5':['sv3pt5'],me01:['me1']}};
(async()=>{ const browser=await launch();
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  await page.setRequestInterception(true);
  page.on('request',r=>/tcgplayer-ids\.json/.test(r.url())?r.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(TAB)}):r.continue());
  await page.evaluateOnNewDocument(th=>{
    const DAY=864e5;
    const mk=(n,id,name,o={})=>({key:id+'|IT|Normale|NM',cardId:id,name,setName:'Megaevoluzione',number:String(n),total:'132',img:'',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:1,priceManual:null,added:Date.now()-n*DAY,...o});
    const cat=[mk(1,'me1-1','Venusaur ex'),mk(2,'me1-2','Mega Venusaur ex',{qty:2}),mk(4,'me1-4','Charmander'),
      mk(6,'tcgdex:it:sv03.5-006','Ivysaur',{src:'tcgdex',srcId:'sv03.5-006',srcLang:'it',setName:'151',total:'165'}),
      mk(143,'sv3pt5-143','Snorlax',{setName:'151',total:'165',lang:'EN'}),
      mk(7,'sv3pt5-7','Squirtle',{setName:'151',total:'165',lang:'JP'}),
      mk(5,'tcgdex:it:svp-161','Charizard ex',{src:'tcgdex',srcId:'svp-161',srcLang:'it',setName:'Promo Scarlatto e Violetto',number:'161',total:''}),
      mk(12,'tcgdex:it:me02-012','Ninetales',{src:'tcgdex',srcId:'me02-012',srcLang:'it',setName:'Fiamme Fantasma',number:'012',total:'94'}),
      mk(99,'manuale-x','Pikachu fatto a mano',{cardId:'manuale',setName:'?',number:'',total:''})];
    localStorage.setItem('pkm_catalog',JSON.stringify(cat));
    localStorage.setItem('pkm_cfg',JSON.stringify({appearance:th,gkey:'x'}));
    localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
  },theme);
  await page.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,800));
  await page.evaluate(()=>{ const w=document.getElementById('prevwarn'); if(w) w.hidden=true; window.scrollTo(0,0); });
  const p=OUT+'cx_'+theme+'_';
  const snap=async n=>{ await new Promise(r=>setTimeout(r,400)); await page.screenshot({path:p+n+'.png'}); };
  await page.evaluate(()=>{ document.getElementById('hm-gear').click(); document.getElementById('btn-collectr').scrollIntoView({block:'center'}); }); await snap('settings');
  await page.evaluate(()=>document.getElementById('btn-collectr').click()); await snap('sheet');
  await page.evaluate(()=>{ const s=document.getElementById('cx-sheet'); s.scrollTop=s.scrollHeight; }); await snap('sheet_bottom');
  console.log(await page.evaluate(()=>document.getElementById('cx-p').textContent));
  await browser.close(); })();
