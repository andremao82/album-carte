# 18/10/2026 (web): righe "da controllare" con tre pulsanti: i pulsanti vanno su una riga sotto, il testo resta largo.
import re
p='/mnt/user-data/outputs/album-carte-pokemon.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(old[:100],s.count(old))
    s=s.replace(old,new)
rep('''.qrow .acts{display:flex;gap:6px;flex:none;flex-wrap:wrap;justify-content:flex-end;max-width:56%}''',
'''.qrow .acts{display:flex;gap:6px;flex:none;flex-wrap:wrap;justify-content:flex-end;max-width:56%}
.qrow.wide{flex-wrap:wrap}
.qrow.wide .acts{flex-basis:100%;max-width:none}''')
rep('''    return '<div class="qrow"><img src="' + esc(j.crop || j.photo || '') + '" alt="">''',
'''    return '<div class="qrow' + ((j.status === 'review' || j.status === 'error') && j.photo ? ' wide' : '') + '"><img src="' + esc(j.crop || j.photo || '') + '" alt="">''')
open(p,'w',encoding='utf-8').write(s)
open('/home/claude/app.js','w',encoding='utf-8').write(re.search(r'<script>\n(.*)</script>',s,re.S).group(1))
print('ok')
