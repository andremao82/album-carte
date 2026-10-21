# 21/10/2026: miniature della Home (Carte di maggior valore, Ultime aggiunte) e di "Si sono mossi" troppo ingrandite.
# Causa: solo `.item .art img` aveva una misura; altrove l'immagine restava alla grandezza originale e .art la tagliava.
import re
p='/mnt/user-data/outputs/album-carte-pokemon.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(old[:100],s.count(old))
    s=s.replace(old,new)
rep('.art img{z-index:1}','.art img{z-index:1}\n.art>img{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:contain}')
open(p,'w',encoding='utf-8').write(s)
open('/home/claude/app.js','w',encoding='utf-8').write(re.search(r'<script>\n(.*)</script>',s,re.S).group(1))
print('ok')
