# Ridisegno "Vetro olografico" del sito web (20/10/2026): palette Notte blu, barra a 5 posti con il tasto
# giallo di scansione al centro, testate nuove (Home, Catalogo, Set, Pokédex), Catalogo a griglia o elenco,
# scheda carta con pillole e carta che si inclina col dito. Stesse funzioni di prima.
# Sostituzioni mirate: ogni rep() fallisce se il testo cercato non è presente esattamente il numero di volte atteso.
import re
p='/mnt/user-data/outputs/album-carte-pokemon.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(old[:100],s.count(old))
    s=s.replace(old,new)

# ---------- testata e palette ----------
rep('<meta name="theme-color" content="#000000">', '<meta name="theme-color" content="#0B1426">')
rep("""  --bg:#000; --surface:#1B1B1D; --surface2:#2A2A2D; --ink:#fff; --muted:#8E8E93;
  --line:rgba(255,255,255,.08); --accent:#FFD60A; --accent-soft:rgba(255,214,10,.16); --accent-line:rgba(255,214,10,.30);
  --danger:#FF6B62; --ok:#4ADE80;""",
"""  --bg:#0B1426; --surface:#16233D; --surface2:#1E2D4B; --ink:#F2F4F8; --muted:#9AA6BD;
  --line:rgba(255,255,255,.09); --accent:#FFCB05; --accent-soft:rgba(255,203,5,.16); --accent-line:rgba(255,203,5,.40);
  --danger:#FF6B6B; --ok:#30D158; --glass:rgba(28,42,72,.55);""")
# giallo dei grafici, della cornice di scansione e delle icone allineato al nuovo accento
n1 = s.count('#FFD60A'); assert n1 >= 9, n1
s = s.replace('#FFD60A', '#FFCB05')
n2 = s.count('rgba(255,214,10,'); assert n2 >= 2, n2
s = s.replace('rgba(255,214,10,', 'rgba(255,203,5,')

