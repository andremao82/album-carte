# Allineamento del sito all'app nativa (20/10/2026), parte 2:
# Collezione come la nativa (fascia dei valori, ricerca a capsula, ordina, griglia/elenco, pillole Lingua/Set/Doppioni/Senza prezzo,
# celle con prezzo e lingua · variante, righe con chip), scheda carta come la nativa (lingua/variante/condizione a pillole, il tuo esemplare
# con prezzo mio, storico col grafico nuovo, dettagli con Pokémon/Set/Artista, menu "…"), immagine a tutto schermo,
# foto mie delle carte (IndexedDB, scelta dell'anteprima, nel backup) e anteprima con il numero sulle iniziali.
import re
p='/mnt/user-data/outputs/album-carte-pokemon.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(old[:100],s.count(old))
    s=s.replace(old,new)
def rep_between(start,end,new):
    global s
    assert s.count(start)==1,('start',start[:80],s.count(start))
    i=s.index(start); j=s.index(end,i+len(start))
    s=s[:i]+new+s[j:]

CSS = r'''
/* Collezione */
.art .nn{position:absolute;left:0;right:0;bottom:11%;text-align:center;font-style:normal;font-size:.62rem;font-weight:600;color:var(--ph-ink)}
.mrow .art .nn,.vrow2 .art .nn,.st .art .nn,.sm .nn{display:none}
.art img{z-index:1}
.ctools{margin:14px 0 0}
.ctools .vsw{background:var(--surface);box-shadow:none;border:0}
.ctools .vsw::after{display:none}
#c-chips{margin:12px -16px 12px}
#list.grid .item .art{box-shadow:0 8px 18px var(--shadow)}
#list.grid .item .chk{top:auto;left:auto;right:6px;bottom:6px;background:rgba(11,20,38,.55);border-color:#fff}
.selmode #list.grid .item:not(.picked) .art{opacity:.7}
.crow{display:flex;align-items:baseline;justify-content:space-between;gap:4px;margin-top:5px;min-width:0}
.crow .val{margin:0;font-size:.82rem;font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums}
.crow .meta{font-size:.6rem!important;font-weight:600;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#list:not(.grid) .item{align-items:center;border:0;border-radius:16px;margin-bottom:8px}
#list:not(.grid) .item .art.sm{width:52px}
.erow .body{display:flex;flex-direction:column;gap:3px}
.erow .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.erow .meta{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.erow .chips2{display:flex;gap:5px;flex-wrap:wrap}
.erow .er{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:2px;font-variant-numeric:tabular-nums}
.erow .er b{font-size:1rem}
.erow .er span{font-size:.75rem;color:var(--muted)}
.cfoot{text-align:center;margin:10px 0 0}
#fpanel{margin:-4px 0 12px}
/* scheda carta */
.cd-top .rbtn .fill{fill:currentColor;stroke:none}
.cd-stage{padding:10px 0 0}
.cd-stage::before{width:220px;height:220px;background:var(--accent-soft);filter:blur(50px)}
.cd-card{width:230px;max-width:66%;border-radius:10px;box-shadow:0 18px 36px var(--shadow)}
.cd-card .nn{font-size:.95rem}
.cd-card .art::before,.cd-card::before{font-size:2.6rem}
.cd-note{margin:6px 0 0;text-align:center;font-size:.72rem;color:var(--muted)}
.cd-ph{display:flex;justify-content:center;margin-top:10px}
.cd-ph .pbtn{width:140px;font-size:.78rem}
.cd-ph svg,.pbtn svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.cd-name{margin:12px 0 2px;text-align:center;font-size:1.45rem;font-weight:800;line-height:1.2}
.cd-set{text-align:center;font-size:.78rem;color:var(--muted)}
.cd-rar{text-align:center;margin-top:6px}
.cd-price{margin-top:12px;text-align:center}
.cd-price .v{font-size:2.75rem;font-weight:800;letter-spacing:-.03em;line-height:1.05;font-variant-numeric:tabular-nums}
.cd-price .q{font-size:.78rem;font-weight:600;margin-top:2px}
.cd-price .none{font-size:1.05rem;font-weight:700;color:var(--muted)}
.cd-price .cap{margin-top:4px}
.lbl2{display:flex;align-items:baseline;justify-content:space-between;margin:20px 2px 8px}
.lbl2 b{font-size:.74rem;font-weight:700;letter-spacing:.06em;color:var(--muted)}
.lbl2 span{font-size:.78rem;color:var(--muted)}
.lp,.cp{display:flex;gap:6px}
.lp button,.cp button{flex:1;min-width:0;min-height:38px;padding:0;border:0;border-radius:999px;background:var(--surface);color:var(--ink);font-weight:700;font-size:.92rem}
.cp button{min-height:36px;border-radius:10px;font-size:.78rem}
.lp button[aria-pressed=true],.cp button[aria-pressed=true],.vp button[aria-pressed=true]{background:var(--accent-fill);color:var(--on-accent)}
.vp{display:flex;gap:4px;padding:4px;border-radius:999px;background:var(--surface);overflow-x:auto;scrollbar-width:none}
.vp::-webkit-scrollbar{display:none}
.vp button{flex:none;display:flex;align-items:baseline;gap:4px;padding:9px 12px;border:0;border-radius:999px;background:none;color:var(--ink);font-weight:600;font-size:.9rem;white-space:nowrap}
.vp small{font-size:.75rem;opacity:.8}
.cd-est{margin:8px 4px 0;font-size:.78rem;color:var(--muted)}
.mine{padding:0 14px;margin-top:18px}
.mine .mr{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:52px;border-bottom:1px solid var(--line)}
.mine .mr:last-child{border-bottom:0}
.mine .mr.sub{min-height:40px;font-size:.9rem;color:var(--muted)}
.qctl{display:flex;align-items:center;gap:8px}
.qctl b{min-width:28px;text-align:center;font-size:1.05rem;font-variant-numeric:tabular-nums}
.qb{width:34px;height:34px;border-radius:50%;border:0;padding:0;background:var(--surface2);color:var(--ink);font-size:1.2rem;font-weight:600}
.qb[disabled]{opacity:.4}
.pmw{display:flex;align-items:center;gap:6px;color:var(--muted)}
.pmw input{width:130px;min-height:36px;padding:0 6px;border:0;background:none;color:var(--ink);text-align:right;font-size:1rem;outline:none}
.hist{margin-top:18px}
.hist .hh{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:6px}
.hist .hh b{font-size:1.05rem}
.hist .hh span{font-size:.78rem;font-weight:700}
.hist .hf{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px}
.det{padding:0 14px;margin-top:18px}
.det .dr{display:flex;align-items:center;gap:10px;width:100%;min-height:46px;padding:0;border:0;border-bottom:1px solid var(--line);background:none;color:var(--ink);font:inherit;text-align:left}
.det .dr:last-child{border-bottom:0}
.det .dr span{flex:1}
.det .dr em{font-style:normal;color:var(--muted);max-width:58%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.det .dr i{font-style:normal;color:var(--muted);opacity:.6}
.det .spr{width:30px;height:30px;image-rendering:pixelated;flex:none}
.delc{width:100%;margin-top:18px}
#v-card textarea.note{background:var(--surface);border:0;border-radius:16px}
/* fogli di azioni */
.actsheet{z-index:34;padding:14px 16px calc(14px + env(safe-area-inset-bottom,0px));background:transparent;border:0;box-shadow:none}
#act-back{z-index:33}
.acttitle{margin:0;padding:12px;text-align:center;font-size:.82rem;color:var(--muted);background:var(--surface);border-radius:14px 14px 0 0}
.actbtn{display:block;width:100%;min-height:54px;border:0;border-top:1px solid var(--line);background:var(--surface);color:var(--accent);font-size:1.05rem}
.acttitle+.actbtn{border-top:1px solid var(--line)}
.actsheet>.actbtn:first-child{border-radius:14px 14px 0 0;border-top:0}
.actbtn.last{border-radius:0 0 14px 14px}
.actsheet>.actbtn:first-child.last{border-radius:14px}
.actbtn.danger{color:var(--danger)}
.actbtn.cancel{margin-top:8px;border-radius:14px;border:0;font-weight:700}
.actbtn[disabled]{opacity:.4}
/* immagine a tutto schermo (sempre scura, come la nativa) */
.zoom{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:16px;background:#000;touch-action:none;overflow:hidden}
.zoom[hidden]{display:none}
.zoom img{max-width:100%;max-height:100%;border-radius:14px;transition:transform .22s ease-out;will-change:transform;-webkit-user-select:none;user-select:none;-webkit-user-drag:none}
.zoom.drag img{transition:none}
.zclose{position:absolute;top:calc(env(safe-area-inset-top,0px) + 8px);right:16px;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.16);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);color:#fff;display:grid;place-items:center;padding:0}
.zclose svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round}
@media (prefers-reduced-motion:reduce){.zoom img{transition:none}}
'''
rep('''.setbar .btn{flex:none}
.appear{padding:10px 12px}
''', '''.setbar .btn{flex:none}
.appear{padding:10px 12px}
''' + CSS)

