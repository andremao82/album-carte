const OUT=require('path').resolve(__dirname,'../.work/shot')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
// Allineamento all'app nativa (20/10/2026): schermate in Notte blu e in Perla. Uso: node shot_nativa.js [dark|light]
const {launch}=require('./browser');
const theme=process.argv[2]||'dark';
(async()=>{ const browser=await launch();
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
  await page.evaluateOnNewDocument(th=>{
    const DAY=864e5, D=Math.floor(Date.now()/DAY);
    const mk=(n,name,price,o={})=>({key:`c${n}|IT|Normale|NM`,cardId:'c'+n,name,setName:'Megaevoluzione',number:String(n),total:'132',img:'',lang:'IT',variant:'Normale',cond:'NM',qty:1,price,priceManual:null,added:Date.now()-n*DAY,...o});
    const cat=[mk(1,'Charizard ex',25,{variant:'Holo',key:'c1|IT|Holo|NM',dex:[6],cat:'Pokemon',ill:'5ban Graphics',rarity:'Rara doppia'}),mk(2,'Pikachu',3.4,{qty:3,dex:[25],cat:'Pokemon',ill:'Atsuko'}),mk(4,'Mewtwo',12,{dex:[150],cat:'Pokemon'}),mk(58,'Gengar',4.8,{variant:'Reverse holo',key:'c58|IT|Reverse holo|NM',dex:[94],cat:'Pokemon'}),mk(5,'Eevee',1.2,{cond:'EX',key:'c5|IT|Normale|EX',dex:[133],cat:'Pokemon'}),mk(3,'Rovine Insidiose',0.6,{qty:2,cat:'Trainer',tt:'Stadio'}),
      mk(143,'Snorlax',2.1,{setName:'151',total:'165',lang:'EN',key:'c143|EN|Normale|NM',dex:[143],cat:'Pokemon'}),mk(101,'Bulbasaur',0.9,{setName:'151',total:'165',qty:2,dex:[1],cat:'Pokemon'}),mk(107,'Squirtle',1.5,{setName:'151',total:'165',lang:'JP',key:'c107|JP|Normale|NM',dex:[7],cat:'Pokemon'})];
    cat[0].pr={normal:25,reverse:30,avg30:21,tcg:{normal:27,holo:30,reverse:31,first:900},fx:0.9,vars:{normal:true,reverse:true,holo:true,first:true}};
    const h={'c1|n':[[D-60,1800],[D-30,2100],[D-10,2300],[D,2500]],'c2|n':[[D-40,200],[D-10,300],[D,340]],'c3|n':[[D-30,90],[D,60]],'c4|n':[[D-20,900],[D,1200]],'c5|n':[[D-30,200],[D,120]]};
    const v=[[D-30,4800,10],[D-25,5020,11],[D-20,5390,12],[D-15,5270,12],[D-10,5640,13],[D-5,5810,13],[D,5980,13]];
    localStorage.setItem('pkm_catalog',JSON.stringify(cat)); localStorage.setItem('pkm_hist',JSON.stringify({v:1,s:h})); localStorage.setItem('pkm_vhist',JSON.stringify({v:1,s:v}));
    localStorage.setItem('pkm_fx',JSON.stringify({t:Date.now(),r:0.9,d:'2026-10-17'}));
    localStorage.setItem('pkm_cfg',JSON.stringify({appearance:th,gkey:'x'}));
    localStorage.setItem('pkm_lastbackup',JSON.stringify(Date.now()-5*DAY));
  },theme);
  await page.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await new Promise(r=>setTimeout(r,800));
  await page.evaluate(()=>{ const w=document.getElementById('prevwarn'); if(w) w.hidden=true; window.scrollTo(0,0); });
  const p=OUT+'n_'+theme+'_';
  const snap=async(n,full)=>{ await new Promise(r=>setTimeout(r,350)); await page.screenshot({path:p+n+'.png',fullPage:!!full}); };
  const click=async sel=>{ await page.evaluate(s=>{ document.querySelector(s).click(); window.scrollTo(0,0); },sel); await new Promise(r=>setTimeout(r,150)); };
  await snap('home_full',true);
  await click('[data-a="value"]'); await page.evaluate(()=>{ const s=document.getElementById('bk-sheet'); if(s) s.hidden=true; document.querySelectorAll('.sheet-bg,.backdrop').forEach(x=>x.hidden=true); }); await snap('value',true);
  await page.evaluate(()=>history.back()); await new Promise(r=>setTimeout(r,200));
  await click('nav button[data-go="cat"]'); await snap('cat');
  await click('#v-list'); await snap('cat_list'); await click('#v-grid');
  await page.evaluate(()=>{ [...document.querySelectorAll('#list .item')].find(r=>r.getAttribute('aria-label').includes('Charizard')).click(); window.scrollTo(0,0); }); await snap('card_full',true);
  await click('[data-a="menu"]'); await snap('card_menu'); await click('[data-act="x"]');
  await click('nav button[data-go="sets"]'); await snap('sets');
  await click('nav button[data-go="dex"]'); await snap('dex');
  await click('#fab'); await snap('add');
  await click('[data-ad="close"]'); await click('nav button[data-go="home"]'); await click('#hm-gear'); await snap('set');
  await browser.close(); })();
