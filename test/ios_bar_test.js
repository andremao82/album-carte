// 18/10/2026: progetto Xcode dell'utente (Xcode 26.x, LastUpgradeCheck 2710) e tasto giallo centrato nella barra.
const fs=require('fs'), assert=require('assert');
const I=require('./percorsi').IOS;
const pbx=fs.readFileSync(I+'CartePokemon.xcodeproj/project.pbxproj','utf8');
const theme=fs.readFileSync(I+'CartePokemon/Theme.swift','utf8');

// 1 versione del progetto: non deve tornare a quella vecchia (1600) né scendere sotto quella del file dell'utente
const MIN_UPGRADE=2710;
const up=[...pbx.matchAll(/LastUpgradeCheck = (\d+);/g)].map(m=>+m[1]);
assert.strictEqual(up.length,1,'un solo LastUpgradeCheck');
assert.ok(up[0]>=MIN_UPGRADE,'LastUpgradeCheck '+up[0]+' sotto '+MIN_UPGRADE+': è tornato il progetto vecchio');
const sw=+(pbx.match(/LastSwiftUpdateCheck = (\d+);/)||[])[1];
assert.ok(sw>=1600,'LastSwiftUpdateCheck presente');
// impostazioni consigliate da Xcode presenti (segno del file aggiornato), una volta per Debug e una per Release
for (const k of ['CLANG_WARN_COMMA = YES','GCC_WARN_UNUSED_VARIABLE = YES','STRING_CATALOG_GENERATE_SYMBOLS = YES'])
  assert.strictEqual(pbx.split(k).length-1,2,k);
// firma: squadra impostata a livello di progetto, nessun DEVELOPMENT_TEAM vuoto che la annulli nel target
assert.ok(/DEVELOPMENT_TEAM = [A-Z0-9]{10};/.test(pbx),'squadra di firma impostata');
assert.ok(!pbx.includes('DEVELOPMENT_TEAM = "";'),'nessun DEVELOPMENT_TEAM vuoto');
assert.ok(pbx.includes('PRODUCT_BUNDLE_IDENTIFIER = it.albumcarte.app.personale;'),'bundle id');
assert.strictEqual((pbx.match(/\{/g)||[]).length,(pbx.match(/\}/g)||[]).length,'parentesi bilanciate');

// 2 barra: tasto giallo centrato, non sborda
const bar=theme.slice(theme.indexOf('struct GlassTabBar'),theme.indexOf('struct TabBarSpace'));
assert.ok(bar.length>500,'GlassTabBar trovata');
const scan=bar.slice(bar.indexOf('private var scanButton'));
assert.ok(!/\.offset\(y: *-/.test(scan.replace(/\.overlay[\s\S]*?\n        \}\n/,'')),'nessuno spostamento verso l\'alto del tasto');
assert.ok(scan.includes('.frame(width: Theme.scanSize, height: Theme.scanSize)'),'diametro da Theme.scanSize');
const size=+(theme.match(/static let scanSize: CGFloat = (\d+)/)||[])[1];
const barH=+(theme.match(/static let barHeight: CGFloat = (\d+)/)||[])[1];
assert.ok(size>=44&&size<=56,'tasto fra 44 e 56 pt (tocco comodo, sta nella barra)');
assert.ok(bar.includes('minHeight: Theme.scanSize'),'voci alte quanto il tasto: tutto allineato al centro');
const pad=+(bar.match(/\.padding\(\.vertical, (\d+)\)\n\s*\.glassEffect\((?:capsuleGlass|\.(?:regular|clear)(?:\.interactive\(\))?), in: \.capsule\)/)||[])[1];
assert.ok(pad>0&&size+2*pad+4<=barH,'barra (tasto + margini) entro lo spazio riservato barHeight');
assert.ok(!/HStack\([^)]*alignment: *\.(top|bottom)/.test(bar),'HStack allineato al centro');
// ordine invariato
for (const [a,b] of [['"Home"','"Collezione"'],['"Collezione"','scanButton.frame'],['scanButton.frame','"Progressi"'],['"Progressi"','"Pokédex"']])
  assert.ok(bar.indexOf(a)<bar.indexOf(b),a+' prima di '+b);
// la vecchia versione (60 pt spostato di -12) fallisce questo test
const old=scan.replace('.accessibilityLabel("Aggiungi carte")','.offset(y: -12)\n        .accessibilityLabel("Aggiungi carte")');
assert.ok(/\.offset\(y: *-/.test(old.replace(/\.overlay[\s\S]*?\n        \}\n/,'')),'il controllo riconosce lo spostamento');
console.log('ios_bar_test ok, errori: nessuno');