CSS = r"""
/* ---- Vetro olografico (20/10/2026): palette Notte blu, vetro sulle barre, riflessi sulle carte ---- */
h1{font-weight:800}
.glass{background:var(--glass);border:1px solid rgba(255,255,255,.16);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.18),inset 0 0 18px rgba(255,255,255,.03),0 12px 30px rgba(0,0,0,.35)}
.glass::after{background:radial-gradient(120% 90% at 18% 0%,rgba(255,255,255,.12),rgba(255,255,255,0) 55%)}
.btn{font-weight:700}
.btn.solid,.btn.primary.big{color:#1C1C1E;box-shadow:0 6px 16px rgba(255,203,5,.30)}
.tools input{border-radius:999px}
.seg button[aria-pressed=true],.chips .chip[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#1C1C1E;font-weight:800}
.pill.up{background:rgba(48,209,88,.15);border-color:transparent}
.pill.down{background:rgba(255,107,107,.14);border-color:transparent}
.panel,.kv,.item,.srow,.sgroup,.dexcard,.qrow{border-color:var(--line)}

/* segnaposto delle immagini (iniziali) e riflessi olografici */
.art,.tile .im{background:linear-gradient(160deg,#2A3B5F,#16233D)}
.art{position:relative;display:block;aspect-ratio:63/88;border-radius:8px;overflow:hidden}
.art::before,.tile .im::before{content:attr(data-ini);position:absolute;inset:0;display:grid;place-items:center;font-weight:800;font-size:1.3rem;letter-spacing:.04em;color:rgba(255,255,255,.5)}
.art img,.tile .im img{position:relative}
.item .art img{width:100%;height:100%;object-fit:contain;border-radius:0}
.holo::after,.rev::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:2;background-size:260% 260%;background-position:var(--hx,35%) var(--hy,50%)}
.holo::after{background-image:linear-gradient(115deg,transparent 18%,rgba(255,64,160,.26) 30%,rgba(255,214,0,.28) 38%,rgba(40,255,180,.26) 46%,rgba(40,170,255,.28) 54%,rgba(170,80,255,.24) 62%,transparent 74%);mix-blend-mode:color-dodge}
.rev::after{background-image:linear-gradient(115deg,transparent 25%,rgba(255,255,255,.30) 45%,transparent 65%);mix-blend-mode:overlay}
.qty{position:absolute;top:6px;right:6px;z-index:3;padding:2px 7px;border-radius:99px;background:rgba(11,20,38,.62);border:1px solid rgba(255,255,255,.22);color:#fff;font-size:.72rem;font-weight:800}

/* Home */
.hbtns{display:flex;gap:10px}
.home-top .rbtn{width:44px;height:44px}
.home-top .rbtn svg{width:20px;height:20px}
.hero{position:relative;overflow:hidden;display:flex;gap:14px;margin:14px 0 6px;padding:20px;border-radius:28px;background:var(--surface);border:1px solid var(--line)}
.hero::before{content:"";position:absolute;right:-40px;top:-60px;width:220px;height:220px;border-radius:50%;background:var(--accent-soft);filter:blur(40px);pointer-events:none}
.hero>*{position:relative}
.hero .hl{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}
.hero .lbl{font-size:.88rem;font-weight:600;color:var(--muted)}
.hero .tot{font-size:2.75rem;font-weight:800;letter-spacing:-.03em;line-height:1;white-space:nowrap;font-variant-numeric:tabular-nums}
.hero .tot.l{font-size:2.2rem}.hero .tot.xl{font-size:1.8rem}
.hero .pill{align-self:flex-start;margin-top:4px;padding:5px 12px;font-size:.9rem}
.hero .hnote{font-size:.76rem;color:var(--muted);line-height:1.35}
.hero .hr{flex:none;width:86px;border-left:1px solid var(--line);padding-left:14px;display:flex;flex-direction:column;justify-content:space-between;gap:8px}
.hero .hr b{display:block;font-size:1.5rem;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums}
.hero .hr b.a{color:var(--accent)}
.hero .hr span{font-size:.76rem;color:var(--muted);font-weight:600}
.kvt span:first-child{font-size:.88rem}
.kvt span:last-child{white-space:nowrap;font-weight:800;color:var(--ink)}
.movers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:28px}
.movers.one{grid-template-columns:1fr}
.movers .mv{border-radius:22px;padding:14px;background:var(--surface);border:1px solid var(--line);min-width:0}
.movers h2{margin:0 0 6px;font-size:1rem}
.mrow{display:flex;gap:10px;align-items:center;width:100%;padding:7px 0;border:0;background:none;color:inherit;font:inherit;text-align:left}
.mrow .art{width:34px;flex:none;border-radius:5px}
.mrow .art::before{font-size:.6rem}
.mrow .t{min-width:0;display:flex;flex-direction:column}
.mrow b{font-size:.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mrow .t span{font-size:.78rem;font-weight:700;font-variant-numeric:tabular-nums}

/* Catalogo: fascia dei valori, filtri rapidi, barra comandi, griglia */
.stats{position:relative;overflow:hidden;display:grid;grid-template-columns:1.6fr 1fr 1fr;margin:4px 0 14px;border-radius:22px;background:var(--surface);border:1px solid var(--line)}
.stats::before{content:"";position:absolute;left:-40px;top:-60px;width:180px;height:160px;border-radius:50%;background:var(--accent-soft);filter:blur(36px);pointer-events:none}
.stats>div{position:relative;padding:12px 14px;display:flex;flex-direction:column;gap:2px;min-width:0}
.stats>div+div{border-left:1px solid var(--line)}
.stats .k{font-size:.75rem;font-weight:700;color:var(--muted);white-space:nowrap}
.stats .v{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;white-space:nowrap;font-variant-numeric:tabular-nums}
.stats .v.a{color:var(--accent)}
.stats .v.l{font-size:1.2rem}.stats .v.xl{font-size:1rem}
.stats .x{font-size:.72rem;color:var(--muted)}
.qchips{margin:0 -16px 12px;padding:0 16px 2px;gap:8px}
.qchips .chip{min-height:36px}
.cchips{display:contents}
.ctool{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 12px}
.ctool .sortsel{flex:0 1 auto;min-width:0;min-height:38px;padding:0 34px 0 14px!important;border:1px solid var(--line);background-color:transparent;color:var(--ink);font-weight:700;font-size:.92rem;background-position:right 12px center;background-size:16px}
.ctool .rgt{display:flex;align-items:center;gap:8px;flex:none}
.vsw{display:flex;gap:2px;padding:3px;border-radius:999px}
.vsw button{position:relative;z-index:1;width:40px;height:32px;border:0;border-radius:999px;background:none;color:var(--ink);display:grid;place-items:center;padding:0}
.vsw button[aria-pressed=true]{background:var(--accent);color:#1C1C1E}
.vsw svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}
.fsum{margin:-4px 6px 10px;font-size:.85rem;color:var(--muted)}
#list.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px 10px}
#list.grid .item{flex-direction:column;align-items:stretch;gap:3px;padding:0;margin:0;border:0;background:none;border-radius:0;position:relative;min-width:0}
#list.grid .item .art{box-shadow:0 8px 18px rgba(0,0,0,.28);border-radius:9px}
#list.grid .item.picked .art{outline:3px solid var(--accent);outline-offset:2px}
#list.grid .item .nm{font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px}
#list.grid .item .meta{font-size:.7rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#list.grid .item .val{margin:0;font-size:.88rem;font-weight:800}
#list.grid .item .chk{position:absolute;top:6px;left:6px;z-index:3;background:rgba(11,20,38,.6);border-color:#fff}
#list.grid .item .chk.on{background:var(--accent);border-color:var(--accent)}
#list.grid .empty{grid-column:1/-1}
#list .item .art.sm{width:46px;flex:none;align-self:center;border-radius:6px}

/* Scheda carta */
.cd-stage{position:relative;display:grid;place-items:center;padding:10px 0 4px}
.cd-stage::before{content:"";position:absolute;width:60%;aspect-ratio:1;border-radius:50%;background:rgba(255,160,40,.20);filter:blur(50px);pointer-events:none}
.cd-card{width:62%;max-width:260px;border-radius:14px;box-shadow:0 24px 50px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.12) inset;transition:transform .15s ease-out}
.cd-card img{display:block;width:100%;height:100%;object-fit:contain}
.cd-card.tilt{touch-action:none;cursor:grab}
.cd-hint{text-align:center;font-size:.78rem;color:var(--muted);margin:8px 0 0}
.bigprice .v{font-weight:800}
.cpanel{background:var(--surface);border:1px solid var(--line);border-radius:24px;padding:16px;margin-top:18px;display:flex;flex-direction:column;gap:14px}
.cpanel .pl{font-size:.82rem;font-weight:700;color:var(--muted);margin-bottom:8px}
.pills{display:flex;flex-wrap:wrap;gap:6px}
.pills button{min-height:38px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:var(--surface2);color:var(--ink);font-weight:600;font-size:.9rem}
.pills button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#1C1C1E;font-weight:800}
.pills.eq{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:4px}
.pills.eq button{padding:0;border-radius:12px}
.cpanel .qrow2{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line);padding-top:14px}
.cpanel .stepper{margin:0;padding:4px;border-radius:999px;background:var(--surface2);gap:4px}
.cpanel .stepper button{width:44px;height:38px;border:0;background:none}
.cpanel .stepper .q{flex:none;min-width:44px;min-height:38px;background:none;border:0}
.setrow{border-radius:22px}

/* Set e Pokédex */
.shero,.dhero{position:relative;overflow:hidden;padding:20px;border-radius:28px;background:var(--surface);border:1px solid var(--line)}
.shero{display:flex;align-items:center;gap:18px}
.shero::before{content:"";position:absolute;left:-50px;top:-50px;width:200px;height:200px;border-radius:50%;background:var(--accent-soft);filter:blur(40px);pointer-events:none}
.shero>*{position:relative}
.ring{flex:none;width:96px;height:96px}
.ring text{fill:var(--ink);font-size:17px;font-weight:800}
.shero .pl{font-size:.82rem;font-weight:700;color:var(--muted)}
.shero .big,.dhero .big{font-weight:800}
.shero .big em,.dhero .big em{font-style:normal;color:var(--accent)}
.chipsr{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.chipsr span{padding:4px 10px;border-radius:999px;font-size:.8rem;font-weight:700;background:rgba(255,255,255,.08)}
.chipsr span.a{background:var(--accent-soft);color:var(--accent)}
.dhero{margin-top:12px}
.dhero::after{content:"";position:absolute;right:-60px;bottom:-80px;width:220px;height:220px;border-radius:50%;border:26px solid rgba(255,255,255,.04);pointer-events:none}
.dhero>*{position:relative}
.dhero .dtop{align-items:flex-end;margin-bottom:0}
.dhero .big{font-size:2.6rem}

/* Aggiungi: carte da controllare */
.qline{display:flex;align-items:center;gap:12px;width:100%;margin-top:12px;padding:12px 14px;border-radius:20px;background:var(--accent-soft);border:1px solid var(--accent-line);color:var(--ink);text-align:left;font-weight:700}
.qline b{flex:none;min-width:28px;height:28px;padding:0 6px;border-radius:14px;background:var(--accent);color:#1C1C1E;display:grid;place-items:center}
.qline span{flex:1;min-width:0}
.qline i{font-style:normal;color:var(--accent);font-weight:800}

/* Barra a 5 posti con il tasto di scansione al centro */
.bar{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));align-items:center;gap:2px;padding:6px}
.bar button{min-height:54px;font-size:.7rem}
.bar button svg{width:23px;height:23px}
.bar button[aria-current=true]{background:var(--accent-soft);box-shadow:none;color:var(--accent);font-weight:700}
.bar .scan{position:relative;z-index:1;display:grid;place-items:center}
.bar .scan button{width:56px;height:56px;min-height:0;flex:none;border-radius:50%;background:var(--accent);color:#1C1C1E;box-shadow:0 6px 18px rgba(255,203,5,.45),inset 0 1px 0 rgba(255,255,255,.6)}
.bar .scan button svg{width:26px;height:26px;stroke-width:2.2}
.bar .scan button:active{transform:scale(.95)}
.bar .scan .badge{position:absolute;top:-3px;right:-3px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#D70015;color:#fff;font-size:.72rem;font-weight:800;display:grid;place-items:center;border:2px solid var(--bg)}
.inquick .dock{display:none}
.inquick main{padding-bottom:calc(30px + env(safe-area-inset-bottom,0px))}
@media (prefers-reduced-motion:reduce){.cd-card{transition:none}}
</style>"""
rep('.bknote .bkbtns{display:flex;align-items:center;gap:12px;flex:none}\n</style>', '.bknote .bkbtns{display:flex;align-items:center;gap:12px;flex:none}' + CSS)

