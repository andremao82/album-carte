# Descrizione di ogni condizione sotto il nome, in Impostazioni → Prezzo per condizione (25/10/2026).
import os, subprocess
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = R if os.path.isdir(os.path.join(R, 'app')) else os.path.dirname(R)
FILE = os.path.join(R, 'app', 'index.html')
s = open(FILE, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, (old[:100], s.count(old))
    s = s.replace(old, new)
D = [('MT','Mint','Perfetta, appena uscita dalla bustina'),
     ('NM','Near Mint','Al massimo 1-2 micro-imperfezioni visibili solo da vicino'),
     ('EX','Excellent','Leggero whitening o qualche graffio superficiale'),
     ('GD','Good','Usura evidente su bordi e angoli, nessuna piega'),
     ('LP','Light Played','Usura diffusa, piccole pieghe o graffi marcati'),
     ('PL','Played','Pieghe evidenti, forte usura'),
     ('PO','Poor','Danni gravi: strappi, acqua, scritte')]
for c, n, d in D:
    rep('<label class="lbl" for="cc-%s">%s</label>' % (c, n), '<label class="lbl" for="cc-%s">%s<small class="sdesc">%s</small></label>' % (c, n, d))
rep('.srow2 .lbl{flex:1;min-width:0;font-weight:500;font-size:1rem}', '.srow2 .lbl{flex:1;min-width:0;font-weight:500;font-size:1rem}\n.srow2 .lbl .sdesc{display:block;margin-top:2px;font-size:.8rem;font-weight:400;line-height:1.3;color:var(--muted)}')
open(FILE, 'w', encoding='utf-8').write(s)
subprocess.run(['python3', os.path.join(R, 'strumenti', 'estrai_js.py')], check=True)
print('ok')
