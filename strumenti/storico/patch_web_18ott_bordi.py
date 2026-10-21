# 18/10/2026 (web): correzione dei bordi nella scansione rapida, come nell'app nativa, con la lente.
# - editor dei bordi riutilizzabile (ed.cv / ed.photo), lente sopra il dito o di lato sugli angoli alti (loupePos)
# - foto senza bordi trovati o con "Conferma i bordi": stato 'edges', editor a schermo intero in Scansione rapida
# - tasto "Correggi bordi" sulle foto da controllare (elenco) e "Correggi bordi" funzionante nella pagina di controllo
import re
p='/mnt/user-data/outputs/album-carte-pokemon.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(old[:100],s.count(old))
    s=s.replace(old,new)

# ---------- CSS ----------
rep('''.qrow .acts{display:flex;gap:6px;flex:none}''',
'''.qrow .acts{display:flex;gap:6px;flex:none;flex-wrap:wrap;justify-content:flex-end;max-width:56%}
.qedge{position:fixed;inset:0;z-index:40;background:#000;display:flex;flex-direction:column;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 14px) 12px calc(env(safe-area-inset-bottom,0px) + 14px)}
.qedge[hidden]{display:none}
.qe-msg{margin:0 8px;text-align:center;font-size:.95rem;color:#fff}
.qe-wrap{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center}
.qedge .editor{width:auto;max-width:100%}
.qe-more{margin:0;font-size:.85rem}
.qe-more[hidden]{display:none}
.qe-btns{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}''')
rep('''#toast{position:fixed;left:50%;''','''#toast{position:fixed;z-index:70;left:50%;''')

# ---------- HTML: editor a schermo intero dentro Scansione rapida ----------
rep('''  <div id="q-list"></div>
</section>''','''  <div id="q-list"></div>
  <div id="qedge" class="qedge" hidden>
    <p id="qe-msg" class="qe-msg"></p>
    <div id="qe-wrap" class="qe-wrap"><canvas id="qe-cv" class="editor" aria-label="Trascina gli angoli sui bordi della carta"></canvas></div>
    <p id="qe-more" class="muted qe-more" hidden></p>
    <div class="qe-btns">
      <button class="btn danger" type="button" data-qe="discard">Scarta</button>
      <button class="btn" type="button" data-qe="reset">Ripristina</button>
      <button class="btn primary" type="button" data-qe="ok">Conferma</button>
    </div>
    <button class="btn small" type="button" data-qe="later">Più tardi</button>
  </div>
</section>''')

# ---------- editor riutilizzabile + lente ----------
rep('''const ed = {quad:null, k:1, dpr:1, drag:-1, off:[0, 0]};''',
'''const ed = {quad:null, k:1, dpr:1, drag:-1, off:[0, 0], cv:null, photo:null, orig:null};''')
rep('''  const cv = $('editor'), g = cv.getContext('2d'), d = ed.dpr;
  g.clearRect(0, 0, cv.width, cv.height); g.drawImage(scan.photo, 0, 0, cv.width, cv.height);''',
'''  const cv = ed.cv, g = cv.getContext('2d'), d = ed.dpr;
  g.clearRect(0, 0, cv.width, cv.height); g.drawImage(ed.photo, 0, 0, cv.width, cv.height);''')
rep('''// lente d'ingrandimento: mostra ingrandita (x3) la zona sotto l'angolo che stai spostando
function drawLoupe(g, q, h){
  const d = ed.dpr, R = 58 * d, Z = 3, W = g.canvas.width;
  const cx = Math.min(W - R - 4 * d, Math.max(R + 4 * d, h[0]));
  let cy = h[1] - R - 38 * d; if (cy < R + 4 * d) cy = h[1] + R + 38 * d;''',
'''// centro della lente: sopra il dito; se in alto non c'è spazio, di lato verso il centro (mai sotto il dito). Sempre dentro il riquadro.
function loupePos(hx, hy, W, H, R, gap, m){
  let cx = hx, cy = hy - R - gap;
  if (cy < R + m){ cx = hx < W / 2 ? hx + R + gap : hx - R - gap; cy = hy; }
  return [Math.min(Math.max(W - R - m, R + m), Math.max(R + m, cx)), Math.min(Math.max(H - R - m, R + m), Math.max(R + m, cy))];
}
// lente d'ingrandimento: mostra ingrandita (x3) la zona sotto l'angolo che stai spostando
function drawLoupe(g, q, h){
  const d = ed.dpr, R = 58 * d, Z = 3, W = g.canvas.width;
  const [cx, cy] = loupePos(h[0], h[1], W, g.canvas.height, R, 38 * d, 4 * d);''')