# ---------- barra: tasto giallo al centro, niente più lente e tasto fluttuante ----------
rep("""<button id="fab" class="fab glass" type="button" aria-label="Scansiona una carta" hidden>
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/></svg>
</button>
""", "")
rep("""      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="11" height="15" rx="2"/><path d="M5 7v12a2 2 0 0 0 2 2h9"/></svg><span>Catalogo</span></button>
""", """      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="11" height="15" rx="2"/><path d="M5 7v12a2 2 0 0 0 2 2h9"/></svg><span>Catalogo</span></button>
    <div class="scan"><button id="fab" type="button" aria-label="Scansiona una carta">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M8 12h8"/></svg><span id="fab-n" class="badge" hidden>0</span></button></div>
""")
rep("""  <button id="orb" class="orb glass" type="button" aria-label="Cerca nel catalogo">
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>
  </button>
""", "")
rep("""  document.querySelectorAll('nav button').forEach(b => b.setAttribute('aria-current', b.dataset.go === tab ? 'true' : 'false'));
  $('fab').hidden = name !== 'cat' || selMode;""",
"""  document.querySelectorAll('nav button[data-go]').forEach(b => b.setAttribute('aria-current', b.dataset.go === tab ? 'true' : 'false'));
  document.body.classList.toggle('inquick', name === 'quick');
  updateScanBadge(); if (name === 'scan') renderScanQueue();""")
rep("""document.querySelectorAll('nav button').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));""",
"""document.querySelectorAll('nav button[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));""")
rep("""$('orb').addEventListener('click', () => { go('cat'); $('c-q').focus(); });
""", "")
rep("""  if (!$('v-cat').hidden && selMode) $('fab').hidden = true;
""", "")
rep("""document.body.classList.toggle('selmode', on); if (!$('v-cat').hidden) $('fab').hidden = on; updateSelBar();""",
"""document.body.classList.toggle('selmode', on); updateSelBar();""")
rep("""function renderQuick(){
  const box = $('q-list'); if (!box) return;""", """function renderQuick(){
  updateScanBadge();
  const box = $('q-list'); if (!box) return;""")

