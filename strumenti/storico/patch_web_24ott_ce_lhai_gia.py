# 24/10/2026: avviso "Ce l'hai già" sulle righe della coda (carta identica: stessa carta, lingua, variante e condizione).
import os, subprocess
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = R if os.path.isdir(os.path.join(R, 'app')) else os.path.dirname(R)
FILE = os.path.join(R, 'app', 'index.html')
s = open(FILE, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, (old[:100], s.count(old))
    s = s.replace(old, new)

# chiave comune all'aggiunta automatica e al controllo delle carte da controllare
rep("""function addAuto(job, c){
  const rec = job.rec, est = condEstimate(rec), cond = est ? est.code : 'NM';
  const lang = {it:'IT', en:'EN', ja:'JP'}[rec.language] || 'IT', variant = defaultVariant(c, {holo:'Holo', reverse:'Reverse holo', normal:'Normale'}[rec.variant_hint]);
  const key = [c.id, lang, variant, cond].join('|'), existed = catalog.some(x => x.key === key);
  addEntryFromCandidate(c, lang, variant, cond, 1, null, est ? {condEst:1, condNote:est.notes} : {});
  if (wantsOwnPhoto(c)) attachPhoto(key, job.raw || job.crop, job.photo, job.quad);
  Object.assign(job, {status:'added', key, existed, name:""",
"""// lingua, variante e condizione con cui la coda aggiungerebbe la carta letta
function autoKeyOf(rec, c){
  const est = condEstimate(rec), cond = est ? est.code : 'NM';
  const lang = {it:'IT', en:'EN', ja:'JP'}[rec.language] || 'IT', variant = defaultVariant(c, {holo:'Holo', reverse:'Reverse holo', normal:'Normale'}[rec.variant_hint]);
  return {est, cond, lang, variant, key:[c.id, lang, variant, cond].join('|')};
}
// quante copie identiche (stessa chiave) hai già fra i risultati possibili di una carta da controllare
function ownedOf(rec, cands){
  const keys = new Set(cands.map(c => autoKeyOf(rec, c).key));
  return catalog.filter(x => keys.has(x.key)).reduce((n, x) => n + (x.qty || 1), 0);
}
function addAuto(job, c){
  const rec = job.rec, {est, cond, lang, variant, key} = autoKeyOf(rec, c);
  const prev = catalog.find(x => x.key === key), existed = !!prev, had = prev ? (prev.qty || 1) : 0;
  addEntryFromCandidate(c, lang, variant, cond, 1, null, est ? {condEst:1, condNote:est.notes} : {});
  if (wantsOwnPhoto(c)) attachPhoto(key, job.raw || job.crop, job.photo, job.quad);
  Object.assign(job, {status:'added', key, existed, had, name:""")

rep("""  job.status = 'reading'; job.msg = ''; renderQuick();""",
    """  job.status = 'reading'; job.msg = ''; job.owned = 0; renderQuick();""")
rep("""    else { job.status = 'review'; job.msg = found.length > 1 ? 'più risultati possibili' : found.length ? 'lettura poco sicura' : 'carta non trovata'; jobSave(job); }""",
    """    else { job.status = 'review'; job.msg = found.length > 1 ? 'più risultati possibili' : found.length ? 'lettura poco sicura' : 'carta non trovata'; job.owned = ownedOf(rec, found); jobSave(job); }""")
rep("""photo:j.photo || null, quad:j.quad || null, ok:j.ok}));""",
    """photo:j.photo || null, quad:j.quad || null, ok:j.ok, owned:j.owned || 0}));""")

# righe della coda: etichetta gialla
rep("""', ' + esc(j.cond) + (j.existed ? ', doppione' : '') + '</div></div>""",
    """', ' + esc(j.cond) + '</div>' + (j.existed ? '<span class="qdup">Ce l’hai già' + (j.had ? ': ne avevi ' + j.had : '') + '</span>' : '') + '</div>""")
rep("""(j.rec.number ? ', ' + esc(j.rec.number) : '') + '</div>' : '') + '</div><div class="acts">' + acts""",
    """(j.rec.number ? ', ' + esc(j.rec.number) : '') + '</div>' : '') + (j.status === 'review' && j.owned ? '<span class="qdup">Forse ce l’hai già: ' + j.owned + (j.owned > 1 ? ' copie' : ' copia') + '</span>' : '') + '</div><div class="acts">' + acts""")

rep(""".qrow .meta{font-size:.82rem;color:var(--muted)}
""", """.qrow .meta{font-size:.82rem;color:var(--muted)}
.qrow .qdup{display:inline-block;margin-top:4px;padding:2px 9px;border-radius:999px;background:var(--accent-soft);border:1px solid var(--accent-line);color:var(--accent);font-size:.76rem;font-weight:700}
""")

open(FILE, 'w', encoding='utf-8').write(s)
subprocess.run(['python3', os.path.join(R, 'strumenti', 'estrai_js.py')], check=True)
print('ok')
