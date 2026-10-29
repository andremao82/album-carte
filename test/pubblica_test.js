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
const cmd=(wf.match(/npx --yes wrangler@4 (pages deploy[^\n]*)/)||[])[1]||'';
ok(sito==='carte-pokemon-5vf','SITO invariato: '+sito);
// il progetto si chiama carte-pokemon: -5vf è solo nell'indirizzo (Cloudflare lo aggiunge se il nome è già preso)
ok(/--project-name=carte-pokemon\s/.test(cmd),'pubblica sul progetto carte-pokemon: '+cmd);
ok(rd('CLAUDE.md').includes('**`carte-pokemon`**'),'CLAUDE.md: nome del progetto');
ok(/^pages deploy app\s/.test(cmd),'pubblica la cartella app/');
ok(cmd.includes('--branch="$GITHUB_REF_NAME"'),'ramo del push (main = produzione)');
ok(/npx --yes wrangler@4 pages deploy/.test(wf)&&!/wrangler-action/.test(wf),'wrangler 4 diretto (l\'azione ufficiale installava la vecchia 3.90)');
ok(/rc=\$\{PIPESTATUS\[0\]\}/.test(wf)&&/exit \$rc/.test(wf),'un caricamento fallito fa fallire il passo');
ok(/::error title=Caricamento su Cloudflare non riuscito::/.test(wf),'errore di Cloudflare come annotazione');
ok(/\$\{#val\} caratteri/.test(wf)&&!/echo[^\n]*\$CF_TOKEN|echo[^\n]*\$val\b/.test(wf),'forma dei secret segnalata (lunghezza e caratteri) senza stamparli');
// credenziali solo come secret
ok(/CF_TOKEN:\s*\$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/.test(wf)&&/CF_ACCOUNT:\s*\$\{\{ secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/.test(wf),'token e account dai secret');
ok(/tr -d '\[:space:\]'/.test(wf),'spazi e a capo tolti dai secret (il primo token era stato incollato su due righe)');
ok(!/[0-9a-f]{32}|[A-Za-z0-9_-]{40}/.test(wf.replace(/\$\{\{[^}]*\}\}/g,'')),'nessun token o ID scritto nel file');
// il file pubblicato è già pronto: il profilo punta al sito anche senza pacchetto.sh
ok(rd('app/carte.mobileconfig').includes('<string>https://'+sito+'.pages.dev/</string>'),'profilo già puntato al sito');
// istruzioni aggiornate
const cm=rd('CLAUDE.md'), lg=rd('LEGGIMI.md');
for(const [t,m] of [['pubblica.yml','workflow citato'],['va online da solo','push = pubblicazione'],['ramo a parte','prove su un ramo'],['CLOUDFLARE_API_TOKEN','secret necessari']]) ok(cm.includes(t),'CLAUDE.md: '+m);
ok(!/carica(lo)? .*zip|trascina lo zip/i.test(cm.replace(/riserva[^\n]*/gi,'')),'CLAUDE.md: niente più caricamento manuale come via normale');
ok(lg.includes('pubblica.yml')&&/automatic/i.test(lg),'LEGGIMI.md: pubblicazione automatica');
console.log('pubblica_test: '+n+' controlli superati, errori: nessuno');