rep('''  g.drawImage(scan.photo, h[0] / ed.k - sz / 2''','''  g.drawImage(ed.photo, h[0] / ed.k - sz / 2''')
rep('''  ed.dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = Math.min(box.clientWidth || 600, 608);''','''  ed.dpr = Math.min(window.devicePixelRatio || 1, 2); ed.cv = cv; ed.photo = scan.photo;
  cv.style.width = ''; cv.style.height = '';
  const cssW = Math.min(box.clientWidth || 600, 608);''')
rep('''const edCv = $('editor');
const edPos = e => { const r = edCv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * scan.photo.width, (e.clientY - r.top) / r.height * scan.photo.height]; };
function moveHandle(e){
  const [x, y] = edPos(e);
  ed.quad[ed.drag] = [Math.min(scan.photo.width, Math.max(0, x + ed.off[0])), Math.min(scan.photo.height, Math.max(0, y + ed.off[1]))];
  drawEditor();
}
edCv.addEventListener('pointerdown', e => {
  if (!ed.quad) return; e.preventDefault();
  const [x, y] = edPos(e); let bi = 0, bd = 1e18;
  ed.quad.forEach((p, i) => { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < bd){ bd = d; bi = i; } });
  ed.drag = bi; ed.off = [ed.quad[bi][0] - x, ed.quad[bi][1] - y]; edCv.setPointerCapture(e.pointerId); moveHandle(e);
});
edCv.addEventListener('pointermove', e => { if (ed.drag >= 0) moveHandle(e); });
['pointerup', 'pointercancel'].forEach(t => edCv.addEventListener(t, () => { ed.drag = -1; if (ed.quad) drawEditor(); }));''',
'''// stesso editor per la pagina di aggiunta (#editor) e per la scansione rapida (#qe-cv): ed.cv è quello attivo
const edPos = e => { const r = ed.cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * ed.photo.width, (e.clientY - r.top) / r.height * ed.photo.height]; };
function moveHandle(e){
  const [x, y] = edPos(e);
  ed.quad[ed.drag] = [Math.min(ed.photo.width, Math.max(0, x + ed.off[0])), Math.min(ed.photo.height, Math.max(0, y + ed.off[1]))];
  drawEditor();
}
function bindEditor(cv){
  cv.addEventListener('pointerdown', e => {
    if (!ed.quad || ed.cv !== cv) return; e.preventDefault();
    const [x, y] = edPos(e); let bi = 0, bd = 1e18;
    ed.quad.forEach((p, i) => { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < bd){ bd = d; bi = i; } });
    ed.drag = bi; ed.off = [ed.quad[bi][0] - x, ed.quad[bi][1] - y]; try { cv.setPointerCapture(e.pointerId); } catch(err){} moveHandle(e);
  });
  cv.addEventListener('pointermove', e => { if (ed.drag >= 0 && ed.cv === cv) moveHandle(e); });
  ['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, () => { if (ed.cv !== cv) return; ed.drag = -1; if (ed.quad) drawEditor(); }));
}
bindEditor($('editor')); bindEditor($('qe-cv'));''')

# ---------- pagina di aggiunta: i tasti tornano visibili ----------
rep('''function resetScan(){
  current = {rec:null, cands:[], sel:null};''','''function resetScan(){
  current = {rec:null, cands:[], sel:null}; $('btn-edges').hidden = false; $('btn-flip').hidden = false;''')

