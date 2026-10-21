# 21/10/2026: trasloco del sito da Netlify a Cloudflare Pages: testi senza nome dell'hosting.
import re
p='/mnt/user-data/outputs/album-carte-pokemon.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(old[:100],s.count(old))
    s=s.replace(old,new)
rep("Apri il link online (…netlify.app) con il browser.","Apri il sito online con il browser.")
rep("apri la pagina dal link online (Netlify).","apri il sito online.")
open(p,'w',encoding='utf-8').write(s)
open('/home/claude/app.js','w',encoding='utf-8').write(re.search(r'<script>\n(.*)</script>',s,re.S).group(1))
print('ok')
