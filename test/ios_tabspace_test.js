// 18/10/2026 (sera): la barra non copre più l'ultima voce; selezione della barra in Liquid Glass.
const fs=require('fs'), assert=require('assert');
const D=require('./percorsi').SWIFT;
const rd=f=>fs.readFileSync(D+f,'utf8');
const app=rd('CartePokemonApp.swift'), th=rd('Theme.swift');

// 1 lo spazio non sta più fuori dal NavigationStack (non arrivava alla ScrollView)
const root=app.slice(app.indexOf('struct RootView'));
assert.ok(!/screen\(t\)\s*\n\s*\.tabBarSpace\(\)/.test(root)&&!/^\s*\.tabBarSpace\(\)/m.test(root),'niente tabBarSpace sulla radice');
// 2 ogni pagina a scorrimento sotto la barra ha il suo spazio: n contenitori = n tabBarSpace
const pages={'HomeView.swift':1,'AlbumView.swift':3,'CardDetailView.swift':1,'DexViews.swift':2,'SetsView.swift':2};
for(const [f,n] of Object.entries(pages)){
  const s=rd(f); const c=(s.match(/\.tabBarSpace\(\)/g)||[]).length;
  assert.strictEqual(c,n,f+': '+c+' tabBarSpace invece di '+n);
}
// ogni ScrollView verticale / List delle schede è seguita dal suo tabBarSpace (prima del contenitore successivo)
for(const f of Object.keys(pages)){
  const s=rd(f); const re=/(\n\s*)(ScrollView \{|List(\(selection: \$selection\))? \{)/g; let m;
  while((m=re.exec(s))){
    const ind=m[1].length-1, rest=s.slice(m.index+m[0].length);
    const close=rest.search(new RegExp('\\n {'+ind+'}\\}'));
    const after=rest.slice(close, close+400).split('\n').slice(1,6).join('\n');
    assert.ok(after.includes('.tabBarSpace()'),f+': contenitore senza spazio per la barra:\n'+s.slice(m.index,m.index+80));
  }
}
// i fogli (Aggiungi, Impostazioni, modifica di gruppo) non hanno la barra sotto: niente spazio inutile
for(const f of ['AddView.swift','SettingsView.swift','BulkOps.swift']) assert.ok(!rd(f).includes('.tabBarSpace()'),f);
// 3 lo spazio basta per la barra: tasto/voci + margini + spazio sotto
const barH=+th.match(/static let barHeight: CGFloat = (\d+)/)[1], size=+th.match(/static let scanSize: CGFloat = (\d+)/)[1];
assert.ok(barH>=size+2*6+4,'barHeight '+barH+' copre la barra ('+(size+16)+')');
assert.ok(/safeAreaInset\(edge: \.bottom, spacing: 0\) \{ Color\.clear\.frame\(height: Theme\.barHeight\) \}/.test(th),'TabBarSpace = safeAreaInset');

// 4 Liquid Glass
const bar=th.slice(th.indexOf('struct GlassTabBar'),th.indexOf('struct TabBarSpace'));
assert.ok(bar.includes('@Namespace private var glassNS'),'namespace del vetro');
assert.ok(/\.glassEffect\(\.regular\.tint\(Theme\.accentSoft\)\.interactive\(\), in: \.capsule\)\s*\.glassEffectID\("tab-selection", in: glassNS\)/.test(bar),'voce scelta: goccia di vetro con id unico');
assert.strictEqual((bar.match(/glassEffectID\(/g)||[]).length,1,'un solo id (stessa goccia per tutte le voci)');
assert.ok(!bar.includes('.background(sel ? Theme.accentSoft'),'niente più velo piatto');
assert.ok(bar.includes('.glassEffect(capsuleGlass, in: .capsule)') && bar.includes(': .regular.interactive()'),'barra che reagisce al tocco');
assert.ok(/\.animation\(\.bouncy\([^)]*\), value: tab\)/.test(bar),'la goccia scivola con un rimbalzo');
assert.ok(!/withAnimation[^\n]*tab = t/.test(bar),'il cambio di scheda resta immediato');
const sp=+bar.match(/GlassEffectContainer\(spacing: (\d+)\)/)[1];
assert.ok(sp<=6,'spacing '+sp+': la goccia non si fonde col tasto giallo');
assert.ok(/glassEffect\(\.regular\.tint\(Theme\.accentFill\)\.interactive\(\), in: \.circle\)/.test(bar),'tasto giallo invariato');
// testo della voce scelta sempre leggibile: accento sul velo accentSoft (contrasto verificato in ios_theme_test)
assert.ok(bar.includes('.foregroundStyle(sel ? Theme.accent : Color.primary.opacity(0.85))'),'colori delle voci invariati');
console.log('ios_tabspace_test ok, errori: nessuno');
