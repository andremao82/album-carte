# Correzione (20/10/2026): dopo il riavvio, quando la coda viene ricaricata, il numero delle carte
# da controllare sul tasto giallo (e la riga in "Aggiungi una carta") si aggiorna subito.
import re
p='/mnt/user-data/outputs/album-carte-pokemon.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(old[:100],s.count(old))
    s=s.replace(old,new)

rep("""  if (qJobs.length){ if (!$('v-home').hidden) renderHome(); if (!$('v-quick').hidden){ renderQuick(); edgeNext(); } }""",
    """  updateScanBadge(); if (!$('v-scan').hidden) renderScanQueue();
  if (qJobs.length){ if (!$('v-home').hidden) renderHome(); if (!$('v-quick').hidden){ renderQuick(); edgeNext(); } }""")

# spazio fra numero e testo: letto correttamente anche dalla voce ("3 carte", non "3carte")
rep("""'<button class="qline" type="button" data-a="openq"><b>' + n + '</b><span>'""", """'<button class="qline" type="button" data-a="openq"><b>' + n + '</b> <span>'""")

open(p,'w',encoding='utf-8').write(s)
open('/home/claude/app.js','w',encoding='utf-8').write(re.search(r'<script>\n(.*)</script>',s,re.S).group(1))
print('ok')
