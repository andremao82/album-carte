# Ritocco (20/10/2026): nelle carte salite/scese della Home importo e percentuale su due righe distinte,
# invece di un'unica riga che andava a capo lasciando il "·" appeso.
import re
p='/mnt/user-data/outputs/album-carte-pokemon.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(old[:100],s.count(old))
    s=s.replace(old,new)

rep("""'<span class="t"><b>' + esc(r.e.name) + '</b><span style="color:' + col + '">' + signed(r.d) + ' · ' + signedPct(r.pct) + '</span></span></button>';""",
    """'<span class="t"><b>' + esc(r.e.name) + '</b><span style="color:' + col + '">' + signed(r.d) + '</span><span class="pc" style="color:' + col + '">' + signedPct(r.pct) + '</span></span></button>';""")
rep(""".mrow .t span{font-size:.78rem;font-weight:700;font-variant-numeric:tabular-nums}""",
    """.mrow .t span{font-size:.78rem;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.mrow .t span.pc{font-weight:600;opacity:.85}""")

open(p,'w',encoding='utf-8').write(s)
open('/home/claude/app.js','w',encoding='utf-8').write(re.search(r'<script>\n(.*)</script>',s,re.S).group(1))
print('ok')
