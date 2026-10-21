// 18/10/2026 (sera): barra a schede. Vetro "clear" provato e scartato (l'utente preferisce il "regular").
// Poi, nel tema scuro, vetro troppo chiaro: capsula tinta col colore di fondo (Theme.bg) al 60%, solo col tema scuro.
const fs=require('fs'), assert=require('assert');
const th=fs.readFileSync(require('./percorsi').SWIFT+'Theme.swift','utf8');
const bar=th.slice(th.indexOf('struct GlassTabBar'), th.indexOf('struct', th.indexOf('struct GlassTabBar')+10));
for (const k of ['@Environment(\\.colorScheme) private var scheme','private var capsuleGlass: Glass',
  'scheme == .dark ? .regular.tint(Theme.bg.opacity(Theme.barDarkTint)).interactive() : .regular.interactive()',
  '.glassEffect(capsuleGlass, in: .capsule)','GlassEffectContainer(spacing: 4)',
  '.glassEffect(.regular.tint(Theme.accentSoft).interactive(), in: .capsule)','.glassEffect(.regular.tint(Theme.accentFill).interactive(), in: .circle)'])
  assert.ok(bar.includes(k),'manca: '+k);
const t=+(th.match(/static let barDarkTint: Double = ([\d.]+)/)||[])[1];
assert.ok(t>=0.4&&t<=0.85,'tinta scura forte ma non opaca: '+t);
assert.ok(!bar.includes('.glassEffect(.clear'),"niente vetro chiaro: scelta dell'utente");
assert.ok(!bar.includes('.shadow(color: Theme.bg'),'niente alone');
assert.ok(!/Color\.black|Color\(white:/.test(bar.slice(bar.indexOf('capsuleGlass'))),'tinta dal tema, non colori fissi');
// stima indicativa: vetro grigio (~#5A5F6B) mescolato col blu notte alla tinta scelta → luminanza almeno dimezzata
const mix=(a,b,k)=>a.map((v,i)=>Math.round(v*(1-k)+b[i]*k)), lum=c=>c.map(v=>v/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);
assert.ok(lum(mix([0x5A,0x5F,0x6B],[0x0B,0x14,0x26],t))<lum([0x5A,0x5F,0x6B])/2,'almeno la metà più scuro (stima)');
console.log('ios_glass ok');
