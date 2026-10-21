// Passaggio a GitHub + Claude Code (21/10/2026): il repository deve funzionare da qualunque cartella,
// pubblicare solo dopo i test e sullo stesso progetto Cloudflare (stesso dominio = stessi dati sul telefono).
const fs=require('fs'),path=require('path'),assert=require('assert');
const L=require('./percorsi'), R=L.ROOT;
let n=0; const ok=(c,m)=>{assert.ok(c,m);n++;};
const rd=p=>fs.readFileSync(path.join(R,p),'utf8');
const ex=p=>fs.existsSync(path.join(R,p));
// percorsi relativi: nessun percorso della vecchia sandbox fuori da strumenti/storico
const VECCHI=/\/mnt\/user-data|\/home\/claude|\/tmp\/shot/;
const walk=d=>fs.readdirSync(path.join(R,d),{withFileTypes:true}).flatMap(e=>e.isDirectory()?(['node_modules','storico'].includes(e.name)?[]:walk(path.join(d,e.name))):[path.join(d,e.name)]);
for(const f of [...walk('test'),...walk('screenshot'),...walk('strumenti'),...walk('.github'),'CLAUDE.md','README.md'].filter(f=>/\.(js|sh|py|yml|md)$/.test(f)&&!f.endsWith('repo_test.js')))
  ok(!VECCHI.test(rd(f)),'percorso assoluto della vecchia sandbox in '+f);
ok(fs.readdirSync(path.join(R,'test')).filter(f=>f.endsWith('_test.js')).length>=50,'tutti i test presenti');
for(const k of ['APP','SITE','SWIFT','IOS','SHOT','PACCHETTO']) ok(fs.existsSync(L[k]),'percorsi.'+k+' esiste');
ok(L.APP_URL==='file://'+L.APP && L.APPJS.startsWith(L.WORK),'percorsi coerenti');
// niente repository git annidati (romperebbero il repo principale)
const gits=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>!e.isDirectory()||e.name==='node_modules'?[]:e.name==='.git'?[path.join(d,e.name)]:gits(path.join(d,e.name)));
ok(gits(path.join(R,'ios')).length===0&&gits(path.join(R,'app')).length===0,'nessun .git dentro ios/ o app/');
// strumenti del kit tolti, quelli nuovi presenti
for(const f of ['kit.sh','kit_pagina.py','estrai_kit.py']) ok(!ex('strumenti/'+f),'strumento del kit rimasto: '+f);
for(const f of ['setup.sh','test.sh','estrai_js.py','pacchetto.sh','ios.sh','patch_modello.py']) ok(ex('strumenti/'+f),'manca strumenti/'+f);
ok(fs.readdirSync(path.join(R,'strumenti','storico')).some(f=>f.startsWith('patch_web_')),'storico delle patch conservato');
// CLAUDE.md: regole del Progetto claude.ai portate in Claude Code
const cm=rd('CLAUDE.md');
for(const [t,m] of [['LEGGIMI.md','rimando alla nota'],['strumenti/test.sh','test dopo ogni modifica'],['test nuovo','un test per funzione nuova'],['mai riscrivere','modifiche mirate'],['screenshot/','controllo a vista'],['compravendita','niente compravendita'],['avvisi di prezzo','niente avvisi di prezzo'],['ambigua','chiedere se ambiguo'],['italiano','lingua'],['non hai potuto verificare','dichiarare il non verificato'],['carte-pokemon-5vf','dominio dei dati']]) ok(cm.includes(t),'CLAUDE.md: '+m);
ok(!/netlify/i.test(cm),'CLAUDE.md senza Netlify');
// pubblicazione: Cloudflare Pages collegato al repository (merge su main = online), test su ogni push e PR
const sito=(rd('strumenti/pacchetto.sh').match(/^SITO="https:\/\/([a-z0-9-]+)\.pages\.dev\/"/m)||[])[1];
ok(sito,'SITO su pages.dev');
ok(!ex('.github/workflows/pubblica.yml')&&!ex('wrangler.toml'),'nessuna pubblicazione con wrangler/token');
const wf=fs.readdirSync(path.join(R,'.github','workflows')).map(f=>rd('.github/workflows/'+f)).join('\n');
ok(!/CLOUDFLARE_API_TOKEN|wrangler/.test(wf),'nessun segreto Cloudflare nei workflow');
const ver=rd('.github/workflows/verifica.yml');
ok(/^\s*push:\s*$/m.test(ver)&&/^\s*pull_request:\s*$/m.test(ver)&&!/branches-ignore/.test(ver),'verifica su ogni push e PR, main compreso');
ok(ver.includes('bash strumenti/setup.sh')&&ver.includes('bash strumenti/test.sh'),'verifica esegue setup e test');
for(const [t,m] of [['pull request','lavoro tramite PR'],['Verifica','attende il controllo verde'],['merge','rilascio = merge su main'],['anteprima','anteprime dei rami'],['mai merge con test falliti','niente merge con test rossi'],['passaggio al nuovo sito','primo avvio: nuovo SITO']]) ok(cm.includes(t),'CLAUDE.md: '+m);
// app/: ogni file pubblicato è un file del sito (niente file in più finiti online)
const zipList=(rd('strumenti/pacchetto.sh').match(/zip -q -X "\$Z" ([^\n]+)/)||[])[1].trim().split(/\s+/).sort();
ok(JSON.stringify(fs.readdirSync(L.SITE).sort())===JSON.stringify(zipList),'app/ contiene esattamente i file del sito: '+fs.readdirSync(L.SITE).join(' '));
const mc=rd('app/carte.mobileconfig');
ok(mc.includes('<string>https://'+sito+'.pages.dev/</string>'),'profilo già puntato al sito');
// .gitignore: generati e backup personali fuori dal repository
const gi=rd('.gitignore');
for(const t of ['.work/','node_modules/','backup-carte-*.json','xcuserdata/']) ok(gi.includes(t),'.gitignore: '+t);
console.log('repo_test: '+n+' controlli superati, errori: nessuno');