# ---------- Aggiungi una carta: riga delle carte da controllare ----------
rep("""  <div id="status" class="status" hidden></div>
  <div id="editbox" hidden>""", """  <div id="scan-queue"></div>
  <div id="status" class="status" hidden></div>
  <div id="editbox" hidden>""")
rep("""$('v-scan').addEventListener('click', ev => { if (ev.target.closest('[data-a="back"]')) popView(); });""",
"""$('v-scan').addEventListener('click', ev => { if (ev.target.closest('[data-a="back"]')) popView(); else if (ev.target.closest('[data-a="openq"]')) pushView('quick', {nocam:true}); });""")

# ---------- Catalogo: struttura ----------
rep('<div class="tag" id="tag"></div>', '<div class="stats" id="tag"></div>')
rep("""  <div class="tools">
    <input id="c-q" type="search" placeholder="Cerca per nome o set" aria-label="Cerca nel catalogo">
    <select id="c-sort" aria-label="Ordina">
      <option value="recent">Recenti</option>
      <option value="value">Valore</option>
      <option value="unit">Prezzo</option>
      <option value="name">Nome</option>
      <option value="set">Set</option>
    </select>
  </div>
  <div class="fbar"><button id="btn-filters" class="btn small" type="button" aria-expanded="false">Filtri</button><span id="f-summary" class="muted"></span><button id="btn-fclear" class="lnk" type="button" hidden>Azzera</button><button id="btn-select" class="btn small" type="button">Seleziona</button></div>""",
"""  <div class="tools">
    <input id="c-q" type="search" placeholder="Cerca per nome o set" aria-label="Cerca nel catalogo">
  </div>
  <div class="rail chips qchips"><button id="btn-filters" class="chip" type="button" aria-expanded="false">Filtri</button><span id="c-chips" class="cchips"></span></div>""")
rep("""  <div id="list"></div>
  <button id="btn-refresh\"""", """  <div class="ctool"><select id="c-sort" class="sortsel" aria-label="Ordina">
      <option value="recent">Più recenti</option>
      <option value="value">Valore</option>
      <option value="unit">Prezzo</option>
      <option value="name">Nome</option>
      <option value="set">Set</option>
    </select><div class="rgt"><div class="vsw glass" role="group" aria-label="Vista">
      <button id="v-grid" type="button" aria-label="Griglia" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1.2"/><rect x="14" y="4" width="6" height="6" rx="1.2"/><rect x="4" y="14" width="6" height="6" rx="1.2"/><rect x="14" y="14" width="6" height="6" rx="1.2"/></svg></button>
      <button id="v-list" type="button" aria-label="Elenco" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg></button>
    </div><button id="btn-select" class="btn small" type="button">Seleziona</button></div></div>
  <div id="fsum" class="fsum" hidden><span id="f-summary"></span> <button id="btn-fclear" class="lnk" type="button" hidden>Azzera</button></div>
  <div id="list"></div>
  <button id="btn-refresh\"""")

# ---------- funzioni comuni del ridisegno ----------
HELPERS = r"""/* ---------- ridisegno "Vetro olografico": funzioni comuni ---------- */
// iniziali per il segnaposto quando l'immagine manca o non si carica (es. "Charizard ex" -> "CH")
const iniOf = n => ((String(n || '').match(/[\p{L}\p{N}]/gu) || ['?']).slice(0, 2).join('')).toUpperCase();
// riflesso: olografico per le Holo, più leggero per le Reverse holo
const holoCls = e => e && e.variant === 'Holo' ? ' holo' : e && e.variant === 'Reverse holo' ? ' rev' : '';
// testo più piccolo per gli importi lunghi, così restano su una riga
const sizeCls = (str, a, b) => str.length >= b ? ' xl' : str.length >= a ? ' l' : '';
const artHtml = (e, extra) => '<span class="art' + (extra || '') + holoCls(e) + '" data-ini="' + esc(iniOf(e.name)) + '">' + (e.img ? '<img src="' + esc(e.img) + '" alt="" loading="lazy">' : '') + '</span>';
const catView = () => cfg.catView === 'list' ? 'list' : 'grid';
const reduceMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
// un'immagine che non si carica lascia il posto alle iniziali (la pagina carta ha il suo ripiego)
document.addEventListener('error', ev => { const t = ev.target;
  if (t && t.tagName === 'IMG' && t.id !== 'cd-img' && t.closest && t.closest('.art, .tile .im')) t.remove(); }, true);
// inclinazione della carta col dito: rotazione e posizione del riflesso seguono il punto toccato
function tiltAt(el, nx, ny){
  nx = Math.min(1, Math.max(0, nx)); ny = Math.min(1, Math.max(0, ny));
  const ry = (nx - 0.5) * 28, rx = (0.5 - ny) * 22;
  el.style.transform = 'perspective(900px) rotateY(' + ry.toFixed(1) + 'deg) rotateX(' + rx.toFixed(1) + 'deg)';
  el.style.setProperty('--hx', (100 - nx * 100).toFixed(0) + '%'); el.style.setProperty('--hy', (100 - ny * 100).toFixed(0) + '%');
}
function tiltReset(el){ el.style.transform = ''; el.style.removeProperty('--hx'); el.style.removeProperty('--hy'); }
function bindTilt(el){
  if (!el || reduceMotion()) return false;
  el.classList.add('tilt');
  let on = false;
  const at = ev => { const r = el.getBoundingClientRect(); if (r.width && r.height) tiltAt(el, (ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height); };
  el.addEventListener('pointerdown', ev => { on = true; try { el.setPointerCapture(ev.pointerId); } catch(err){} at(ev); });
  el.addEventListener('pointermove', ev => { if (on || ev.pointerType === 'mouse') at(ev); });
  ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture'].forEach(n => el.addEventListener(n, () => { on = false; tiltReset(el); }));
  return true;
}
const needsReview = () => { try { return qJobs.filter(j => j.status === 'review' || j.status === 'error' || j.status === 'edges').length; } catch(err){ return 0; } };
// numero delle carte da controllare sul tasto giallo della barra
function updateScanBadge(){
  const b = $('fab-n'), n = needsReview(); if (!b) return;
  b.hidden = !n; b.textContent = n > 99 ? '99+' : String(n);
  $('fab').setAttribute('aria-label', 'Scansiona una carta' + (n ? ', ' + n + ' da controllare' : ''));
}
function renderScanQueue(){
  const box = $('scan-queue'), n = needsReview(); if (!box) return;
  box.innerHTML = n ? '<button class="qline" type="button" data-a="openq"><b>' + n + '</b><span>' + (n === 1 ? 'carta da controllare' : 'carte da controllare') + ' nella coda</span><i>Apri</i></button>' : '';
}

/* ---------- catalogo ---------- */
function renderCatalog(){"""
rep("""/* ---------- catalogo ---------- */
function renderCatalog(){""", HELPERS)

