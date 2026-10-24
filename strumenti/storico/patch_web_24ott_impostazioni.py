# Impostazioni riordinate (24/10/2026): gruppi Generali, Scansione, Riconoscimento, Prezzi, Backup, Esporta, Avanzate, Zona delicata.
import os, subprocess, re
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = R if os.path.isdir(os.path.join(R, 'app')) else os.path.dirname(R)
FILE = os.path.join(R, 'app', 'index.html')
s = open(FILE, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, (old[:100], s.count(old))
    s = s.replace(old, new)

a = s.index('<section id="v-set" class="view" hidden>'); b = s.index('</section>', a)
old = s[a:b]
lines = old.split('\n')
def row(key):
    m = [l for l in lines if key in l]
    assert len(m) == 1, (key, len(m))
    return m[0].strip()
def block(start, end):   # righe consecutive da start a end comprese
    i = next(k for k, l in enumerate(lines) if start in l); j = next(k for k, l in enumerate(lines) if k >= i and end in l)
    return '\n'.join('  ' + l.strip() if l.strip() else '' for l in lines[i:j + 1])
G = lambda *rows: '  <div class="sgroup">\n' + '\n'.join('    ' + r for r in rows) + '\n  </div>'
GG = lambda *rows: G(*rows).replace('class="sgroup"', 'class="sgroup sgap"', 1)
H = lambda t: '  <div class="sh">' + t + '</div>'
F = lambda t, id='': '  <p ' + ('id="' + id + '" ' if id else '') + 'class="sfoot">' + t + '</p>'

new = '\n'.join([
  '<section id="v-set" class="view" hidden>',
  '  ' + row('class="setbar"'),
  '',
  H('Generali'),
  G(row('id="s-appear"').replace('<div class="sgroup">','',1)[:-len('</div>')], row('id="s-start"')),
  F('Aspetto: Automatico segue il tema dell’iPhone (Scuro: Notte blu · Chiaro: Perla). Le impostazioni si salvano da sole appena le cambi; solo le chiavi hanno il pulsante “Salva”.'),
  '',
  H('Scansione'),
  G(row('id="s-edges"'), row('id="s-enh"'), row('id="s-cest"')),
  F('Il miglioramento toglie le ombre e rende più nitida la carta ritagliata. La stima della condizione dalla foto è indicativa: controllala sempre sulla carta vera.'),
  '',
  H('Riconoscimento delle carte'),
  G(row('id="s-prov"')),
  block('<div id="g-box">', '<div id="c-box" hidden>').rsplit('\n', 1)[0],
  block('<div id="c-box" hidden>', 'Usa una chiave creata su un account personale') + '\n  </div>',
  row('id="keystate"').join(['  ', '']),
  row('id="usage"').join(['  ', '']),
  GG(row('id="btn-diag"')),
  row('id="diag"').join(['  ', '']),
  F('Se il riconoscimento non funziona, “Prova la connessione” controlla ogni collegamento e mostra l’esito.'),
  '',
  H('Prezzi'),
  G(row('id="s-psrc"'), row('id="fxstate"'), row('id="pxstate"'), row('id="btn-refresh"')),
  F('Cardmarket dà il prezzo in euro per la carta normale e per la reverse holo; TCGplayer ha anche holo e 1st edition, in dollari convertiti con il cambio BCE (per la 1st edition si usa sempre TCGplayer, se c’è). I prezzi si aggiornano da soli una volta al giorno, alla prima apertura dell’app con la rete.'),
  '',
  H('Prezzo per condizione'),
  G(*[row('id="cc-' + c + '"') for c in ['MT','NM','EX','GD','LP','PL','PO']], row('id="btn-ccdef"')),
  F('Percentuale del prezzo di mercato (che vale per una carta Near Mint) per le altre condizioni. Il prezzo che imposti a mano su una carta non cambia.'),
  '',
  H('Backup'),
  G(row('id="btn-bak"'), row('id="s-bksheet"'), row('for="restore"'), row('id="btn-autobak"')),
  '  ' + row('id="restore"'),
  F('', 'bakstate'),
  F('Il catalogo è salvato solo su questo telefono, in questo browser e per questo indirizzo: se cambi browser o indirizzo, o cancelli i dati del sito, serve il backup. Backup apre il foglio di condivisione: scegli “Salva su File” (iCloud Drive, cartella Album carte) o il comando “Backup carte”. Con “Proponi il backup” l’app lo chiede all’apertura quando è scaduto.'),
  '',
  H('Esporta'),
  G(row('id="btn-csv"'), row('id="btn-collectr"')),
  F('CSV: tutte le carte in un foglio di calcolo. Collectr: file nel formato TCGplayer, da inviare a Collectr per l’importazione.'),
  '',
  H('Avanzate'),
  G(row('id="s-tcg"'), row('id="btn-save-t"')),
  F('La chiave pokemontcg.io è facoltativa: aumenta i limiti della ricerca di riserva e non serve per l’uso normale.'),
  '  <div class="sgroup sgap"><div class="sinfo">',
  '    ' + row('id="pwa-state"'),
  '    ' + row('id="persist-state"'),
  '    ' + row('id="clip-note"'),
  '  </div></div>',
  '',
  H('Zona delicata'),
  G(row('id="btn-histdel"'), row('id="btn-delkey"'), row('id="btn-reset"')),
  F('', 'histstate'),
  F('Svuotando il catalogo puoi comunque tornare indietro con Annulla o con la copia automatica.'),
  ''])
s = s[:a] + new + s[b:]
rep('.appear{padding:10px 12px}', '.appear{padding:10px 12px}\n.appear+.srow2{border-top:1px solid var(--line)}\n.sgroup.sgap{margin-top:12px}')
open(FILE, 'w', encoding='utf-8').write(s)
subprocess.run(['python3', os.path.join(R, 'strumenti', 'estrai_js.py')], check=True)
print('ok')
