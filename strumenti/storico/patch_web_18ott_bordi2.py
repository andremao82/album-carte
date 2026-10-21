# 18/10/2026 (web): "Altre N foto in attesa" si aggiorna anche quando arrivano foto con l'editor già aperto.
import re
p='/mnt/user-data/outputs/album-carte-pokemon.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(old[:100],s.count(old))
    s=s.replace(old,new)
rep('''  const more = qJobs.filter(j => j.status === 'edges' && j !== job).length;
  $('qe-more').hidden = !more; $('qe-more').textContent = more ? 'Altre ' + more + (more === 1 ? ' foto in attesa' : ' foto in attesa') : '';
''','''  qeMore();
''')
rep('''function closeQEdit(){''','''function qeMore(){
  const more = qJobs.filter(j => j.status === 'edges' && j !== qeJob).length;
  $('qe-more').hidden = !more; $('qe-more').textContent = more ? 'Altre ' + more + ' foto in attesa' : '';
}
function closeQEdit(){''')
rep('''function renderQuick(){
  const box = $('q-list'); if (!box) return;''','''function renderQuick(){
  const box = $('q-list'); if (!box) return;
  if (qeJob) qeMore();''')
open(p,'w',encoding='utf-8').write(s)
open('/home/claude/app.js','w',encoding='utf-8').write(re.search(r'<script>\n(.*)</script>',s,re.S).group(1))
print('ok')
