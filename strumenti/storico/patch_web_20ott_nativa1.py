# Allineamento del sito all'app nativa (20/10/2026), parte 1:
# temi Notte blu / Perla con Aspetto, barra come la nativa (Collezione, Progressi), grafico con assi e tocco,
# Home come la nativa (titolo Album, riquadro del valore, maggior valore, ultime aggiunte, si sono mossi, set in corso),
# pagina Valore, pannello "Aggiungi carte" a tre scelte, Impostazioni come foglio con "Fine".
import re
p='/mnt/user-data/outputs/album-carte-pokemon.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(old[:100],s.count(old))
    s=s.replace(old,new)
def rep_between(start,end,new):
    """sostituisce da start (compreso) a end (escluso); start deve essere unico"""
    global s
    assert s.count(start)==1,('start',start[:80],s.count(start))
    i=s.index(start); j=s.index(end,i+len(start))
    s=s[:i]+new+s[j:]

# ---------- testa: tema scelto prima del disegno (anche la barra di stato di iOS, letta all'avvio) ----------
rep('<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n',
 '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
 '<script>try{var c=JSON.parse(localStorage.getItem(\'pkm_cfg\')||\'{}\'),a=c.appearance,l=a===\'light\'||(a!==\'dark\'&&!!window.matchMedia&&matchMedia(\'(prefers-color-scheme: light)\').matches);'
 'document.documentElement.setAttribute(\'data-theme\',l?\'light\':\'dark\');if(l){var m=document.querySelector(\'meta[name="apple-mobile-web-app-status-bar-style"]\');if(m)m.setAttribute(\'content\',\'default\');}}catch(e){}</script>\n')

