// App iOS nativa (SwiftUI, Liquid Glass): controlli statici sui file del progetto Xcode e coerenza con la versione web.
// Lo Swift non si compila qui (niente macOS): si controllano sintassi di base, parentesi, API attese, costanti e formato dei dati.
const fs=require('fs'), assert=require('assert');
const I=require('./percorsi').IOS;
const D=I+'CartePokemon/';
const web=fs.readFileSync(require('./percorsi').APPJS,'utf8');
const files=fs.readdirSync(D).filter(f=>f.endsWith('.swift'));
const src={}; for(const f of files) src[f]=fs.readFileSync(D+f,'utf8');
const all=Object.values(src).join('\n');

// 1 progetto Xcode
const pbx=fs.readFileSync(I+'CartePokemon.xcodeproj/project.pbxproj','utf8');
for (const k of ['NSCameraUsageDescription','NSPhotoLibraryUsageDescription','PBXFileSystemSynchronizedRootGroup','ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon','CODE_SIGN_STYLE = Automatic','IPHONEOS_DEPLOYMENT_TARGET = 26.0']) assert.ok(pbx.includes(k),k);
assert.ok(!/IPHONEOS_DEPLOYMENT_TARGET = (1|2[0-5])/.test(pbx),'nessun obiettivo di distribuzione vecchio');
assert.strictEqual((pbx.match(/\{/g)||[]).length,(pbx.match(/\}/g)||[]).length,'parentesi del pbxproj bilanciate');
assert.ok(fs.existsSync(D+'Assets.xcassets/AppIcon.appiconset/icon-1024.png'),'icona');
console.log('1 progetto Xcode: permessi, icona, firma automatica, iOS 26 presenti');

// 2 parentesi bilanciate in ogni file Swift (con stringhe e interpolazioni)
function balanced(s){ const st=[],pairs={')':'(',']':'[','}':'{'}; const modes=[['code',null]]; let i=0;
 while(i<s.length){ const ch=s[i], m=modes[modes.length-1][0];
  if(m==='code'){
   if(s.startsWith('//',i)){ while(i<s.length&&s[i]!=='\n') i++; continue; }
   if(s.startsWith('/*',i)){ i=s.indexOf('*/',i)+2; continue; }
   if(s.startsWith('"""',i)){ modes.push(['mstr',null]); i+=3; continue; }
   if(ch==='"'){ modes.push(['str',null]); i++; continue; }
   if('([{'.includes(ch)) st.push(ch);
   else if(')]}'.includes(ch)){ if(!st.length||st[st.length-1]!==pairs[ch]) return false; st.pop(); if(modes[modes.length-1][1]!==null&&st.length===modes[modes.length-1][1]&&ch===')') modes.pop(); }
   i++; }
  else { if(ch==='\\'&&i+1<s.length){ if(s[i+1]==='('){ st.push('('); modes.push(['code',st.length-1]); i+=2; continue; } i+=2; continue; }
   if(m==='str'&&ch==='"'){ modes.pop(); i++; continue; } if(m==='mstr'&&s.startsWith('"""',i)){ modes.pop(); i+=3; continue; } i++; } }
 return st.length===0&&modes.length===1; }
for(const f of files) assert.ok(balanced(src[f]),'parentesi non bilanciate in '+f);
console.log('2 Swift:',files.length,'file con parentesi bilanciate');

// 3 niente residui del vecchio contenitore web, niente chiavi nel codice
assert.ok(!/WKWebView|import WebKit|native-bridge|albumNative/.test(all),'residui del contenitore web');
assert.ok(!/AIza[0-9A-Za-z_-]{20,}|sk-ant-[0-9A-Za-z_-]{10,}/.test(all),'chiave scritta nel codice');
assert.ok(/enum Keychain/.test(all)&&/kSecClassGenericPassword/.test(all),'chiavi nel Portachiavi');
console.log('3 nessun residuo del contenitore web, chiavi solo nel Portachiavi');

// 4 interfaccia nativa con Liquid Glass
const need={ 'CartePokemonApp.swift':['@main','GlassTabBar(','AddView()','SettingsView()','HomeView('],
 'Theme.swift':['GlassEffectContainer','.glassEffect(.regular','.interactive()','enum AppTab'],
 'CameraView.swift':['AVCapturePhotoOutput','AVCaptureVideoPreviewLayer','GlassEffectContainer','.buttonStyle(.glass)','PhotosPicker','videoRotationAngle'],
 'Imaging.swift':['VNDetectRectanglesRequest','perspectiveCorrection','CIContext','jpegRepresentation'],
 'AddView.swift':['Scansione rapida','Da foto','Cerca e aggiungi','PhotosPicker','Cerca a mano','CameraScreen()'],
 'Components.swift':['.glassEffect('],
 'ScanQueue.swift':['gap: TimeInterval = 4.5','pauseSeconds: UInt64 = 65','autoPick'],
 'API.swift':['api.tcgdex.net/v2','api.pokemontcg.io','generativelanguage.googleapis.com','api.anthropic.com','x-goog-api-key','anthropic-version','frankfurter'],
 'Store.swift':['catalog_bak.json','history.json','.applicationSupportDirectory'] };
