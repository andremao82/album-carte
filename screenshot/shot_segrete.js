// Carte segrete (22/10/2026): Progressi con la pillola "Con segrete" e dettaglio del set con la sezione "Carte segrete".
// Uso: node shot_segrete.js dark|light → .work/shot/segrete_elenco_<tema>.png e segrete_<tema>.png
const {launch}=require('./browser'), path=require('path'), fs=require('fs');
const P=require('../test/percorsi'), theme=process.argv[2]==='light'?'light':'dark';
(async()=>{ const browser=await launch();
  try {
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  await page.evaluateOnNewDocument(theme=>{
    const now=Date.now(), mk=(num,name)=>({key:`tcgdex:it:me01-${num}|IT|Normale|NM`,cardId:'tcgdex:it:me01-'+num,name,setName:'Megaevoluzione',number:num,total:'132',img:'',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:2,added:now,src:'tcgdex',srcId:'me01-'+num,srcLang:'it',setId:'me01',dex:[]});
    localStorage.setItem('pkm_catalog',JSON.stringify([mk('002','Bulbasaur'),mk('005','Charmander'),mk('009','Squirtle'),mk('134','Mega Venusaur ex'),mk('140','Mega Charizard ex')]));
    localStorage.setItem('pkm_cfg',JSON.stringify({gkey:'x',appearance:theme})); localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()));
    const ids=[]; for(let i=1;i<=12;i++) ids.push(String(i).padStart(3,'0')); for(let i=133;i<=141;i++) ids.push(String(i));
    const set={id:'me01',name:'Megaevoluzione',cardCount:{official:132,total:188},cards:ids.map(i=>({id:'me01-'+i,localId:i,name:'Carta '+i,image:''}))};
    const J=b=>({ok:true,status:200,json:async()=>b});
    window.fetch=async url=>{ url=String(url); if(url.endsWith('/it/sets')) return J([{id:'me01',name:'Megaevoluzione',cardCount:set.cardCount}]);
      if(url.endsWith('/it/sets/me01')) return J(set); if(/\/sets$/.test(url)) return J([]); return {ok:false,status:404,json:async()=>({})}; };
  },theme);
  await page.goto(P.APP_URL); await new Promise(r=>setTimeout(r,800));
  await page.evaluate(()=>document.querySelector('nav button[data-go="sets"]').click()); await new Promise(r=>setTimeout(r,400));
  await page.evaluate(()=>document.querySelector('#ss-filter [data-sf="secret"]').click()); await new Promise(r=>setTimeout(r,300));
  const dir0=path.join(P.WORK,'shot'); fs.mkdirSync(dir0,{recursive:true});
  await page.evaluate(()=>window.scrollTo(0,0)); await page.screenshot({path:path.join(dir0,'segrete_elenco_'+theme+'.png')}); console.log('segrete_elenco_'+theme+'.png');
  await page.evaluate(()=>document.querySelector('[data-set*="me01"]').click()); await new Promise(r=>setTimeout(r,600));
  await page.evaluate(()=>document.querySelector('.ssec').scrollIntoView({block:'center'})); await new Promise(r=>setTimeout(r,300));
  const dir=path.join(P.WORK,'shot'); fs.mkdirSync(dir,{recursive:true});
  await page.screenshot({path:path.join(dir,'segrete_'+theme+'.png')}); console.log('segrete_'+theme+'.png');
  } finally { await browser.close(); }
})().catch(e=>{ console.error(e); process.exit(1); });