# ---------- CSS: temi e componenti comuni ----------
CSS = r'''
/* ---- Allineamento all'app nativa (20/10/2026): temi Notte blu (scuro) e Perla (chiaro), componenti comuni ---- */
:root{--bg:#0B1426;--surface:#16233D;--surface2:#22324F;--ink:#F2F4F8;--muted:#9AA6BD;--line:rgba(255,255,255,.09);
  --accent:#FFCB05;--accent-fill:#FFCB05;--on-accent:#1C1C1E;--accent-soft:rgba(255,203,5,.14);--accent-line:#FFCB05;
  --ok:#4ADE80;--danger:#FF6B62;--orange:#FF9F0A;--blue:#0A84FF;--green:#30D158;--purple:#BF5AF2;
  --glass:rgba(11,20,38,.60);--glass-line:rgba(255,255,255,.16);--glass-hi:rgba(255,255,255,.18);
  --sheet-bg:#0E192E;--sheet-panel:#1C2B48;--sheet-panel-hi:#2A3B5C;--sheet-text:rgba(255,255,255,.74);
  --ph-a:#2A3B5F;--ph-b:#16233D;--ph-ink:rgba(255,255,255,.5);--shadow:rgba(0,0,0,.45);--scheme:dark}
:root[data-theme="light"]{--bg:#F2F2F7;--surface:#FFFFFF;--surface2:#E5E5EA;--ink:#000000;--muted:#6C6C70;--line:rgba(0,0,0,.09);
  --accent:#1C1C1E;--accent-soft:rgba(255,203,5,.32);--accent-line:#A67C00;
  --ok:#177A33;--danger:#D70015;--orange:#C93400;--blue:#0062CC;--green:#1E7B34;--purple:#8944AB;
  --glass:rgba(255,255,255,.62);--glass-line:rgba(0,0,0,.08);--glass-hi:rgba(255,255,255,.7);
  --sheet-bg:#F2F2F7;--sheet-panel:#FFFFFF;--sheet-panel-hi:#E5E5EA;--sheet-text:rgba(0,0,0,.70);
  --ph-a:#E5E5EA;--ph-b:#F2F2F7;--ph-ink:rgba(0,0,0,.38);--shadow:rgba(0,0,0,.16);--scheme:light}
html,body{color-scheme:var(--scheme)}
:root[data-theme="light"] select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%231C1C1E' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")}
.glass{background:var(--glass);border-color:var(--glass-line);box-shadow:inset 0 1px 0 var(--glass-hi),0 12px 30px var(--shadow)}
:root[data-theme="light"] .glass::after{background:radial-gradient(120% 90% at 18% 0%,rgba(255,255,255,.5),rgba(255,255,255,0) 55%)}
/* riempimenti gialli: gialli in entrambi i temi, testo quasi nero sopra */
.btn.primary.big,.btn.solid,.seg button[aria-pressed=true],.chips .chip[aria-pressed=true],.vsw button[aria-pressed=true],.pills button[aria-pressed=true],.qline b,.bar .scan button,.item .chk.on,#list.grid .item .chk.on,.scell .qb,.tile .qb{background:var(--accent-fill);border-color:var(--accent-fill);color:var(--on-accent)}
.prog i,.shutter{background:var(--accent-fill)}
.qline{color:var(--ink)}
.art,.tile .im{background:linear-gradient(160deg,var(--ph-a),var(--ph-b))}
.art::before,.tile .im::before{color:var(--ph-ink)}
.chipsr span{background:var(--surface2)}
.pill.up{background:color-mix(in srgb,var(--ok) 15%,transparent);color:var(--ok)}
.pill.down{background:color-mix(in srgb,var(--danger) 14%,transparent);color:var(--danger)}
.dcell.miss img{filter:grayscale(1);opacity:.35}
.bar .scan .badge{background:#FF9500;color:#fff}
.inset .dock{display:none}
.inset main{padding-bottom:calc(30px + env(safe-area-inset-bottom,0px))}

/* intestazioni grandi, pulsanti tondi, pillole, pannelli */
.hdr{display:flex;align-items:center;gap:10px;margin:8px 0 18px}
.hdr h1{flex:1;min-width:0;margin:0;font-size:2rem;font-weight:800;letter-spacing:-.02em}
.hbtns{display:flex;align-items:center;gap:8px;flex:none}
.cicon{flex:none;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;padding:0;border:0;background:var(--surface);color:var(--ink);position:relative}
.cicon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.cicon select{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
.pbtn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:36px;padding:0 14px;border-radius:999px;border:0;background:var(--surface);color:var(--ink);font-size:.88rem;font-weight:700;white-space:nowrap}
.pbtn.solid{background:var(--accent-fill);color:var(--on-accent)}
.pbtn.danger{color:var(--danger)}
.pbtn[disabled]{opacity:.45}
.pb{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:4px;flex:none;padding:8px 14px;border-radius:999px;border:0;background:var(--surface);color:var(--ink);font-size:.9rem;font-weight:600;white-space:nowrap}
.pb[aria-pressed=true]{background:var(--accent-fill);color:var(--on-accent)}
.pb.menu::after{content:"";width:6px;height:6px;margin:0 2px 3px 4px;border:solid currentColor;border-width:0 2px 2px 0;transform:rotate(45deg)}
.pb select{position:absolute;inset:0;width:100%;height:100%;opacity:0;padding:0!important;border:0;background:none;cursor:pointer}
.pbrow{display:flex;gap:8px;margin:12px 0}
.pbrow.eq .pb{flex:1;min-width:0}
.pbrow.scroll{overflow-x:auto;margin-left:-16px;margin-right:-16px;padding:0 16px 2px;scrollbar-width:none}
.pbrow.scroll::-webkit-scrollbar{display:none}
.pnl{background:var(--surface);border-radius:18px;padding:14px;margin-top:22px}
.pnl.hl{box-shadow:inset 0 0 0 1.5px var(--accent-line)}
.pnl h3{margin:0 0 6px;font-size:1.05rem}
.sec2{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:24px 0 10px}
.sec2 h2{margin:0;font-size:1.25rem;font-weight:700}
.sec2 .lnk{font-size:.9rem}
.cap{font-size:.78rem;color:var(--muted)}
.warn{color:var(--orange)}
.empty2{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;padding:40px 8px}
.empty2 svg{width:46px;height:46px;fill:none;stroke:var(--accent);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.empty2 b{font-size:1.2rem}
.empty2 p{margin:0;color:var(--muted);font-size:.92rem}
.sfield{display:flex;align-items:center;gap:8px;flex:1;min-width:0;padding:0 14px;min-height:44px;border-radius:999px;background:var(--surface);color:var(--muted)}
.sfield svg{flex:none;width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}
.sfield input{flex:1;min-width:0;min-height:42px;padding:0;border:0;background:none;color:var(--ink);font-size:1rem;outline:none}
.sfield input::-webkit-search-cancel-button{-webkit-appearance:none}
.sclear{flex:none;width:22px;height:22px;border-radius:50%;border:0;padding:0;background:var(--muted);color:var(--surface);font-size:.8rem;font-weight:800;line-height:22px}
.trow{display:flex;align-items:center;gap:8px}
.tbar{height:4px;border-radius:99px;background:var(--surface2);overflow:hidden}
.tbar i{display:block;height:100%;border-radius:99px;background:var(--accent-fill)}
.tbar.big{height:8px}
.chip2{display:inline-block;padding:2px 7px;border-radius:99px;font-size:.68rem;font-weight:700;color:var(--muted);background:color-mix(in srgb,var(--muted) 16%,transparent)}
.chip2.o{color:var(--orange);background:color-mix(in srgb,var(--orange) 15%,transparent)}
.chip2.b{color:var(--blue);background:color-mix(in srgb,var(--blue) 15%,transparent)}
.chip2.g{color:var(--green);background:color-mix(in srgb,var(--green) 15%,transparent)}
.chip2.p{color:var(--purple);background:color-mix(in srgb,var(--purple) 15%,transparent)}
.spin{display:inline-block;flex:none;width:16px;height:16px;border-radius:50%;border:2px solid var(--muted);border-top-color:transparent;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.spin{animation:none}}
.dot{display:inline-block;flex:none;width:8px;height:8px;border-radius:50%;background:var(--accent-fill)}

/* Home come la nativa */
.bkchip{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;border:0;background:var(--accent-soft);color:var(--accent);font-size:.78rem;font-weight:600;white-space:nowrap}
.bkchip i{width:7px;height:7px;border-radius:50%;background:currentColor}
.bkchip.due{background:color-mix(in srgb,var(--orange) 15%,transparent);color:var(--orange)}
.vcard{padding:16px;margin-top:0;display:flex;flex-direction:column;gap:10px}
.vtop{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:.9rem;color:var(--muted)}
.vrow{display:flex;align-items:flex-start;gap:14px}
.vl{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.vbig{font-size:2.6rem;font-weight:800;letter-spacing:-.03em;line-height:1;white-space:nowrap;font-variant-numeric:tabular-nums}
.vbig.l{font-size:2.15rem}.vbig.xl{font-size:1.75rem}
.vpill{padding:5px 10px;border-radius:999px;font-size:.88rem;font-weight:700}
.vpill.up{color:var(--ok);background:color-mix(in srgb,var(--ok) 15%,transparent)}
.vpill.down{color:var(--danger);background:color-mix(in srgb,var(--danger) 15%,transparent)}
.vside{flex:none;width:92px;padding-left:14px;border-left:1px solid var(--line);display:flex;flex-direction:column;gap:8px}
.vside b{display:block;font-size:1.35rem;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums}
.vside b.a{color:var(--accent)}
.vside span{font-size:.75rem;font-weight:600;color:var(--muted)}
.vcard .pbrow{margin:2px 0 0}
.strip{display:flex;align-items:flex-start;gap:10px;overflow-x:auto;margin:0 -16px;padding:0 16px 4px;scrollbar-width:none}
.strip::-webkit-scrollbar{display:none}
.st{flex:none;width:74px;padding:0;border:0;background:none;color:inherit;font:inherit;text-align:left}
.st .art{width:74px;border-radius:8px}
.st b{display:block;margin-top:4px;font-size:.78rem;font-weight:700;font-variant-numeric:tabular-nums}
.movers{margin-top:0}
.movers .mv{border-radius:16px;padding:12px;border:0}
.movers h3{margin:0 0 8px;font-size:.92rem}
.mrow .art{width:30px;border-radius:4px}
.sprow{display:flex;align-items:center;gap:12px;width:100%;margin-bottom:8px;padding:12px;border:0;border-radius:16px;background:var(--surface);color:inherit;font:inherit;text-align:left}
.sprow .logo{flex:none;width:44px;height:44px;border-radius:10px;background:var(--surface2);display:grid;place-items:center;overflow:hidden}
.sprow .logo img{max-width:38px;max-height:26px;object-fit:contain}
.sprow .logo .ini{width:44px;height:44px;border:0;border-radius:10px;background:none;font-size:.8rem;color:var(--muted)}
.sprow .bd{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.sprow .t1{display:flex;align-items:baseline;gap:6px}
.sprow .t1 b{font-size:.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sprow .t1 small{font-size:.68rem;font-weight:600;color:var(--muted)}
.sprow .t1 span{margin-left:auto;font-size:.78rem;font-weight:600;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.sprow .t1 span.a{color:var(--accent)}
.sprow .cap{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* grafico ad area con assi e tocco */
.vch{display:block;width:100%;height:auto;overflow:visible;margin:4px 0 2px;cursor:pointer;-webkit-user-select:none;user-select:none}
.vch .ln{fill:none;stroke:var(--accent);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round}
.vch .dt,.vch .sd{fill:var(--accent)}
.vch .gr{stroke:var(--muted);stroke-opacity:.35;stroke-width:.6;stroke-dasharray:3 3}
.vch text{fill:var(--muted);font-size:10px}
.vch .g0{stop-color:var(--accent);stop-opacity:.35}
.vch .g1{stop-color:var(--accent);stop-opacity:.02}
.vch .rl{stroke:var(--muted);stroke-opacity:.7;stroke-width:1;stroke-dasharray:3 3}
.vch .tb{fill:var(--surface2)}
.vch text.tv{fill:var(--ink);font-weight:700;font-size:11px}
.chnote{font-size:.82rem;color:var(--muted);min-height:60px;display:flex;align-items:center}

/* pagina Valore */
.vrows{margin-top:14px}
.vrow2{display:flex;align-items:center;gap:12px;width:100%;padding:10px 0;border:0;border-bottom:1px solid var(--line);background:none;color:inherit;font:inherit;text-align:left}
.vrow2:last-child{border-bottom:0}
.vrow2 .art{width:38px;flex:none;border-radius:5px}
.vrow2 .t{flex:1;min-width:0}
.vrow2 .t b{display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vrow2 .v{font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}

/* pannello "Aggiungi carte" */
.addsheet{background:var(--sheet-bg);border:0;padding:0 20px calc(28px + env(safe-area-inset-bottom,0px));z-index:32}
.addsheet::before{content:"";display:block;width:36px;height:5px;margin:6px auto 0;border-radius:3px;background:color-mix(in srgb,var(--ink) 28%,transparent)}
#add-back{z-index:31}
.ashead{display:flex;align-items:center;gap:10px;padding:22px 0 10px}
.ashead h2{flex:1;margin:0;font-size:1.85rem;font-weight:800}
.addsheet .cicon{background:var(--sheet-panel)}
.akey{margin:6px 0 0;color:var(--orange);font-size:.85rem}
.aopt{display:flex;align-items:center;gap:14px;width:100%;margin-top:14px;padding:14px;border-radius:18px;border:1px solid color-mix(in srgb,var(--ink) 10%,transparent);background:var(--sheet-panel);color:var(--ink);font:inherit;text-align:left}
.aopt.primary{border:1.5px solid var(--accent-line);background:linear-gradient(var(--accent-soft),var(--accent-soft)),var(--sheet-panel)}
.aopt .ai{flex:none;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--sheet-panel-hi)}
.aopt.primary .ai{background:var(--accent-fill);color:var(--on-accent)}
.aopt .ai svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.aopt .at{flex:1;min-width:0}
.aopt .at b{display:block;font-size:1.05rem}
.aopt .at span{display:block;font-size:.9rem;color:var(--sheet-text)}
.aopt .chev{flex:none;color:color-mix(in srgb,var(--ink) 45%,transparent);font-size:1.4rem;line-height:1}
.aqueue{display:flex;align-items:center;gap:10px;margin-top:14px;padding:12px;border-radius:16px;background:var(--sheet-panel)}
.aqueue span{flex:1;min-width:0;font-size:.92rem}
.aprov{margin:22px 0 0;text-align:center;font-size:.82rem;color:var(--sheet-text)}

/* Impostazioni come foglio, Aspetto */
.setbar .btn{flex:none}
.appear{padding:10px 12px}
'''
rep('@media (prefers-reduced-motion:reduce){.cd-card{transition:none}}\n</style>',
    '@media (prefers-reduced-motion:reduce){.cd-card{transition:none}}\n' + CSS + '</style>')

