# Album carte Pokémon — istruzioni per Claude Code

Progetto personale: app web single-file (`app/index.html`, HTML + CSS + JS senza librerie) per catalogare ~500 carte Pokémon, per lo più italiane, usata su iPhone come icona a schermo intero (profilo Web Clip `app/carte.mobileconfig`). C'è anche un'app nativa SwiftUI in `ios/` (progetto Xcode, compilata dall'utente sul suo Mac).

**Prima di toccare il codice leggi `LEGGIMI.md`** (nota di progetto: funzioni, dati, scelte dell'utente, punti aperti). È la memoria del progetto: tutto ciò che va ricordato fra una sessione e l'altra sta lì, non altrove.

## Avvio della sessione
1. `bash strumenti/setup.sh` (dipendenze di test e screenshot; si può rilanciare).
2. `bash strumenti/test.sh`: deve finire con "TUTTI I TEST SUPERATI". Se qualcosa non funziona, dillo all'utente prima di procedere.

## Metodo di lavoro (obbligatorio)
- **Modifiche solo mirate**, mai riscrivere un file grande da zero (né `app/index.html` né i file Swift né `project.pbxproj`). Usa lo strumento Edit con un testo da cercare unico, oppure uno script copiato da `strumenti/patch_modello.py` (`rep()` fallisce se il testo non è unico). Per trovare il codice: grep su `.work/app.js` (JavaScript estratto) o direttamente su `app/index.html`.
- **Dopo ogni modifica**: `bash strumenti/test.sh` (tutti i test; `strumenti/test.sh nome` per uno solo durante il lavoro, ma alla fine sempre tutti).
- **Per ogni funzione nuova un test nuovo** in `test/<tema>_test.js` (JSDOM; Chromium vero se serve la resa CSS, come `web_thumbs_test.js`). I percorsi si prendono da `require('./percorsi')`, mai percorsi assoluti. Il test deve fallire sul codice vecchio. Ultima riga stampata: `<nome>: N controlli superati, errori: nessuno`. Non risparmiare sui test.
- **Controllo a vista** quando cambia qualcosa di visibile: script in `screenshot/` (`node screenshot/shot_nativa.js dark|light`, ecc.), immagini in `.work/shot/`; guardale con Read prima di dire che va bene.
- **Swift**: qui non si compila. Test statici `test/ios_*_test.js`; rispetta le regole Swift di LEGGIMI (niente colori fissi, `.tabBarSpace()`, niente `NavigationLink` in griglie dentro `List`, niente catene lunghe con tuple anonime). `project.pbxproj` è quello di Xcode dell'utente: solo sostituzioni mirate.
- **Service worker**: incrementa `VERSION` in `app/sw.js` se cambia la lista dei file in cache.

## Fine lavoro
1. Aggiorna `LEGGIMI.md` (sezioni Funzioni / App iOS, Punti aperti, data) con cosa è cambiato, scelte dell'utente e cosa resta da verificare sul telefono.
2. `bash strumenti/test.sh` completo, poi commit con messaggio in italiano che dica cosa cambia per l'utente.
3. Pubblicazione: il push su `main` (o il merge della PR) pubblica `app/` su Cloudflare Pages tramite `.github/workflows/pubblica.yml`, solo se i test passano. Non serve più nessuno zip. `strumenti/pacchetto.sh` resta solo come riserva per il caricamento manuale (crea `.work/album-carte-pwa.zip`). Per l'app nativa l'utente apre `ios/CartePokemon/CartePokemon.xcodeproj` dal suo clone (o `strumenti/ios.sh` crea lo zip).
4. Nella risposta: cosa è cambiato, cosa hai verificato, **cosa non hai potuto verificare** (comportamento reale su iPhone, Safari/Web Clip, compilazione Swift).

## Regole di prodotto
- Uso personale, non di scambio: **niente avvisi di prezzo né funzioni di compravendita** (escluse anche analisi scambi e altri mercati).
- Se una richiesta è ambigua, **chiedi prima di lavorare**. Distingui sito web e app nativa: chiedi su quale dei due va la modifica se non è detto (in passato si è lavorato sul posto sbagliato).
- I dati dell'utente stanno nel browser del telefono, legati al dominio `carte-pokemon-5vf.pages.dev`: **non cambiare dominio o progetto Cloudflare** senza avvisare (servirebbe backup e ripristino). Nuovi campi del catalogo: in `normalizeEntry` con valore predefinito; il formato del backup deve restare compatibile con l'app nativa.
- Rispondi in italiano, in modo concreto e sintetico.

## Struttura
- `app/` — il sito pubblicato (index.html, sw.js, manifest, `_headers`, profilo, icone). Sorgente unica: si modifica qui.
- `test/` — test Node (`*_test.js`, JSDOM, `percorsi.js`), `package.json`.
- `screenshot/` — script Puppeteer a 390×844 (Chromium di `@sparticuz/chromium`, solo Linux x64; su Mac `CHROME_PATH=/percorso/di/Chrome`).
- `ios/` — progetto Xcode e `ISTRUZIONI.md` per l'utente.
- `strumenti/` — `setup.sh`, `test.sh`, `estrai_js.py`, `pacchetto.sh`, `ios.sh`, `patch_modello.py`; `storico/` = patch delle chat precedenti (solo riferimento, non rilanciarle: puntano ai percorsi della vecchia sandbox).
- `.work/` — file generati (non versionati).