for(const [f,ks] of Object.entries(need)) for(const k of ks) assert.ok(src[f]&&src[f].includes(k),f+' deve contenere '+k);
// pannello Aggiungi a tre scelte (ridisegno ottobre 2026), nell'ordine dello screen
const add=src['AddView.swift'];
const o=['Scansione rapida','Da foto','Cerca e aggiungi'].map(t=>add.indexOf('"'+t+'"'));
assert.ok(o.every(i=>i>0)&&o[0]<o[1]&&o[1]<o[2],'tre scelte in ordine');
assert.ok(!/Apri la fotocamera/.test(add),'il vecchio tasto unico non c\'è più');
console.log('4 barra in vetro personalizzata, pannello Aggiungi a tre scelte, fotocamera nativa, Vision');

// 5 icona del Set: libro, non più il vecchio disegno
assert.ok(/item\(\.progress, "Progressi", "books\.vertical\.fill"\)/.test(src['Theme.swift']),'icona Progressi (ex Set) a libri');
console.log('5 icona di Progressi (ex Set): libri');

// 6 costanti identiche alla versione web
const wc=web.match(/const COND_DEFAULT = \{([^}]*)\}/)[1].split(',').map(x=>x.trim().split(':').map(y=>y.trim())).reduce((o,[k,v])=>(o[k]=+v,o),{});
const sc=[...src['Models.swift'].match(/COND_DEFAULT: \[String: Double\] = \[([^\]]*)\]/)[1].matchAll(/"(\w+)": ([\d.]+)/g)].reduce((o,m)=>(o[m[1]]=+m[2],o),{});
assert.deepStrictEqual(sc,wc,'coefficienti di condizione');
const wg=[...web.match(/const GENS = (\[[\s\S]*?\]\]);/)[1].matchAll(/\['(\w+)', '([^']+)', (\d+), (\d+)\]/g)].map(m=>[m[1],m[2],+m[3],+m[4]]);
const sg=[...src['Models.swift'].matchAll(/GenItem\("(\w+)", "([^"]+)", (\d+), (\d+)\)/g)].map(m=>[m[1],m[2],+m[3],+m[4]]);
assert.deepStrictEqual(sg,wg,'generazioni'); assert.strictEqual(wg.length,9);
assert.ok(/DEX_MAX = 1025/.test(src['Models.swift'])&&/DEX_MAX = 1025/.test(web));
for(const v of ["'Normale','Holo','Reverse holo','1st edition','Altro'"]) assert.ok(web.includes('const VARS = ['+v+']'));
assert.ok(src['Models.swift'].includes('["Normale", "Holo", "Reverse holo", "1st edition", "Altro"]'),'varianti');
assert.ok(src['Models.swift'].includes('["IT", "EN", "JP", "Altro"]'),'lingue');
console.log('6 costanti uguali al web: coefficienti', JSON.stringify(wc),'| 9 generazioni | varianti | lingue');

// 7 formato dei dati: campi della voce e del backup uguali al web
const fields=['key','cardId','name','setName','number','total','img','lang','variant','cond','qty','price','priceManual','pr','priceT','rarity','added','src','srcId','srcLang','setId','dex','cat','tt','ill','note','condEst','condNote'];
const entry=src['Models.swift'].match(/struct Entry: Codable[\s\S]*?\n    var id: String/)[0];
for(const f of fields){ assert.ok(new RegExp('var '+f+'\\b').test(entry),'campo Entry mancante: '+f); }
for(const f of ['condEst','condNote','tt','ill','srcLang']) assert.ok(web.includes(f),'il web non usa '+f);
const bf=src['Store.swift'].match(/struct BackupFile: Codable \{[\s\S]*?\n\}/)[0];
for(const f of ['v','saved','condCoef','hist','vhist','catalog']) assert.ok(new RegExp('var '+f+'\\b').test(bf),'campo backup mancante: '+f);
assert.ok(/lenient|Lossy/.test(src['Store.swift']),'lettura tollerante');
for(const f of ['hist','vhist','condCoef','catalog']) assert.ok(web.includes(f));
console.log('7 formato dati: ',fields.length,'campi della voce e 6 del backup, lettura tollerante');

// 8 regole di calcolo allineate: storico, promemoria backup, coda
assert.ok(/<= 90|<= *90/.test(src['Store.swift'])&&/365/.test(src['Store.swift'])&&/120/.test(src['Store.swift']),'sfoltimento dello storico');
assert.ok(/bkEdits >= 25/.test(src['Store.swift'])&&/d >= 3/.test(src['Store.swift'])&&/count >= 10/.test(src['Store.swift']),'promemoria backup');
assert.ok(/confidence/.test(src['StoreOps.swift'])&&/0\.7/.test(src['StoreOps.swift'])&&/cands\.count == 1/.test(src['StoreOps.swift']),'aggiunta automatica');
console.log('8 regole: storico, promemoria backup, aggiunta automatica');

// 9 regolazione manuale dei bordi e selezione multipla (parità con il web)
const edge=src['EdgeEditView.swift'], img=src['Imaging.swift'], q=src['ScanQueue.swift'], alb=src['AlbumView.swift'], bulk=src['BulkOps.swift'];
assert.ok(edge&&/ForEach\(0\.\.<4/.test(edge)&&/DragGesture/.test(edge)&&/Conferma/.test(edge)&&/Scarta/.test(edge)&&/Ripristina/.test(edge),'editor dei bordi con 4 angoli');
assert.ok(/quad: \[CGPoint\]\? = nil/.test(img)&&/static func prepare/.test(img)&&/toNormalized/.test(img)&&/fromNormalized/.test(img),'Imaging accetta bordi decisi a mano');
assert.ok(/confirmEdges \|\| !p\.detected/.test(q),'editor se i bordi vanno confermati o non si trovano (come il web)');
assert.ok(/EdgeEditView\(/.test(src['CameraView.swift'])&&/queue\.submit\(photo/.test(src['CameraView.swift']),'fotocamera e galleria passano dall\'editor');
assert.ok(/bind\(\\\.confirmEdges\)/.test(src['SettingsView.swift']),'interruttore "Conferma i bordi"');
assert.ok(/List\(selection: \$selection\)/.test(alb)&&/editMode/.test(alb)&&/BulkEditSheet/.test(alb)&&/confirmBulkDelete/.test(alb)&&/"Tutte"/.test(alb),'selezione multipla nell\'album');
assert.ok(/qty \+= e\.qty/.test(bulk)&&/priceManual = nil/.test(bulk)&&/case \.set/.test(bulk)&&/condEst = nil/.test(bulk),'modifica di gruppo: unione doppioni, prezzo, condizione');
// geometria: normalizzato <-> Core Image (alto-sinistra <-> basso-sinistra) è una coppia inversa
const e={x:10,y:20,w:400,h:600}, toN=p=>({x:(p.x-e.x)/e.w,y:1-(p.y-e.y)/e.h}), fromN=p=>({x:e.x+p.x*e.w,y:e.y+(1-p.y)*e.h});
const pt={x:123,y:456}; const back=fromN(toN(pt)); assert.ok(Math.abs(back.x-pt.x)<1e-9&&Math.abs(back.y-pt.y)<1e-9);
assert.ok(img.includes('e.origin.x + $0.x * e.width')&&img.includes('e.origin.y + (1 - $0.y) * e.height')&&img.includes('1 - ($0.y - e.origin.y) / e.height'),'formule di conversione');
console.log('9 bordi a mano (4 angoli, conferma/scarta/ripristina, interruttore) e selezione multipla (tutte, modifica di gruppo, elimina)');

// 10 import: ogni file che usa SwiftUI/UIKit/Charts/AVFoundation/Vision/PhotosUI deve importarli
const needImp=[[/: View\b|@State\b|@Environment\b|@Binding\b|Binding</,/^import SwiftUI$/m,'SwiftUI'],[/\bUIImage\b|\bUIApplication\b|UIViewRepresentable/,/^import (SwiftUI|UIKit)$/m,'UIKit/SwiftUI'],[/\bChart\(|LineMark|PointMark/,/^import Charts$/m,'Charts'],[/AVCapture/,/^import AVFoundation$/m,'AVFoundation'],[/PhotosPicker/,/^import PhotosUI$/m,'PhotosUI'],[/VNDetect|VNImageRequest/,/^import Vision$/m,'Vision'],[/UTType|\.json, \.plainText/,/^import (UniformTypeIdentifiers|SwiftUI)$/m,'UniformTypeIdentifiers']];
for(const f of files) for(const [use,imp,name] of needImp) if(use.test(src[f])) assert.ok(imp.test(src[f]),f+' usa '+name+' ma non lo importa');
console.log('10 import corretti in tutti i file');
console.log('errori: nessuno'); process.exit(0);