# ---------- barra: Home, Collezione, scansione, Progressi, Pokédex ----------
rep_between('<nav class="bar glass" aria-label="Sezioni">', '</nav>',
'''<nav class="bar glass" aria-label="Sezioni">
    <button data-go="home" aria-current="true">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/></svg><span>Home</span></button>
    <button data-go="cat">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="9" width="16" height="11" rx="2"/><path d="M6.5 6h11M9 3h6"/></svg><span>Collezione</span></button>
    <div class="scan"><button id="fab" type="button" aria-label="Aggiungi carte">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/></svg><span id="fab-n" class="badge" hidden>0</span></button></div>
    <button data-go="sets">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="9.5" y="4" width="5" height="16" rx="1"/><path d="M16.3 5.6l3.4-.9 3 14.6-3.4.9z"/></svg><span>Progressi</span></button>
    <button data-go="dex">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="4" height="4" rx="1"/><rect x="10" y="4" width="4" height="4" rx="1"/><rect x="16" y="4" width="4" height="4" rx="1"/><rect x="4" y="10" width="4" height="4" rx="1"/><rect x="10" y="10" width="4" height="4" rx="1"/><rect x="16" y="10" width="4" height="4" rx="1"/><rect x="4" y="16" width="4" height="4" rx="1"/><rect x="10" y="16" width="4" height="4" rx="1"/><rect x="16" y="16" width="4" height="4" rx="1"/></svg><span>Pokédex</span></button>
  ''')

# ---------- pannello "Aggiungi carte" e pagina Valore ----------
rep('<div id="undo" class="undo" hidden>',
'''<div id="add-back" class="sheet-back" hidden></div>
<div id="add-sheet" class="sheet addsheet" role="dialog" aria-label="Aggiungi carte" hidden>
  <div class="ashead"><h2>Aggiungi carte</h2><button class="cicon" type="button" data-ad="close" aria-label="Chiudi"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
  <p id="add-key" class="akey" hidden>Per leggere le foto serve una chiave: la inserisci in Impostazioni.</p>
  <button class="aopt primary" type="button" data-ad="quick"><span class="ai"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/></svg></span><span class="at"><b>Scansione rapida</b><span>Fotocamera sempre aperta, una carta dopo l’altra</span></span><span class="chev" aria-hidden="true">›</span></button>
  <button class="aopt" type="button" data-ad="photos"><span class="ai"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3" width="15" height="13" rx="2"/><path d="M3 7v11a2 2 0 0 0 2 2h12M9 13l3-3 4 4M14 12l1.5-1.5L19 14"/></svg></span><span class="at"><b>Da foto</b><span id="add-photos-t">Scegli una o più foto dalla galleria</span></span><span class="chev" aria-hidden="true">›</span></button>
  <button class="aopt" type="button" data-ad="search"><span class="ai"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></span><span class="at"><b>Cerca e aggiungi</b><span>Per nome o numero, senza foto</span></span><span class="chev" aria-hidden="true">›</span></button>
  <div id="add-queue"></div>
  <p id="add-prov" class="aprov"></p>
</div>
<div id="undo" class="undo" hidden>''')
rep('<section id="v-card" class="view" hidden></section>',
    '<section id="v-card" class="view" hidden></section>\n\n<section id="v-value" class="view" hidden></section>')

