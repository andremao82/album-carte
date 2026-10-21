# Modello per le modifiche mirate: ogni sostituzione fallisce se il testo non compare esattamente "count" volte.
# Uso: copia il file (es. strumenti/storico/patch_web_AAAA-MM-GG_tema.py), scrivi le rep(), lancialo da qualunque cartella.
import os, subprocess
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = R if os.path.isdir(os.path.join(R, 'app')) else os.path.dirname(R)   # anche da strumenti/storico/
FILE = os.path.join(R, 'app', 'index.html')
s = open(FILE, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, (old[:100], s.count(old))
    s = s.replace(old, new)
# rep("testo esatto da cercare", "testo nuovo")
open(FILE, 'w', encoding='utf-8').write(s)
if FILE.endswith('index.html'): subprocess.run(['python3', os.path.join(R, 'strumenti', 'estrai_js.py')], check=True)
print('ok')
