# 21/10/2026: foglio "È ora del backup" all'apertura dell'app quando il backup è scaduto
# (stesse regole del promemoria: 3 giorni con modifiche, 25 modifiche, mai fatto con almeno 10 carte).
# Si ripropone anche al ritorno dopo almeno 30 minuti in secondo piano. Opzione in Impostazioni.
import re
p='/mnt/user-data/outputs/album-carte-pokemon.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(old[:100],s.count(old))
    s=s.replace(old,new)

# stile
rep("#add-back{z-index:31}\n",
"#add-back{z-index:31}\n"
"/* foglio del backup all'apertura */\n"
"#bk-back{z-index:35}\n"
".bksheet{z-index:36;text-align:center}\n"
".bksheet .bkico{width:64px;height:64px;margin:26px auto 12px;border-radius:20px;display:grid;place-items:center;background:var(--accent-fill);color:var(--on-accent)}\n"
".bksheet .bkico svg{width:32px;height:32px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}\n"
".bksheet h2{margin:0 0 8px;font-size:1.6rem;font-weight:800}\n"
".bksheet p{margin:0 auto 6px;max-width:34ch;color:var(--muted);font-size:.95rem}\n"
".bksheet .btn{width:100%;margin-top:12px}\n"
".bksheet .btn.solid{margin-top:20px}\n")

# markup: dopo il pannello Aggiungi carte
rep('<div id="undo" class="undo" hidden>',
'<div id="bk-back" class="sheet-back" hidden></div>\n'
'<div id="bk-sheet" class="sheet addsheet bksheet" role="dialog" aria-modal="true" aria-labelledby="bks-t" hidden>\n'
'  <div class="bkico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg></div>\n'
'  <h2 id="bks-t">È ora del backup</h2>\n'
'  <p id="bks-p"></p>\n'
'  <p id="bks-n"></p>\n'
'  <button id="bks-save" class="btn solid" type="button">Salva backup</button>\n'
'  <button id="bks-later" class="btn" type="button">Più tardi</button>\n'
'</div>\n'
'<div id="undo" class="undo" hidden>')

# opzione in Impostazioni → Dati e backup
rep('<label class="srow2 act" for="restore">',
'<div class="srow2"><span class="ico yellow"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v5l3 2"/><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4"/></svg></span><label class="lbl" for="s-bksheet">All’apertura</label><select id="s-bksheet"><option value="yes">Proponi il backup</option><option value="no">Solo promemoria</option></select></div>\n'
'    <label class="srow2 act" for="restore">')
rep("startPage:'home', condEstimate:true}", "startPage:'home', condEstimate:true, bkSheet:true}")
rep("  $('s-edges').value = cfg.confirmEdges ? 'yes' : 'no';\n",
    "  $('s-edges').value = cfg.confirmEdges ? 'yes' : 'no';\n  $('s-bksheet').value = cfg.bkSheet === false ? 'no' : 'yes';\n")
rep("  cfg.condEstimate = $('s-cest').value !== 'no';\n",
    "  cfg.condEstimate = $('s-cest').value !== 'no';\n  cfg.bkSheet = $('s-bksheet').value !== 'no';\n")
rep("['s-prov', 's-psrc', 's-cest', 's-model', 's-gmodel', 's-edges', 's-enh', 's-start']",
    "['s-prov', 's-psrc', 's-cest', 's-model', 's-gmodel', 's-edges', 's-enh', 's-start', 's-bksheet']")
rep("Su iPhone, Backup apre il foglio di condivisione: scegli “Salva su File” (iCloud Drive, cartella Album carte) oppure il comando “Backup carte”.</p>",
    "Su iPhone, Backup apre il foglio di condivisione: scegli “Salva su File” (iCloud Drive, cartella Album carte) oppure il comando “Backup carte”. Con “Proponi il backup”, quando il backup è scaduto l’app lo chiede appena la apri: basta un tocco (iPhone non permette di salvare un file senza toccare).</p>")

# logica
rep("$('btn-bak').addEventListener('click', doBackup);\n",
"""$('btn-bak').addEventListener('click', doBackup);
/* Backup all'apertura: se il backup è scaduto (stesse regole del promemoria) un foglio con un solo tasto.
   Nel web su iPhone un file non si salva senza un tocco: il foglio di condivisione vuole un gesto.
   Una volta per apertura; di nuovo se l'app torna in primo piano dopo almeno BK_RESUME_MIN minuti. */
const BK_RESUME_MIN = 30;
let bkSheetDone = false, bkHiddenAt = 0;
const bkSheetOpen = () => !$('bk-sheet').hidden;
function bkSheetBusy(){ return !$('v-quick').hidden || !$('qedge').hidden || !$('add-sheet').hidden || !$('bulk-sheet').hidden || !$('act-sheet').hidden || !$('zoom').hidden; }
function maybeBackupSheet(){
  if (bkSheetDone || bkSheetOpen() || cfg.bkSheet === false) return false;
  const bi = backupInfo(); if (!bi.due || bi.snoozed) return false;
  if (bkSheetBusy()) return false; // non sopra la fotocamera, l'editor dei bordi o un altro foglio: si riprova al prossimo ritorno
  bkSheetDone = true;
  const ph = new Set(catalog.map(e => e.photo).filter(photoExists)).size;
  $('bks-p').textContent = backupText(bi);
  const nc = homeStats().n;
  $('bks-n').textContent = fmtN(nc) + (nc === 1 ? ' carta' : ' carte') + (ph ? ' e ' + fmtN(ph) + ' foto' : '') + ' da salvare in un file.';
  $('bk-back').hidden = false; $('bk-sheet').hidden = false;
  return true;
}
function closeBackupSheet(){ $('bk-back').hidden = true; $('bk-sheet').hidden = true; }
$('bks-save').addEventListener('click', () => { closeBackupSheet(); doBackup(); }); // chiamata nello stesso tocco: serve al foglio di condivisione
$('bks-later').addEventListener('click', () => { closeBackupSheet(); LS.set('pkm_bksnooze', Date.now() + 864e5); if (!$('v-home').hidden) renderHome(); renderCatalog(); });
$('bk-back').addEventListener('click', closeBackupSheet); // tocco fuori: chiude solo per questa apertura
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden'){ bkHiddenAt = Date.now(); return; }
  if (bkHiddenAt && Date.now() - bkHiddenAt >= BK_RESUME_MIN * 6e4){ bkSheetDone = false; setTimeout(maybeBackupSheet, 400); }
  bkHiddenAt = 0;
});
""")
rep("go(({home:'home', cat:'cat', sets:'sets'})[cfg.startPage] || 'home');\n})();",
    "go(({home:'home', cat:'cat', sets:'sets'})[cfg.startPage] || 'home');\nsetTimeout(maybeBackupSheet, 500);\n})();")

open(p,'w',encoding='utf-8').write(s)
open('/home/claude/app.js','w',encoding='utf-8').write(re.search(r'<script>\n(.*)</script>',s,re.S).group(1))
print('ok')