# ---------- Impostazioni: "Fine" e Aspetto ----------
rep('''<section id="v-set" class="view" hidden>
  <h1>Impostazioni</h1>
''','''<section id="v-set" class="view" hidden>
  <div class="setbar"><h1>Impostazioni</h1><button id="btn-setdone" class="btn small solid" type="button">Fine</button></div>

  <div class="sh">Aspetto</div>
  <div class="sgroup"><div class="appear"><div id="s-appear" class="pills eq" style="--n:3" role="group" aria-label="Aspetto"></div></div></div>
  <p class="sfoot">Automatico segue il tema dell’iPhone. Scuro: Notte blu · Chiaro: Perla.</p>
''')
rep('<select id="s-start"><option value="home">Home</option><option value="cat">Catalogo</option><option value="sets">Set</option></select>',
    '<select id="s-start"><option value="home">Home</option><option value="cat">Collezione</option><option value="sets">Progressi</option></select>')

# ---------- pagina "Cerca e aggiungi" (ex Aggiungi una carta): niente più tasto fotocamera ----------
rep('''<div class="cd-top"><button class="rbtn glass" type="button" data-a="back" aria-label="Indietro"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><div class="ttl">Aggiungi una carta</div><div style="width:52px;flex:none"></div></div>
  <button id="btn-quick" class="btn primary big" type="button">Apri la fotocamera</button>
  <input id="file" type="file" accept="image/*" capture="environment" hidden>
  <p class="muted" style="margin-top:8px">Fotografa le carte una alla volta su un fondo uniforme, con un po’ di margine intorno: l’app trova i bordi e ritaglia da sola. Dalla fotocamera puoi anche scegliere una o più foto dalla galleria.</p>
''','''<div class="cd-top"><button class="rbtn glass" type="button" data-a="back" aria-label="Indietro"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><div class="ttl" id="scan-title">Cerca e aggiungi</div><div style="width:52px;flex:none"></div></div>
  <input id="file" type="file" accept="image/*" capture="environment" hidden>
''')
rep('<details id="manual">\n    <summary>Cerca a mano o correggi</summary>', '<details id="manual" open>\n    <summary>Cerca a mano</summary>')
rep("$('btn-quick').addEventListener('click', () => { reviewJobId = null; pushView('quick', {}); });\n", '')
rep("$('btn-addcard').addEventListener('click', () => { reviewJobId = null; pushView('scan', {}); $('manual').open = true; });\n", '')

# ---------- JS: tema ----------
rep("if (cfg.gmodel === 'gemini-2.5-flash' && !(cfg.gmodels || []).length) cfg.gmodel = '';\n",
r"""if (cfg.gmodel === 'gemini-2.5-flash' && !(cfg.gmodels || []).length) cfg.gmodel = '';
/* Aspetto (come l'app nativa): Automatico segue l'iPhone, Chiaro = Perla, Scuro = Notte blu */
const APPEARANCES = [['auto', 'Automatico'], ['light', 'Chiaro'], ['dark', 'Scuro']];
const THEME_BG = {dark:'#0B1426', light:'#F2F2F7'};
const appearance = () => (cfg.appearance === 'light' || cfg.appearance === 'dark') ? cfg.appearance : 'auto';
const lightMQ = (() => { try { return window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null; } catch(e){ return null; } })();
const themeOf = (a = appearance()) => a === 'auto' ? (lightMQ && lightMQ.matches ? 'light' : 'dark') : a;
function applyTheme(){
  const t = themeOf(), r = document.documentElement;
  r.setAttribute('data-theme', t); r.style.colorScheme = t;
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', THEME_BG[t]);
  const cs = document.querySelector('meta[name="color-scheme"]'); if (cs) cs.setAttribute('content', t);
}
applyTheme();
if (lightMQ){ const onSys = () => { if (appearance() === 'auto') applyTheme(); }; try { lightMQ.addEventListener('change', onSys); } catch(e){ try { lightMQ.addListener(onSys); } catch(e2){} } }
""")

# ---------- JS: navigazione (Valore, Impostazioni come foglio) ----------
rep("""  ['home','scan','cat','set','card','sets','setd','dex','dexd','quick'].forEach(n => { $('v-' + n).hidden = n !== name; });
  const tab = keepStack ? navBase : (name === 'card' || name === 'scan' || name === 'quick' ? 'cat' : name === 'setd' ? 'sets' : name === 'dexd' ? 'dex' : name === 'set' ? 'home' : name);""",
"""  ['home','scan','cat','set','card','sets','setd','dex','dexd','quick','value'].forEach(n => { $('v-' + n).hidden = n !== name; });
  const tab = keepStack ? navBase : (name === 'card' || name === 'scan' || name === 'quick' ? 'cat' : name === 'setd' ? 'sets' : name === 'dexd' ? 'dex' : name === 'set' || name === 'value' ? 'home' : name);""")
rep("  document.body.classList.toggle('inquick', name === 'quick');\n",
    "  document.body.classList.toggle('inquick', name === 'quick');\n  document.body.classList.toggle('inset', name === 'set');\n  closeAdd();\n")
rep("$('fab').addEventListener('click', () => { reviewJobId = null; pushView('quick', {}); });\n",
    "$('fab').addEventListener('click', () => openAdd());\n")
rep("""  if (top.name === 'scan') go('scan', true);""",
"""  if (top.name === 'scan'){ go('scan', true); $('scan-title').textContent = reviewJobId ? 'Controlla la carta' : 'Cerca e aggiungi'; }
  else if (top.name === 'set') go('set', true);
  else if (top.name === 'value'){ go('value', true); renderValue(); }""")
rep("window.addEventListener('popstate', () => { if (navStack.length && ['v-card', 'v-setd', 'v-scan', 'v-dexd', 'v-quick'].some(id => !$(id).hidden)) doPop(); });",
    "window.addEventListener('popstate', () => { if (navStack.length && ['v-card', 'v-setd', 'v-scan', 'v-dexd', 'v-quick', 'v-set', 'v-value'].some(id => !$(id).hidden)) doPop(); });\nconst openSettings = () => pushView('set', {});\n$('btn-setdone').addEventListener('click', () => popView());")