# ---------- coda: foto conservata, stato 'edges' ----------
rep('''const jobSave = j => idbRun('readwrite', st => st.put({id:j.id, t:j.t, crop:j.crop, raw:j.raw, uncropped:j.uncropped, status:j.status, msg:j.msg, rec:j.rec}));''',
'''const jobSave = j => idbRun('readwrite', st => st.put({id:j.id, t:j.t, crop:j.crop, raw:j.raw, uncropped:j.uncropped, status:j.status, msg:j.msg, rec:j.rec, photo:j.photo || null, quad:j.quad || null, ok:j.ok}));''')
rep('''  if (qJobs.length){ if (!$('v-home').hidden) renderHome(); if (!$('v-quick').hidden) renderQuick(); }
});''','''  if (qJobs.length){ if (!$('v-home').hidden) renderHome(); if (!$('v-quick').hidden){ renderQuick(); edgeNext(); } }
});''')
rep('''  const det = detectCard(src);
  if (det.ok){
    const qd = insetQuad(orderQuad(det.quad, false), 0.008);
    return {crop:warp(src, qd).toDataURL('image/jpeg', 0.92), raw:cfg.enhance && cfg.condEstimate !== false ? warp(src, qd, 756, 1056, false).toDataURL('image/jpeg', 0.9) : null, uncropped:false};
  }
  const k = Math.min(1, 1280 / Math.max(src.width, src.height)), c = document.createElement('canvas'); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return {crop:c.toDataURL('image/jpeg', 0.88), raw:null, uncropped:true};
}''','''  const det = detectCard(src), kept = keepPhoto(src), quad = normQuad(det.quad, src.width, src.height);
  // bordi non trovati o conferma richiesta: la foto aspetta la correzione a mano (come nell'app nativa)
  if (cfg.confirmEdges || !det.ok) return {status:'edges', ok:det.ok, quad, photo:kept, crop:null, raw:null, uncropped:false};
  return Object.assign({status:'queued', ok:true, quad, photo:kept, uncropped:false}, cropFrom(src, det.quad));
}
// foto conservata per correggere i bordi più tardi (lato lungo 2000 px); quad in coordinate 0-1
function keepPhoto(src){
  const k = Math.min(1, 2000 / Math.max(src.width, src.height)); let c = src;
  if (k < 1){ c = document.createElement('canvas'); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); }
  return c.toDataURL('image/jpeg', 0.85);
}
const normQuad = (q, w, h) => q.map(p => [p[0] / w, p[1] / h]);
const denormQuad = (q, w, h) => q.map(p => [p[0] * w, p[1] * h]);
function cropFrom(src, quad){
  const qd = insetQuad(orderQuad(quad, false), 0.008);
  return {crop:warp(src, qd).toDataURL('image/jpeg', 0.92), raw:cfg.enhance && cfg.condEstimate !== false ? warp(src, qd, 756, 1056, false).toDataURL('image/jpeg', 0.9) : null};
}
function urlToCanvas(url){
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth || im.width; c.height = im.naturalHeight || im.height; c.getContext('2d', {willReadFrequently:true}).drawImage(im, 0, 0); res(c); };
    im.onerror = () => rej(new Error('Foto non leggibile'));
    im.src = url;
  });
}''')
rep('''        const p = prepPhoto(photo), job = {id:'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t:Date.now(), crop:p.crop, raw:p.raw, uncropped:p.uncropped, status:'queued', msg:'', rec:null};
        qJobs.push(job); jobSave(job);''','''        const job = Object.assign({id:'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t:Date.now(), msg:'', rec:null}, prepPhoto(photo));
        qJobs.push(job); jobSave(job); if (job.status === 'edges') edgeNext();''')
rep('''img:(c.images && c.images.small) || '', crop:null, raw:null, msg:''});''','''img:(c.images && c.images.small) || '', crop:null, raw:null, photo:null, msg:''});''')

# ---------- elenco della coda ----------
rep('''  const added = cnt('added'), review = cnt('review') + cnt('error'), waiting''','''  const added = cnt('added'), review = cnt('review') + cnt('error') + cnt('edges'), waiting''')
rep('''    const label = j.status === 'queued' ? 'In coda' : j.status === 'reading' ? 'In lettura…' : j.status === 'review' ? 'Da controllare: ' + esc(j.msg) : 'Errore: ' + esc(j.msg);
    const acts = j.status === 'review' || j.status === 'error' ? '<button class="btn small solid" type="button" data-q="review" data-id="' + id + '">Controlla</button><button class="btn small danger" type="button" data-q="drop" data-id="' + id + '">Elimina</button>' : j.status === 'queued' ? '<button class="btn small danger" type="button" data-q="drop" data-id="' + id + '">Elimina</button>' : '';
    return '<div class="qrow"><img src="' + esc(j.crop) + '" alt="">''',
'''    const label = j.status === 'edges' ? 'Bordi da controllare' : j.status === 'queued' ? 'In coda' : j.status === 'reading' ? 'In lettura…' : j.status === 'review' ? 'Da controllare: ' + esc(j.msg) : 'Errore: ' + esc(j.msg);
    const fix = j.photo ? '<button class="btn small" type="button" data-q="edges" data-id="' + id + '">Correggi bordi</button>' : '';
    const del = '<button class="btn small danger" type="button" data-q="drop" data-id="' + id + '">Elimina</button>';
    const acts = j.status === 'edges' ? fix + del : j.status === 'review' || j.status === 'error' ? '<button class="btn small solid" type="button" data-q="review" data-id="' + id + '">Controlla</button>' + fix + del : j.status === 'queued' ? del : '';
    return '<div class="qrow"><img src="' + esc(j.crop || j.photo || '') + '" alt="">''')
rep('''  else if (a === 'review' && job) reviewJob(job);
});''','''  else if (a === 'review' && job) reviewJob(job);
  else if (a === 'edges' && job) openQEdit(job);
});''')
rep('''{ const qq = qJobs.filter(j => j.status === 'queued' || j.status === 'reading').length, qr = qJobs.filter(j => j.status === 'review' || j.status === 'error').length;''',
'''{ const qq = qJobs.filter(j => j.status === 'queued' || j.status === 'reading').length, qr = qJobs.filter(j => j.status === 'review' || j.status === 'error' || j.status === 'edges').length;''')
rep('''  else if (top.name === 'quick'){ go('quick', true); renderQuick();''','''  else if (top.name === 'quick'){ go('quick', true); renderQuick(); edgeNext();''')