# ---------- Catalogo: fascia dei valori, filtri rapidi, griglia o elenco ----------
rep("""  $('tag').innerHTML = '<div class="lbl">Valore stimato</div><div class="tot">' + eur(t) + '</div><div class="sub">' + n + ' carte, ' + catalog.length + ' diverse' + (miss ? ', ' + miss + ' senza prezzo' : '') + '</div>';""",
"""  { const vs = eur(t);
    $('tag').innerHTML = '<div><span class="k">Valore stimato</span><span class="v a' + sizeCls(vs, 9, 12) + '">' + vs + '</span>' + (miss ? '<span class="x">' + miss + ' senza prezzo</span>' : '') + '</div>' +
      '<div><span class="k">Carte</span><span class="v">' + fmtN(n) + '</span></div><div><span class="k">Diverse</span><span class="v">' + fmtN(catalog.length) + '</span></div>'; }""")
rep("""  $('f-summary').textContent = (nAct || q) && catalog.length ? list.length + ' di ' + catalog.length + ' voci, ' + eur(list.reduce((t, e) => t + line(e), 0)) : '';""",
"""  $('f-summary').textContent = (nAct || q) && catalog.length ? list.length + ' di ' + catalog.length + ' voci, ' + eur(list.reduce((t, e) => t + line(e), 0)) : '';
  $('fsum').hidden = !$('f-summary').textContent && $('btn-fclear').hidden;
  { const qc = [['all', 'Tutte', !nAct], ['lang:IT', 'Italiano', cf.lang === 'IT'], ['extra:multi', 'Doppioni', cf.extra === 'multi'], ['extra:noprice', 'Senza prezzo', cf.extra === 'noprice'], ['extra:manual', 'Prezzo mio', cf.extra === 'manual']];
    $('c-chips').innerHTML = qc.map(c => '<button class="chip" type="button" data-qf="' + c[0] + '" aria-pressed="' + c[2] + '">' + c[1] + '</button>').join(''); }
  const grid = catView() === 'grid';
  $('list').className = grid ? 'grid' : '';
  $('v-grid').setAttribute('aria-pressed', String(grid)); $('v-list').setAttribute('aria-pressed', String(!grid));""")
rep("""    const u = unit(e);
    return '<button class="item' + (selKeys.has(e.key) ? ' picked' : '') + '" type="button" data-open="' + esc(e.key) + '">' + (selMode ? '<span class="chk' + (selKeys.has(e.key) ? ' on' : '') + '"></span>' : '') + '<img src="' + esc(e.img) + '" alt="" loading="lazy"><div class="body">' +""",
"""    const u = unit(e), chk = selMode ? '<span class="chk' + (selKeys.has(e.key) ? ' on' : '') + '"></span>' : '';
    if (grid) return '<button class="item' + (selKeys.has(e.key) ? ' picked' : '') + '" type="button" data-open="' + esc(e.key) + '">' +
      '<span class="art' + holoCls(e) + '" data-ini="' + esc(iniOf(e.name)) + '">' + chk + (e.img ? '<img src="' + esc(e.img) + '" alt="" loading="lazy">' : '') + (e.qty > 1 ? '<b class="qty">×' + e.qty + '</b>' : '') + '</span>' +
      '<span class="nm">' + esc(e.name) + '</span><span class="meta">' + esc(e.lang) + ' · ' + esc(e.variant) + ' · ' + esc(e.cond) + '</span>' +
      '<span class="val">' + eur(u) + (e.priceManual != null ? ' <small class="muted">tuo</small>' : '') + '</span></button>';
    return '<button class="item' + (selKeys.has(e.key) ? ' picked' : '') + '" type="button" data-open="' + esc(e.key) + '">' + chk + artHtml(e, ' sm') + '<div class="body">' +""")
rep("""$('c-sort').addEventListener('change', renderCatalog);""",
"""$('c-sort').addEventListener('change', renderCatalog);
// filtri rapidi: scorciatoie sugli stessi filtri del pannello
$('c-chips').addEventListener('click', ev => {
  const b = ev.target.closest('[data-qf]'); if (!b) return;
  const v = b.dataset.qf;
  if (v === 'all') Object.keys(cf).forEach(k => cf[k] = '');
  else { const [k, x] = v.split(':'); cf[k] = cf[k] === x ? '' : x; }
  renderCatalog();
});
// vista a griglia o a elenco, ricordata fra un avvio e l'altro
[['v-grid', 'grid'], ['v-list', 'list']].forEach(([id, v]) => $(id).addEventListener('click', () => {
  if (catView() === v) return; cfg.catView = v; LS.set('pkm_cfg', cfg); renderCatalog();
}));""")

