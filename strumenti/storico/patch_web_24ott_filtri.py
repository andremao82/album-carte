# 24/10/2026: filtri Tipo e Rarità nella Collezione, "Altri filtri" a pillole
import os, subprocess
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = R if os.path.isdir(os.path.join(R, 'app')) else os.path.dirname(R)
FILE = os.path.join(R, 'app', 'index.html')
s = open(FILE, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, (old[:100], s.count(old))
    s = s.replace(old, new)

# --- pannello Altri filtri a pillole
rep('''    <div class="row"><div class="field"><label for="cf-var">Variante</label><select id="cf-var"></select></div>
      <div class="field"><label for="cf-cond">Condizione</label><select id="cf-cond"></select></div></div>
    <button id="cf-manual" class="pb" type="button" aria-pressed="false">Solo con il mio prezzo</button>''',
'''    <div class="fsec"><span class="flbl">Variante</span><div id="cf-var" class="pbrow scroll" role="group" aria-label="Variante"></div></div>
    <div class="fsec"><span class="flbl">Condizione</span><div id="cf-cond" class="pbrow scroll" role="group" aria-label="Condizione"></div></div>
    <div class="fsec"><span class="flbl">Prezzo</span><div class="pbrow"><button id="cf-manual" class="pb" type="button" aria-pressed="false">Solo con il mio prezzo</button></div></div>''')
rep('#fpanel{margin:-4px 0 12px}',
'''#fpanel{margin:-4px 0 12px}
#fpanel .fsec+.fsec{margin-top:12px}
#fpanel .flbl{display:block;font-size:.8rem;font-weight:600;color:var(--ink2);margin:0 0 6px 2px}
#fpanel .pbrow{margin:0}
#fpanel .pbrow.scroll{margin:0 -16px;padding:0 16px 2px}
#fpanel .pb{background:var(--surface2)}
#fpanel .pb[aria-pressed=true]{background:var(--accent-fill)}
#fpanel .pb .n{font-weight:500;opacity:.6;font-size:.8rem}''')

# --- tipi e rarità: nomi in italiano
rep("const normCat = s => {",
"""// tipi delle carte in italiano (TCGdex in italiano li dà già così; inglese e giapponese in inglese)
const TYPE_IT = {grass:'Erba', fire:'Fuoco', water:'Acqua', lightning:'Lampo', psychic:'Psico', fighting:'Lotta', darkness:'Oscurità', metal:'Metallo', fairy:'Folletto', dragon:'Drago', colorless:'Incolore'};
const TYPE_ORDER = ['Erba', 'Fuoco', 'Acqua', 'Lampo', 'Psico', 'Lotta', 'Oscurità', 'Metallo', 'Folletto', 'Drago', 'Incolore', 'Allenatore', 'Energia'];
const normTypes = a => [...new Set((Array.isArray(a) ? a : []).map(t => TYPE_IT[String(t).toLowerCase()] || String(t)).filter(Boolean))];
// tipo per il filtro: Allenatori ed Energie come voce a parte; null = non ancora letto
const typeKeys = e => e.cat === 'Trainer' ? ['Allenatore'] : e.cat === 'Energy' ? ['Energia'] : Array.isArray(e.types) ? e.types : null;
// rarità: quelle inglesi (Pokémon TCG API, TCGdex inglese) con il nome italiano di TCGdex
const RAR_IT = {'common':'Comune', 'uncommon':'Non comune', 'rare':'Rara', 'rare holo':'Olografica Rara', 'holo rare':'Olografica Rara', 'rare holo v':'Olografica Rara V', 'holo rare v':'Olografica Rara V',
  'rare holo vmax':'Olografica Rara VMAX', 'holo rare vmax':'Olografica Rara VMAX', 'rare holo vstar':'Olografica Rara VSTAR', 'holo rare vstar':'Olografica Rara VSTAR', 'double rare':'Rara doppia',
  'ultra rare':'Ultrarara', 'rare ultra':'Ultrarara', 'illustration rare':'Rara illustrazione', 'special illustration rare':'Rara illustrazione speciale', 'hyper rare':'Rara iper', 'rare rainbow':'Rara iper',
  'secret rare':'Segreto rara', 'rare secret':'Segreto rara', 'ace spec rare':'Rara Asso tattico', 'rara asso tattico':'Rara Asso tattico', 'shiny rare':'Rara Lucente', 'rare shiny':'Rara Lucente', 'radiant rare':'Rara radiosa', 'promo':'Promo'};
const rarityName = r => { const t = String(r || '').trim(); if (!t || /^(none|nessuna)$/i.test(t)) return ''; return RAR_IT[t.toLowerCase()] || t; };
const RAR_ORDER = ['Comune', 'Non comune', 'Rara', 'Olografica Rara', 'Olografica Rara V', 'Olografica Rara VMAX', 'Olografica Rara VSTAR', 'Rara doppia', 'Ultrarara', 'Rara illustrazione', 'Rara illustrazione speciale', 'Rara iper', 'Segreto rara', 'Rara Asso tattico', 'Rara Lucente', 'Promo'];
const normCat = s => {""")
rep("const ptcgExtra = c => { const cat = normCat(c.supertype); return {",
    "const ptcgExtra = c => { const cat = normCat(c.supertype); return {...(Array.isArray(c.types) || c.supertype ? {types:normTypes(c.types)} : {}), ")
rep("select:'id,cardmarket,tcgplayer,nationalPokedexNumbers,supertype,artist,subtypes'", "select:'id,cardmarket,tcgplayer,nationalPokedexNumbers,supertype,artist,subtypes,types'", 2)
rep("select:'id,nationalPokedexNumbers,supertype,artist,subtypes'", "select:'id,nationalPokedexNumbers,supertype,artist,subtypes,types'")
# TCGdex: i tipi ci sono solo nella carta completa (con la categoria)
rep("tt:c.trainerType || '', ill:c.illustrator || '',\n    name:c.name",
    "tt:c.trainerType || '', ill:c.illustrator || '', ...(Array.isArray(c.types) || c.category ? {types:normTypes(c.types)} : {}),\n    name:c.name")
rep("  if (c.cat !== undefined){ e.cat = c.cat; e.tt = c.tt || ''; e.ill = c.ill || ''; }\n",
    "  if (c.cat !== undefined){ e.cat = c.cat; e.tt = c.tt || ''; e.ill = c.ill || ''; }\n  if (Array.isArray(c.types)) e.types = normTypes(c.types);\n  if (!e.rarity && c.rarity) e.rarity = c.rarity;\n")
rep("...(c.cat !== undefined ? {cat:c.cat, tt:c.tt || '', ill:c.ill || ''} : {}), ...(extra || {})});",
    "...(c.cat !== undefined ? {cat:c.cat, tt:c.tt || '', ill:c.ill || ''} : {}), ...(Array.isArray(c.types) ? {types:normTypes(c.types)} : {}), ...(extra || {})});")
# lettura una tantum: anche tipo e rarità mancante
rep("const need = catalog.filter(e => !Array.isArray(e.dex) || e.cat === undefined || e.ill === undefined); if (!need.length) return;",
    "const need = catalog.filter(e => !Array.isArray(e.dex) || e.cat === undefined || e.ill === undefined || !Array.isArray(e.types)); if (!need.length) return;")
rep("""          const info = d ? {dex:Array.isArray(d.dexId) ? d.dexId : [], cat:normCat(d.category), tt:d.trainerType || '', ill:d.illustrator || ''} : {dex:[], cat:'', tt:'', ill:''};
          for (const e of td.get(k)) Object.assign(e, info);""",
"""          const info = d ? {dex:Array.isArray(d.dexId) ? d.dexId : [], cat:normCat(d.category), tt:d.trainerType || '', ill:d.illustrator || '', types:normTypes(d.types)} : {dex:[], cat:'', tt:'', ill:'', types:[]};
          for (const e of td.get(k)){ Object.assign(e, info); if (!e.rarity && d && d.rarity) e.rarity = d.rarity; }""")
rep("for (const e of part) Object.assign(e, m.get(e.cardId) || {dex:[], cat:'', tt:'', ill:''});",
    "for (const e of part) Object.assign(e, m.get(e.cardId) || {dex:[], cat:'', tt:'', ill:'', types:[]});")
rep("    if (!$('v-dex').hidden) renderDex(); if (!$('v-home').hidden) renderHome(); if (!$('v-sets').hidden) renderSets();",
    "    if (!$('v-dex').hidden) renderDex(); if (!$('v-home').hidden) renderHome(); if (!$('v-sets').hidden) renderSets(); if (!$('v-cat').hidden) renderCatalog();")
# Collezione: legge in sottofondo il tipo delle carte che non l'hanno (al massimo ogni 10 minuti)
rep("  if (name === 'cat') renderCatalog();\n",
    "  if (name === 'cat'){ renderCatalog(); readTypesSoon(); }\n")
rep("// legge dalle carte, una sola volta, Pokémon, categoria, tipo di Allenatore e artista",
"""let typesTry = 0;
function readTypesSoon(){
  if (dexFill.running || navigator.onLine === false || Date.now() - typesTry < 600000) return;
  if (!catalog.some(e => !Array.isArray(e.types))) return;
  typesTry = Date.now(); backfillDex();
}
// legge dalle carte, una sola volta, Pokémon, categoria, tipo (Erba, Acqua…), tipo di Allenatore e artista""")

# --- filtri
rep("const cf = {lang:'', set:'', dup:false, noprice:false, variant:'', cond:'', manual:false};",
    "const cf = {lang:'', set:'', type:'', rar:'', dup:false, noprice:false, variant:'', cond:'', manual:false};")
rep("  if (cf.dup && !(e.qty > 1)) return false;\n",
    "  if (cf.type && !(typeKeys(e) || []).includes(cf.type)) return false;\n  if (cf.rar && rarityName(e.rarity) !== cf.rar) return false;\n  if (cf.dup && !(e.qty > 1)) return false;\n")
rep("const anyFilter = () => !!(cf.lang || cf.set || cf.dup",
    "const anyFilter = () => !!(cf.lang || cf.set || cf.type || cf.rar || cf.dup")
rep("function clearFilters(){ Object.assign(cf, {lang:'', set:'', dup:false,",
    "function clearFilters(){ Object.assign(cf, {lang:'', set:'', type:'', rar:'', dup:false,")
rep("""  const more = !!(cf.variant || cf.cond || cf.manual);
  $('c-chips').innerHTML""",
"""  const more = !!(cf.variant || cf.cond || cf.manual);
  const by = fn => { const m = new Map(); for (const e of catalog) for (const k of [].concat(fn(e) || [])){ if (k) m.set(k, (m.get(k) || 0) + e.qty); } return m; };
  const T = by(typeKeys), Rr = by(e => rarityName(e.rarity)), V = by(e => e.variant), C = by(e => e.cond);
  const unread = catalog.filter(e => !typeKeys(e)).length;
  if (cf.type && !T.has(cf.type)) cf.type = '';
  if (cf.rar && !Rr.has(cf.rar)) cf.rar = '';
  if (cf.variant && !V.has(cf.variant)) cf.variant = '';
  if (cf.cond && !C.has(cf.cond)) cf.cond = '';
  const menu = (id, label, cur, all, m, order) => '<span class="pb menu" aria-pressed="' + !!cur + '"><span>' + esc(cur || label) + '</span><select id="' + id + '" aria-label="' + label + '">' +
    optHtml(all, m, k => k, cur, order) + (id === 'cf-type' && unread ? '<option disabled>' + unread + (unread === 1 ? ' carta' : ' carte') + ' ancora da leggere</option>' : '') + '</select></span>';
  $('c-chips').innerHTML""")
rep("""    '<button class="pb" type="button" data-qf="dup" aria-pressed="' + cf.dup + '">Doppioni</button>' +""",
"""    menu('cf-type', 'Tipo', cf.type, 'Tutti i tipi', T, TYPE_ORDER) + menu('cf-rar', 'Rarità', cf.rar, 'Tutte le rarità', Rr, RAR_ORDER) +
    '<button class="pb" type="button" data-qf="dup" aria-pressed="' + cf.dup + '">Doppioni</button>' +""")
rep("""  const by = fn => { const m = new Map(); for (const e of catalog){ const k = fn(e); m.set(k, (m.get(k) || 0) + e.qty); } return m; };
  const V = by(e => e.variant), C = by(e => e.cond);
  if (cf.variant && !V.has(cf.variant)) cf.variant = '';
  if (cf.cond && !C.has(cf.cond)) cf.cond = '';
  $('cf-var').innerHTML = optHtml('Tutte', V, k => k, cf.variant, VARS);
  $('cf-cond').innerHTML = optHtml('Tutte', C, k => { const c = CONDS.find(x => x[0] === k); return c ? c[0] + ' – ' + c[1] : k; }, cf.cond, CONDS.map(c => c[0]));""",
"""  $('cf-var').innerHTML = pillsHtml('variant', V, k => k, cf.variant, VARS);
  $('cf-cond').innerHTML = pillsHtml('cond', C, k => k, cf.cond, CONDS.map(c => c[0]), k => { const c = CONDS.find(x => x[0] === k); return c ? c[1] : ''; });""")
rep("function optHtml(label, m, nameOf, cur, order){\n  const keys = [...m.keys()].sort((a, b) => order ? (order.indexOf(a) < 0 ? 99 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 99 : order.indexOf(b)) || String(a).localeCompare(String(b)) : String(nameOf(a)).localeCompare(String(nameOf(b))));\n",
"""const sortKeys = (m, nameOf, order) => [...m.keys()].sort((a, b) => order ? (order.indexOf(a) < 0 ? 99 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 99 : order.indexOf(b)) || String(a).localeCompare(String(b)) : String(nameOf(a)).localeCompare(String(nameOf(b))));
// "Altri filtri": una fila di pillole per campo (Tutte + i valori presenti, con il numero di carte)
function pillsHtml(field, m, nameOf, cur, order, titleOf){
  return '<button class="pb" type="button" data-fv="' + field + '" data-v="" aria-pressed="' + !cur + '">Tutte</button>' + sortKeys(m, nameOf, order).map(k =>
    '<button class="pb" type="button" data-fv="' + field + '" data-v="' + esc(k) + '" aria-pressed="' + (k === cur) + '"' + (titleOf && titleOf(k) ? ' title="' + esc(titleOf(k)) + '"' : '') + '>' + esc(nameOf(k)) + ' <span class="n">' + m.get(k) + '</span></button>').join('');
}
function optHtml(label, m, nameOf, cur, order){
  const keys = sortKeys(m, nameOf, order);
""")
rep("$('c-chips').addEventListener('change', ev => { const t = ev.target; if (t.id === 'cf-lang') cf.lang = t.value; else if (t.id === 'cf-set') cf.set = t.value; else return; renderCatalog(); });",
    "$('c-chips').addEventListener('change', ev => { const t = ev.target; if (t.id === 'cf-lang') cf.lang = t.value; else if (t.id === 'cf-set') cf.set = t.value; else if (t.id === 'cf-type') cf.type = t.value; else if (t.id === 'cf-rar') cf.rar = t.value; else return; renderCatalog(); });")
rep("""$('cf-var').addEventListener('change', () => { cf.variant = $('cf-var').value; renderCatalog(); });
$('cf-cond').addEventListener('change', () => { cf.cond = $('cf-cond').value; renderCatalog(); });""",
"""$('fpanel').addEventListener('click', ev => { const b = ev.target.closest('[data-fv]'); if (!b) return; cf[b.dataset.fv] = b.dataset.v; renderCatalog(); });""")
# scheda: rarità con il nome italiano
rep("(e.rarity ? '<div class=\"cd-rar\"><span class=\"chip2 p\">' + esc(e.rarity) + '</span></div>' : '')",
    "(rarityName(e.rarity) ? '<div class=\"cd-rar\"><span class=\"chip2 p\">' + esc(rarityName(e.rarity)) + '</span></div>' : '')")
rep("/* filtri: Lingua e Set a menu, Doppioni e Senza prezzo (come la nativa); variante, condizione e prezzo mio in \"Altri filtri\" */",
    "/* filtri: Lingua, Set, Tipo e Rarità a menu, Doppioni e Senza prezzo; variante, condizione e prezzo mio a pillole in \"Altri filtri\" */")
open(FILE, 'w', encoding='utf-8').write(s)
subprocess.run(['python3', os.path.join(R, 'strumenti', 'estrai_js.py')], check=True)
print('ok')
