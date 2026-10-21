// Percorsi del repository usati da test e strumenti (niente percorsi assoluti: il repo funziona ovunque).
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const WORK=process.env.WORK_DIR||path.join(ROOT,'.work');
const APP=path.join(ROOT,'app','index.html');
module.exports={
  ROOT, WORK,
  APP,                                   // l'app (sorgente unica)
  APP_URL:'file://'+APP,
  APPJS:path.join(WORK,'app.js'),        // JavaScript estratto da test.sh
  SITE:path.join(ROOT,'app'),            // cartella pubblicata sul sito
  ZIP:path.join(ROOT,'album-carte-pwa.zip'),   // pacchetto da caricare su Cloudflare (non versionato)
  PACCHETTO:path.join(ROOT,'strumenti','pacchetto.sh'),
  SHOT:path.join(ROOT,'screenshot'),
};
