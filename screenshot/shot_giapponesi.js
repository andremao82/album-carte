// Carte giapponesi col nome in italiano (08/11/2026): scheda (titolo italiano, giapponese sotto, sigla del set, campo Nome italiano)
// e Collezione a elenco, in tema chiaro e scuro.
// Uso: node screenshot/shot_giapponesi.js → .work/shot/jp_scheda_<tema>.png, jp_scheda2_<tema>.png (campo), jp_coll_<tema>.png
const path=require('path'), OUT=path.resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
const {launch}=require('./browser');
const IMG='https://assets.tcgdex.net/ja/SV/SV7a/062/low.webp';
const base={variant:'Normale',cond:'NM',qty:1,priceManual:null,src:'tcgdex',srcLang:'ja',lang:'JP'};
const CAT=[
  Object.assign({},base,{key:'tcgdex:ja:SV7a-062|JP|Normale|NM',cardId:'tcgdex:ja:SV7a-062',name:'Drasna',nameJp:'ドラセナ',setName:'楽園ドラゴーナ',setId:'SV7a',number:'062',total:'64',img:IMG,price:0.02,rarity:'Common',cat:'Trainer',tt:'Supporter',ill:'Hideki Ishikawa',dex:[],added:Date.now()-1000}),
  Object.assign({},base,{key:'tcgdex:ja:SV2a-025|JP|Normale|NM',cardId:'tcgdex:ja:SV2a-025',name:'Pikachu',nameJp:'ピカチュウ',setName:'ポケモンカード151',setId:'SV2a',number:'025',total:'165',img:'https://assets.tcgdex.net/ja/SV/SV2a/025/low.webp',price:0.5,cat:'Pokemon',dex:[25],added:Date.now()-2000}),
  Object.assign({},base,{key:'tcgdex:ja:SV7a-063|JP|Normale|NM',cardId:'tcgdex:ja:SV7a-063',name:'ゼイユ',setName:'楽園ドラゴーナ',setId:'SV7a',number:'063',total:'64',img:'',price:0.1,cat:'Trainer',dex:[],added:Date.now()-3000}),
  Object.assign({},base,{key:'tcgdex:it:sv03.5-006|IT|Normale|NM',cardId:'tcgdex:it:sv03.5-006',name:'Charizard-ex',setName:'151',setId:'sv03.5',number:'006',total:'165',lang:'IT',srcLang:'it',img:'https://assets.tcgdex.net/it/sv/sv03.5/006/low.webp',price:30,cat:'Pokemon',dex:[6],added:Date.now()-4000})
];
(async()=>{ const b=await launch();
  for (const th of ['light','dark']){
    const p=await b.newPage(); await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
    await p.evaluateOnNewDocument((th,cat)=>{ localStorage.setItem('pkm_catalog',JSON.stringify(cat)); localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',appearance:th,bkSheet:false,catView:'list'})); localStorage.setItem('pkm_lastbackup',String(Date.now())); },th,CAT);
    await p.goto('file://'+path.resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,800));
    await p.evaluate(()=>{ const w=document.getElementById('prevwarn'); if(w) w.hidden=true; });
    await p.evaluate(()=>document.querySelector('nav button[data-go="cat"]').click()); await new Promise(r=>setTimeout(r,1500));
    await p.screenshot({path:OUT+'jp_coll_'+th+'.png'});
    await p.evaluate(()=>document.querySelector('#list [data-open^="tcgdex:ja:SV7a-062"]').click()); await new Promise(r=>setTimeout(r,2500));
    await p.screenshot({path:OUT+'jp_scheda_'+th+'.png'});
    await p.evaluate(()=>document.getElementById('cd-it').scrollIntoView({block:'center'})); await new Promise(r=>setTimeout(r,300));
    await p.screenshot({path:OUT+'jp_scheda2_'+th+'.png'}); await p.close(); }
  await b.close(); console.log('ok'); })();
