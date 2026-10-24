# 24/10/2026: filtro Sigla nella Collezione (ex, EX, GX, V, VMAX, VSTAR…), dal nome della carta
import os, subprocess
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = R if os.path.isdir(os.path.join(R, 'app')) else os.path.dirname(R)
FILE = os.path.join(R, 'app', 'index.html')
s = open(FILE, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, (old[:100], s.count(old))
    s = s.replace(old, new)
rep("const normCat = s => {",
"""// sigla in fondo al nome ("Charizard ex", "Charizard-ex" di TCGdex, "Charizard-EX", "Pikachu V ASTRO" = VSTAR); ex ed EX restano distinte
const SIGLE = ['ex', 'EX', 'GX', 'V', 'VMAX', 'VSTAR', 'V-UNION', 'BREAK', 'LV.X'];
function siglaOf(name){
  const m = String(name || '').trim().match(/(?:^|[\\s-])(ex|EX|GX|VMAX|VSTAR|V ASTRO|V-UNION|V|BREAK|LV\\.\\s?X)$/i); if (!m) return '';
  const t = m[1].replace(/\\s/g, '');
  if (t === 'ex' || t === 'EX') return t;
  const u = t.toUpperCase(); return u === 'VASTRO' ? 'VSTAR' : u;
}
const normCat = s => {""")
rep("const cf = {lang:'', set:'', type:'', rar:'',", "const cf = {lang:'', set:'', type:'', rar:'', sigla:'',")
rep("  if (cf.rar && rarityName(e.rarity) !== cf.rar) return false;\n",
    "  if (cf.rar && rarityName(e.rarity) !== cf.rar) return false;\n  if (cf.sigla && siglaOf(e.name) !== cf.sigla) return false;\n")
rep("cf.type || cf.rar || cf.dup", "cf.type || cf.rar || cf.sigla || cf.dup")
rep("{lang:'', set:'', type:'', rar:'', dup:false,", "{lang:'', set:'', type:'', rar:'', sigla:'', dup:false,")
rep("const T = by(typeKeys), Rr = by(e => rarityName(e.rarity)),", "const T = by(typeKeys), Rr = by(e => rarityName(e.rarity)), S = by(e => siglaOf(e.name)),")
rep("  if (cf.rar && !Rr.has(cf.rar)) cf.rar = '';\n", "  if (cf.rar && !Rr.has(cf.rar)) cf.rar = '';\n  if (cf.sigla && !S.has(cf.sigla)) cf.sigla = '';\n")
rep("menu('cf-rar', 'Rarità', cf.rar, 'Tutte le rarità', Rr, RAR_ORDER) +",
    "menu('cf-rar', 'Rarità', cf.rar, 'Tutte le rarità', Rr, RAR_ORDER) + menu('cf-sigla', 'Sigla', cf.sigla, 'Tutte le sigle', S, SIGLE) +")
rep("else if (t.id === 'cf-rar') cf.rar = t.value;", "else if (t.id === 'cf-rar') cf.rar = t.value; else if (t.id === 'cf-sigla') cf.sigla = t.value;")
rep("/* filtri tutti nella fila di pillole: Lingua, Set, Tipo, Rarità, Variante", "/* filtri tutti nella fila di pillole: Lingua, Set, Tipo, Rarità, Sigla, Variante")
open(FILE, 'w', encoding='utf-8').write(s)
subprocess.run(['python3', os.path.join(R, 'strumenti', 'estrai_js.py')], check=True)
print('ok')
