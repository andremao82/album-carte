const OUT=require('path').resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
// Filtri della Collezione tutti a pillole, con Tipo e Rarità (24/10/2026). Uso: node shot_filtri.js [dark|light]
const {launch}=require('./browser');
const theme=process.argv[2]||'dark';
(async()=>{ const browser=await launch();
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  await page.evaluateOnNewDocument(th=>{
    const DAY=864e5;
    const mk=(n,name,price,types,rarity,o={})=>({key:`c${n}|IT|Normale|NM`,cardId:'c'+n,name,setName:'Megaevoluzione',number:String(n),total:'132',img:'',lang:'IT',variant:'Normale',cond:'NM',qty:1,price,priceManual:null,added:Date.now()-n*DAY,dex:[],cat:'Pokemon',ill:'',types,rarity,...o});
    const cat=[mk(1,'Charizard ex',25,['Fuoco'],'Rara doppia'),mk(2,'Bulbasaur',0.4,['Erba'],'Comune',{qty:2}),mk(3,'Squirtle',0.5,['Acqua'],'Comune'),mk(4,'Pikachu',3,['Lampo'],'Rara'),
      mk(5,'Mewtwo',12,['Psico'],'Ultrarara'),mk(6,'Ricerca',0.2,[],'Non comune',{cat:'Trainer'}),mk(7,'Vulpix',0.3,['Fuoco'],'Comune'),mk(9,'Charizard-ex',30,['Fuoco'],'Rara doppia'),mk(10,'Pikachu VMAX',8,['Lampo'],'Olografica Rara VMAX'),mk(8,'Oddish',0.2,['Erba'],'Comune')];
    localStorage.setItem('pkm_catalog',JSON.stringify(cat));
    localStorage.setItem('pkm_cfg',JSON.stringify({appearance:th,gkey:'x',catView:'list'}));
    localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
  },theme);
  await page.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,800));
  await page.evaluate(()=>{ const w=document.getElementById('prevwarn'); if(w) w.hidden=true; document.querySelector('nav button[data-go="cat"]').click(); window.scrollTo(0,0); });
  await new Promise(r=>setTimeout(r,400)); await page.screenshot({path:OUT+'filtri1_'+theme+'.png'});
  await page.evaluate(()=>{ const s=document.getElementById('cf-type'); s.value='Fuoco'; s.dispatchEvent(new Event('change',{bubbles:true}));
    const r=document.getElementById('cf-rar'); r.value='Rara doppia'; r.dispatchEvent(new Event('change',{bubbles:true})); const g=document.getElementById('cf-sigla'); g.value='ex'; g.dispatchEvent(new Event('change',{bubbles:true})); document.getElementById('c-chips').scrollLeft=260; });
  await new Promise(r=>setTimeout(r,400)); await page.screenshot({path:OUT+'filtri2_'+theme+'.png'});
  await page.evaluate(()=>{ document.getElementById('c-chips').scrollLeft=9999; });
  await new Promise(r=>setTimeout(r,300)); await page.screenshot({path:OUT+'filtri3_'+theme+'.png',clip:{x:0,y:0,width:390,height:420}});
  await browser.close(); })();