# ---------- Home ----------
rep("""const ICON_SLIDERS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/></svg>';""",
"""const ICON_SLIDERS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/></svg>';
const ICON_SEARCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';""")
rep("""  let h = '<div class="home-top"><h1>Home</h1><button id="hm-gear" class="rbtn glass" type="button" data-a="settings" aria-label="Impostazioni">' + ICON_SLIDERS + '</button></div>';""",
"""  let h = '<div class="home-top"><h1>Home</h1><div class="hbtns"><button id="hm-search" class="rbtn glass" type="button" data-a="search" aria-label="Cerca nel catalogo">' + ICON_SEARCH + '</button>' +
    '<button id="hm-gear" class="rbtn glass" type="button" data-a="settings" aria-label="Impostazioni">' + ICON_SLIDERS + '</button></div></div>';""")
rep("""    h += '<div class="tag"><div class="lbl">Valore della collezione</div><div class="tot">' + eur(st.val) + '</div>' +
      '<div class="sub">' + st.n + ' carte, ' + catalog.length + ' diverse, ' + groups.length + ' set' + (st.miss ? ', ' + st.miss + ' senza prezzo' : '') + '</div>' +
      (st.pct != null ? '<div><span class="pill ' + cls + '">' + (st.pct >= 0 ? '+' : '−') + Math.abs(st.pct).toFixed(1).replace('.', ',') + '% rispetto alla media di 30 giorni</span><div class="muted" style="margin-top:6px">stima su ' + st.cov + ' carte con dati</div></div>' : '') + '</div>';""",
"""    { const vs = eur(st.val);
      h += '<div class="hero"><div class="hl"><div class="lbl">Valore della collezione</div><div class="tot' + sizeCls(vs, 9, 11) + '">' + vs + '</div>' +
        (st.pct != null ? '<span class="pill ' + cls + '">' + (cls === 'up' ? '▲ ' : cls === 'down' ? '▼ ' : '') + (st.pct >= 0 ? '+' : '−') + Math.abs(st.pct).toFixed(1).replace('.', ',') + '%</span>' +
          '<div class="hnote">rispetto alla media di 30 giorni<br>stima su ' + st.cov + ' carte con dati</div>' : '') +
        (st.miss ? '<div class="hnote">' + st.miss + ' senza prezzo</div>' : '') + '</div>' +
        '<div class="hr"><div><b class="a">' + fmtN(st.n) + '</b><span>carte</span></div><div><b>' + fmtN(catalog.length) + '</b><span>diverse</span></div><div><b>' + fmtN(groups.length) + '</b><span>set</span></div></div></div>'; }""")
rep("""  else if (a === 'settings') go('set');
  else if (a === 'allcards') go('cat');""", """  else if (a === 'settings') go('set');
  else if (a === 'search'){ go('cat'); $('c-q').focus(); }
  else if (a === 'allcards') go('cat');""")
rep("""  return '<button class="tile" type="button" data-open="' + esc(e.key) + '"><span class="im"><img src="' + esc(e.img) + '" alt="" loading="lazy">' +
    (e.qty > 1 ?""", """  return '<button class="tile" type="button" data-open="' + esc(e.key) + '"><span class="im' + holoCls(e) + '" data-ini="' + esc(iniOf(e.name)) + '">' + (e.img ? '<img src="' + esc(e.img) + '" alt="" loading="lazy">' : '') +
    (e.qty > 1 ?""")
rep("""'<div class="kv vk" style="margin-top:8px"><div><span>Valore totale dal '""", """'<div class="kv vk kvt" style="margin-top:8px"><div><span>Valore totale dal '""")
rep("""  if (up.length) h += '<div class="sec"><h2>Carte salite</h2></div><div class="rail">' + up.map(deltaTile).join('') + '</div>';
  if (down.length) h += '<div class="sec"><h2>Carte scese</h2></div><div class="rail">' + down.map(deltaTile).join('') + '</div>';""",
"""  if (up.length || down.length){
    const box = (title, rows, col) => '<div class="mv"><h2>' + title + '</h2>' + rows.map(r => moverRow(r, col)).join('') + '</div>';
    h += '<div class="movers' + (up.length && down.length ? '' : ' one') + '">' + (up.length ? box('Carte salite', up, 'var(--ok)') : '') + (down.length ? box('Carte scese', down, 'var(--danger)') : '') + '</div>';
  }""")
rep("""function trendBlock(){""", """// riga compatta delle carte salite o scese: miniatura, nome, variazione
const moverRow = (r, col) => '<button class="mrow" type="button" data-open="' + esc(r.e.key) + '">' + artHtml(r.e) +
  '<span class="t"><b>' + esc(r.e.name) + '</b><span style="color:' + col + '">' + signed(r.d) + ' · ' + signedPct(r.pct) + '</span></span></button>';
function trendBlock(){""")