# ---------- markup: Collezione ----------
rep_between('<section id="v-cat" class="view" hidden>', '<section id="v-card" class="view" hidden></section>',
'''<section id="v-cat" class="view" hidden>
  <div class="hdr"><h1>Collezione</h1><button id="btn-select" class="pbtn" type="button">Seleziona</button></div>
  <div class="stats" id="tag"></div>
  <div class="trow ctools">
    <label class="sfield"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><input id="c-q" type="search" placeholder="Nome, set o numero" aria-label="Cerca nella collezione" autocomplete="off" autocapitalize="off" spellcheck="false"><button id="c-qx" class="sclear" type="button" aria-label="Cancella la ricerca" hidden>✕</button></label>
    <span class="cicon" aria-hidden="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16M3.5 7.5L7 4l3.5 3.5M17 20V4M13.5 16.5L17 20l3.5-3.5"/></svg><select id="c-sort" aria-label="Ordina">
      <option value="recent">Più recenti</option>
      <option value="name">Nome</option>
      <option value="value">Valore</option>
      <option value="set">Set</option>
    </select></span>
    <div class="vsw" role="group" aria-label="Vista">
      <button id="v-grid" type="button" aria-label="Griglia" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1.2"/><rect x="14" y="4" width="6" height="6" rx="1.2"/><rect x="4" y="14" width="6" height="6" rx="1.2"/><rect x="14" y="14" width="6" height="6" rx="1.2"/></svg></button>
      <button id="v-list" type="button" aria-label="Elenco" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg></button>
    </div>
  </div>
  <div id="c-chips" class="pbrow scroll" role="group" aria-label="Filtri"></div>
  <div id="fpanel" class="panel" hidden>
    <div class="row"><div class="field"><label for="cf-var">Variante</label><select id="cf-var"></select></div>
      <div class="field"><label for="cf-cond">Condizione</label><select id="cf-cond"></select></div></div>
    <button id="cf-manual" class="pb" type="button" aria-pressed="false">Solo con il mio prezzo</button>
  </div>
  <div id="list"></div>
  <p id="c-foot" class="cap cfoot"></p>
</section>

''')

# ---------- markup: fogli di azioni, tutto schermo, foto della carta; editor dei bordi fuori dalla Scansione rapida ----------
QEDGE = '''  <div id="qedge" class="qedge" hidden>
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
'''
rep(QEDGE, '')
rep('<div id="toast" role="status" aria-live="polite"></div>',
'''<div id="qedge" class="qedge" hidden>
  <p id="qe-msg" class="qe-msg"></p>
  <div id="qe-wrap" class="qe-wrap"><canvas id="qe-cv" class="editor" aria-label="Trascina gli angoli sui bordi della carta"></canvas></div>
  <p id="qe-more" class="muted qe-more" hidden></p>
  <div class="qe-btns">
    <button id="qe-discard" class="btn danger" type="button" data-qe="discard">Scarta</button>
    <button class="btn" type="button" data-qe="reset">Ripristina</button>
    <button class="btn primary" type="button" data-qe="ok">Conferma</button>
  </div>
  <button id="qe-later" class="btn small" type="button" data-qe="later">Più tardi</button>
</div>
<div id="zoom" class="zoom" role="dialog" aria-label="Immagine della carta" hidden><img id="zoom-img" alt=""><button class="zclose" type="button" data-z="close" aria-label="Chiudi"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
<div id="act-back" class="sheet-back" hidden></div>
<div id="act-sheet" class="sheet actsheet" role="dialog" hidden></div>
<input id="ph-file" type="file" accept="image/*" hidden>
<div id="toast" role="status" aria-live="polite"></div>''')

