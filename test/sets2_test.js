const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('./percorsi').APP,'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const now=Date.now();
const mk=(id,num,name,set,sid,lang='it',o={})=>({key:`tcgdex:${lang}:${id}|IT|Normale|NM`,cardId:`tcgdex:${lang}:${id}`,name,setName:set,number:num,total:'100',img:'x',lang:'IT',variant:'Normale',cond:'NM',qty:1,price:1,added:now,src:'tcgdex',srcId:id,srcLang:lang,setId:sid,dex:[],...o});
const seed=[mk('me01-001','001','A','Megaevoluzione','me01'),mk('as01-005','005','B','Ascesa Eroica','as01'),mk('xx01-001','001','C','Set senza immagini','xx01'),mk('sy01-002','002','D','Solo simbolo','sy01'),mk('en1-003','003','E','English Set','en1','en')];
const J=(b,st=200)=>({ok:st<300,status:st,json:async()=>b});
const itSets=[{id:'me01',name:'Megaevoluzione',logo:'https://assets/it/me01/logo',symbol:'https://assets/univ/me01/symbol',cardCount:{official:132,total:188}},
 {id:'as01',name:'Ascesa Eroica',logo:'https://assets/it/as01/logo',cardCount:{official:200,total:295}},
 {id:'xx01',name:'Set senza immagini',cardCount:{official:50,total:60}},
 {id:'sy01',name:'Solo simbolo',symbol:'https://assets/univ/sy01/symbol',cardCount:{official:80,total:90}},
 {id:'z1',name:'Altro 1',cardCount:{official:1000,total:2000}},{id:'z2',name:'Altro 2',cardCount:{official:3000,total:5000}}];
const enSets=[{id:'en1',name:'English Set',cardCount:{official:100,total:150}},{id:'en2',name:'Other EN',cardCount:{official:900,total:1000}}];
const api=async(url)=>{url=String(url); if(url.endsWith('/it/sets')) return J(itSets); if(url.endsWith('/en/sets')) return J(enSets); return J({},404)};
function boot(seedArr){ const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',x=>errors.push(String(x.detail&&x.detail.stack||x.message).split('\n')[0]));
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.netlify.app/',virtualConsole:vc,
   beforeParse(w){ w.localStorage.setItem('pkm_catalog',JSON.stringify(seedArr)); w.confirm=()=>true; w.scrollTo=()=>{}; w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({}),set:()=>true}); w.fetch=api; }});
  return {w:dom.window,d:dom.window.document,errors}; }
const txt=(t,sel)=>{const el=t.d.querySelector(sel);return el?el.textContent.replace(/\s+/g,' ').trim():null};
(async()=>{
 const t=boot(seed); await wait(250); t.d.querySelector('nav button[data-go="sets"]').click(); await wait(300);
 const sum=txt(t,'#sets-global .ssum'); console.log('1 riepilogo (Tutti):',sum);
 if(!/^5 ?\/ ?7\.?783/.test(sum)) throw new Error('attesi 5 / 7.783 (set iniziati con i loro totali + set italiani non iniziati)');
 if(txt(t,'#sets-global .ring2 b')!=='0,06%') throw new Error('percentuale con due decimali sotto l’1%: '+txt(t,'#sets-global .ring2 b'));
 { const arc=t.d.querySelector('#sets-global .ring2 .rf'); const dash=parseFloat(arc.getAttribute('stroke-dasharray')); console.log('1 anello visibile anche con poche carte (min 1,5):',dash); if(!(dash>=1.5)) throw new Error('anello invisibile con poche carte'); }
 t.d.querySelector('#sets-global [data-scope="started"]').click(); console.log('1 Iniziati:',txt(t,'#sets-global .ssum')); if(!/^5 ?\/ ?783/.test(txt(t,'#sets-global .ssum'))) throw new Error('Iniziati: 5 / 783');
 t.d.querySelector('#sets-global [data-scope="official"]').click(); console.log('1 Ufficiali:',txt(t,'#sets-global .ssum')); if(!/^5 ?\/ ?4\.?562/.test(txt(t,'#sets-global .ssum'))) throw new Error('Ufficiali: 5 / 4.562');
 if(JSON.parse(t.w.localStorage.getItem('pkm_cfg')).setsScope!=='official') throw new Error('ambito non ricordato');
 console.log('2 miniature:'); t.d.querySelectorAll('#sets-list .sprow').forEach(r=>{const th=r.querySelector('.logo'); const img=th.querySelector('img'); console.log('    ',r.querySelector('.t1 b').textContent.padEnd(20),img?('immagine '+img.getAttribute('src').replace(/https:\/\/assets\//,'')+(img.dataset.alt?' (ripiego simbolo)':'')):('iniziali '+th.querySelector('.ini').textContent));});
 const t3=boot([]); await wait(250); console.log('5 Home vuota:',txt(t3,'#v-home .empty2 b'));
 t3.d.querySelector('#v-home [data-a="add"]').click(); console.log('5 apre il pannello Aggiungi:',!t3.d.getElementById('add-sheet').hidden);
 t3.d.querySelector('nav button[data-go="sets"]').click(); console.log('6 Progressi vuoto:',txt(t3,'#sets-global .empty2 b'));
 console.log('errori:',[t,t3].flatMap(x=>x.errors).length?[t,t3].flatMap(x=>x.errors):'nessuno'); process.exit(0);
})();