# ---------- Scheda carta: carta che si inclina, pillole, quantità ----------
rep("""    '<div class="cd-head"><img id="cd-img" src="' + esc(hiImg(e.img) || e.img) + '" alt="' + esc(e.name) + '">' +
    '<div class="cd-sel">' +
      '<div class="field"><label for="cd-lang">Lingua</label><select id="cd-lang">' + opts(LANGS, e.lang) + '</select></div>' +
      '<div class="field"><label for="cd-var">Variante</label><select id="cd-var">' + opts(variantList(e.pr && e.pr.vars, e.variant), e.variant) + '</select></div>' +
      '<div class="field"><label for="cd-cond">Condizione</label><select id="cd-cond">' + opts(CONDS, e.cond) + '</select></div>' +
      (e.condEst ? '<div class="muted" style="font-size:.8rem;margin:-2px 0 8px 6px">Condizione stimata dalla foto' + (e.condNote ? ': ' + esc(e.condNote) : '') + '</div>' : '') +
      '<div class="stepper"><button type="button" data-a="qminus" aria-label="Meno">−</button><div class="q">' + e.qty + '×</div><button type="button" data-a="qplus" aria-label="Più">+</button></div>' +
    '</div></div>' +
    '<button class="setrow" type="button" data-a="set">""",
"""    '<div class="cd-stage"><div id="cd-tilt" class="cd-card art' + holoCls(e) + '" data-ini="' + esc(iniOf(e.name)) + '">' + (e.img ? '<img id="cd-img" src="' + esc(hiImg(e.img) || e.img) + '" alt="' + esc(e.name) + '">' : '') + '</div></div>' +
    (reduceMotion() ? '' : '<p class="cd-hint">Trascina il dito sulla carta per inclinarla</p>') +
    '<div class="bigprice"><div class="v">' + eur(u) + '</div>' +
      (e.priceManual != null ? '<div class="own">prezzo tuo (mercato Near Mint: ' + eur(e.price) + ')</div>' : (e.price != null && condCoef(e.cond) !== 1 ? '<div class="own">mercato Near Mint ' + eur(e.price) + ', × ' + Math.round(condCoef(e.cond) * 100) + '% (' + esc(e.cond) + ')</div>' : '<div class="own">prezzo di mercato per carta</div>')) +
      (pct ? '<div class="pill ' + (ch > 0.05 ? 'up' : ch < -0.05 ? 'down' : 'flat') + '">' + pct + '</div>' : '') +
      (u != null && e.qty > 1 ? '<div class="own" style="margin-top:10px">' + e.qty + ' carte: <b style="color:var(--ink)">' + eur(u * e.qty) + '</b></div>' : '') + '</div>' +
    '<div class="cpanel">' +
      '<div><div class="pl">Lingua</div>' + pickPills('cd-lang', LANGS, e.lang, true) + '</div>' +
      '<div><div class="pl">Variante</div>' + pickPills('cd-var', variantList(e.pr && e.pr.vars, e.variant), e.variant) + '</div>' +
      '<div><div class="pl">Condizione · ' + esc((CONDS.find(c => c[0] === e.cond) || [0, e.cond])[1]) + '</div>' + pickPills('cd-cond', CONDS, e.cond, true) +
        (e.condEst ? '<div class="muted" style="font-size:.8rem;margin:8px 4px 0">Condizione stimata dalla foto' + (e.condNote ? ': ' + esc(e.condNote) : '') + '</div>' : '') + '</div>' +
      '<div class="qrow2"><b>Quantità</b><div class="stepper"><button type="button" data-a="qminus" aria-label="Meno">−</button><div class="q">' + e.qty + '×</div><button type="button" data-a="qplus" aria-label="Più">+</button></div></div>' +
      '<div hidden>' +
        '<div class="field"><label for="cd-lang">Lingua</label><select id="cd-lang">' + opts(LANGS, e.lang) + '</select></div>' +
        '<div class="field"><label for="cd-var">Variante</label><select id="cd-var">' + opts(variantList(e.pr && e.pr.vars, e.variant), e.variant) + '</select></div>' +
        '<div class="field"><label for="cd-cond">Condizione</label><select id="cd-cond">' + opts(CONDS, e.cond) + '</select></div>' +
      '</div>' +
    '</div>' +
    '<button class="setrow" type="button" data-a="set">""")
# il prezzo grande è salito sotto la carta: tolto dal punto di prima
rep("""<span class="chev">›</span></button>' +
    '<div class="bigprice"><div class="v">' + eur(u) + '</div>' +
      (e.priceManual != null ? '<div class="own">prezzo tuo (mercato Near Mint: ' + eur(e.price) + ')</div>' : (e.price != null && condCoef(e.cond) !== 1 ? '<div class="own">mercato Near Mint ' + eur(e.price) + ', × ' + Math.round(condCoef(e.cond) * 100) + '% (' + esc(e.cond) + ')</div>' : '<div class="own">prezzo di mercato per carta</div>')) +
      (pct ? '<div class="pill ' + (ch > 0.05 ? 'up' : ch < -0.05 ? 'down' : 'flat') + '">' + pct + '</div>' : '') +
      (u != null && e.qty > 1 ? '<div class="own" style="margin-top:10px">' + e.qty + ' carte: <b style="color:var(--ink)">' + eur(u * e.qty) + '</b></div>' : '') + '</div>' +
    (chart ?""", """<span class="chev">›</span></button>' +
    (chart ?""")