# ---------- JS: foto mie, anteprima, miniature ----------
rep_between("const artHtml = (e, extra) =>", "const catView = () =>",
r"""/* ---------- foto mie delle carte (come l'app nativa): ritaglio e foto intera in IndexedDB ('pkm_photos'), ritaglio anche in memoria ----------
   Anteprima: se ho scelto (photoPref) vale la scelta: "own" = mia foto, "web" = immagine da internet (se manca, la foto).
   Automatico: immagine ufficiale nella lingua della carta > mia foto > immagine inglese di ripiego > iniziali. */
const photoCache = new Map(), photoOrig = new Set();   // ritagli in memoria; id con la foto intera (per rifare il ritaglio)
const PH_SCHEME = 'photo:';
const validPhotoId = id => typeof id === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(id);
const newPhotoId = () => { try { if (crypto && crypto.randomUUID) return crypto.randomUUID().toUpperCase(); } catch(e){} return ('P' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)).toUpperCase(); };
function phOpen(){ return new Promise((res, rej) => { const r = indexedDB.open('pkm_photos', 1); r.onupgradeneeded = () => r.result.createObjectStore('p', {keyPath:'id'}); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function phRun(mode, fn){
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await phOpen();
    return await new Promise((res, rej) => { const tx = db.transaction('p', mode), out = fn(tx.objectStore('p')); tx.oncomplete = () => { db.close(); res(out && out.result !== undefined ? out.result : true); }; tx.onerror = () => rej(tx.error); });
  } catch(e){ return null; }
}
const photoExists = id => validPhotoId(id) && photoCache.has(id);
async function photoWrite(crop, orig, id = newPhotoId()){
  if (!validPhotoId(id) || !crop) return null;
  const r = await phRun('readwrite', st => st.put({id, crop, orig:orig || null}));
  if (r == null) return null;
  photoCache.set(id, crop); if (orig) photoOrig.add(id); else photoOrig.delete(id); return id;
}
async function photoGetOrig(id){ if (!validPhotoId(id)) return null; const r = await phRun('readonly', st => st.get(id)); return (r && r.orig) || null; }
async function photoRemove(id){ if (!validPhotoId(id)) return; photoCache.delete(id); photoOrig.delete(id); await phRun('readwrite', st => st.delete(id)); }
// foto usate dal catalogo e dalla copia automatica (che si può ripristinare); le altre si cancellano all'avvio
function photoIdsInUse(){
  const ids = new Set(catalog.map(e => e.photo).filter(Boolean));
  try { const b = JSON.parse(localStorage.getItem('pkm_catalog_bak') || 'null'); for (const e of (b ? JSON.parse(b.raw) : [])) if (e && e.photo) ids.add(e.photo); } catch(e){}
  return ids;
}
async function loadPhotos(){
  const list = await phRun('readonly', st => st.getAll());
  for (const x of (Array.isArray(list) ? list : [])) if (x && validPhotoId(x.id) && x.crop){ photoCache.set(x.id, x.crop); if (x.orig) photoOrig.add(x.id); }
  if (!catalogProblem){ const keep = photoIdsInUse(); for (const x of (Array.isArray(list) ? list : [])) if (x && !keep.has(x.id)) await photoRemove(x.id); }
  if (photoCache.size) refreshViews();
}
const hasOfficialImage = e => !!e.img && e.imgFrom !== 'EN';
function showsOwnPhoto(e){
  if (!photoExists(e.photo)) return false;
  if (e.photoPref === 'own') return true;
  if (e.photoPref === 'web') return !e.img;     // scelta internet ma l'immagine non c'è: meglio la foto che le iniziali
  return !hasOfficialImage(e);                  // automatico: l'ufficiale vince, la foto vince sul ripiego inglese
}
const previewURL = e => showsOwnPhoto(e) ? PH_SCHEME + e.photo : (e.img || '');
const imgSrc = u => !u ? '' : String(u).startsWith(PH_SCHEME) ? (photoCache.get(String(u).slice(PH_SCHEME.length)) || '') : u;
const webImageLabel = e => hasOfficialImage(e) ? 'Usa l’immagine ufficiale' : 'Usa l’immagine inglese';
// la carta scelta non ha immagine nella sua lingua: conviene tenere la foto scattata
const wantsOwnPhoto = c => !(c && c.images && c.images.small);
const flatQuad = q => Array.isArray(q) && q.length === 4 ? q.reduce((a, p) => a.concat([+p[0], +p[1]]), []) : null;
const pointsQuad = f => Array.isArray(f) && f.length === 8 ? [[f[0], f[1]], [f[2], f[3]], [f[4], f[5]], [f[6], f[7]]] : null;
// foto dalla coda: si mette solo se la voce non ha già un'immagine ufficiale o una foto
async function attachPhoto(key, crop, orig, quad){
  const e = entryByKey(key); if (!e || !crop || hasOfficialImage(e) || photoExists(e.photo)) return false;
  const id = await photoWrite(crop, orig || null); if (!id) return false;
  const e2 = entryByKey(key); if (!e2) return false;
  e2.photo = id; e2.photoQuad = flatQuad(quad); save(); refreshViews(); return true;
}
// nuovo scatto o nuovo ritaglio dalla scheda: la foto diventa l'anteprima scelta
async function replacePhoto(key, src, quad, keepOrig){
  let crop, orig;
  try { crop = warp(src, insetQuad(orderQuad(quad, false), 0.008), 756, 1056, false).toDataURL('image/jpeg', 0.9); orig = keepOrig || keepPhoto(src); } catch(e){ return false; }
  const id = await photoWrite(crop, orig); if (!id) return false;
  const e = entryByKey(key); if (!e) return false;   // il file vecchio resta fino al prossimo avvio: un annulla non perde la foto
  e.photo = id; e.photoQuad = flatQuad(normQuad(quad, src.width, src.height)); e.photoPref = 'own'; save(); return true;
}
function setPhotoPref(key, pref){ const e = entryByKey(key); if (e && (pref === 'own' || pref === 'web')){ e.photoPref = pref; save(); } }
function removePhoto(key){ const e = entryByKey(key); if (!e) return; delete e.photo; delete e.photoQuad; delete e.photoPref; save(); }
// miniatura: anteprima (ufficiale, foto mia o inglese) oppure iniziali e numero
const artHtml = (e, extra, inner) => { const u = imgSrc(previewURL(e));
  return '<span class="art' + (extra || '') + holoCls(e) + '" data-ini="' + esc(iniOf(e.name)) + '">' + (e.number ? '<em class="nn">' + esc(e.number) + '</em>' : '') + (u ? '<img src="' + esc(u) + '" alt="" loading="lazy">' : '') + (inner || '') + '</span>'; };
const shortVariant = v => v === 'Reverse holo' ? 'Reverse' : v === '1st edition' ? '1st ed.' : v;
const numLine = (n, t) => t ? n + '/' + t : n;
const setLine = (sn, n, t) => n ? sn + ' · ' + numLine(n, t) : sn;
""")

