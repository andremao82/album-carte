# 30/10/2026: nella scheda carta si scorre di lato per passare alla carta prima/dopo dell'elenco da cui è stata aperta.
import os, subprocess
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = R if os.path.isdir(os.path.join(R, 'app')) else os.path.dirname(R)
FILE = os.path.join(R, 'app', 'index.html')
s = open(FILE, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, (old[:100], s.count(old))
    s = s.replace(old, new)

# CSS: il contenuto sotto la barra scorre di lato, tagliato ai bordi dello schermo (la barra resta ferma)
rep(""".cd-stage{padding:10px 0 0}
""", """.cd-stage{padding:10px 0 0}
#cd-sw{margin:0 -16px;padding:0 16px;overflow-x:clip}
#cd-mv{touch-action:pan-y}
""")
# HTML della scheda: contenitore che si sposta col dito
rep("""'<button class="rbtn glass" type="button" data-a="menu" aria-label="Altre azioni">' + ICON_MORE + '</button></div>' +
    '<div class="cd-stage">""", """'<button class="rbtn glass" type="button" data-a="menu" aria-label="Altre azioni">' + ICON_MORE + '</button></div>' +
    '<div id="cd-sw"><div id="cd-mv">' + '<div class="cd-stage">""")
rep("""    '<button class="btn danger delc" type="button" data-a="del">Elimina carta</button>';
  $('v-card').innerHTML = h;""", """    '<button class="btn danger delc" type="button" data-a="del">Elimina carta</button></div></div>';
  $('v-card').innerHTML = h;""")
# la chiave della carta cambia con lingua/variante/condizione: si aggiorna anche nella pila e nell'elenco
rep("""function renderCard(){
  const e = entryByKey(cardKey);""", """function renderCard(){
  syncCardList();
  const e = entryByKey(cardKey);""")
# elenco da cui si apre la carta: i [data-open] accanto a quello toccato (stesso contenitore, stesso ordine)
rep("""  const top = {name, ctx, scroll:0}; navStack.push(top);""", """  if (name === 'card' && !ctx.list && openFrom && openFrom.includes(ctx.key)) ctx.list = openFrom;
  const top = {name, ctx, scroll:0}; navStack.push(top);""")
rep("""function leaveCard(){ popView(); }
""", """function leaveCard(){ popView(); }
/* scorrere di lato nella scheda carta (30/10/2026): carta dopo (verso sinistra) o prima (verso destra) nell'elenco da cui è
   stata aperta, con i filtri e l'ordinamento di quel momento. La scheda segue il dito; ai capi dell'elenco rimbalza.
   Non sull'immagine (inclinazione), non mentre si scrive nel prezzo o nella nota, non dal bordo sinistro (gesto Indietro). */
let openFrom = null, swEat = false;
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-open]'); if (!b || !b.parentElement) return;
  openFrom = [...new Set([...b.parentElement.children].filter(x => x.dataset && x.dataset.open).map(x => x.dataset.open))];
  setTimeout(() => { openFrom = null; });
}, true);
const cardTop = () => { const t = navStack[navStack.length - 1]; return t && t.name === 'card' ? t : null; };
function syncCardList(){
  const t = cardTop(); if (!t || t.ctx.key === cardKey) return;
  const l = t.ctx.list, i = l ? l.indexOf(t.ctx.key) : -1;
  if (i >= 0 && !l.includes(cardKey)) l[i] = cardKey;
  t.ctx.key = cardKey;
}
function cardNeighbor(dir){
  const t = cardTop(), l = t && t.ctx.list; if (!l) return null;
  let i = l.indexOf(cardKey); if (i < 0) return null;
  for (i += dir; i >= 0 && i < l.length; i += dir) if (l[i] !== cardKey && entryByKey(l[i])) return l[i];
  return null;
}
const cardEditing = () => { const a = document.activeElement; return !!a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && $('v-card').contains(a); };
const hScrolls = (el, stop) => { for (; el && el !== stop; el = el.parentElement) if (el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true; return false; };
const swRubber = dx => Math.sign(dx) * Math.min(90, Math.abs(dx) * 0.35);
const sw = {on:false, drag:false, busy:false, id:null, x:0, y:0, dx:0, vx:0, t:0};
function swSet(x, ms, ease){
  const m = $('cd-mv'); if (!m) return;
  m.style.transition = ms ? 'transform ' + ms + 'ms ' + (ease || 'ease-out') : 'none';
  m.style.transform = x ? 'translateX(' + x.toFixed(1) + 'px)' : '';
}
function cardStep(key, dir){
  const t = cardTop(); if (!t) return;
  const show = () => { cardKey = t.ctx.key = key; renderCard(); window.scrollTo(0, 0); };
  if (reduceMotion()){ swSet(0); show(); return; }
  const W = window.innerWidth; sw.busy = true;
  swSet(-dir * W, 160, 'ease-in');
  setTimeout(() => {
    if (cardTop() !== t){ sw.busy = false; return; }
    show(); swSet(dir * W, 0); void ($('cd-mv') || {}).offsetWidth; swSet(0, 220, 'ease-out');
    setTimeout(() => { sw.busy = false; if (cardTop() === t) swSet(0); }, 240);
  }, 170);
}
$('v-card').addEventListener('pointerdown', ev => {
  sw.on = false;
  if (sw.busy || ev.button > 0 || ev.isPrimary === false) return;
  const t = ev.target, mv = $('cd-mv');
  if (!mv || !mv.contains(t) || t.closest('#cd-tilt, input, textarea, select') || cardEditing() || hScrolls(t, mv) || ev.clientX < 20) return;
  Object.assign(sw, {on:true, drag:false, id:ev.pointerId, x:ev.clientX, y:ev.clientY, dx:0, vx:0, t:ev.timeStamp});
});
$('v-card').addEventListener('pointermove', ev => {
  if (!sw.on || ev.pointerId !== sw.id) return;
  const dx = ev.clientX - sw.x, dy = ev.clientY - sw.y;
  if (!sw.drag){
    if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)){ sw.on = false; return; }
    if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    sw.drag = true; try { $('v-card').setPointerCapture(ev.pointerId); } catch(err){}
  }
  sw.vx = (dx - sw.dx) / Math.max(1, ev.timeStamp - sw.t); sw.t = ev.timeStamp; sw.dx = dx;
  swSet(cardNeighbor(dx < 0 ? 1 : -1) ? dx : swRubber(dx));
});
function swEnd(ev){
  if (!sw.on || ev.pointerId !== sw.id) return;
  sw.on = false; if (!sw.drag) return;
  sw.drag = false; swEat = true; setTimeout(() => { swEat = false; }, 300);
  const dir = sw.dx < 0 ? 1 : -1, next = cardNeighbor(dir), W = window.innerWidth;
  const fast = Math.abs(sw.dx) > 30 && Math.abs(sw.vx) > 0.5 && Math.sign(sw.vx) === Math.sign(sw.dx);
  if (ev.type === 'pointerup' && next && (Math.abs(sw.dx) > W * 0.25 || fast)) cardStep(next, dir);
  else swSet(0, 320, next ? 'ease-out' : 'cubic-bezier(.34,1.56,.64,1)');   // ai capi dell'elenco: rimbalzo
}
['pointerup', 'pointercancel'].forEach(n => $('v-card').addEventListener(n, swEnd));
// il tocco che chiude un trascinamento non preme il pulsante sotto il dito
$('v-card').addEventListener('click', ev => { if (swEat){ swEat = false; ev.stopPropagation(); ev.preventDefault(); } }, true);
""")
open(FILE, 'w', encoding='utf-8').write(s)
subprocess.run(['python3', os.path.join(R, 'strumenti', 'estrai_js.py')], check=True)
print('ok')
