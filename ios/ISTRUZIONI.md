# App iOS "Carte Pokémon" — nativa SwiftUI con Liquid Glass

Richiede **Xcode 26** e un iPhone con **iOS 26**. Si installa con il tuo Apple ID personale gratuito.

## Una volta sola
1. Apri Xcode, accetta la licenza e lascia installare i componenti iOS 26.
2. Xcode → Impostazioni → Accounts → "+" → Apple ID: usa il tuo **Apple ID personale** (non l'account sviluppatore aziendale).
3. Collega l'iPhone con il cavo, sbloccalo e tocca "Autorizza".
4. iPhone: Impostazioni → Privacy e sicurezza → Modalità sviluppatore → attiva (il telefono si riavvia).
5. Scompatta CartePokemon-ios.zip e apri `CartePokemon/CartePokemon.xcodeproj`.
6. Nel progetto: clic su "CartePokemon" (icona blu in alto a sinistra) → target CartePokemon → Signing & Capabilities → Team: "<Tuo nome> (Personal Team)".
   Se compare un errore sull'identificativo (bundle identifier già usato), cambia `it.albumcarte.app.personale` aggiungendo qualcosa, es. le tue iniziali.
7. In alto scegli il tuo iPhone come destinazione e premi ▶ (Run).
8. Al primo avvio l'iPhone può dire "sviluppatore non attendibile": Impostazioni → Generali → VPN e gestione dispositivi → il tuo Apple ID → Autorizza. Poi riapri l'app.

## Se Xcode segnala errori di compilazione
Questa è la prima versione nativa e il codice non è stato compilato prima della consegna (non avevo un Mac): è possibile che Xcode segnali qualche errore. Copia il messaggio rosso (file, riga, testo) e mandamelo: di norma sono correzioni di una riga.

## Portare le carte dalla versione web
Nella versione web: Impostazioni → Backup. Nell'app nativa: Home → icona in alto a destra (Impostazioni) → Ripristina da un backup… e scegli il file. Il formato è lo stesso nei due sensi. Le chiavi (Gemini, Claude) vanno reinserite in Impostazioni: stanno nel Portachiavi di iPhone e non nei backup.
I dati dell'app nativa e quelli della versione web **non si sincronizzano**: sono due archivi separati. Tieni la versione web finché non hai controllato che tutto ci sia.

## Ogni 7 giorni
Il profilo gratuito scade dopo 7 giorni: l'app non si apre più, ma i dati restano.
Collega l'iPhone, apri il progetto e premi ▶. **Non eliminare l'app dal telefono**: si perderebbero i dati. Fai comunque backup regolari.
