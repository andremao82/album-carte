# 18/10/2026 (web): i tre pulsanti dell'editor dei bordi su una riga sola anche a 390 px.
import re
p='/mnt/user-data/outputs/album-carte-pokemon.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(old[:100],s.count(old))
    s=s.replace(old,new)
rep('''.qe-btns{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}''','''.qe-btns{display:flex;gap:8px;width:100%;max-width:440px}
.qe-btns .btn{flex:1;min-width:0;padding:0 8px}''')
open(p,'w',encoding='utf-8').write(s)
open('/home/claude/app.js','w',encoding='utf-8').write(re.search(r'<script>\n(.*)</script>',s,re.S).group(1))
print('ok')