# ---------- JS: Collezione ----------
rep_between("/* ---------- catalogo ---------- */", "$('list').addEventListener('click', ev => {",
r"""/* ---------- Collezione (come la nativa) ---------- */
const ALBUM_SORTS = ['recent', 'name', 'value', 'set'];
const albumSort = () => ALBUM_SORTS.includes(cfg.albumSort) ? cfg.albumSort : 'recent';
const numOf = e => parseInt(String(e.number).replace(/\D/g, ''), 10) || 0;
function matchesQuery(e, q){
  if (!q) return true;
  return e.name.toLowerCase().includes(q) || (e.setName || '').toLowerCase().includes(q) || String(e.number).toLowerCase() === q ||
    String(e.ill || '').toLowerCase().includes(q) || String(e.note || '').toLowerCase().includes(q);
}
function sortAlbum(list, sort){
  const line = e => { const u = unit(e); return u == null ? -1 : u * e.qty; };
  return list.sort(sort === 'value' ? (a, b) => line(b) - line(a)
    : sort === 'name' ? (a, b) => a.name.localeCompare(b.name, 'it', {sensitivity:'base'})
    : sort === 'set' ? (a, b) => (a.setName || '').localeCompare(b.setName || '') || numOf(a) - numOf(b)
    : (a, b) => (b.added || 0) - (a.added || 0));
}
function entryRow(e, chk){
  const u = unit(e), ch = changeInfo(e), chips = ['<span class="chip2">' + esc(e.lang) + '</span>'];
  if (e.variant !== 'Normale') chips.push('<span class="chip2 o">' + esc(e.variant) + '</span>');
  if (e.cond !== 'NM') chips.push('<span class="chip2 b">' + esc(e.cond) + '</span>');
  if (e.qty > 1) chips.push('<span class="chip2 g">×' + e.qty + '</span>');
  return (chk || '') + artHtml(e, ' sm') + '<div class="body"><div class="nm">' + esc(e.name) + '</div><div class="meta">' + esc(setLine(e.setName, e.number, e.total)) + '</div><div class="chips2">' + chips.join('') + '</div></div>' +
    '<div class="er">' + (u != null ? '<b>' + eur(u * e.qty) + '</b>' + (e.qty > 1 ? '<span>' + eur(u) + ' cad.</span>' : '') +
      (ch != null && Math.abs(ch) >= 0.5 ? '<span style="color:' + (ch >= 0 ? 'var(--ok)' : 'var(--danger)') + ';font-weight:600">' + signedPct(ch) + '</span>' : '') : '<span>—</span>') + '</div>';
}
function renderCatalog(){
  const st = homeStats(), vs = eur(st.val), any = catalog.length > 0;
  $('tag').hidden = !any; $('btn-select').hidden = !any;
  $('tag').innerHTML = '<div><span class="k">Valore stimato</span><span class="v a' + sizeCls(vs, 9, 12) + '">' + vs + '</span>' + (st.miss ? '<span class="x warn">' + st.miss + ' senza prezzo</span>' : '') + '</div>' +
    '<div><span class="k">Carte</span><span class="v">' + fmtN(st.n) + '</span></div><div><span class="k">Diverse</span><span class="v">' + fmtN(distinctCount()) + '</span></div>';
  const q = $('c-q').value.trim().toLowerCase(), sort = albumSort();
  $('c-qx').hidden = !q; $('c-sort').value = sort;
  fillFilters();
  const list = sortAlbum(catalog.filter(e => matchesQuery(e, q) && passesFilters(e)), sort);
  catList = list;
  const grid = catView() === 'grid';
  $('list').className = grid ? 'grid' : '';
  $('v-grid').setAttribute('aria-pressed', String(grid)); $('v-list').setAttribute('aria-pressed', String(!grid));
  const n = list.length;
  $('c-foot').textContent = !any || !n ? '' : n === catalog.length ? n + (n === 1 ? ' voce' : ' voci') : n + ' di ' + catalog.length + ' voci';
  if (!any){ $('list').innerHTML = '<div class="empty2">' + ICON_STACK + '<b>Nessuna carta</b><p>Tocca il tasto giallo in basso per fotografare la prima.</p></div>'; return; }
  if (!n){ $('list').innerHTML = '<div class="empty2">' + ICON_SEARCH + '<b>Nessuna carta trovata</b><p>Cambia la ricerca o i filtri.</p></div>'; return; }
  $('list').innerHTML = list.map(e => {
    const u = unit(e), on = selKeys.has(e.key), chk = selMode ? '<span class="chk' + (on ? ' on' : '') + '"></span>' : '';
    if (grid) return '<button class="item' + (on ? ' picked' : '') + '" type="button" data-open="' + esc(e.key) + '" aria-label="' + esc(e.name + ', ' + (u != null ? eur(u) : 'senza prezzo')) + '">' +
      artHtml(e, '', (e.qty > 1 ? '<b class="qty">×' + e.qty + '</b>' : '') + chk) +
      '<span class="crow"><span class="val">' + (u != null ? eur(u) : '— €') + '</span><span class="meta">' + esc(e.lang + ' · ' + (e.variant !== 'Normale' ? shortVariant(e.variant) : e.cond)) + '</span></span></button>';
    return '<button class="item erow' + (on ? ' picked' : '') + '" type="button" data-open="' + esc(e.key) + '">' + entryRow(e, chk) + '</button>';
  }).join('');
}
/* filtri: Lingua e Set a menu, Doppioni e Senza prezzo (come la nativa); variante, condizione e prezzo mio in "Altri filtri" */
const cf = {lang:'', set:'', dup:false, noprice:false, variant:'', cond:'', manual:false};
function passesFilters(e){
  if (cf.lang && e.lang !== cf.lang) return false;
  if (cf.set && groupKey(e) !== cf.set) return false;
  if (cf.dup && !(e.qty > 1)) return false;
  if (cf.noprice && unit(e) != null) return false;
  if (cf.variant && e.variant !== cf.variant) return false;
  if (cf.cond && e.cond !== cf.cond) return false;
  if (cf.manual && e.priceManual == null) return false;
  return true;
}
const anyFilter = () => !!(cf.lang || cf.set || cf.dup || cf.noprice || cf.variant || cf.cond || cf.manual);
function clearFilters(){ Object.assign(cf, {lang:'', set:'', dup:false, noprice:false, variant:'', cond:'', manual:false}); }
function fillFilters(){
  const names = new Map(); for (const e of catalog){ const k = groupKey(e); if (!names.has(k)) names.set(k, (e.setName || 'Set') + (e.srcLang ? ' · ' + (LANGMAP[e.srcLang] || '') : '')); }
  const langs = LANGS.filter(l => catalog.some(e => e.lang === l));
  if (cf.lang && !langs.includes(cf.lang)) cf.lang = '';
  if (cf.set && !names.has(cf.set)) cf.set = '';
  const sets = [...names.keys()].sort((a, b) => names.get(a).localeCompare(names.get(b)));
  const more = !!(cf.variant || cf.cond || cf.manual);
  $('c-chips').innerHTML = '<button class="pb" type="button" data-qf="all" aria-pressed="' + !anyFilter() + '">Tutte</button>' +
    '<span class="pb menu" aria-pressed="' + !!cf.lang + '"><span>' + esc(cf.lang ? LANGN[cf.lang] || cf.lang : 'Lingua') + '</span><select id="cf-lang" aria-label="Lingua"><option value="">Tutte le lingue</option>' + langs.map(l => '<option value="' + l + '"' + (cf.lang === l ? ' selected' : '') + '>' + esc(LANGN[l] || l) + '</option>').join('') + '</select></span>' +
    '<span class="pb menu" aria-pressed="' + !!cf.set + '"><span>' + esc(cf.set ? names.get(cf.set) : 'Set') + '</span><select id="cf-set" aria-label="Set"><option value="">Tutti i set</option>' + sets.map(k => '<option value="' + esc(k) + '"' + (cf.set === k ? ' selected' : '') + '>' + esc(names.get(k)) + '</option>').join('') + '</select></span>' +
    '<button class="pb" type="button" data-qf="dup" aria-pressed="' + cf.dup + '">Doppioni</button>' +
    '<button class="pb" type="button" data-qf="noprice" aria-pressed="' + cf.noprice + '">Senza prezzo</button>' +
    '<button class="pb" type="button" data-qf="more" aria-pressed="' + more + '" aria-expanded="' + !$('fpanel').hidden + '">Altri filtri</button>';
  const by = fn => { const m = new Map(); for (const e of catalog){ const k = fn(e); m.set(k, (m.get(k) || 0) + e.qty); } return m; };
  const V = by(e => e.variant), C = by(e => e.cond);
  if (cf.variant && !V.has(cf.variant)) cf.variant = '';
  if (cf.cond && !C.has(cf.cond)) cf.cond = '';
  $('cf-var').innerHTML = optHtml('Tutte', V, k => k, cf.variant, VARS);
  $('cf-cond').innerHTML = optHtml('Tutte', C, k => { const c = CONDS.find(x => x[0] === k); return c ? c[0] + ' – ' + c[1] : k; }, cf.cond, CONDS.map(c => c[0]));
  $('cf-manual').setAttribute('aria-pressed', String(cf.manual));
}
function optHtml(label, m, nameOf, cur, order){
  const keys = [...m.keys()].sort((a, b) => order ? (order.indexOf(a) < 0 ? 99 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 99 : order.indexOf(b)) || String(a).localeCompare(String(b)) : String(nameOf(a)).localeCompare(String(nameOf(b))));
  return '<option value="">' + label + '</option>' + keys.map(k => '<option value="' + esc(k) + '"' + (k === cur ? ' selected' : '') + '>' + esc(nameOf(k)) + ' (' + m.get(k) + ')</option>').join('');
}
$('c-chips').addEventListener('click', ev => {
  const b = ev.target.closest('[data-qf]'); if (!b) return;
  const v = b.dataset.qf;
  if (v === 'all'){ clearFilters(); $('fpanel').hidden = true; }
  else if (v === 'more') $('fpanel').hidden = !$('fpanel').hidden;
  else cf[v] = !cf[v];
  renderCatalog();
});
$('c-chips').addEventListener('change', ev => { const t = ev.target; if (t.id === 'cf-lang') cf.lang = t.value; else if (t.id === 'cf-set') cf.set = t.value; else return; renderCatalog(); });
$('cf-var').addEventListener('change', () => { cf.variant = $('cf-var').value; renderCatalog(); });
$('cf-cond').addEventListener('change', () => { cf.cond = $('cf-cond').value; renderCatalog(); });
$('cf-manual').addEventListener('click', () => { cf.manual = !cf.manual; renderCatalog(); });
$('c-q').addEventListener('input', renderCatalog);
$('c-qx').addEventListener('click', () => { $('c-q').value = ''; renderCatalog(); $('c-q').focus(); });
$('c-sort').addEventListener('change', () => { cfg.albumSort = $('c-sort').value; LS.set('pkm_cfg', cfg); renderCatalog(); });
// vista a griglia o a elenco, ricordata fra un avvio e l'altro
[['v-grid', 'grid'], ['v-list', 'list']].forEach(([id, v]) => $(id).addEventListener('click', () => {
  if (catView() === v) return; cfg.catView = v; LS.set('pkm_cfg', cfg); renderCatalog();
}));
""")