rep("""  const im = $('cd-img'); im.onerror = () => { im.onerror = null; if (e.img && im.getAttribute('src') !== e.img) im.src = e.img; };
}""", """  const im = $('cd-img');
  if (im) im.onerror = () => { if (e.img && im.getAttribute('src') !== e.img) im.src = e.img; else { im.onerror = null; im.remove(); } };
  bindTilt($('cd-tilt'));
}
// pillole al posto dei menu: toccarne una cambia il menu nascosto, che fa il lavoro di sempre
const LANGN = {IT:'Italiano', EN:'Inglese', JP:'Giapponese', Altro:'Altro'};
function pickPills(id, list, cur, eq){
  return '<div class="pills' + (eq ? ' eq' : '') + '"' + (eq ? ' style="--n:' + list.length + '"' : '') + ' role="group">' + list.map(o => {
    const v = Array.isArray(o) ? o[0] : o, full = Array.isArray(o) ? o[1] : (LANGN[o] || o);
    return '<button type="button" data-pick="' + id + '" data-v="' + esc(v) + '" aria-pressed="' + (v === cur) + '"' + (full !== v ? ' aria-label="' + esc(full) + '"' : '') + '>' + esc(v) + '</button>';
  }).join('') + '</div>';
}""")
rep("""$('v-card').addEventListener('click', async ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return;""", """$('v-card').addEventListener('click', async ev => {
  const pk = ev.target.closest('[data-pick]');
  if (pk){ const sel = $(pk.dataset.pick); if (sel && sel.value !== pk.dataset.v){ sel.value = pk.dataset.v; sel.dispatchEvent(new Event('change', {bubbles:true})); } return; }
  const b = ev.target.closest('[data-a]'); if (!b) return;""")

# ---------- Set: anello dell'avanzamento globale ----------
rep("""  $('sets-global').innerHTML = groups.length ? '<div class="sec"><h2>Avanzamento globale</h2></div><div class="panel" style="margin-top:0"><div class="dtop"><div><div class="big">' + fmtN(owned) + ' / ' + fmtN(allCards) + '</div>' +
    '<div class="muted">' + (allKnown ? 'carte raccolte su tutte quelle esistenti' : 'carte raccolte nei tuoi set (calcolo il totale…)') + '</div></div><div class="pct">' + fmtPct(gp) + '%</div></div>' +
    '<div class="prog"><i style="width:' + (owned ? Math.max(gp, 1) : 0) + '%"></i></div>' +
    '<div class="muted" style="margin-top:10px">' + groups.length + ' set iniziati su ' + fmtN(allSets) + ', ' + complete + ' completi</div>' +
    (byLang.length > 1 ? byLang.map(b => '<div class="muted" style="margin-top:4px">' + (LN[b[0]] || b[0]) + ': ' + fmtN(b[1]) + ' / ' + fmtN(b[2]) + '</div>').join('') : '') + '</div>' : '';
  $('sets-tag').innerHTML = '<div class="lbl">I tuoi set</div><div class="tot">' + groups.length + '</div><div class="sub">' + complete + ' completi, ' + (groups.length - complete) + ' in corso</div>';""",
"""  { const C = 2 * Math.PI * 40, dash = owned ? Math.max(1.5, Math.min(gp, 100) / 100 * C) : 0;
    $('sets-global').innerHTML = groups.length ? '<div class="shero"><svg class="ring" viewBox="0 0 96 96" role="img" aria-label="Avanzamento globale ' + fmtPct(gp) + ' per cento">' +
      '<circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="10"/>' +
      '<circle cx="48" cy="48" r="40" fill="none" stroke="#FFCB05" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + dash.toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 48 48)"/>' +
      '<text x="48" y="54" text-anchor="middle">' + fmtPct(gp) + '%</text></svg>' +
      '<div style="min-width:0"><div class="pl">Avanzamento globale</div><div class="big"><em>' + fmtN(owned) + '</em> / ' + fmtN(allCards) + '</div>' +
      '<div class="muted">' + (allKnown ? 'carte raccolte su tutte quelle esistenti' : 'carte raccolte nei tuoi set (calcolo il totale…)') + '</div>' +
      '<div class="chipsr"><span class="a">' + (groups.length - complete) + ' in corso</span><span>' + complete + ' completi</span></div></div></div>' +
      '<div class="muted" style="margin:10px 6px 0">' + groups.length + ' set iniziati su ' + fmtN(allSets) + ', ' + complete + ' completi</div>' +
      (byLang.length > 1 ? byLang.map(b => '<div class="muted" style="margin:4px 6px 0">' + (LN[b[0]] || b[0]) + ': ' + fmtN(b[1]) + ' / ' + fmtN(b[2]) + '</div>').join('') : '') : ''; }
  $('sets-tag').innerHTML = ''; $('sets-tag').hidden = true;""")

# ---------- Pokédex: testata in un pannello ----------
rep("""    '<div class="bigprice" style="margin-top:8px"><div class="v">' + owned + ' / ' + fmtN(DEX_MAX) + '</div><div class="own">Pokémon raccolti</div><div class="pill ' + (owned ? 'up' : 'flat') + '">' + fmtPct(pct) + '%</div></div>' +
    '<div class="prog" style="margin-top:14px"><i style="width:' + pct + '%"></i></div>' +
    '<div id="dex-note" class="muted" style="text-align:center;margin-top:10px">' + dexNoteHtml() + '</div>' +""",
"""    '<div class="dhero"><div class="dtop"><div><div class="big"><em>' + owned + '</em> / ' + fmtN(DEX_MAX) + '</div><div class="muted">Pokémon raccolti</div></div><span class="pill ' + (owned ? 'up' : 'flat') + '">' + fmtPct(pct) + '%</span></div>' +
    '<div class="prog" style="margin-top:14px;height:8px"><i style="width:' + (owned ? Math.max(pct, 1) : 0) + '%"></i></div>' +
    '<div id="dex-note" class="muted" style="margin-top:12px">' + dexNoteHtml() + '</div></div>' +""")

open(p,'w',encoding='utf-8').write(s)
open('/home/claude/app.js','w',encoding='utf-8').write(re.search(r'<script>\n(.*)</script>',s,re.S).group(1))
print('ok')
