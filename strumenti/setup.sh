#!/bin/bash
# Prepara l'ambiente (una volta per macchina o sessione): dipendenze dei test e del browser per gli screenshot.
set -e
R="$(cd "$(dirname "$0")/.." && pwd)"; cd "$R"
for c in node npm python3 zip unzip; do command -v $c >/dev/null || { echo "ERRORE: manca '$c'. Sul Mac: Node.js da https://nodejs.org (versione LTS); python3, zip e unzip arrivano con i Command Line Tools di Apple (xcode-select --install, non serve Xcode)."; exit 1; }; done
mkdir -p .work/shot
(cd test && npm install --silent --no-audit --no-fund >/dev/null 2>&1) && echo "jsdom installato" || { echo "ERRORE: npm install in test/ non riuscito"; exit 1; }
(cd screenshot && npm install --silent --no-audit --no-fund >/dev/null 2>&1) && echo "browser per gli screenshot installato" || echo "ATTENZIONE: screenshot non disponibili (installazione non riuscita)"
python3 strumenti/estrai_js.py
node --check .work/app.js && echo "app pronta: app/index.html"
(cd screenshot && node -e "const b=require('./browser');if(!b.trovaBrowser()&&process.platform!=='linux'){console.log('ATTENZIONE: Chrome non trovato: web_thumbs_test e screenshot non funzioneranno (installa Google Chrome o imposta CHROME_PATH)');}")