# ---------- JS: scheda carta (al posto di renderCard e dei vecchi grafici) ----------
rep_between("function chartSvg(e){", "const fmtDay = d => {", "")
rep_between("// serie nel tempo: serve almeno 3 rilevazioni distribuite su almeno 3 giorni\nfunction histChartSvg(e){", "const ICON_BACK =", "")
rep_between("function renderCard(){", "/* Navigazione a pila:",
r"""const ICON_MORE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="fill" cx="5" cy="12" r="1.8"/><circle class="fill" cx="12" cy="12" r="1.8"/><circle class="fill" cx="19" cy="12" r="1.8"/></svg>';
const ICON_CAMERA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
const LANGN = {IT:'Italiano', EN:'Inglese', JP:'Giapponese', Altro:'Altro'};
const lbl2 = (t, right) => '<div class="lbl2"><b>' + esc(t.toUpperCase()) + '</b>' + (right ? '<span>' + esc(right) + '</span>' : '') + '</div>';
function sourceLine(e, info){
  const p = [];
  if (e.priceManual != null) p.push('Prezzo mio');
  else if (info) p.push(info.src === 'cm' ? 'Cardmarket' : 'TCGplayer' + (info.approx ? ' circa' : ''));
  p.push(shortVariant(e.variant)); p.push(e.cond);
  return p.join(' · ');
}
function imgNote(e){
  if (showsOwnPhoto(e)) return 'La tua foto';
  if (e.imgFrom === 'EN' && e.lang !== 'EN' && e.img) return 'Immagine della versione inglese';
  return '';
}
function renderCard(){
  const e = entryByKey(cardKey);
  if (!e){ leaveCard(); return; }
  const u = unit(e), info = priceInfo(e.pr, e.variant), prev = previewURL(e), art = imgSrc(hiImg(prev) || prev), note = imgNote(e);
  const pts = (hist[histKey(e)] || []).filter(q => q.length >= 2).map(q => ({day:q[0], value:q[1] / 100}));
  const condName = (CONDS.find(c => c[0] === e.cond) || [0, e.cond])[1];
  let h = '<div class="cd-top"><button class="rbtn glass" type="button" data-a="back" aria-label="Indietro">' + ICON_BACK + '</button><div class="ttl"></div>' +
    '<button class="rbtn glass" type="button" data-a="menu" aria-label="Altre azioni">' + ICON_MORE + '</button></div>' +
    '<div class="cd-stage"><div id="cd-tilt" class="cd-card art' + holoCls(e) + '" data-ini="' + esc(iniOf(e.name)) + '"' + (art ? ' role="button" tabindex="0" aria-label="Ingrandisci l’immagine"' : '') + '>' +
      (e.number ? '<em class="nn">' + esc(e.number) + '</em>' : '') + (art ? '<img id="cd-img" src="' + esc(art) + '" alt="' + esc(e.name) + '">' : '') + '</div></div>' +
    (reduceMotion() ? '' : '<p class="cd-hint">Trascina il dito sulla carta per inclinarla</p>') +
    (note ? '<p class="cd-note">' + esc(note) + '</p>' : '') +
    '<div class="cd-ph"><button class="pbtn" type="button" data-a="photo">' + ICON_CAMERA + (photoExists(e.photo) ? 'Foto' : 'Aggiungi foto') + '</button></div>' +
    '<div class="cd-name">' + esc(e.name) + '</div><div class="cd-set">' + esc(setLine(e.setName, e.number, e.total)) + '</div>' +
    (e.rarity ? '<div class="cd-rar"><span class="chip2 p">' + esc(e.rarity) + '</span></div>' : '') +
    '<div class="cd-price">' + (u != null ? '<div class="v">' + eur(u) + '</div>' + (e.qty > 1 ? '<div class="q">×' + e.qty + ' = ' + eur(u * e.qty) + '</div>' : '') : '<div class="none">Senza prezzo</div>') +
      '<div class="cap">' + esc(sourceLine(e, info)) + '</div></div>' +
    lbl2('Lingua', LANGN[e.lang] || e.lang) + '<div class="lp" role="group" aria-label="Lingua">' + LANGS.map(l => '<button type="button" data-ed="lang" data-v="' + l + '" aria-pressed="' + (e.lang === l) + '" aria-label="' + esc(LANGN[l] || l) + '">' + esc(l) + '</button>').join('') + '</div>' +
    lbl2('Variante') + '<div class="vp" role="group" aria-label="Variante">' + variantList(e.pr && e.pr.vars, e.variant).map(v => { const i = priceInfo(e.pr, v);
      return '<button type="button" data-ed="variant" data-v="' + esc(v) + '" aria-pressed="' + (e.variant === v) + '">' + esc(shortVariant(v)) + (i ? '<small>' + eur(i.v) + '</small>' : '') + '</button>'; }).join('') + '</div>' +
    lbl2('Condizione', condName) + '<div class="cp" role="group" aria-label="Condizione">' + CONDS.map(c => '<button type="button" data-ed="cond" data-v="' + c[0] + '" aria-pressed="' + (e.cond === c[0]) + '" aria-label="' + esc(c[1]) + '">' + c[0] + '</button>').join('') + '</div>' +
    (e.condEst && e.condNote ? '<p class="cd-est">✦ Stimata dalla foto: ' + esc(e.condNote) + '</p>' : '') +
    '<div class="pnl mine"><div class="mr"><span>Quantità</span><span class="qctl"><button class="qb" type="button" data-a="qminus" aria-label="Una in meno"' + (e.qty <= 1 ? ' disabled' : '') + '>−</button><b>' + e.qty + '</b><button class="qb" type="button" data-a="qplus" aria-label="Una in più">+</button></span></div>' +
      '<div class="mr"><label for="cd-pm">Prezzo mio</label><span class="pmw"><input id="cd-pm" inputmode="decimal" autocomplete="off" placeholder="non impostato" value="' + (e.priceManual != null ? e.priceManual.toFixed(2).replace('.', ',') : '') + '">€</span></div>' +
      (info ? '<div class="mr sub"><span>Mercato (Near Mint)</span><span>' + eur(info.v) + (info.approx ? ' circa' : '') + '</span></div>' : '') +
      (e.priceManual == null && e.price != null && e.cond !== 'NM' ? '<div class="mr sub"><span>Con la condizione ' + esc(e.cond) + '</span><span>' + eur(u) + '</span></div>' : '') + '</div>';
  { let hd = ''; if (pts.length >= 2){ const a = pts[0], b = pts[pts.length - 1], d = b.value - a.value; hd = '<span style="color:' + (d >= 0 ? 'var(--ok)' : 'var(--danger)') + '">' + (d >= 0 ? '▲ ' : '▼ ') + signed(d) + ' in ' + Math.max(1, b.day - a.day) + ' gg</span>'; }
    h += '<div class="pnl hist"><div class="hh"><b>Storico prezzo</b>' + hd + '</div>' +
      (pts.length >= 2 ? areaChart(pts, 150, 'Storico del prezzo') : '<p class="cap" style="margin:4px 0">Lo storico si riempie con gli aggiornamenti dei prezzi.</p>') +
      '<div class="hf">' + (e.priceT ? '<span class="cap">Aggiornato il ' + fmtDate(e.priceT) + '</span>' : '<span></span>') + '<button class="lnk" type="button" data-a="refresh">Aggiorna il prezzo</button></div></div>'; }
  { const dex = Array.isArray(e.dex) ? [...new Set(e.dex)].sort((a, b) => a - b) : [];
    h += '<div class="pnl det">' + dex.map(n => '<button class="dr" type="button" data-dex="' + n + '"><img class="spr" src="' + SPRITE(n) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'"><span>' + esc(dexName(n) || 'Pokémon') + '</span><em>#' + n + '</em><i>›</i></button>').join('') +
      '<button class="dr" type="button" data-a="set"><span>Set</span><em>' + esc(e.setName) + '</em><i>›</i></button>' +
      (e.ill ? '<button class="dr" type="button" data-art="' + esc(e.ill) + '"><span>Artista</span><em>' + esc(e.ill) + '</em><i>›</i></button>' : '') +
      (e.cat ? '<div class="dr"><span>Categoria</span><em>' + esc(e.cat === 'Pokemon' ? 'Pokémon' : e.cat) + '</em></div>' : '') +
      (e.tt ? '<div class="dr"><span>Tipo</span><em>' + esc(e.tt) + '</em></div>' : '') +
      '<div class="dr"><span>Aggiunta il</span><em>' + fmtDate(e.added) + '</em></div></div>'; }
  h += lbl2('Note') + '<textarea id="cd-note" class="note" placeholder="Una nota su questa carta">' + esc(e.note || '') + '</textarea>' +
    '<button class="btn danger delc" type="button" data-a="del">Elimina carta</button>';
  $('v-card').innerHTML = h;
  const im = $('cd-img'), low = imgSrc(prev);
  if (im) im.onerror = () => { if (low && im.getAttribute('src') !== low) im.src = low; else { im.onerror = null; im.remove(); $('cd-tilt').removeAttribute('role'); } };
  bindTilt($('cd-tilt'), () => { const i = $('cd-img'); if (i) openZoom(i.getAttribute('src'), e.name); });
}
// menu della foto: scegliere l'anteprima, ritagliare, scattare o eliminare la foto (come la nativa)
let phKey = null;
function photoMenu(e){
  const has = photoExists(e.photo), own = showsOwnPhoto(e), key = e.key, items = [];
  if (has && own && e.img) items.push({t:webImageLabel(e), fn:() => { setPhotoPref(key, 'web'); renderCard(); }});
  if (has && !own) items.push({t:'Usa la mia foto', fn:() => { setPhotoPref(key, 'own'); renderCard(); }});
  if (has && photoOrig.has(e.photo)) items.push({t:'Ritaglia la foto', fn:() => cropOwnPhoto(key)});
  items.push({t:has ? 'Riscatta la foto' : 'Scatta una foto', fn:() => { phKey = key; $('ph-file').click(); }});
  if (has) items.push({t:'Elimina la foto', danger:true, fn:() => { removePhoto(key); renderCard(); }});
  actionSheet(null, items);
}
async function cropOwnPhoto(key){
  const e = entryByKey(key); if (!e || !photoExists(e.photo)) return;
  const orig = await photoGetOrig(e.photo); if (!orig){ toast('La foto intera non è disponibile'); return; }
  let c; try { c = await urlToCanvas(orig); } catch(err){ toast('Foto non leggibile'); return; }
  const q = pointsQuad(e.photoQuad), quad = q ? denormQuad(q, c.width, c.height) : detectCard(c).quad;
  openPhotoEdit(c, quad, (src, qd) => savePhotoFor(key, src, qd, orig), 'Annulla');
}
async function savePhotoFor(key, src, quad, keepOrig){
  const ok = await replacePhoto(key, src, quad, keepOrig);
  if (!ok) toast('Foto non salvata'); else if (!$('v-card').hidden && cardKey === key) renderCard();
}
$('ph-file').addEventListener('change', async ev => {
  const f = ev.target.files[0], key = phKey; ev.target.value = ''; if (!f || !key) return;
  let c; try { c = await loadPhoto(f); } catch(err){ toast(err.message || 'Foto non leggibile'); return; }
  openPhotoEdit(c, detectCard(c).quad, (src, qd) => savePhotoFor(key, src, qd, null), 'Annulla');
});
// foglio di azioni (come i menu della nativa)
let actItems = [];
function actionSheet(title, items){
  actItems = items;
  $('act-sheet').innerHTML = (title ? '<p class="acttitle">' + esc(title) + '</p>' : '') + items.map((it, i) => '<button class="actbtn' + (it.danger ? ' danger' : '') + (i === items.length - 1 ? ' last' : '') + '" type="button" data-act="' + i + '"' + (it.dis ? ' disabled' : '') + '>' + esc(it.t) + '</button>').join('') +
    '<button class="actbtn cancel" type="button" data-act="x">Annulla</button>';
  $('act-back').hidden = false; $('act-sheet').hidden = false;
}
function closeAct(){ $('act-back').hidden = true; $('act-sheet').hidden = true; }
$('act-back').addEventListener('click', closeAct);
$('act-sheet').addEventListener('click', ev => { const b = ev.target.closest('[data-act]'); if (!b) return; closeAct(); const it = actItems[parseInt(b.dataset.act, 10)]; if (it && it.fn) it.fn(); });
/* immagine a tutto schermo: pizzico fino a 5×, doppio tocco 1×/2,5×, trascinamento quando è ingrandita;
   a 1× trascinando in alto o in basso oltre 120 px si chiude; tasto ✕ (come la nativa) */
const ZOOM_MAX = 5, ZOOM_DOUBLE = 2.5, ZOOM_CLOSE = 120;
const zoomClamp = v => Math.min(Math.max(v, 1), ZOOM_MAX);
const zoomShouldClose = (scale, dy) => scale <= 1.01 && Math.abs(dy) > ZOOM_CLOSE;
const zoomBackdrop = (scale, dy) => scale > 1.01 ? 1 : Math.max(0.35, 1 - Math.abs(dy) / 400);
const zm = {s:1, bs:1, x:0, y:0, bx:0, by:0, pts:new Map(), d0:1, pinch:false, sx:0, sy:0, moved:0, lastTap:0};
function zoomApply(){
  $('zoom-img').style.transform = 'translate(' + zm.x.toFixed(1) + 'px,' + zm.y.toFixed(1) + 'px) scale(' + zm.s.toFixed(3) + ')';
  $('zoom').style.backgroundColor = 'rgba(0,0,0,' + zoomBackdrop(zm.s, zm.y).toFixed(2) + ')';
}
function zoomReset(){ Object.assign(zm, {s:1, bs:1, x:0, y:0, bx:0, by:0}); zoomApply(); }
function openZoom(src, name){
  if (!src) return;
  $('zoom-img').src = src; $('zoom-img').alt = name ? 'Immagine di ' + name : 'Immagine della carta';
  zm.pts.clear(); zm.pinch = false; zoomReset(); $('zoom').hidden = false;
}
function closeZoom(){ $('zoom').hidden = true; zm.pts.clear(); }
{
  const z = $('zoom'), dist2 = () => { const [a, b] = [...zm.pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  z.addEventListener('pointerdown', ev => {
    if (ev.target.closest('[data-z]')) return;
    zm.pts.set(ev.pointerId, {x:ev.clientX, y:ev.clientY}); try { z.setPointerCapture(ev.pointerId); } catch(err){}
    z.classList.add('drag');
    if (zm.pts.size === 1){ zm.sx = ev.clientX; zm.sy = ev.clientY; zm.moved = 0; zm.bx = zm.x; zm.by = zm.y; zm.pinch = false; }
    else if (zm.pts.size === 2){ zm.d0 = dist2(); zm.bs = zm.s; zm.pinch = true; }
  });
  z.addEventListener('pointermove', ev => {
    if (!zm.pts.has(ev.pointerId)) return;
    zm.pts.set(ev.pointerId, {x:ev.clientX, y:ev.clientY});
    if (zm.pts.size >= 2){ zm.s = zoomClamp(zm.bs * dist2() / zm.d0); }
    else {
      const dx = ev.clientX - zm.sx, dy = ev.clientY - zm.sy; zm.moved = Math.max(zm.moved, Math.hypot(dx, dy));
      if (zm.pinch) return;
      if (zm.s > 1.01){ zm.x = zm.bx + dx; zm.y = zm.by + dy; } else { zm.x = 0; zm.y = dy; }
    }
    zoomApply();
  });
  const end = ev => {
    if (!zm.pts.has(ev.pointerId)) return;
    zm.pts.delete(ev.pointerId);
    if (zm.pts.size === 1){ const [p] = [...zm.pts.values()]; zm.sx = p.x; zm.sy = p.y; zm.bx = zm.x; zm.by = zm.y; return; }
    if (zm.pts.size) return;
    z.classList.remove('drag');
    if (zm.pinch){ zm.bs = zm.s; if (zm.s <= 1.01) zoomReset(); zm.pinch = false; return; }
    if (ev.type === 'pointerup' && zm.moved < 8){
      const now = Date.now();
      if (now - zm.lastTap < 320){ zm.lastTap = 0; if (zm.s > 1.01) zoomReset(); else { zm.s = zm.bs = ZOOM_DOUBLE; zm.x = zm.y = 0; zoomApply(); } return; }
      zm.lastTap = now; return;
    }
    if (zoomShouldClose(zm.s, zm.y)){ closeZoom(); return; }
    if (zm.s > 1.01){ zm.bx = zm.x; zm.by = zm.y; } else { zm.x = 0; zm.y = 0; zoomApply(); }
  };
  ['pointerup', 'pointercancel'].forEach(n => z.addEventListener(n, end));
  z.addEventListener('click', ev => { if (ev.target.closest('[data-z="close"]')) closeZoom(); });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !z.hidden) closeZoom(); });
}
""")
rep_between("$('v-card').addEventListener('click', async ev => {", "/* ---------- set: avanzamento della collezione ---------- */",
r"""$('v-card').addEventListener('click', async ev => {
  if (ev.target.closest('svg[data-chart]')) return;
  const e = entryByKey(cardKey); if (!e) return;
  const ed = ev.target.closest('[data-ed]');
  if (ed){ if (e[ed.dataset.ed] !== ed.dataset.v){ applyEdit(e, {[ed.dataset.ed]:ed.dataset.v}); renderCard(); } return; }
  const dx = ev.target.closest('[data-dex]'); if (dx){ pushView('dexd', {kind:'pokemon', n:parseInt(dx.dataset.dex, 10)}); return; }
  const ar = ev.target.closest('[data-art]'); if (ar){ pushView('dexd', {kind:'art', name:ar.dataset.art}); return; }
  const b = ev.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a;
  const del = () => { if (!confirm('Eliminare questa carta?')) return; pushUndo(); catalog = catalog.filter(x => x !== e); save(); leaveCard(); showUndo('Eliminata: ' + e.name); };
  if (a === 'back') leaveCard();
  else if (a === 'del') del();
  else if (a === 'qplus'){ e.qty = Math.min(999, e.qty + 1); save(); renderCard(); }
  else if (a === 'qminus'){ if (e.qty > 1){ e.qty--; save(); renderCard(); } }
  else if (a === 'refresh'){ b.disabled = true; b.textContent = 'Aggiorno…'; await refreshOne(e); }
  else if (a === 'photo') photoMenu(e);
  else if (a === 'set') pushView('setd', {key:groupKey(e)});
  else if (a === 'menu'){
    const items = [{t:'Aggiorna il prezzo', fn:() => refreshOne(e)}];
    if (e.priceManual != null) items.push({t:'Torna al prezzo di mercato', fn:() => { e.priceManual = null; save(); renderCard(); }});
    items.push({t:'Elimina carta', danger:true, fn:del});
    actionSheet(null, items);
  }
});
$('v-card').addEventListener('keydown', ev => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.id === 'cd-tilt'){ const i = $('cd-img'); if (i){ ev.preventDefault(); openZoom(i.getAttribute('src'), (entryByKey(cardKey) || {}).name); } } });
$('v-card').addEventListener('change', ev => {
  const e = entryByKey(cardKey); if (!e) return;
  const t = ev.target;
  if (t.id === 'cd-note'){ const v = t.value.trim(); if (v !== (e.note || '')){ e.note = v; save(); } }
  else if (t.id === 'cd-pm'){
    const raw = t.value.trim();
    if (!raw){ if (e.priceManual != null){ e.priceManual = null; save(); renderCard(); } return; }
    const v = parsePrice(raw);
    if (v == null){ toast('Prezzo non valido'); return; }
    if (v !== e.priceManual){ e.priceManual = v; save(); toast('Prezzo salvato'); renderCard(); }
  }
});

""")
# unione dei doppioni: stesso testo della nativa
rep("    if (!confirm('Hai già questa carta con le stesse caratteristiche (' + other.qty + '×). Unire le due voci?')) return false;",
    "    if (!confirm('Esiste già una carta uguale. Nel catalogo ne hai già ' + other.qty + '. Vuoi sommare le quantità in un’unica voce?')) return false;")

