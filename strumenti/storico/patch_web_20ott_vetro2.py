# Ritocchi al ridisegno "Vetro olografico" dopo gli screenshot (20/10/2026):
# barra sopra i badge delle carte, percentuali sotto gli importi nell'Andamento, riflesso più tenue.
import re
p='/mnt/user-data/outputs/album-carte-pokemon.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(old[:100],s.count(old))
    s=s.replace(old,new)

rep(""".inquick .dock{display:none}""", """.dock{z-index:20}
.inquick .dock{display:none}
.holo::after{opacity:.8}
.kvt span:last-child small{display:block;font-size:.75rem;font-weight:700;color:var(--muted)}""")
rep("""<span>' + signed(d) + (a > 0 ? ' (' + signedPct(d / a * 100) + ')' : '') + '</span>""",
    """<span>' + signed(d) + (a > 0 ? '<small>' + signedPct(d / a * 100) + '</small>' : '') + '</span>""")
rep("""<span>' + signed(mv.dTot) + (mv.bTot > 0 ? ' (' + signedPct(mv.dTot / mv.bTot * 100) + ')' : '') + '</span>""",
    """<span>' + signed(mv.dTot) + (mv.bTot > 0 ? '<small>' + signedPct(mv.dTot / mv.bTot * 100) + '</small>' : '') + '</span>""")

open(p,'w',encoding='utf-8').write(s)
open('/home/claude/app.js','w',encoding='utf-8').write(re.search(r'<script>\n(.*)</script>',s,re.S).group(1))
print('ok')