# ---------- JS: grafico, Home, pagina Valore (al posto di Andamento + Home) ----------
HOME = r"""/* ---------- grafico ad area come l'app nativa: date in basso (al massimo 4), euro a destra, punti, tocco ---------- */
const CHART_MAX_DOTS = 31;
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
// giorni da mostrare sull'asse: al massimo n, distribuiti, senza doppioni, primo e ultimo compresi
function chartTickDays(days, n = 4){
  const u = [...new Set(days)].sort((a, b) => a - b); if (u.length <= n) return u;
  const out = []; for (let i = 0; i < n; i++){ const d = u[Math.round(i * (u.length - 1) / (n - 1))]; if (out[out.length - 1] !== d) out.push(d); }
  return out;
}
// "12 ott"; con l'anno ("12 ott 25") se non è l'anno in corso
function chartDayLabel(d, today = dayNow()){
  const dt = new Date(d * 864e5), y = dt.getUTCFullYear(), ty = new Date(today * 864e5).getUTCFullYear();
  return dt.getUTCDate() + ' ' + MESI[dt.getUTCMonth()] + (y !== ty ? ' ' + String(y).slice(2) : '');
}
const chartWholeEuros = vals => vals.length ? Math.max(...vals) - Math.min(...vals) >= 5 : false;
const EUR0 = new Intl.NumberFormat('it-IT', {style:'currency', currency:'EUR', maximumFractionDigits:0, minimumFractionDigits:0});
const chartEuroLabel = (v, whole) => whole ? EUR0.format(Math.round(v)) : eur(v);
// punto più vicino al giorno toccato (a parità, il primo)
const nearestPoint = (pts, day) => pts.reduce((b, p) => !b || Math.abs(p.day - day) < Math.abs(b.day - day) ? p : b, null);
// tre valori "tondi" per l'asse dei prezzi (il grafico non parte da zero)
function niceTicks(lo, hi, want = 3){
  if (!(hi > lo)){ const pad = Math.max(Math.abs(hi) * 0.05, 0.5); lo -= pad; hi += pad; }
  const raw = (hi - lo) / Math.max(1, want - 1), mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(x => x >= raw) || 10 * mag;
  const out = []; for (let v = Math.floor(lo / step) * step; v <= hi + step * 0.5 && out.length < 8; v += step) out.push(Math.round(v * 100) / 100);
  if (out[out.length - 1] < hi) out.push(Math.round((out[out.length - 1] + step) * 100) / 100);
  return out;
}
const chartReg = new Map(); let chartSeq = 0;
// pts: [{day, value}] in ordine di giorno
function areaChart(pts, h = 150, label = 'Grafico del valore'){
  const id = 'ch' + (++chartSeq), W = 340, H = h, L = 4, R = 52, T = 10, B = 22;
  const vals = pts.map(p => p.value), ticks = niceTicks(Math.min(...vals), Math.max(...vals));
  const y0 = ticks[0], y1 = ticks[ticks.length - 1], d0 = pts[0].day, d1 = pts[pts.length - 1].day;
  const X = d => L + (d1 > d0 ? (d - d0) / (d1 - d0) : 0.5) * (W - L - R), Y = v => T + (H - T - B) * (1 - (v - y0) / ((y1 - y0) || 1));
  const xy = pts.map(p => [X(p.day), Y(p.value)]);
  // linea "monotona" (come .monotone dei grafici di iOS): niente picchi inventati fra i punti
  const n = xy.length, dk = [], m = [];
  for (let i = 0; i < n - 1; i++){ const dx = xy[i + 1][0] - xy[i][0]; dk.push(dx ? (xy[i + 1][1] - xy[i][1]) / dx : 0); }
  for (let i = 0; i < n; i++) m.push(i === 0 ? dk[0] || 0 : i === n - 1 ? dk[n - 2] || 0 : (dk[i - 1] * dk[i] <= 0 ? 0 : (dk[i - 1] + dk[i]) / 2));
  let line = 'M' + xy[0][0].toFixed(1) + ' ' + xy[0][1].toFixed(1);
  for (let i = 0; i < n - 1; i++){
    const dx = (xy[i + 1][0] - xy[i][0]) / 3;
    line += ' C' + (xy[i][0] + dx).toFixed(1) + ' ' + (xy[i][1] + m[i] * dx).toFixed(1) + ' ' + (xy[i + 1][0] - dx).toFixed(1) + ' ' + (xy[i + 1][1] - m[i + 1] * dx).toFixed(1) + ' ' + xy[i + 1][0].toFixed(1) + ' ' + xy[i + 1][1].toFixed(1);
  }
  const base = (H - B).toFixed(1), area = line + ' L' + xy[n - 1][0].toFixed(1) + ' ' + base + ' L' + xy[0][0].toFixed(1) + ' ' + base + ' Z';
  const whole = chartWholeEuros(vals), tk = chartTickDays(pts.map(p => p.day));
  let g = '<defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="g0"/><stop offset="1" class="g1"/></linearGradient></defs>';
  g += ticks.map(v => '<line class="gr" x1="' + L + '" x2="' + (W - R + 4) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/><text x="' + (W - R + 8) + '" y="' + (Y(v) + 3.5).toFixed(1) + '">' + esc(chartEuroLabel(v, whole)) + '</text>').join('');
  g += '<path d="' + area + '" fill="url(#' + id + 'g)"/><path class="ln" d="' + line + '"/>';
  if (n <= CHART_MAX_DOTS) g += xy.map(q => '<circle class="dt" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="2.6"/>').join('');
  g += tk.map((d, i) => '<text x="' + X(d).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + (i === 0 ? 'start' : i === tk.length - 1 ? 'end' : 'middle') + '">' + esc(chartDayLabel(d)) + '</text>').join('');
  chartReg.set(id, {pts, X, Y, W, R, T, H, B}); if (chartReg.size > 24) chartReg.delete(chartReg.keys().next().value);
  const last = pts[n - 1];
  return '<svg class="vch" id="' + id + '" data-chart="' + id + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '. Ultimo valore ' + esc(eur(last.value)) + ' il ' + esc(chartDayLabel(last.day)) + '">' + g + '<g class="sel"></g></svg>';
}
// tocco sul grafico: linea tratteggiata e riquadro con valore e data del punto più vicino (lo scorrimento resta libero)
function chartSelect(svg, clientX){
  const c = chartReg.get(svg.dataset.chart); if (!c) return null;
  const r = svg.getBoundingClientRect(), x = r.width ? (clientX - r.left) / r.width * c.W : 0;
  let best = null, bd = Infinity; for (const p of c.pts){ const d = Math.abs(c.X(p.day) - x); if (d < bd){ bd = d; best = p; } }
  if (!best) return null;
  const px = c.X(best.day), py = c.Y(best.value), t1 = eur(best.value), t2 = chartDayLabel(best.day);
  const bw = Math.max(t1.length, t2.length) * 6.2 + 16, bx = Math.min(Math.max(px - bw / 2, 0), c.W - bw);
  svg.querySelector('.sel').innerHTML = '<line class="rl" x1="' + px.toFixed(1) + '" x2="' + px.toFixed(1) + '" y1="' + (c.T + 26) + '" y2="' + (c.H - c.B) + '"/><circle class="sd" cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="5"/>' +
    '<rect class="tb" x="' + bx.toFixed(1) + '" y="' + (c.T - 8) + '" width="' + bw.toFixed(1) + '" height="30" rx="8"/><text class="tv" x="' + (bx + bw / 2).toFixed(1) + '" y="' + (c.T + 5) + '" text-anchor="middle">' + esc(t1) + '</text><text x="' + (bx + bw / 2).toFixed(1) + '" y="' + (c.T + 17) + '" text-anchor="middle">' + esc(t2) + '</text>';
  return best;
}
document.addEventListener('click', ev => { const svg = ev.target.closest && ev.target.closest('svg[data-chart]'); if (svg) chartSelect(svg, ev.clientX); });
const vhistPoints = days => { const start = days > 0 ? dayNow() - days : -Infinity; return vhist.filter(q => q.length >= 2 && q[0] >= start).map(q => ({day:q[0], value:q[1] / 100})); };

/* ---------- Home come l'app nativa ---------- */
const ICON_SLIDERS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/></svg>';
const ICON_SEARCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
const ICON_STACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="9" width="16" height="11" rx="2"/><path d="M6.5 6h11M9 3h6M12 12v5M9.5 14.5h5"/></svg>';
function homeStats(){
  let n = 0, val = 0, miss = 0, cur = 0, base = 0, cov = 0;
  for (const e of catalog){
    n += e.qty; const u = unit(e); if (u == null) miss += e.qty; else val += u * e.qty;
    const pr = e.pr; // variazione stimata: solo carte con media a 30 giorni, prezzo di mercato (non tuo) e senza reverse holo
    if (pr && e.variant !== 'Reverse holo' && e.variant !== '1st edition' && e.priceManual == null && pr.avg30 && pr.normal != null){ cur += pr.normal * e.qty; base += pr.avg30 * e.qty; cov += e.qty; }
  }
  return {n, val, miss, cov, pct: base ? (cur - base) / base * 100 : null};
}
// carte diverse = carte distinte (stessa carta in lingue o condizioni diverse conta una volta), come la nativa
const distinctCount = () => new Set(catalog.map(e => e.cardId)).size;
// prime n carte per prezzo di una copia (le carte senza prezzo restano fuori); a parità la più recente
function topValueEntries(list = catalog, n = 12){
  return list.filter(e => unit(e) != null).sort((a, b) => (unit(b) - unit(a)) || ((b.added || 0) - (a.added || 0))).slice(0, n);
}
function tile(e){
  const u = unit(e);
  return '<button class="st" type="button" data-open="' + esc(e.key) + '" aria-label="' + esc(e.name) + '">' + artHtml(e) + '<b>' + (u != null ? eur(u) : '—') + '</b></button>';
}
function backupChip(){
  const b = backupInfo(), t = b.days == null ? 'Nessun backup' : b.days === 0 ? 'Backup oggi' : 'Backup ' + b.days + ' gg fa';
  return '<button class="bkchip' + (b.due ? ' due' : '') + '" type="button" data-a="backup" aria-label="' + esc(t) + '. Tocca per salvare un backup"><i></i>' + esc(t) + '</button>';
}
function setProgressRow(g){
  const t = totalOf(g), have = g.nums ? g.nums.size : 0, miss = Math.max(0, t - have), p = [];
  if (g.value > 0) p.push(eur(g.value));
  p.push(t > 0 ? (miss === 0 ? 'completo' : 'mancano ' + miss + (miss === 1 ? ' carta' : ' carte')) : have + (have === 1 ? ' carta' : ' carte') + ', totale non noto');
  return '<button class="sprow" type="button" data-set="' + esc(g.key) + '"><span class="logo">' + setThumb(g, metaOf(g)) + '</span><span class="bd">' +
    '<span class="t1"><b>' + esc(g.name) + '</b>' + (g.lang ? '<small>' + esc(g.lang.toUpperCase()) + '</small>' : '') + '<span' + (t > 0 && have >= t ? ' class="a"' : '') + '>' + (t > 0 ? have + ' / ' + t : have) + '</span></span>' +
    '<span class="tbar"><i style="width:' + (t > 0 ? Math.min(100, have / t * 100) : 0).toFixed(1) + '%"></i></span><span class="cap">' + esc(p.join(' · ')) + '</span></span></button>';
}
const moverRow = (r, col) => '<button class="mrow" type="button" data-open="' + esc(r.e.key) + '">' + artHtml(r.e) +
  '<span class="t"><b>' + esc(r.e.name) + '</b><span style="color:' + col + '">' + signed(r.d) + '</span><span class="pc" style="color:' + col + '">' + signedPct(r.pct) + '</span></span></button>';
function renderHome(){
  recordValue(); // aprire l'app ogni giorno basta a far crescere lo storico del valore
  const st = homeStats(), groups = groupSets();
  let h = '<div class="hdr"><h1>Album</h1><div class="hbtns">' + (catalog.length ? backupChip() : '') +
    '<button id="hm-gear" class="cicon" type="button" data-a="settings" aria-label="Impostazioni">' + ICON_SLIDERS + '</button></div></div>';
  if (!catalog.length){
    h += '<div class="empty2">' + ICON_STACK + '<b>Nessuna carta</b><p>Tocca il tasto giallo in basso per fotografare la prima, oppure ripristina un backup dalle Impostazioni.</p>' +
      '<button class="btn solid" type="button" data-a="add">Aggiungi la prima carta</button></div>';
    $('v-home').innerHTML = h; return;
  }
  { const bi = backupInfo(); if (bi.due && !bi.snoozed)
    h += '<div class="pnl hl bknote" style="margin:0 0 22px"><h3>Fai un backup</h3><p class="muted" style="margin:0 0 10px">' + esc(backupText(bi)) + '</p><div class="trow"><button class="pbtn solid" type="button" data-a="backup">Salva backup</button><button class="pbtn" type="button" data-a="bklater">Più tardi</button></div></div>'; }
  // valore della collezione: variazione dei soli prezzi nel periodo scelto, carte / diverse / set a destra, grafico
  { const mv = priceMovers(homeRange), pct = mv.bTot > 0 ? mv.dTot / mv.bTot * 100 : null, vs = eur(st.val), pts = vhistPoints(homeRange);
    h += '<div class="pnl vcard"><div class="vtop"><span>Valore della collezione</span><button class="lnk" type="button" data-a="value" aria-label="Dettagli: andamento del valore">Dettagli ›</button></div>' +
      '<div class="vrow"><div class="vl"><div class="vbig' + sizeCls(vs, 9, 11) + '">' + vs + '</div>' +
      (pct != null && Math.abs(pct) >= 0.05 ? '<span class="vpill ' + (pct >= 0 ? 'up' : 'down') + '">' + (pct >= 0 ? '▲ ' : '▼ ') + signedPct(pct).slice(1) + '</span>' : '') +
      (pct != null ? '<span class="cap">prezzi rispetto a ' + (homeRange ? homeRange + ' giorni fa' : 'l’inizio') + '</span>' : '') +
      (st.miss ? '<span class="cap warn">' + st.miss + (st.miss === 1 ? ' carta senza prezzo' : ' carte senza prezzo') + '</span>' : '') + '</div>' +
      '<div class="vside"><div><b class="a">' + fmtN(st.n) + '</b><span>' + (st.n === 1 ? 'carta' : 'carte') + '</span></div><div><b>' + fmtN(distinctCount()) + '</b><span>diverse</span></div><div><b>' + fmtN(groups.length) + '</b><span>set</span></div></div></div>' +
      (pts.length >= 2 ? areaChart(pts, 150) : '<div class="chnote">Il grafico si riempie con i giorni: serve almeno un secondo aggiornamento dei prezzi.</div>') +
      '<div class="pbrow eq" role="group" aria-label="Periodo">' + [[7, '7 gg'], [30, '30 gg'], [90, '90 gg'], [0, 'Tutto']].map(r => '<button class="pb" type="button" data-r="' + r[0] + '" aria-pressed="' + (homeRange === r[0]) + '">' + r[1] + '</button>').join('') + '</div></div>'; }
  const top = topValueEntries();
  if (top.length) h += '<div class="sec2"><h2>Carte di maggior valore</h2><button class="lnk" type="button" data-a="allcards">Tutte</button></div><div class="strip">' + top.map(tile).join('') + '</div>';
  const recent = catalog.slice().sort((a, b) => (b.added || 0) - (a.added || 0)).slice(0, 12);
  h += '<div class="sec2"><h2>Ultime aggiunte</h2><button class="lnk" type="button" data-a="recentcards">Tutte</button></div><div class="strip">' + recent.map(tile).join('') + '</div>';
  { const rows = priceMovers(30).rows, ups = rows.filter(r => r.d > 0.004).sort((a, b) => b.d - a.d).slice(0, 3), downs = rows.filter(r => r.d < -0.004).sort((a, b) => a.d - b.d).slice(0, 3);
    if (ups.length || downs.length){
      const box = (t, list, col) => '<div class="mv"><h3>' + t + '</h3>' + (list.length ? list.map(r => moverRow(r, col)).join('') : '<span class="cap">Nessuna</span>') + '</div>';
      h += '<div class="sec2"><h2>Si sono mossi (30 gg)</h2></div><div class="movers">' + box('Salite', ups, 'var(--ok)') + box('Scese', downs, 'var(--danger)') + '</div>';
    } }
  { const open = groups.filter(g => { const t = totalOf(g); return t === 0 || g.nums.size < t; }).sort((a, b) => b.last - a.last).slice(0, 3);
    if (open.length) h += '<div class="sec2"><h2>Set in corso</h2><button class="lnk" type="button" data-a="allsets">Tutti</button></div>' + open.map(setProgressRow).join(''); }
  $('v-home').innerHTML = h;
  loadMeta(['it', 'en', 'ja']).then(ch => { if (ch && !$('v-home').hidden) renderHome(); });
}
$('v-home').addEventListener('click', ev => {
  if (ev.target.closest('svg[data-chart]')) return;
  const rb = ev.target.closest('[data-r]'); if (rb){ homeRange = parseInt(rb.dataset.r, 10); renderHome(); return; }
  const o = ev.target.closest('[data-open]'); if (o){ pushView('card', {key:o.dataset.open}); return; }
  const s = ev.target.closest('[data-set]'); if (s){ pushView('setd', {key:s.dataset.set}); return; }
  const b = ev.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a;
  if (a === 'add') openAdd();
  else if (a === 'settings') openSettings();
  else if (a === 'value') pushView('value', {});
  else if (a === 'allcards'){ cfg.albumSort = 'value'; LS.set('pkm_cfg', cfg); go('cat'); }
  else if (a === 'recentcards'){ cfg.albumSort = 'recent'; LS.set('pkm_cfg', cfg); go('cat'); }
  else if (a === 'allsets') go('sets');
  else if (a === 'backup') doBackup();
  else if (a === 'bklater'){ LS.set('pkm_bksnooze', Date.now() + 864e5); renderHome(); }
});

/* ---------- pagina Valore: periodo, grafico, variazione totale, carte che sono cambiate di più ---------- */
let valueRange = 30;
function renderValue(){
  const mv = priceMovers(valueRange), rows = mv.rows.slice().sort((a, b) => Math.abs(b.d) - Math.abs(a.d)), pts = vhistPoints(valueRange);
  let h = '<div class="cd-top"><button class="rbtn glass" type="button" data-a="back" aria-label="Indietro">' + ICON_BACK + '</button><div class="ttl">Valore</div><div style="width:52px;flex:none"></div></div>' +
    '<div class="seg" role="group" aria-label="Periodo" style="margin-top:0">' + [[7, '7 giorni'], [30, '30 giorni'], [90, '90 giorni'], [0, 'Tutto']].map(r => '<button type="button" data-r="' + r[0] + '" aria-pressed="' + (valueRange === r[0]) + '">' + r[1] + '</button>').join('') + '</div>' +
    '<div class="pnl" style="margin-top:0">' + (pts.length >= 2 ? areaChart(pts, 200) : '<div class="chnote">Il grafico si riempie con i giorni: serve almeno un secondo aggiornamento dei prezzi.</div>') + '</div>';
  if (rows.length){
    const col = mv.dTot >= 0 ? 'var(--ok)' : 'var(--danger)';
    h += '<div class="pnl trow" style="justify-content:space-between"><span>Variazione totale</span><span><b style="color:' + col + '">' + signed(mv.dTot) + '</b>' + (mv.bTot > 0 ? ' <span class="muted">(' + signedPct(mv.dTot / mv.bTot * 100) + ')</span>' : '') + '</span></div>' +
      '<div class="sec2"><h2 style="font-size:1rem">Carte che sono cambiate di più</h2></div><div class="pnl vrows" style="margin-top:0;padding:0 14px">' +
      rows.slice(0, 30).map(r => '<button class="vrow2" type="button" data-open="' + esc(r.e.key) + '">' + artHtml(r.e) + '<span class="t"><b>' + esc(r.e.name) + '</b><span class="cap">' + signedPct(r.pct) + '</span></span><span class="v" style="color:' + (r.d >= 0 ? 'var(--ok)' : 'var(--danger)') + '">' + signed(r.d) + '</span></button>').join('') + '</div>';
  }
  $('v-value').innerHTML = h;
}
$('v-value').addEventListener('click', ev => {
  if (ev.target.closest('svg[data-chart]')) return;
  const rb = ev.target.closest('[data-r]'); if (rb){ valueRange = parseInt(rb.dataset.r, 10); renderValue(); return; }
  const o = ev.target.closest('[data-open]'); if (o){ pushView('card', {key:o.dataset.open}); return; }
  if (ev.target.closest('[data-a="back"]')) popView();
});

/* ---------- pannello "Aggiungi carte": Scansione rapida, Da foto, Cerca e aggiungi, coda e servizio in uso ---------- */
function queueSummary(){
  const act = qJobs.filter(j => j.status === 'queued' || j.status === 'reading').length + prepList.length;
  const rev = qJobs.filter(j => j.status === 'review' || j.status === 'error' || j.status === 'edges').length;
  const add = qJobs.filter(j => j.status === 'added').length, p = [];
  if (act) p.push(act + ' in lettura'); if (rev) p.push(rev + ' da controllare'); if (add) p.push(add + (add === 1 ? ' aggiunta' : ' aggiunte'));
  return {act, rev, add, text: p.length ? p.join(' · ') : 'Coda vuota'};
}
function renderAddSheet(){
  $('add-key').hidden = !!(cfg.provider === 'gemini' ? cfg.gkey : cfg.key);
  const q = queueSummary(), any = q.act || q.rev || q.add;
  $('add-queue').innerHTML = any ? '<div class="aqueue">' + (q.act ? '<i class="spin" aria-hidden="true"></i>' : '<i class="dot" aria-hidden="true"></i>') + '<span>' + esc(q.text) + '</span><button class="pbtn solid" type="button" data-ad="queue">' + (q.rev ? 'Controlla' : 'Riprendi') + '</button></div>' : '';
  $('add-prov').textContent = 'Riconoscimento con ' + (cfg.provider === 'claude' ? 'Claude' : 'Gemini') + ' · cambia in Impostazioni';
}
function openAdd(){ renderAddSheet(); $('add-back').hidden = false; $('add-sheet').hidden = false; }
function closeAdd(){ $('add-back').hidden = true; $('add-sheet').hidden = true; }
$('add-back').addEventListener('click', closeAdd);
$('add-sheet').addEventListener('click', ev => {
  const b = ev.target.closest('[data-ad]'); if (!b) return;
  const a = b.dataset.ad; closeAdd();
  if (a === 'quick'){ reviewJobId = null; pushView('quick', {}); }
  else if (a === 'photos') $('q-file').click();
  else if (a === 'search'){ reviewJobId = null; resetScan(); pushView('scan', {}); $('manual').open = true; }
  else if (a === 'queue') pushView('quick', {nocam:true});
});

"""
rep_between("/* ---------- Andamento del valore e carte salite o scese (Home) ---------- */", "/* ---------- Pokédex, categorie e avanzamento ---------- */",
r"""/* ---------- variazione dei prezzi nel periodo (Home, Valore) ---------- */
let homeRange = 30;
// di quanto sono cambiati i prezzi nel periodo, carta per carta (le carte con il tuo prezzo manuale non contano)
function priceMovers(days){
  const t = dayNow(), start = days ? t - days : -1e9, rows = []; let dTot = 0, bTot = 0;
  for (const e of catalog){
    if (e.priceManual != null || e.price == null) continue;
    const s = hist[histKey(e)]; if (!s || !s.length) continue;
    let base = null, baseDay = null;
    for (const q of s){ if (q[0] <= start){ base = q[1]; baseDay = q[0]; } }
    if (base == null){ base = s[0][1]; baseDay = s[0][0]; } // la serie parte dopo l'inizio del periodo: si parte dal primo punto
    if (baseDay >= t) continue;                              // serve almeno un giorno di storia
    const b = base / 100; if (!(b > 0)) continue;
    const k = condCoef(e.cond), d = (e.price - b) * k * e.qty;
    rows.push({e, d, pct:(e.price - b) / b * 100});
    dTot += d; bTot += b * k * e.qty;
  }
  return {rows, dTot, bTot};
}
const signed = v => (v >= 0 ? '+' : '−') + eur(Math.abs(v));
const signedPct = p => (p >= 0 ? '+' : '−') + Math.abs(p).toFixed(1).replace('.', ',') + '%';
""" + HOME)

# ---------- impostazioni: Aspetto ----------
rep("function renderSettings(){\n  $('s-model').value = cfg.model;\n",
    "function renderAppearance(){ $('s-appear').innerHTML = APPEARANCES.map(a => '<button type=\"button\" data-ap=\"' + a[0] + '\" aria-pressed=\"' + (appearance() === a[0]) + '\">' + a[1] + '</button>').join(''); }\n"
    "$('s-appear').addEventListener('click', ev => { const b = ev.target.closest('[data-ap]'); if (!b) return; cfg.appearance = b.dataset.ap; LS.set('pkm_cfg', cfg); applyTheme(); renderAppearance(); });\n"
    "function renderSettings(){\n  renderAppearance();\n  $('s-model').value = cfg.model;\n")

open(p,'w',encoding='utf-8').write(s)
open('/home/claude/app.js','w',encoding='utf-8').write(re.search(r'<script>\n(.*)</script>',s,re.S).group(1))
print('ok')
