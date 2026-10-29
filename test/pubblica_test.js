// Pubblicazione automatica (29/10/2026): GitHub Actions esegue i test e carica app/ sul progetto Cloudflare esistente.
// Stesso progetto = stesso indirizzo = stessi dati sul telefono; un test fallito blocca la pubblicazione.
const fs=require('fs'),path=require('path'),assert=require('assert');
const L=require('./percorsi'), R=L.ROOT;
let n=0; const ok=(c,m)=>{assert.ok(c,m);n++;};
const rd=p=>fs.readFileSync(path.join(R,p),'utf8');
const WF='.github/workflows/pubblica.yml';
ok(fs.existsSync(path.join(R,WF)),'manca '+WF);
const wf=rd(WF);
ok(fs.readdirSync(path.join(R,'.github','workflows')).length===1,'un solo workflow');
ok(!fs.existsSync(path.join(R,'wrangler.toml')),'niente wrangler.toml (configurazione tutta nel workflow)');
// quando parte: ogni push (main = sito, altri rami = anteprima) e a mano
ok(/^on:\n\s+push:\s*\n/m.test(wf)&&!/branches:/.test(wf),'parte a ogni push, su tutti i rami');
ok(/workflow_dispatch:/.test(wf),'avviabile a mano');
// prima i test, poi il caricamento
const iSetup=wf.indexOf('bash strumenti/setup.sh'), iTest=wf.indexOf('bash strumenti/test.sh'), iDeploy=wf.indexOf('pages deploy');
ok(iSetup>0&&iTest>iSetup&&iDeploy>iTest,'setup → test → pubblicazione, in quest\'ordine');
ok(!/continue-on-error|\|\|\s*true/.test(wf),'un test fallito ferma la pubblicazione');
ok(rd('strumenti/test.sh').includes('::error title=FALLITO $f::'),'test.sh segnala su GitHub il test fallito (annotazione leggibile senza log)');
ok(/CHROME_PATH:\s*\/usr\/bin\/google-chrome/.test(wf),'Chrome del runner per i test con Chromium vero');
ok(/node-version:\s*24/.test(wf),'stessa versione di Node del Mac');
// dove pubblica: progetto esistente, cartella app, ramo del push
const sito=(rd('strumenti/pacchetto.sh').match(/^SITO="https:\/\/([a-z0-9-]+)\.pages\.dev\/"/m)||[])[1];
const cmd=(wf.match(/command:\s*(pages deploy[^\n]*)/)||[])[1]||'';
ok(sito==='carte-pokemon-5vf','SITO invariato: '+sito);
ok(cmd.includes('--project-name='+sito),'pubblica sul progetto di SITO: '+cmd);
ok(/^pages deploy app\s/.test(cmd),'pubblica la cartella app/');
ok(cmd.includes('--branch=${{ github.ref_name }}'),'ramo del push (main = produzione)');
ok(/cloudflare\/wrangler-action@v3/.test(wf),'azione ufficiale di Cloudflare');
ok(/wranglerVersion:\s*"4"/.test(wf),'wrangler 4 (la 3 dell\'azione non gestisce i token dell\'account)');
// credenziali solo come secret
ok(/apiToken:\s*\$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/.test(wf)&&/accountId:\s*\$\{\{ secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/.test(wf),'token e account dai secret');
ok(!/[0-9a-f]{32}|[A-Za-z0-9_-]{40}/.test(wf.replace(/\$\{\{[^}]*\}\}/g,'')),'nessun token o ID scritto nel file');
// il file pubblicato è già pronto: il profilo punta al sito anche senza pacchetto.sh
ok(rd('app/carte.mobileconfig').includes('<string>https://'+sito+'.pages.dev/</string>'),'profilo già puntato al sito');
// istruzioni aggiornate
const cm=rd('CLAUDE.md'), lg=rd('LEGGIMI.md');
for(const [t,m] of [['pubblica.yml','workflow citato'],['va online da solo','push = pubblicazione'],['ramo a parte','prove su un ramo'],['CLOUDFLARE_API_TOKEN','secret necessari']]) ok(cm.includes(t),'CLAUDE.md: '+m);
ok(!/carica(lo)? .*zip|trascina lo zip/i.test(cm.replace(/riserva[^\n]*/gi,'')),'CLAUDE.md: niente più caricamento manuale come via normale');
ok(lg.includes('pubblica.yml')&&/automatic/i.test(lg),'LEGGIMI.md: pubblicazione automatica');
console.log('pubblica_test: '+n+' controlli superati, errori: nessuno');
