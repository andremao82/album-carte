# Album carte Pokémon — istruzioni per Claude Code

Progetto personale: **solo PWA** (l'app nativa SwiftUI è stata abbandonata il 21/10/2026; non riproporla). App web single-file (`app/index.html`, HTML + CSS + JS senza librerie) per catalogare ~500 carte Pokémon, per lo più italiane, usata su iPhone come icona a schermo intero (profilo Web Clip `app/carte.mobileconfig`).

Si lavora con Claude Code **sul Mac dell'utente, in questa cartella** (git locale, nessun GitHub: l'account Claude di lavoro non può collegarsi a GitHub). Il rilascio del sito è **manuale**: tu prepari lo zip, l'utente lo carica su Cloudflare Pages.

**Prima di toccare il codice leggi `LEGGIMI.md`** (nota di progetto: funzioni, dati, scelte dell'utente, punti aperti). È la memoria del progetto: tutto ciò che va ricordato fra una sessione e l'altra sta lì, non altrove.

## Avvio della sessione
1. `bash strumenti/setup.sh` (dipendenze di test e screenshot; si può rilanciare).
2. `bash strumenti/test.sh`: deve finire con "TUTTI I TEST SUPERATI". Se qualcosa non funziona, dillo all'utente prima di procedere.
3. `git status`: se ci sono modifiche non committate di una sessione precedente, chiedi all'utente cosa farne prima di iniziare. La cartella sta in Documenti, sincronizzata con iCloud Drive: file "nome 2.ext" sono copie in conflitto di iCloud (ignorate da git); se ne trovi, confrontale con l'originale e segnalale all'utente.

## Metodo di lavoro (obbligatorio)
- **Modifiche solo mirate**, mai riscrivere un file grande da zero (soprattutto `app/index.html`). Usa lo strumento Edit con un testo da cercare unico, oppure uno script copiato da `strumenti/patch_modello.py` (`rep()` fallisce se il testo non è unico). Per trovare il codice: grep su `.work/app.js` (JavaScript estratto) o direttamente su `app/index.html`.
- **Dopo ogni modifica**: `bash strumenti/test.sh` (tutti i test; `strumenti/test.sh nome` per uno solo durante il lavoro, ma alla fine sempre tutti).
- **Per ogni funzione nuova un test nuovo** in `test/<tema>_test.js` (JSDOM; Chromium vero se serve la resa CSS, come `web_thumbs_test.js`). I percorsi si prendono da `require('./percorsi')`, mai percorsi assoluti. Il test deve fallire sul codice vecchio. Ultima riga stampata: `<nome>: N controlli superati, errori: nessuno`. Non risparmiare sui test.
- **Controllo a vista** quando cambia qualcosa di visibile: script in `screenshot/` (`node screenshot/shot_nativa.js dark|light`, ecc.), immagini in `.work/shot/`; guardale con Read prima di dire che va bene. Serve Google Chrome installato (o `CHROME_PATH`).
- **Service worker**: incrementa `VERSION` in `app/sw.js` se cambia la lista dei file in cache.

## Fine lavoro e rilascio
Il sito è il progetto Cloudflare Pages **`carte-pokemon-5vf`** a caricamento manuale (Direct Upload), indirizzo `https://carte-pokemon-5vf.pages.dev/`.
1. Aggiorna `LEGGIMI.md` (sezioni Funzioni / App iOS, Punti aperti, data) con cosa è cambiato, scelte dell'utente e cosa resta da verificare sul telefono.
2. `bash strumenti/test.sh` completo: niente rilascio con test falliti.
3. Commit su `main` con messaggio in italiano che dica cosa cambia per l'utente (un commit per lavoro; `git log` è lo storico delle modifiche).
4. Se è cambiato il sito (`app/`): `bash strumenti/pacchetto.sh` → crea **`album-carte-pwa.zip` nella cartella del progetto**. Di' all'utente di caricarlo: dash.cloudflare.com → Workers & Pages → `carte-pokemon-5vf` → Create deployment (o "Nuova distribuzione") → trascina lo zip. Un caricamento per gruppo di modifiche: raggruppa quando puoi.
5. Nella risposta: cosa è cambiato, se c'è uno zip da caricare, cosa hai verificato, **cosa non hai potuto verificare** (comportamento reale su iPhone, Safari/Web Clip).

## Regole di prodotto
- Uso personale, non di scambio: **niente avvisi di prezzo né funzioni di compravendita** (escluse anche analisi scambi e altri mercati).
- Se una richiesta è ambigua, **chiedi prima di lavorare**.
- I dati dell'utente stanno nel browser del telefono, legati al dominio del sito (`SITO` in `strumenti/pacchetto.sh`): **non cambiare dominio o progetto Cloudflare** senza avvisare (servirebbe backup e ripristino). Nuovi campi del catalogo: in `normalizeEntry` con valore predefinito Il formato del backup deve restare compatibile con quelli già fatti (anche dalla vecchia app nativa).
- Rispondi in italiano, in modo concreto e sintetico.

## Struttura
- `app/` — il sito pubblicato (index.html, sw.js, manifest, `_headers`, profilo, icone). Sorgente unica: si modifica qui.
- `test/` — test Node (`*_test.js`, JSDOM, `percorsi.js`), `package.json`.
- `screenshot/` — script Puppeteer a 390×844; `browser.js` usa Chrome installato sul Mac (o `CHROME_PATH`; su Linux `@sparticuz/chromium`).
- `strumenti/` — `setup.sh`, `test.sh`, `estrai_js.py`, `pacchetto.sh`, `patch_modello.py`; `storico/` = patch delle chat precedenti (solo riferimento, non rilanciarle: puntano ai percorsi della vecchia sandbox).
- `.work/` e `album-carte-pwa.zip` — file generati (non versionati).
