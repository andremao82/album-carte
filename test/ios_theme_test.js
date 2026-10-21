// Temi dell'app nativa (18/10/2026): Notte blu (scuro), Perla (chiaro), impostazione Aspetto Automatico/Chiaro/Scuro.
const fs=require('fs'),assert=require('assert');
const D=require('./percorsi').SWIFT;
const rd=f=>fs.readFileSync(D+f,'utf8');
const files=fs.readdirSync(D).filter(f=>f.endsWith('.swift'));
const th=rd('Theme.swift'),app=rd('CartePokemonApp.swift'),set=rd('SettingsView.swift'),add=rd('AddView.swift');
const has=(s,...a)=>a.forEach(x=>assert.ok(s.includes(x),'manca: '+x));

// 1 palette: legge i colori da Theme.swift
const pal={};
for(const m of th.matchAll(/static let (\w+) = themed\(dark: 0x([0-9A-F]{6}), light: 0x([0-9A-F]{6})(?:, darkAlpha: ([\d.]+), lightAlpha: ([\d.]+))?\)/g))
  pal[m[1]]={dark:m[2],light:m[3],da:+(m[4]||1),la:+(m[5]||1)};
['accent','accentSoft','accentLine','bg','panel','panelHi','up','down','sheetBg','sheetPanel','sheetPanelHi','sheetText'].forEach(k=>assert.ok(pal[k],'colore dinamico mancante: '+k));
assert.deepStrictEqual([pal.bg.dark,pal.panel.dark,pal.accent.dark],['0B1426','16233D','FFCB05'],'Notte blu');
assert.deepStrictEqual([pal.bg.light,pal.panel.light,pal.accent.light],['F2F2F7','FFFFFF','1C1C1E'],'Perla');
has(th,'static let accentFill = Color(uiColor: UIColor(hex: 0xFFCB05))','static let darkName = "Notte blu"','static let lightName = "Perla"');
console.log('1 palette Notte blu e Perla lette da Theme.swift');

// 2 contrasto (WCAG)
const lum=h=>{const c=[0,2,4].map(i=>parseInt(h.substr(i,2),16)/255).map(v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4));return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];};
const mix=(fg,a,bg)=>{const f=[0,2,4].map(i=>parseInt(fg.substr(i,2),16)),b=[0,2,4].map(i=>parseInt(bg.substr(i,2),16));return f.map((v,i)=>Math.round(v*a+b[i]*(1-a)).toString(16).padStart(2,'0')).join('');};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
const out=[];
for(const m of ['dark','light']){
  const ink=m==='dark'?'FFFFFF':'000000';
  for(const s of ['bg','panel']){
    assert.ok(ratio(ink,pal[s][m])>=7,m+' testo su '+s);
    const r=ratio(pal.accent[m],pal[s][m]); assert.ok(r>=4.5,m+' accento su '+s+' '+r.toFixed(1)); out.push(m+' accento/'+s+' '+r.toFixed(1));
    for(const k of ['up','down']){const q=ratio(pal[k][m],pal[s][m]);assert.ok(q>=4.5,m+' '+k+' su '+s+' '+q.toFixed(1));}
  }
  assert.ok(ratio(pal.accentLine[m],pal.panel[m])>=3,m+' bordo evidenziato >= 3:1: '+ratio(pal.accentLine[m],pal.panel[m]).toFixed(1));
  assert.ok(ratio(pal.panel[m],pal.bg[m])>=1.08,m+' pannello distinto dal fondo');
  const st=mix(pal.sheetText[m],m==='dark'?pal.sheetText.da:pal.sheetText.la,pal.sheetPanel[m]);
  assert.ok(ratio(st,pal.sheetPanel[m])>=4.5,m+' testo secondario del foglio');
}
assert.ok(ratio('000000','FFCB05')>=7,'nero sul giallo dei tasti');
console.log('2 contrasti ok:',out.join(', '));

// 3 aspetto
has(th,'enum Appearance: String, CaseIterable, Identifiable','case auto, light, dark','static let key = "appearance"','case .auto: return "Automatico"','case .light: return "Chiaro"','case .dark: return "Scuro"','case .auto: return .unspecified','case .light: return .light','case .dark: return .dark','w.overrideUserInterfaceStyle = style','@MainActor\nfunc applyAppearance');
has(app,'@AppStorage(Appearance.key) private var appearance = Appearance.auto.rawValue','.onAppear { applyAppearance(appearance) }','.onChange(of: appearance) { _, a in applyAppearance(a) }','.tint(Theme.accent)');
has(set,'@AppStorage(Appearance.key) private var appearance = Appearance.auto.rawValue','Picker("Aspetto", selection: $appearance)','ForEach(Appearance.allCases) { a in Text(a.label).tag(a.rawValue) }','.pickerStyle(.segmented)','Automatico segue il tema dell\'iPhone');
assert.ok(set.indexOf('appearanceSection\n')<set.indexOf('readingSection\n'),'Aspetto è la prima sezione');
// stessa logica in JS: valore salvato -> stile della finestra (sconosciuto = automatico)
const style=r=>({auto:'unspecified',light:'light',dark:'dark'})[r]||'unspecified';
assert.deepStrictEqual(['auto','light','dark','',undefined].map(style),['unspecified','light','dark','unspecified','unspecified']);
console.log('3 Aspetto: Automatico predefinito, prima sezione delle Impostazioni, applicato alle finestre');

// 4 niente colori fissi rimasti
files.forEach(f=>{const s=rd(f);
  assert.ok(!s.includes('.preferredColorScheme('),f+': scuro forzato');
  assert.ok(!/\? \.green : \.red/.test(s),f+': verde/rosso di sistema per le variazioni');
  // eccezione voluta: il punto del chip Backup ha il colore del testo del chip
  const s2=s.replace('Circle().fill(b.due ? Color.orange : Theme.accent)','');
  assert.ok(!/(background|fill)\([^)\n]*Theme\.accent(?![A-Za-z])/.test(s2),f+': giallo come sfondo deve usare accentFill');
  assert.ok(!/glassEffect\([^\n]*Theme\.accent\)/.test(s),f+': vetro tinto con accent');
  if(!['CameraView.swift','EdgeEditView.swift'].includes(f)) assert.ok(!/Color\.yellow|\.tint\(\.yellow\)/.test(s),f+': giallo fisso');
});
assert.ok(!/foregroundStyle\(\.white\)|Color\.white/.test(add),'foglio Aggiungi senza bianco fisso');
assert.ok(!/Color\(white:|secondarySystemBackground/.test(th),'niente grigi fissi nel tema');
console.log('4 nessun colore fisso: niente scuro forzato, gialli di sfondo da accentFill, variazioni con Theme.up/down');
console.log('errori: nessuno');
