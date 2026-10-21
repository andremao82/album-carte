#!/bin/bash
# Estrae il JavaScript, controlla la sintassi ed esegue tutti i test. Esce con errore se un test fallisce.
# Uso: strumenti/test.sh            tutti i test
#      strumenti/test.sh nome_test  solo i test il cui nome contiene "nome_test"
R="$(cd "$(dirname "$0")/.." && pwd)"; cd "$R"
[ -d test/node_modules ] || bash strumenti/setup.sh >/dev/null || exit 1
python3 strumenti/estrai_js.py || { echo "ERRORE: script dell'app non trovato"; exit 1; }
node --check .work/app.js || { echo "ERRORE DI SINTASSI"; exit 1; }
# timeout: su macOS non c'è di serie (gtimeout con Homebrew coreutils); senza, i test girano senza limite.
if command -v timeout >/dev/null; then TO="timeout 120"; elif command -v gtimeout >/dev/null; then TO="gtimeout 120"; else TO=""; fi
cd test; fail=0; n=0
for f in *_test.js; do
  [ -n "$1" ] && [[ "$f" != *"$1"* ]] && continue
  n=$((n+1))
  out=$($TO node "$f" 2>&1); rc=$?
  # fallisce se il test si interrompe (eccezione, verifica non superata) o se segnala errori della pagina.
  # Non si cercano parole come "TypeError" nel testo: alcuni test simulano apposta errori di rete.
  err=$(echo "$out" | grep -E "errori" | grep -v "nessuno")
  if [ $rc -ne 0 ] || [ -n "$err" ]; then echo "FALLITO  $f"; echo "$out" | tail -8; fail=1; else echo "ok       $f"; fi
done
[ $n -eq 0 ] && { echo "nessun test trovato"; exit 1; }
[ $fail -eq 0 ] && echo "TUTTI I TEST SUPERATI ($n)" || { echo "CI SONO TEST FALLITI"; exit 1; }