# ---------- inclinazione: il tocco senza trascinare apre il tutto schermo (anche con Riduci movimento) ----------
rep_between("function bindTilt(el){", "const needsReview = () =>",
r"""function bindTilt(el, onTap){
  if (!el) return false;
  const still = reduceMotion();
  if (!still) el.classList.add('tilt');
  let on = false, sx = 0, sy = 0, moved = 0;
  const at = ev => { const r = el.getBoundingClientRect(); if (r.width && r.height) tiltAt(el, (ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height); };
  el.addEventListener('pointerdown', ev => { on = true; sx = ev.clientX; sy = ev.clientY; moved = 0; try { el.setPointerCapture(ev.pointerId); } catch(err){} if (!still) at(ev); });
  el.addEventListener('pointermove', ev => { if (on) moved = Math.max(moved, Math.hypot(ev.clientX - sx, ev.clientY - sy)); if (!still && (on || ev.pointerType === 'mouse')) at(ev); });
  el.addEventListener('pointerup', () => { const tap = on && moved < 8; on = false; tiltReset(el); if (tap && onTap) onTap(); });
  ['pointercancel', 'pointerleave', 'lostpointercapture'].forEach(n => el.addEventListener(n, () => { on = false; tiltReset(el); }));
  return !still;
}
""")

