// 18/10/2026: lente d'ingrandimento sull'angolo trascinato nell'editor dei bordi (solo app nativa).
const fs=require('fs'), assert=require('assert');
const D=require('./percorsi').SWIFT;
const s=fs.readFileSync(D+'EdgeEditView.swift','utf8');
const has=(...ks)=>{ for(const k of ks) assert.ok(s.includes(k),'manca: '+k); };

// 1 stato del trascinamento con GestureState (si azzera anche se il gesto è annullato) e lente mostrata solo allora
has('@GestureState private var active: Int? = nil','.updating($active) { _, st, _ in st = i }',
    'if let i = active {','loupe(i: i, ox: ox, oy: oy, w: w, h: h, box: g.size)');
// 2 costanti e lente che non ruba i tocchi agli angoli
has('static let loupeSize: CGFloat = 130','static let loupeZoom: CGFloat = 3','static let loupeGap: CGFloat = 44',
    '.allowsHitTesting(false)\n        .accessibilityHidden(true)','.clipShape(Circle())','Image(uiImage: photo.preview)');
assert.strictEqual((s.match(/\.allowsHitTesting\(false\)/g)||[]).length,2,'lente e contorno senza tocchi');
// 3 la lente sta nello stesso spazio di coordinate degli angoli (dentro lo ZStack con coordinateSpace "edit")
assert.ok(s.indexOf('if let i = active')<s.indexOf('.coordinateSpace(name: "edit")'),'lente dentro lo ZStack dell\'editor');
// 4 il resto dell'editor è invariato
has('Button(discardLabel, role: discardLabel == "Scarta" ? .destructive : nil)','Button("Ripristina") { quad = original }','Button("Conferma") { onConfirm(quad) }',
    'DragGesture(minimumDistance: 0, coordinateSpace: .named("edit"))');
// parentesi bilanciate
for (const [a,b] of [['{','}'],['(',')'],['[',']']]) assert.strictEqual(s.split(a).length,s.split(b).length,'parentesi '+a+b);

// 5 posizione della lente: stessa regola di loupeCenter rifatta in JS
const SZ=130, GAP=44, r=SZ/2;
function center(p,box){ let x=p.x, y=p.y-GAP-r;
  if (y-r<0){ x = p.x<box.w/2 ? p.x+GAP+r : p.x-GAP-r; y=p.y; }
  x=Math.min(Math.max(x,r),Math.max(box.w-r,r)); y=Math.min(Math.max(y,r),Math.max(box.h-r,r)); return {x,y}; }
const box={w:390,h:560};
const inside=c=>c.x-r>=0&&c.x+r<=box.w&&c.y-r>=0&&c.y+r<=box.h;
const far=(c,p)=>Math.hypot(c.x-p.x,c.y-p.y)>=r+GAP-0.5; // il dito (sul punto) non copre la lente
// angolo in basso: lente sopra
let p={x:200,y:450}, c=center(p,box); assert.deepStrictEqual(c,{x:200,y:450-GAP-r}); assert.ok(inside(c)&&far(c,p));
// angoli in alto (poco spazio sopra): lente di lato, verso il centro
p={x:40,y:30}; c=center(p,box); assert.ok(c.x>p.x,'alto a sinistra → lente a destra'); assert.ok(inside(c)&&far(c,p));
p={x:350,y:30}; c=center(p,box); assert.ok(c.x<p.x,'alto a destra → lente a sinistra'); assert.ok(inside(c)&&far(c,p));
// angoli in basso ai lati: dentro lo schermo
for (const q of [{x:5,y:555},{x:385,y:555},{x:5,y:200},{x:385,y:200}]) { c=center(q,box); assert.ok(inside(c),'dentro '+JSON.stringify(q)); assert.ok(far(c,q),'non sotto il dito '+JSON.stringify(q)); }
// valore di confine della regola (sopra se ci sta esattamente)
p={x:200,y:2*r+GAP}; assert.strictEqual(center(p,box).y,r,'ci sta esattamente sopra');

// 6 l'immagine ingrandita mette l'angolo toccato al centro della lente
has('.position(x: d / 2 + w * z / 2 - q.x * w * z, y: d / 2 + h * z / 2 - q.y * h * z)');
const w=300,h=420,z=3,d=SZ;
for (const q of [{x:0,y:0},{x:.1,y:.05},{x:.93,y:.97},{x:1,y:1}]) {
  const cx=d/2+w*z/2-q.x*w*z, left=cx-w*z/2;   // bordo sinistro dell'immagine ingrandita
  assert.ok(Math.abs(left+q.x*w*z-d/2)<1e-9,'angolo al centro (x)');
  const cy=d/2+h*z/2-q.y*h*z, top=cy-h*z/2; assert.ok(Math.abs(top+q.y*h*z-d/2)<1e-9,'angolo al centro (y)');
}
console.log('ios_loupe_test: ok');
