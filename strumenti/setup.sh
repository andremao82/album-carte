#!/bin/bash
# Prepara l'ambiente (una volta per macchina o sessione): dipendenze dei test e del browser per gli screenshot.
set -e
R="$(cd "$(dirname "$0")/.." && pwd)"; cd "$R"
mkdir -p .work/shot
(cd test && npm install --silent --no-audit --no-fund >/dev/null 2>&1) && echo "jsdom installato" || { echo "ERRORE: npm install in test/ non riuscito"; exit 1; }
(cd screenshot && npm install --silent --no-audit --no-fund >/dev/null 2>&1) && echo "browser per gli screenshot installato" || echo "ATTENZIONE: screenshot non disponibili (installazione non riuscita)"
python3 strumenti/estrai_js.py
node --check .work/app.js && echo "app pronta: app/index.html"