# ---------- selezione multipla: barra come la nativa ----------
rep("""function updateSelBar(){
  $('selbar').hidden = !(selMode && !$('v-cat').hidden);
  $('sel-n').textContent = selKeys.size + (selKeys.size === 1 ? ' selezionata' : ' selezionate');
  $('btn-select').textContent = selMode ? 'Fine' : 'Seleziona';
}""","""function updateSelBar(){
  $('selbar').hidden = !(selMode && !$('v-cat').hidden);
  $('sel-n').textContent = selKeys.size ? selKeys.size + (selKeys.size === 1 ? ' selezionata' : ' selezionate') : 'Seleziona le carte';
  $('sel-all').textContent = catList.length && selKeys.size >= catList.length ? 'Nessuna' : 'Tutte';
  $('sel-edit').disabled = $('sel-del').disabled = !selKeys.size;
  $('btn-select').textContent = selMode ? 'Fine' : 'Seleziona';
}""")
rep("$('sel-all').addEventListener('click', () => { catList.forEach(e => selKeys.add(e.key)); renderCatalog(); updateSelBar(); });",
    "$('sel-all').addEventListener('click', () => { if (catList.length && selKeys.size >= catList.length) selKeys.clear(); else catList.forEach(e => selKeys.add(e.key)); renderCatalog(); updateSelBar(); });")
rep("  if (!$('v-cat').hidden) renderCatalog();\n  if (!$('v-sets').hidden) renderSets();",
    "  if (!$('v-cat').hidden) renderCatalog();\n  if (!$('v-value').hidden) renderValue();\n  if (!$('v-sets').hidden) renderSets();")