# ---------- pagina di controllo: "Correggi bordi" e "Capovolgi" usano la foto conservata ----------
rep('''  reviewJobId = job.id; pushView('scan', {});
  scan.photo = null; scan.crop = job.crop; scan.cropRaw = job.raw;''','''  reviewJobId = job.id; pushView('scan', {});
  scan.photo = null; scan.quad = null; scan.flip = false; scan.crop = job.crop; scan.cropRaw = job.raw;
  $('btn-edges').hidden = $('btn-flip').hidden = !job.photo;
  if (job.photo) urlToCanvas(job.photo).then(c => { if (reviewJobId !== job.id || scan.photo) return; scan.photo = c; scan.quad = job.quad ? denormQuad(job.quad, c.width, c.height) : defaultQuad(c.width, c.height); }).catch(() => { $('btn-edges').hidden = $('btn-flip').hidden = true; });''')

# ---------- editor a schermo intero della scansione rapida ----------
rep('''function finishReview(id){''','''// correzione dei bordi in Scansione rapida: si apre da sola per le foto 'edges', oppure con "Correggi bordi"
let qeJob = null;
function edgeNext(){
  if (qeJob || $('v-quick').hidden) return;
  const job = qJobs.find(j => j.status === 'edges' && j.photo && !j.later);
  if (job) openQEdit(job);
}
async function openQEdit(job){
  if (!job.photo){ toast('La foto originale non è più disponibile'); return; }
  qeJob = job;
  let c; try { c = await urlToCanvas(job.photo); } catch(e){ qeJob = null; toast(e.message); return; }
  if (qeJob !== job) return;
  const box = $('qedge'), cv = $('qe-cv'); box.hidden = false;
  $('qe-msg').textContent = job.status === 'edges' ? (job.ok ? 'Controlla i bordi, poi conferma.' : 'Non trovo bene i bordi: trascina gli angoli sulla carta, poi conferma.') : 'Trascina gli angoli sui bordi della carta e conferma: la carta verrà letta di nuovo.';
  const more = qJobs.filter(j => j.status === 'edges' && j !== job).length;
  $('qe-more').hidden = !more; $('qe-more').textContent = more ? 'Altre ' + more + (more === 1 ? ' foto in attesa' : ' foto in attesa') : '';
  const wr = $('qe-wrap').getBoundingClientRect();
  const aw = Math.min(wr.width || (window.innerWidth || 390) - 24, 608), ah = wr.height || (window.innerHeight || 844) - 230;
  const cssW = Math.max(120, Math.min(aw, ah * c.width / c.height));
  ed.dpr = Math.min(window.devicePixelRatio || 1, 2); ed.cv = cv; ed.photo = c;
  cv.style.width = Math.round(cssW) + 'px'; cv.style.height = Math.round(cssW * c.height / c.width) + 'px';
  cv.width = Math.round(cssW * ed.dpr); cv.height = Math.round(cssW * c.height / c.width * ed.dpr); ed.k = cv.width / c.width;
  ed.quad = job.quad ? denormQuad(job.quad, c.width, c.height) : defaultQuad(c.width, c.height);
  ed.orig = ed.quad.map(p => p.slice()); ed.drag = -1; drawEditor();
}
function closeQEdit(){ $('qedge').hidden = true; if (ed.cv === $('qe-cv')){ ed.quad = null; ed.drag = -1; ed.cv = null; } qeJob = null; }
$('qedge').addEventListener('click', ev => {
  const b = ev.target.closest('[data-qe]'); if (!b || !qeJob || !ed.quad) return;
  const a = b.dataset.qe, job = qeJob;
  if (a === 'reset'){ ed.quad = ed.orig.map(p => p.slice()); drawEditor(); }
  else if (a === 'later'){ job.later = true; closeQEdit(); renderQuick(); }
  else if (a === 'discard'){ closeQEdit(); dropJob(job); edgeNext(); }
  else if (a === 'ok'){
    const src = ed.photo, quad = ed.quad.map(p => p.slice());
    let cr; try { cr = cropFrom(src, quad); } catch(e){ toast('Ritaglio non riuscito'); return; }
    Object.assign(job, cr, {quad:normQuad(quad, src.width, src.height), status:'queued', ok:true, msg:'', rec:null, later:false, uncropped:false});
    jobSave(job); closeQEdit(); renderQuick(); if (!qPaused) runQueue(); edgeNext();
  }
});
function finishReview(id){''')

open(p,'w',encoding='utf-8').write(s)
open('/home/claude/app.js','w',encoding='utf-8').write(re.search(r'<script>\n(.*)</script>',s,re.S).group(1))
print('ok')
