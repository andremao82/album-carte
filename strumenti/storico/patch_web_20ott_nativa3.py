# Allineamento del sito all'app nativa (20/10/2026), parte 3:
# Progressi come la nativa (riepilogo con anello e ambito Iniziati / Ufficiali / Tutti, pillole In corso / Completati / Tutti i set,
# righe con barra), dettaglio del set con testata nativa, Pokédex come la nativa (schede, numero grande con percentuale,
# avviso delle carte da leggere, sezioni per generazione, Allenatori / Energie / Artisti a elenco) e dettaglio Pokédex
# (le tue carte, poi tutte le carte: tue fuori elenco in testa, possedute, mancanti; confronto anche con gli id della Pokémon TCG API).
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
/* Progressi */
.ssum{margin-top:0;padding:18px;display:flex;flex-direction:column;gap:14px}
.ssr{display:flex;align-items:center;gap:16px}
.ssl{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.ssn{display:flex;align-items:baseline;gap:6px;white-space:nowrap}
.ssn b{font-size:2.9rem;font-weight:800;color:var(--accent);line-height:1;font-variant-numeric:tabular-nums}
.ssn b.l{font-size:2.2rem}.ssn b.xl{font-size:1.7rem}
.ssn span{font-size:1.6rem;font-weight:700;color:var(--muted);font-variant-numeric:tabular-nums}
.ssc{font-size:.92rem;font-weight:500}
.ring2{position:relative;flex:none;width:88px;height:88px}
.ring2 svg{display:block;width:88px;height:88px;transform:rotate(-90deg)}
.ring2 .rb{fill:none;stroke:var(--surface2);stroke-width:10}
.ring2 .rf{fill:none;stroke:var(--accent-fill);stroke-width:10;stroke-linecap:round}
.ring2 b{position:absolute;inset:0;display:grid;place-items:center;font-size:1.05rem;font-weight:800}
.ssum .pbrow{margin:0}
.ssum .pb{background:var(--surface2)}
.ssum .pb[aria-pressed=true]{background:var(--accent-fill)}
#sets-tools{margin-top:14px}
#sets-tools .pbrow{margin:12px 0}
.sdh{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:2px 0 10px}
.sdh .sdl{min-width:0}
.sdh .sdl img{display:block;max-height:52px;max-width:96px;object-fit:contain}
.sdh .sdr{text-align:right}
.sdh .sdr b{display:block;font-size:1.25rem}
.scell.own .n{color:var(--accent);font-weight:700}
.scell .im i{font-size:1.2rem;font-weight:800}
.elist .item{align-items:center;border:0;border-radius:16px;margin-bottom:8px}
.elist .item .art.sm{width:52px}
/* Pokédex */
.dtabs{display:flex;gap:6px;margin:0 0 16px}
.dtabs button{flex:1;min-width:0;padding:9px 0;border:0;border-radius:999px;background:var(--surface);color:var(--ink);font-weight:600;font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dtabs button[aria-pressed=true]{background:var(--accent-fill);color:var(--on-accent)}
.dstat{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
.dstat .n{display:flex;align-items:baseline;gap:8px;white-space:nowrap}
.dstat .n b{font-size:3.5rem;font-weight:800;color:var(--accent);line-height:1;font-variant-numeric:tabular-nums}
.dstat .n span{font-size:2rem;font-weight:700;color:var(--muted)}
.dstat .l{font-size:.92rem;color:var(--muted)}
.dstat .pc{margin-top:2px;padding:6px 14px;border-radius:999px;font-weight:700;font-size:.9rem;color:var(--ok);background:color-mix(in srgb,var(--ok) 16%,transparent)}
.dstat .tbar{align-self:stretch;margin-top:6px}
.dfill{display:flex;align-items:center;gap:10px;margin-top:14px;padding:12px;border-radius:14px}
.dfill>span{flex:1;font-size:.85rem}
.dfill .tbar{margin-top:6px}
.dtools{display:flex;gap:8px;margin-top:14px}
.dtools .pb{background:var(--surface)}
.gsec{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:18px 2px 8px}
.gsec h2{margin:0;font-size:1.05rem}
.gsec span{font-size:.78rem;color:var(--muted)}
.dgrid{gap:8px}
.dcell{padding:8px;border-radius:14px;border:0;gap:3px}
.dcell.own{box-shadow:inset 0 0 0 1.5px var(--accent-line);border:0}
.dcell .dn{margin-left:0;font-size:.68rem;font-weight:600}
.dcell img{width:58px;height:58px}
.dcell b{font-size:.8rem}
.dcell .cn{font-size:.68rem}
.dcell.own .cn{font-weight:700}
.lhead{margin:18px 4px 8px;font-size:.82rem;font-weight:600;color:var(--muted)}
.lst{padding:0 14px;margin-top:0}
.lrow{display:flex;align-items:center;gap:10px;width:100%;min-height:48px;padding:0;border:0;border-bottom:1px solid var(--line);background:none;color:var(--ink);font:inherit;text-align:left}
.lrow:last-child{border-bottom:0}
.lrow span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lrow em{font-style:normal;color:var(--muted)}
.lrow i{font-style:normal;color:var(--muted);opacity:.6}
.lrow svg{flex:none;width:18px;height:18px;fill:none;stroke:var(--muted);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.dspr{text-align:center;margin:-4px 0 4px}
.dspr img{width:120px;height:120px;image-rendering:pixelated}
.dlnote{margin:10px 2px 0;font-size:.82rem;color:var(--muted)}
'''
rep('''.zoom{position:fixed;''', CSS.strip('\n') + '\n.zoom{position:fixed;')

# ---------- markup: Progressi ----------
rep_between('<section id="v-sets" class="view" hidden>', '<div id="browse" hidden>',
'''<section id="v-sets" class="view" hidden>
  <div class="hdr"><h1>Progressi</h1></div>
  <div id="sets-global"></div>
  <div id="sets-tools">
    <label class="sfield"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><input id="ss-q" type="search" placeholder="Cerca un set" aria-label="Cerca un set" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
    <div id="ss-filter" class="pbrow" role="group" aria-label="Filtro"></div>
  </div>
  <div id="sets-list"></div>
  <button id="btn-browse" class="btn" type="button" style="width:100%;margin-top:6px">Sfoglia tutti i set</button>
  ''')

# ---------- JS: Progressi ----------
rep_between("function setRow(g, o){", "async function renderBrowse(){",
r"""/* ---------- Progressi (come la nativa): riepilogo ad anello con ambito, pillole e righe dei set ---------- */
const SET_SCOPES = [['started', 'Iniziati', 'carte nei set iniziati'], ['official', 'Ufficiali', 'carte ufficiali di tutti i set'], ['all', 'Tutti', 'carte di tutti i set, segrete incluse']];
const setsScope = () => SET_SCOPES.some(x => x[0] === cfg.setsScope) ? cfg.setsScope : 'all';
let setsFilter = 'open';
const isComplete = g => { const t = totalOf(g); return t > 0 && g.nums.size >= t; };
// carte ufficiali del set (col numero stampato sul totale, senza segrete)
const officialOf = g => { const m = metaOf(g); return m && m.official > 0 ? m.official : g.official; };
// carte possedute con numero da 1 al totale ufficiale (segrete e numeri con lettere restano fuori)
const officialHave = (g, off) => [...g.nums].filter(n => /^\d+$/.test(n) && +n >= 1 && +n <= off).length;
// started: solo i set che hai; official / all: anche i set mai iniziati dell'elenco italiano di TCGdex
function setsSummary(scope){
  const s = {have:0, total:0, started:0, complete:0, sets:0}, startedIT = new Set();
  for (const g of groupSets()){
    s.started++; if (g.td && g.lang === 'it' && g.setId) startedIT.add(g.setId);
    const t = scope === 'official' ? officialOf(g) : totalOf(g); if (!(t > 0)) continue;
    const h = scope === 'official' ? officialHave(g, t) : Math.min(g.nums.size, t);
    s.total += t; s.have += h; s.sets++; if (h >= t) s.complete++;
  }
  if (scope !== 'started' && tdMeta.it) for (const [id, m] of tdMeta.it){
    if (startedIT.has(id)) continue;
    const t = scope === 'official' ? (m.official || 0) : (m.total || m.official || 0);
    if (t > 0){ s.total += t; s.sets++; }
  }
  s.pct = s.total > 0 ? s.have / s.total * 100 : 0;
  return s;
}
// una cifra decimale, due sotto l'1% (così "0,02%" non diventa "0,0%")
const setsPercent = p => (p > 0 && p < 1 ? p.toFixed(2) : p.toFixed(1)).replace('.', ',') + '%';
function setsLine(s, scope){
  const comp = s.complete + (s.complete === 1 ? ' completo' : ' completi');
  if (scope === 'started') return s.started + (s.started === 1 ? ' set iniziato' : ' set iniziati') + ' · ' + comp;
  return s.started + (s.started === 1 ? ' iniziato' : ' iniziati') + ' su ' + Math.max(s.sets, s.started) + ' set · ' + comp;
}
function renderSets(){
  const groups = groupSets(), any = catalog.length > 0;
  $('sets-tools').hidden = !any; $('btn-browse').hidden = !any && !browseOn;
  if (!any){
    $('sets-global').innerHTML = '<div class="empty2"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="9.5" y="4" width="5" height="16" rx="1"/><path d="M16.3 5.6l3.4-.9 3 14.6-3.4.9z"/></svg><b>Nessun set</b><p>I set compaiono quando aggiungi delle carte.</p></div>';
    $('sets-list').innerHTML = ''; $('btn-browse').hidden = false; return;
  }
  const sc = setsScope(), st = setsSummary(sc), cap = SET_SCOPES.find(x => x[0] === sc)[2];
  const C = 2 * Math.PI * 39, dash = st.have ? Math.max(1.5, Math.min(st.pct, 100) / 100 * C) : 0, hv = fmtN(st.have);
  $('sets-global').innerHTML = '<div class="pnl ssum"><div class="ssr"><div class="ssl"><div class="ssn"><b class="' + sizeCls(hv + fmtN(st.total), 9, 12).trim() + '">' + hv + '</b><span>/ ' + fmtN(st.total) + '</span></div>' +
    '<div class="ssc">' + esc(cap) + '</div><div class="cap" style="font-size:.88rem">' + esc(setsLine(st, sc)) + '</div></div>' +
    '<div class="ring2" role="img" aria-label="Avanzamento ' + esc(setsPercent(st.pct)) + '"><svg viewBox="0 0 88 88" aria-hidden="true"><circle class="rb" cx="44" cy="44" r="39"/><circle class="rf" cx="44" cy="44" r="39" stroke-dasharray="' + dash.toFixed(1) + ' ' + C.toFixed(1) + '"/></svg><b>' + esc(setsPercent(st.pct)) + '</b></div></div>' +
    '<div class="pbrow eq" role="group" aria-label="Ambito">' + SET_SCOPES.map(x => '<button class="pb" type="button" data-scope="' + x[0] + '" aria-pressed="' + (sc === x[0]) + '">' + x[1] + '</button>').join('') + '</div></div>';
  $('ss-filter').innerHTML = [['open', 'In corso'], ['done', 'Completati'], ['all', 'Tutti i set']].map(f => '<button class="pb" type="button" data-sf="' + f[0] + '" aria-pressed="' + (setsFilter === f[0]) + '">' + f[1] + '</button>').join('');
  const q = $('ss-q').value.trim().toLowerCase();
  const list = groups.filter(g => (setsFilter === 'all' || (setsFilter === 'done') === isComplete(g)) && (!q || g.name.toLowerCase().includes(q))).sort((a, b) => b.last - a.last);
  $('sets-list').innerHTML = list.length ? list.map(setProgressRow).join('') : '<p class="cap" style="margin:8px 4px">' + (setsFilter === 'done' ? 'Nessun set completo, per ora.' : 'Nessun set trovato.') + '</p>';
}
$('sets-global').addEventListener('click', ev => { const b = ev.target.closest('[data-scope]'); if (!b) return; cfg.setsScope = b.dataset.scope; LS.set('pkm_cfg', cfg); renderSets(); });
$('ss-filter').addEventListener('click', ev => { const b = ev.target.closest('[data-sf]'); if (!b) return; setsFilter = b.dataset.sf; renderSets(); });
""")
rep("""      return setRow(og || {key, td:true, lang:l, setId:x.id, name:x.name, official:x.official || 0}, og);""",
    """      return setProgressRow(og || {key, td:true, lang:l, setId:x.id, name:x.name, official:x.official || 0, nums:new Set(), value:0});""")
rep("""function openSetsTab(){
  renderSets();
  const langs = [...new Set(groupSets().filter(g => g.td).map(g => g.lang))];
  loadMeta(langs).then(ch => { if (ch && !$('v-sets').hidden) renderSets(); });""",
"""function openSetsTab(){
  renderSets();
  loadMeta(['it', 'en', 'ja']).then(ch => { if (ch && !$('v-sets').hidden) renderSets(); });""")
rep("$('ss-sort').addEventListener('change', renderSets);\n", "")

# ---------- dettaglio del set: testata come la nativa ----------
rep("""    box.innerHTML = head + '<div class="bigprice"><div class="v">' + g.nums.size + (g.official ? ' / ' + g.official : '') + '</div><div class="own">carte diverse possedute</div>' +
      (g.value ? '<div class="pill flat">Valore: ' + eur(g.value) + '</div>' : '') + '</div>' +
      '<p class="muted" style="text-align:center">L’elenco completo di questo set non è disponibile. Le carte nuove scansionate dal catalogo italiano compariranno qui con tutte le mancanti.</p>' +
      '<div style="margin-top:14px">' + g.entries.map(itemRow).join('') + '</div>';""",
"""    box.innerHTML = head + '<div class="sdh"><span class="sdl"><span class="ini">' + esc(initials(g.name)) + '</span></span><span class="sdr"><b>' + (g.official ? g.nums.size + ' di ' + g.official : g.nums.size + ' carte') + '</b>' + (g.value ? '<span class="cap">' + eur(g.value) + '</span>' : '') + '</span></div>' +
      (g.official ? '<div class="tbar big"><i style="width:' + Math.min(100, g.nums.size / g.official * 100).toFixed(1) + '%"></i></div>' : '') +
      '<p class="cap" style="text-align:center;margin:12px 0">L’elenco completo di questo set non è disponibile: qui ci sono solo le tue carte.</p>' +
      '<div class="elist">' + g.entries.map(e => '<button class="item erow" type="button" data-open="' + esc(e.key) + '">' + entryRow(e) + '</button>').join('') + '</div>';""")
rep("""  box.innerHTML = head + logo +
    '<div class="bigprice"><div class="v">' + ownedN + ' / ' + total + '</div><div class="own">' + pct + '% completato' + (g.qty && g.qty !== ownedN ? ', ' + g.qty + ' carte in tutto' : '') + '</div>' +
    (g.value ? '<div class="pill flat">Valore: ' + eur(g.value) + '</div>' : '') + '</div>' +
    '<div class="prog" style="margin-top:14px"><i style="width:' + pct + '%"></i></div>' +""",
"""  const tot = totalOf(g) || total, have = g.nums.size;
  box.innerHTML = head + '<div class="sdh"><span class="sdl">' + (logo || '<span class="ini">' + esc(initials(g.name)) + '</span>') + '</span><span class="sdr"><b>' + (tot ? have + ' di ' + tot : have + ' carte') + '</b>' + (g.value ? '<span class="cap">' + eur(g.value) + '</span>' : '') + '</span></div>' +
    (tot ? '<div class="tbar big"><i style="width:' + Math.min(100, have / tot * 100).toFixed(1) + '%"></i></div>' : '') +""")
rep("""  const lg = sd.logo || sd.symbol, logo = lg ? '<img class="slogo" src="' + esc(lg) + '.webp" alt="" onerror="this.style.display=\\'none\\'">' : '';""",
    """  const lg = sd.logo || sd.symbol, logo = lg ? '<img src="' + esc(lg) + '.webp" alt="" onerror="this.style.display=\\'none\\'">' : '';""")
rep("""      return '<button class="scell ' + (es ? 'own' : 'miss') + '" type="button" data-cid="' + esc(c.id) + '" data-n="' + esc(c.localId) + '"><span class="im">' +
        (c.image ? '<img src="' + esc(c.image) + '/low.webp" alt="' + esc(c.name) + '" loading="lazy">' : '<i>' + esc(c.name) + '</i>') + (q ? '<b class="qb">' + q + '×</b>' : '') + '</span><span class="n">' + esc(c.localId) + '</span></button>';""",
"""      const im = c.image ? c.image + '/low.webp' : es ? imgSrc(previewURL(es[0])) : '';
      return '<button class="scell ' + (es ? 'own' : 'miss') + '" type="button" data-cid="' + esc(c.id) + '" data-n="' + esc(c.localId) + '" data-nm="' + esc(c.name) + '" aria-label="' + esc(c.name + ' ' + c.localId) + '"><span class="im">' +
        (im ? '<img src="' + esc(im) + '" alt="" loading="lazy">' : '<i>?</i>') + (q ? '<b class="qb">' + q + '×</b>' : '') + '</span><span class="n">' + esc(c.localId) + '</span></button>';""")
rep("""  if (!confirm('Aggiungere «' + nm + '» (n. ' + n + ') al catalogo? ' + (LANGMAP[g.lang] || 'IT') + ', Near Mint, prima variante disponibile.')) return;""",
    """  if (!confirm('Aggiungere la carta? ' + nm + ' (' + n + ') verrà aggiunta in Near Mint.')) return;""")

# ---------- JS: Pokédex ----------
rep("function updateDexCell(n){ const el = document.querySelector('#dex-grid .dcell[data-n=\"' + n + '\"] .cn'); if (el) el.textContent = cellCount(n); }",
    "function updateDexCell(n){ const el = document.querySelector('#dex-body .dcell[data-n=\"' + n + '\"] .cn'); if (el) el.textContent = cellCount(n); }")
rep_between("function cellCount(n){", "function updateDexCell(n){",
r"""function cellCount(n){
  const d = curDexIdx.get(n), x = d ? ownedDistinct(d.entries) : 0, y = totalFor(n);
  return y !== undefined ? x + '/' + y + ' carte' : x + ' carte';
}
""")
rep_between("function dexNoteHtml(){", "/* ---------- Selezione multipla, modifica in blocco e Annulla ---------- */",
r"""// id delle carte confrontati senza zeri iniziali nei numeri (sv01-025 = sv1-25): vale per TCGdex e Pokémon TCG API
const normCardId = s => String(s || '').toLowerCase().replace(/\d+/g, m => String(parseInt(m, 10)));
const entryMatchIds = e => [e.srcId, e.cardId].filter(Boolean).map(normCardId);
const dexPercent = (have, total) => total > 0 ? (have / total * 100).toFixed(2).replace('.', ',') + '%' : '0,00%';
function dexNoteHtml(){
  if (dexFill.running) return '<span>Leggo Pokémon, categoria e artista dalle tue carte…<span class="tbar" style="display:block"><i style="width:' + (dexFill.done / Math.max(1, dexFill.total) * 100).toFixed(1) + '%"></i></span></span>';
  const p = pendingDex();
  return p ? '<span>' + p + (p === 1 ? ' carta non ancora collegata' : ' carte non ancora collegate') + ' al Pokédex</span><button class="pbtn solid" data-a="fill" type="button">Leggi ora</button>' : '';
}
function renderDexNote(){ const el = $('dex-note'); if (!el) return; const h = dexNoteHtml(); el.innerHTML = h; el.hidden = !h; }
function dexHead(title){
  return '<div class="cd-top"><button class="rbtn glass" type="button" data-a="back" aria-label="Indietro">' + ICON_BACK + '</button><div class="ttl">' + esc(title) + '</div><div style="width:52px;flex:none"></div></div>';
}
const LANG_NAMES = {it:'Italiano', en:'Inglese', ja:'Giapponese'};
const langOptions = () => ['it', 'en', 'ja'].map(l => '<option value="' + l + '"' + (dexLang() === l ? ' selected' : '') + '>' + LANG_NAMES[l] + '</option>').join('');
const ICON_BRUSH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4l6 6-8 8-4-4zM8 14l-3 3c-1 1-1 3 1 3h1l3-3"/></svg>';

/* ---- pagina Pokédex (come la nativa): schede, numero grande, avviso, ricerca e lingua, pillole, sezioni per generazione ---- */
function renderDex(){
  const idx = dexIndex(); curDexIdx = idx;
  const st = dexCat === 'pokemon' ? {have:idx.size, total:DEX_MAX, label:'Pokémon raccolti'}
    : dexCat === 'trainer' ? {have:catalog.filter(e => e.cat === 'Trainer').length, label:'carte Allenatore'}
    : dexCat === 'energy' ? {have:catalog.filter(e => e.cat === 'Energy').length, label:'carte Energia'}
    : {have:new Set(catalog.map(e => e.ill).filter(Boolean)).size, label:'artisti nelle tue carte'};
  const note = dexNoteHtml(), tools = dexCat === 'pokemon' || dexCat === 'artist';
  $('v-dex').innerHTML = '<div class="hdr"><h1>Pokédex</h1></div>' +
    '<div class="dtabs" role="group" aria-label="Categoria">' + DEX_CATS.map(c => '<button type="button" data-cat="' + c[0] + '" aria-pressed="' + (dexCat === c[0]) + '">' + c[1] + '</button>').join('') + '</div>' +
    '<div class="dstat"><div class="n"><b>' + fmtN(st.have) + '</b>' + (st.total ? '<span>/ ' + fmtN(st.total) + '</span>' : '') + '</div><div class="l">' + st.label + '</div>' +
      (st.total ? '<span class="pc">' + dexPercent(st.have, st.total) + '</span><span class="tbar big"><i style="width:' + Math.min(100, st.have / st.total * 100).toFixed(2) + '%"></i></span>' : '') + '</div>' +
    '<div id="dex-note" class="pnl hl dfill"' + (note ? '' : ' hidden') + '>' + note + '</div>' +
    (tools ? '<div class="dtools"><label class="sfield">' + ICON_SEARCH + '<input id="dex-q" type="search" placeholder="' + (dexCat === 'pokemon' ? 'Nome o numero' : 'Cerca') + '" aria-label="Cerca" value="' + esc(dexQ) + '" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
      '<span class="pb menu"><span>' + LANG_NAMES[dexLang()] + '</span><select id="dex-lang" aria-label="Lingua dei totali">' + langOptions() + '</select></span></div>' : '') +
    (dexCat === 'pokemon' ? '<div class="pbrow scroll" role="group" aria-label="Filtro"><button class="pb" type="button" data-g="-1" aria-pressed="' + (dexGen < 0) + '">Tutte</button>' +
      GENS.map((g, i) => '<button class="pb" type="button" data-g="' + i + '" aria-pressed="' + (dexGen === i) + '">Gen ' + g[0] + '</button>').join('') +
      '<button class="pb" type="button" data-f="miss" aria-pressed="' + (dexFilter === 'miss') + '">Mancanti</button><button class="pb" type="button" data-f="own" aria-pressed="' + (dexFilter === 'own') + '">Posseduti</button></div>' : '') +
    '<div id="dex-body"></div>';
  renderDexBody();
  if (dexCat === 'artist') loadIllustrators().then(ch => { if (ch && dexCat === 'artist' && !$('v-dex').hidden) renderDexBody(); }).catch(() => {});
}
function renderDexBody(){ if (dexCat === 'pokemon') renderDexGrid(); else renderDexList(); }
function renderDexGrid(){
  const idx = curDexIdx, q = dexQ.trim().toLowerCase().replace(/^#/, '');
  const gens = q ? GENS : dexGen < 0 ? GENS : [GENS[dexGen]];
  let h = ''; const shown = [];
  for (const g of gens){
    const nums = [];
    for (let n = g[2]; n <= g[3]; n++){
      const d = idx.get(n);
      if (dexFilter === 'own' && !d) continue; if (dexFilter === 'miss' && d) continue;
      if (q && String(n) !== q && !dexName(n).toLowerCase().includes(q)) continue;
      nums.push(n);
    }
    if (!nums.length && q) continue;
    let have = 0; for (let n = g[2]; n <= g[3]; n++) if (idx.has(n)) have++;
    h += '<div class="gsec"><h2>Generazione ' + g[0] + ' · ' + g[1] + '</h2><span>' + have + ' / ' + (g[3] - g[2] + 1) + '</span></div>' +
      (nums.length ? '<div class="dgrid">' + nums.map(n => { const d = idx.get(n);
        return '<button class="dcell ' + (d ? 'own' : 'miss') + '" type="button" data-n="' + n + '"><span class="dn">#' + n + '</span><img src="' + SPRITE(n) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' +
          '<b>' + esc(dexName(n) || '—') + '</b><span class="cn">' + cellCount(n) + '</span></button>'; }).join('') + '</div>'
      : '<p class="cap" style="margin:0 4px">' + (dexFilter === 'miss' ? 'Li hai tutti!' : 'Nessun Pokémon qui, per ora.') + '</p>');
    shown.push(...nums);
  }
  $('dex-body').innerHTML = h || '<div class="empty2">' + ICON_SEARCH + '<b>Nessun Pokémon trovato</b><p>Prova con un altro nome o numero.</p></div>';
  ensureDexTotals(shown);
}
const lrow = (attrs, label, count, icon) => '<button class="lrow" type="button" ' + attrs + '>' + (icon || '') + '<span>' + esc(label) + '</span><em>' + count + '</em><i>›</i></button>';
function renderDexList(){
  const q = dexQ.trim().toLowerCase(), box = $('dex-body'); if (!box) return;
  const pendingCat = catalog.filter(e => e.cat === undefined).length;
  const pend = pendingCat ? '<p class="cap" style="margin:14px 4px 0">' + pendingCat + ' carte non ancora lette.</p>' : '';
  if (dexCat === 'artist'){
    const m = new Map(); for (const e of catalog) if (e.ill) m.set(e.ill, (m.get(e.ill) || 0) + 1);
    let rows = [...m.entries()].map(([name, count]) => ({name, count})).filter(r => !q || r.name.toLowerCase().includes(q)).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    if (q.length >= 2 && illNames) rows = rows.concat(illNames.filter(n => !m.has(n) && n.toLowerCase().includes(q)).slice(0, 40).map(name => ({name, count:0})));
    box.innerHTML = '<div class="lhead">' + rows.length + ' artisti</div>' + (rows.length ? '<div class="pnl lst">' + rows.map(r => lrow('data-art="' + esc(r.name) + '"', r.name, r.count, ICON_BRUSH)).join('') + '</div>'
      : '<p class="cap" style="margin:0 4px">' + (q ? 'Nessun artista trovato.' : 'Gli artisti compaiono dopo la lettura dei dati delle carte.') + '</p>');
    return;
  }
  const cat = dexCat === 'trainer' ? 'Trainer' : 'Energy', all = catalog.filter(e => e.cat === cat);
  let h = '<div class="lhead">' + (cat === 'Trainer' ? 'Allenatori' : 'Energie') + '</div><div class="pnl lst">' + lrow('data-grp="' + cat + '" data-tt=""', cat === 'Trainer' ? 'Tutti gli allenatori' : 'Tutte le energie', all.length) + '</div>';
  if (cat === 'Trainer'){
    const tts = new Map(); for (const e of all) if (e.tt) tts.set(e.tt, (tts.get(e.tt) || 0) + 1);
    if (tts.size) h += '<div class="lhead">Per tipo</div><div class="pnl lst">' + [...tts.keys()].sort().map(t => lrow('data-grp="Trainer" data-tt="' + esc(t) + '"', t, tts.get(t))).join('') + '</div>';
  }
  box.innerHTML = h + pend;
}

/* ---- dettaglio: un Pokémon, un artista o un gruppo di carte (come la nativa) ---- */
async function addFromCard(cid, nm, n){
  const lang = dexLang();
  if (!confirm('Aggiungere la carta? ' + nm + (n ? ' (' + n + ')' : '') + ' verrà aggiunta in Near Mint.')) return false;
  try {
    const d = await tdGet(lang + '/cards/' + encodeURIComponent(cid));
    if (!d) throw new Error('Carta non trovata nel catalogo');
    const cand = fromTcgdex(d, lang);
    pushUndo(); addEntryFromCandidate(cand, LANGMAP[lang] || 'IT', defaultVariant(cand), 'NM', 1, null);
    showUndo('Aggiunta: ' + cand.name); return true;
  } catch(err){ toast(err.message); return false; }
}
// immagine nella griglia: la mia foto se è la sua anteprima, poi quella dell'elenco; se manca e la carta è tua, la sua anteprima
function gridImage(c, mine){
  if (mine && showsOwnPhoto(mine)) return imgSrc(previewURL(mine));
  if (c.image) return c.image + '/low.webp';
  return mine ? imgSrc(previewURL(mine)) : '';
}
async function renderDexDetail(){
  const ctx = curDexCtx, box = $('v-dexd'); if (!ctx) return;
  const isPk = ctx.kind === 'pokemon';
  const title = isPk ? (dexName(ctx.n) || 'Pokémon #' + ctx.n) : ctx.kind === 'art' ? ctx.name : (ctx.tt || (ctx.cat === 'Trainer' ? 'Allenatore' : ctx.cat === 'Energy' ? 'Energia' : 'Pokémon'));
  const mine = isPk ? catalog.filter(e => Array.isArray(e.dex) && e.dex.includes(ctx.n)) : ctx.kind === 'art' ? catalog.filter(e => e.ill === ctx.name) : catalog.filter(e => e.cat === ctx.cat && (!ctx.tt || e.tt === ctx.tt));
  const head = dexHead(title) + (isPk ? '<div class="dspr"><img src="' + SPRITE(ctx.n) + '" alt="" onerror="this.style.visibility=\'hidden\'"></div>' : '') +
    '<div class="lhead">Le tue carte (' + mine.length + ')</div>' + (mine.length ? '<div class="elist">' + mine.map(e => '<button class="item erow" type="button" data-open="' + esc(e.key) + '">' + entryRow(e) + '</button>').join('') + '</div>' : '<p class="cap" style="margin:0 4px">Non hai ancora carte qui.</p>');
  if (ctx.kind === 'grp'){ box.innerHTML = head; return; }
  const lang = dexLang();
  box.innerHTML = head + '<div class="lhead">Tutte le carte</div><p class="cap" style="text-align:center;margin:16px 0"><span class="spin" aria-hidden="true"></span> Carico l’elenco…</p>';
  let cards;
  try { cards = await loadCardList(isPk ? 'pokemon' : 'art', lang, isPk ? ctx.n : ctx.name); }
  catch(e){ if (curDexCtx === ctx) box.innerHTML = head + '<div class="lhead">Tutte le carte</div><p class="cap" style="margin:0 4px">' + esc(e.message) + '</p>'; return; }
  if (curDexCtx !== ctx) return;
  const byId = new Map(); for (const e of mine) for (const k of entryMatchIds(e)) if (!byId.has(k)) byId.set(k, e);
  const ids = new Set(cards.map(c => normCardId(c.id))), seen = new Set();
  const others = mine.filter(e => { const ks = entryMatchIds(e); if (ks.some(k => ids.has(k))) return false; const k0 = ks[0] || e.key; if (seen.has(k0)) return false; seen.add(k0); return true; });
  const ordered = cards.filter(c => byId.has(normCardId(c.id))).concat(cards.filter(c => !byId.has(normCardId(c.id))));
  const ln = LANG_NAMES[lang] || 'questa lingua';
  box.innerHTML = head + '<div class="lhead">Tutte le carte (' + cards.length + '), lingua: ' + esc(LANG_NAMES[lang] || '') + '</div>' +
    (cards.length || others.length ? '<div class="sgrid">' + others.map(e => { const im = imgSrc(previewURL(e));
        return '<button class="scell own" type="button" data-open="' + esc(e.key) + '" aria-label="' + esc(e.name) + '"><span class="im">' + (im ? '<img src="' + esc(im) + '" alt="" loading="lazy">' : '<i>' + esc(iniOf(e.name)) + '</i>') + '</span><span class="n">' + esc(normNum(e.number) + ' · ' + e.lang) + '</span></button>'; }).join('') +
      ordered.map(c => { const m = byId.get(normCardId(c.id)), im = gridImage(c, m);
        return '<button class="scell ' + (m ? 'own' : 'miss') + '" type="button" ' + (m ? 'data-open="' + esc(m.key) + '"' : 'data-cid="' + esc(c.id) + '" data-n="' + esc(c.localId) + '" data-nm="' + esc(c.name) + '"') + ' aria-label="' + esc(c.name + ' ' + c.localId) + '"><span class="im">' + (im ? '<img src="' + esc(im) + '" alt="" loading="lazy">' : '<i>?</i>') + '</span><span class="n">' + esc(c.localId) + '</span></button>'; }).join('') + '</div>' : '<p class="cap" style="margin:0 4px">Nessuna carta trovata nel catalogo.</p>') +
    (others.length ? '<p class="dlnote">' + (others.length === 1 ? 'La prima carta colorata è tua ma non esiste in ' + ln + ': non conta nel totale.' : 'Le prime ' + others.length + ' carte colorate sono tue ma non esistono in ' + ln + ': non contano nel totale.') + '</p>' : '');
}
$('v-dexd').addEventListener('click', async ev => {
  const b = ev.target.closest('[data-a],[data-open],[data-cid]'); if (!b) return;
  const y = window.scrollY, d = b.dataset;
  if (d.a === 'back'){ popView(); return; }
  if (d.open){ pushView('card', {key:d.open}); return; }
  if (d.cid && await addFromCard(d.cid, d.nm || 'carta', d.n)){ await renderDexDetail(); window.scrollTo(0, y); }
});
$('v-dex').addEventListener('click', ev => {
  const b = ev.target.closest('[data-a],[data-g],[data-f],[data-n],[data-cat],[data-grp],[data-art]'); if (!b) return;
  const d = b.dataset;
  if (d.a === 'fill'){ backfillDex(); renderDexNote(); return; }
  if (d.cat){ if (dexCat !== d.cat){ dexCat = d.cat; dexQ = ''; } renderDex(); return; }
  if (d.g != null){ dexGen = parseInt(d.g, 10); renderDex(); return; }
  if (d.f){ dexFilter = dexFilter === d.f ? 'all' : d.f; renderDex(); return; }
  if (d.n) pushView('dexd', {kind:'pokemon', n:parseInt(d.n, 10)});
  else if (d.grp) pushView('dexd', {kind:'grp', cat:d.grp, tt:d.tt || ''});
  else if (d.art) pushView('dexd', {kind:'art', name:d.art});
});
$('v-dex').addEventListener('input', ev => { if (ev.target.id === 'dex-q'){ dexQ = ev.target.value; renderDexBody(); } });
$('v-dex').addEventListener('change', ev => { if (ev.target.id === 'dex-lang'){ cfg.dexLang = ev.target.value; LS.set('pkm_cfg', cfg); illNames = null; renderDex(); } });

""")
rep("""  else if (top.name === 'dexd'){ if (!top.applied){ dexdFilter = 'all'; dexdLimit = 90; top.applied = true; } curDexCtx = top.ctx; go('dexd', true); renderDexDetail(); loadDexNamesAndRefresh(); }""",
    """  else if (top.name === 'dexd'){ curDexCtx = top.ctx; go('dexd', true); renderDexDetail(); loadDexNamesAndRefresh(); }""")

open(p,'w',encoding='utf-8').write(s)
open('/home/claude/app.js','w',encoding='utf-8').write(re.search(r'<script>\n(.*)</script>',s,re.S).group(1))
print('ok')