# ---------- editor dei bordi anche per le foto della scheda ----------
rep("""async function openQEdit(job){
  if (!job.photo){ toast('La foto originale non è più disponibile'); return; }
  qeJob = job;
  let c; try { c = await urlToCanvas(job.photo); } catch(e){ qeJob = null; toast(e.message); return; }
  if (qeJob !== job) return;
  const box = $('qedge'), cv = $('qe-cv'); box.hidden = false;
  $('qe-msg').textContent = job.status === 'edges' ? (job.ok ? 'Controlla i bordi, poi conferma.' : 'Non trovo bene i bordi: trascina gli angoli sulla carta, poi conferma.') : 'Trascina gli angoli sui bordi della carta e conferma: la carta verrà letta di nuovo.';
  qeMore();
""","""async function openQEdit(job){
  if (!job.photo){ toast('La foto originale non è più disponibile'); return; }
  qeJob = job;
  let c; try { c = await urlToCanvas(job.photo); } catch(e){ qeJob = null; toast(e.message); return; }
  if (qeJob !== job) return;
  $('qe-discard').textContent = 'Scarta'; $('qe-later').hidden = false;
  $('qedge').hidden = false;
  $('qe-msg').textContent = job.status === 'edges' ? (job.ok ? 'Controlla i bordi, poi conferma.' : 'Non trovo bene i bordi: trascina gli angoli sulla carta, poi conferma.') : 'Trascina gli angoli sui bordi della carta e conferma: la carta verrà letta di nuovo.';
  qeMore();
  qeLayout(c, job.quad ? denormQuad(job.quad, c.width, c.height) : defaultQuad(c.width, c.height));
}
// foto di una carta della collezione (scatto o nuovo ritaglio): stesso editor, con "Annulla"
function openPhotoEdit(c, quad, onOk, discardLabel){
  qeJob = {photoMode:true, onOk};
  $('qe-discard').textContent = discardLabel || 'Annulla'; $('qe-later').hidden = true; $('qe-more').hidden = true;
  $('qedge').hidden = false; $('qe-msg').textContent = 'Trascina gli angoli sui bordi della carta, poi conferma.';
  qeLayout(c, quad);
}
function qeLayout(c, quad){
  const cv = $('qe-cv');
""")
rep("""  ed.quad = job.quad ? denormQuad(job.quad, c.width, c.height) : defaultQuad(c.width, c.height);
  ed.orig = ed.quad.map(p => p.slice()); ed.drag = -1; drawEditor();""",
"""  ed.quad = quad.map(p => p.slice());
  ed.orig = ed.quad.map(p => p.slice()); ed.drag = -1; drawEditor();""")
rep("""function qeMore(){
  const more""", """function qeMore(){
  if (qeJob && qeJob.photoMode) return;
  const more""")
rep("""  const a = b.dataset.qe, job = qeJob;
  if (a === 'reset'){""", """  const a = b.dataset.qe, job = qeJob;
  if (job.photoMode){
    if (a === 'reset'){ ed.quad = ed.orig.map(p => p.slice()); drawEditor(); }
    else if (a === 'discard') closeQEdit();
    else if (a === 'ok'){ const src = ed.photo, quad = ed.quad.map(p => p.slice()); closeQEdit(); job.onOk(src, quad); }
    return;
  }
  if (a === 'reset'){""")

# ---------- coda: la foto della scansione resta come anteprima delle carte senza immagine ----------
rep("""  const key = [c.id, lang, variant, cond].join('|'), existed = catalog.some(x => x.key === key);
  addEntryFromCandidate(c, lang, variant, cond, 1, null, est ? {condEst:1, condNote:est.notes} : {});""",
"""  const key = [c.id, lang, variant, cond].join('|'), existed = catalog.some(x => x.key === key);
  addEntryFromCandidate(c, lang, variant, cond, 1, null, est ? {condEst:1, condNote:est.notes} : {});
  if (wantsOwnPhoto(c)) attachPhoto(key, job.raw || job.crop, job.photo, job.quad);""")
rep("""  addEntryFromCandidate(c, lang, variant, cond, qty, pm, est && cond === est.code ? {condEst:1, condNote:est.notes} : {});
  toast('Aggiunta al catalogo');""","""  const key = addEntryFromCandidate(c, lang, variant, cond, qty, pm, est && cond === est.code ? {condEst:1, condNote:est.notes} : {});
  if (rj && wantsOwnPhoto(c)){ const j = qJobs.find(x => x.id === rj); if (j) attachPhoto(key, j.raw || j.crop, j.photo, j.quad); }
  toast('Aggiunta al catalogo');""")

# ---------- backup e ripristino con le foto (stesso formato della nativa: photos = {id: {crop, orig}} in base64) ----------
rep("""async function doBackup(){
  if (!catalog.length){ toast('Il catalogo è vuoto'); return; }
  const p = download('backup-carte-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({v:DATA_VERSION, saved:new Date().toISOString(), condCoef:cfg.condCoef || COND_DEFAULT, hist, vhist, catalog}), 'application/json');""",
"""const b64Of = du => String(du || '').replace(/^data:[^,]*,/, '');
async function backupPhotos(){
  const ids = new Set(catalog.map(e => e.photo).filter(photoExists)); if (!ids.size) return null;
  const rows = await phRun('readonly', st => st.getAll()), origs = new Map((Array.isArray(rows) ? rows : []).map(r => [r.id, r.orig]));
  const out = {}; for (const id of ids){ const o = {crop:b64Of(photoCache.get(id))}; if (origs.get(id)) o.orig = b64Of(origs.get(id)); out[id] = o; }
  return out;
}
async function restorePhotos(ph){
  if (!ph || typeof ph !== 'object') return 0; let n = 0;
  for (const id of Object.keys(ph)){ const x = ph[id]; if (!validPhotoId(id) || !x || typeof x.crop !== 'string' || !x.crop) continue;
    if (await photoWrite('data:image/jpeg;base64,' + x.crop, typeof x.orig === 'string' && x.orig ? 'data:image/jpeg;base64,' + x.orig : null, id)) n++; }
  return n;
}
async function doBackup(){
  if (!catalog.length){ toast('Il catalogo è vuoto'); return; }
  const data = {v:DATA_VERSION, saved:new Date().toISOString(), condCoef:cfg.condCoef || COND_DEFAULT, hist, vhist, catalog}, ph = await backupPhotos();
  if (ph) data.photos = ph;
  const p = download('backup-carte-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(data), 'application/json');""")
rep("""    snapshotIfDue(true); catalog = d.catalog.map(normalizeEntry).filter(Boolean);""",
    """    snapshotIfDue(true); await restorePhotos(d.photos); catalog = d.catalog.map(normalizeEntry).filter(Boolean);""")
rep("$('btn-bakwarn').addEventListener('click', doBackup);\n", "")

# ---------- avvio: carica le foto mie ----------
rep("askPersist();\nif (!LS.get('pkm_bkstat', null))", "askPersist();\nloadPhotos();\nif (!LS.get('pkm_bkstat', null))")

# ---------- "Aggiorna tutti i prezzi" passa nelle Impostazioni (come la nativa) ----------
rep("""    <div class="srow2"><span class="ico gray"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M16 7.5c0-1.9-1.8-3-4-3s-4 1.1-4 3 1.8 2.6 4 3 4 1.1 4 3-1.8 3-4 3-4-1.1-4-3"/></svg></span><span class="lbl">Cambio dollaro-euro</span><span id="fxstate" class="suf" style="margin:0;text-align:right"></span></div>
  </div>""","""    <div class="srow2"><span class="ico gray"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M16 7.5c0-1.9-1.8-3-4-3s-4 1.1-4 3 1.8 2.6 4 3 4 1.1 4 3-1.8 3-4 3-4-1.1-4-3"/></svg></span><span class="lbl">Cambio dollaro-euro</span><span id="fxstate" class="suf" style="margin:0;text-align:right"></span></div>
    <button id="btn-refresh" class="srow2 act" type="button"><span class="ico green"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg></span><span id="refresh-lbl" class="lbl">Aggiorna tutti i prezzi</span></button>
  </div>""")
rep("""  const prog = () => { btn.textContent = 'Aggiorno… ' + done + '/' + totalN; };""", """  const prog = () => { $('refresh-lbl').textContent = 'Aggiorno ' + done + ' di ' + totalN + '…'; };""")
rep("""  btn.disabled = false; btn.textContent = 'Aggiorna i prezzi';""", """  btn.disabled = false; $('refresh-lbl').textContent = 'Aggiorna tutti i prezzi';""")

open(p,'w',encoding='utf-8').write(s)
open('/home/claude/app.js','w',encoding='utf-8').write(re.search(r'<script>\n(.*)</script>',s,re.S).group(1))
print('ok')
