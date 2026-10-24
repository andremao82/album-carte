# 24/10/2026: niente pannello "Altri filtri": variante, condizione e prezzo mio nella fila delle pillole
import os, subprocess
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = R if os.path.isdir(os.path.join(R, 'app')) else os.path.dirname(R)
FILE = os.path.join(R, 'app', 'index.html')
s = open(FILE, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, (old[:100], s.count(old))
    s = s.replace(old, new)
rep('#fpanel{margin:0 0 14px}\n', '')
rep('''#fpanel{margin:-4px 0 12px}
#fpanel .fsec+.fsec{margin-top:12px}
#fpanel .flbl{display:block;font-size:.8rem;font-weight:600;color:var(--ink2);margin:0 0 6px 2px}
#fpanel .pbrow{margin:0}
#fpanel .pbrow.scroll{margin:0 -16px;padding:0 16px 2px}
#fpanel .pb{background:var(--surface2)}
#fpanel .pb[aria-pressed=true]{background:var(--accent-fill)}
#fpanel .pb .n{font-weight:500;opacity:.6;font-size:.8rem}
''', '')
rep('''  <div id="fpanel" class="panel" hidden>
    <div class="fsec"><span class="flbl">Variante</span><div id="cf-var" class="pbrow scroll" role="group" aria-label="Variante"></div></div>
    <div class="fsec"><span class="flbl">Condizione</span><div id="cf-cond" class="pbrow scroll" role="group" aria-label="Condizione"></div></div>
    <div class="fsec"><span class="flbl">Prezzo</span><div class="pbrow"><button id="cf-manual" class="pb" type="button" aria-pressed="false">Solo con il mio prezzo</button></div></div>
  </div>
''', '')
rep("  const more = !!(cf.variant || cf.cond || cf.manual);\n", '')
rep("""  const menu = (id, label, cur, all, m, order) => '<span class="pb menu" aria-pressed="' + !!cur + '"><span>' + esc(cur || label) + '</span><select id="' + id + '" aria-label="' + label + '">' +
    optHtml(all, m, k => k, cur, order)""",
"""  const condName = k => { const c = CONDS.find(x => x[0] === k); return c ? c[0] + ' – ' + c[1] : k; };
  const menu = (id, label, cur, all, m, order, nameOf) => '<span class="pb menu" aria-pressed="' + !!cur + '"><span>' + esc(cur || label) + '</span><select id="' + id + '" aria-label="' + label + '">' +
    optHtml(all, m, nameOf || (k => k), cur, order)""")
rep("""    '<button class="pb" type="button" data-qf="noprice" aria-pressed="' + cf.noprice + '">Senza prezzo</button>' +
    '<button class="pb" type="button" data-qf="more" aria-pressed="' + more + '" aria-expanded="' + !$('fpanel').hidden + '">Altri filtri</button>';
  $('cf-var').innerHTML = pillsHtml('variant', V, k => k, cf.variant, VARS);
  $('cf-cond').innerHTML = pillsHtml('cond', C, k => k, cf.cond, CONDS.map(c => c[0]), k => { const c = CONDS.find(x => x[0] === k); return c ? c[1] : ''; });
  $('cf-manual').setAttribute('aria-pressed', String(cf.manual));
}""",
"""    menu('cf-var', 'Variante', cf.variant, 'Tutte le varianti', V, VARS) + menu('cf-cond', 'Condizione', cf.cond, 'Tutte le condizioni', C, CONDS.map(c => c[0]), condName) +
    '<button class="pb" type="button" data-qf="noprice" aria-pressed="' + cf.noprice + '">Senza prezzo</button>' +
    '<button class="pb" type="button" data-qf="manual" aria-pressed="' + cf.manual + '">Prezzo mio</button>';
}""")
rep("""// "Altri filtri": una fila di pillole per campo (Tutte + i valori presenti, con il numero di carte)
function pillsHtml(field, m, nameOf, cur, order, titleOf){
  return '<button class="pb" type="button" data-fv="' + field + '" data-v="" aria-pressed="' + !cur + '">Tutte</button>' + sortKeys(m, nameOf, order).map(k =>
    '<button class="pb" type="button" data-fv="' + field + '" data-v="' + esc(k) + '" aria-pressed="' + (k === cur) + '"' + (titleOf && titleOf(k) ? ' title="' + esc(titleOf(k)) + '"' : '') + '>' + esc(nameOf(k)) + ' <span class="n">' + m.get(k) + '</span></button>').join('');
}
""", '')
rep("""  if (v === 'all'){ clearFilters(); $('fpanel').hidden = true; }
  else if (v === 'more') $('fpanel').hidden = !$('fpanel').hidden;
  else cf[v] = !cf[v];""", """  if (v === 'all') clearFilters();
  else cf[v] = !cf[v];""")
rep("else if (t.id === 'cf-rar') cf.rar = t.value; else return;",
    "else if (t.id === 'cf-rar') cf.rar = t.value; else if (t.id === 'cf-var') cf.variant = t.value; else if (t.id === 'cf-cond') cf.cond = t.value; else return;")
rep("""$('fpanel').addEventListener('click', ev => { const b = ev.target.closest('[data-fv]'); if (!b) return; cf[b.dataset.fv] = b.dataset.v; renderCatalog(); });
$('cf-manual').addEventListener('click', () => { cf.manual = !cf.manual; renderCatalog(); });
""", '')
rep("/* filtri: Lingua, Set, Tipo e Rarità a menu, Doppioni e Senza prezzo; variante, condizione e prezzo mio a pillole in \"Altri filtri\" */",
    "/* filtri tutti nella fila di pillole: Lingua, Set, Tipo, Rarità, Variante e Condizione a menu; Doppioni, Senza prezzo e Prezzo mio da accendere */")
open(FILE, 'w', encoding='utf-8').write(s)
subprocess.run(['python3', os.path.join(R, 'strumenti', 'estrai_js.py')], check=True)
print('ok')
