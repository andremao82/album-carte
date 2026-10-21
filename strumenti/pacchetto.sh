#!/bin/bash
# Rilascio: scrive SITO nel profilo dell'icona (app/carte.mobileconfig) e crea album-carte-pwa.zip nella radice del
# progetto, da caricare a mano su Cloudflare Pages (Workers & Pages → carte-pokemon-5vf → Create deployment).
# SITO = indirizzo pubblico del sito: finisce nel profilo dell'icona (carte.mobileconfig).
SITO="https://carte-pokemon-5vf.pages.dev/"
set -e; R="$(cd "$(dirname "$0")/.." && pwd)"; A="$R/app"; Z="$R/album-carte-pwa.zip"
[[ "$SITO" =~ ^https://[a-z0-9.-]+/$ ]] || { echo "ERRORE: imposta SITO in pacchetto.sh (es. https://nome.pages.dev/)"; exit 1; }
python3 - "$SITO" "$A/carte.mobileconfig" <<'P'
import re,sys
url,p=sys.argv[1],sys.argv[2]; s=open(p,encoding='utf-8').read()
s2,n=re.subn(r'(<key>URL</key>\s*<string>)[^<]*(</string>)',lambda m:m.group(1)+url+m.group(2),s)
assert n==1,n
if s2!=s: open(p,'w',encoding='utf-8').write(s2)
P
rm -f "$Z"
cd "$A" && zip -q -X "$Z" index.html sw.js manifest.webmanifest _headers carte.mobileconfig icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png
echo "pacchetto pronto: $Z (sito: $SITO)"
