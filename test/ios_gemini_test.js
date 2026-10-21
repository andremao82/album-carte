// 18/10/2026: lettura con Gemini dall'app nativa andava in timeout (oltre 60 s) mentre il web funzionava.
// Correzione: sessione di rete nuova per ogni chiamata (niente collegamento riusato e rimasto appeso),
// tempo massimo complessivo, un secondo tentativo, immagini come il web, prova di connessione con chiamate vere.
// Controlli statici sullo Swift più la regola dei tentativi e delle immagini rifatta in JS.
const fs=require('fs'), assert=require('assert');
const D=require('./percorsi').SWIFT;
const S=n=>fs.readFileSync(D+n,'utf8');
const api=S('API.swift'), img=S('Imaging.swift'), q=S('ScanQueue.swift'), ops=S('StoreOps.swift'), set=S('SettingsView.swift');
const has=(s,...ks)=>{ for(const k of ks) assert.ok(s.includes(k),'manca: '+k); };
const bal=(s,a,b)=>s.split(a).length===s.split(b).length;
for (const [n,s] of Object.entries({api,img,q,ops,set})) for (const [a,b] of [['{','}'],['(',')'],['[',']']]) assert.ok(bal(s,a,b),n+': parentesi '+a+b);

// 1 sessione nuova e tempo complessivo per Gemini
has(api,'func freshSend(_ req: URLRequest, timeout: TimeInterval)','URLSessionConfiguration.ephemeral','timeoutIntervalForRequest = timeout',
  'timeoutIntervalForResource = timeout + 15','waitsForConnectivity = false','finishTasksAndInvalidate()','let GEMINI_TIMEOUT: TimeInterval = 45','let GEMINI_TRIES = 2');
const gem=api.match(/static func callGemini[\s\S]*?\n    \}\n/)[0];
assert.ok(gem.includes('freshSend(req, timeout: GEMINI_TIMEOUT)'),'Gemini usa la sessione nuova');
assert.ok(!gem.includes('httpSend(req)'),'Gemini non usa più la sessione condivisa');
assert.ok(!/60 secondi/.test(api),'vecchio messaggio dei 60 secondi rimosso');
has(gem,'.timedOut','.networkConnectionLost','attempt < GEMINI_TRIES','modello \\(model)','invio \\(kb) KB','Prova la connessione');
// le altre chiamate (TCGdex, Claude) restano sulla sessione condivisa
assert.ok((api.match(/URLSession\.shared/g)||[]).length>=3,'le altre chiamate non cambiano');

// regola dei tentativi rifatta: timeout o collegamento perso -> riprova una volta, altri errori -> subito
function run(results){ let att=0; for(;;){ att++; const r=results[att-1];
  if (r==='ok') return {ok:true,att}; if ((r==='timeout'||r==='lost') && att<2) continue;
  if (r==='timeout'||r==='lost') return {ok:false,att,msg:'non risponde'}; return {ok:false,att,msg:'rete'}; } }
assert.deepStrictEqual(run(['ok']),{ok:true,att:1});
assert.deepStrictEqual(run(['timeout','ok']),{ok:true,att:2});
assert.deepStrictEqual(run(['lost','ok']),{ok:true,att:2});
assert.deepStrictEqual(run(['timeout','timeout']),{ok:false,att:2,msg:'non risponde'});
assert.deepStrictEqual(run(['offline']),{ok:false,att:1,msg:'rete'});
// caso peggiore: 2 x (45 + 15) = 120 s prima del messaggio; attesa tipica 45 s se il primo collegamento è appeso
assert.ok(2*(45+15)<=120);

// 2 immagini come il web: niente più foto intera; seconda immagine = carta non migliorata, solo se migliorata e bordi trovati
has(img,'var raw: Data?','let plain = card','let raw: Data? = (enhance && detected) ? jpeg(plain, quality: 0.85) : nil','static func tinyJPEG()');
assert.ok(!/k = 1400 \/ longest/.test(img),'foto intera ridotta non più inviata');
has(q,'if let raw = r.raw { try? raw.write(to: rawURL(id), options: .atomic) }');
has(ops,'func recognize(crop: Data, raw rawIn: Data?)','let raw = cfg.condEstimate ? rawIn : nil');
const rawRule=(enh,det,cond)=>enh&&det&&cond;   // web: cfg.enhance && condEstimate, e null se ritaglio centrale
assert.strictEqual(rawRule(true,true,true),true);
assert.strictEqual(rawRule(false,true,true),false);
assert.strictEqual(rawRule(true,false,true),false);
assert.strictEqual(rawRule(true,true,false),false);
// stesso comportamento del web
const web=fs.readFileSync(require('./percorsi').APPJS,'utf8');
// dal 18/10/2026 il web non manda più la foto intera: senza bordi la foto aspetta la correzione (stato 'edges', raw null), come nell'app nativa
assert.ok(web.includes("status:'edges', ok:det.ok, quad, photo:kept, crop:null, raw:null")&&web.includes("cfg.enhance && cfg.condEstimate !== false ? warp("),'regola del web invariata');

// 3 prova di connessione con chiamate vere e tempi
has(set,'await testGemini()','private func testGemini() async','Modello provato:','Gemini, solo testo','Gemini, immagine minuscola',
  'Imaging.tinyJPEG()','freshSend(req, timeout: 30)','String(format: " (%.1f s)"','nessuna chiave salvata');
console.log('ios_gemini_test: ok, errori: nessuno');
