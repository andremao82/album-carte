// 18/10/2026: "Prova la connessione" dal telefono: gemini-flash-latest risponde 503 (high demand) e la lettura è lenta.
// Correzione: "Automatico" = primo modello concreto dell'elenco, 5xx = sovraccarico -> si prova il modello successivo,
// l'elenco letto viene salvato, la prova di connessione usa lo stesso modello della lettura.
const fs=require('fs'), assert=require('assert');
const D=require('./percorsi').SWIFT;
const S=n=>fs.readFileSync(D+n,'utf8');
const api=S('API.swift'), ops=S('StoreOps.swift'), set=S('SettingsView.swift');
const has=(s,...ks)=>{ for(const k of ks) assert.ok(s.includes(k),'manca: '+k); };
for (const [n,s] of Object.entries({api,ops,set})) for (const [a,b] of [['{','}'],['(',')'],['[',']']]) assert.ok(s.split(a).length===s.split(b).length,n+': parentesi '+a+b);

has(api,'var busy = false','busy: Bool = false','self.busy = busy','sovraccarico (\\(model)), riprova.", busy: true)',
  'static func preferredModel(_ model: String, _ known: [String]) -> String','static func modelQueue(_ model: String, _ known: [String]) -> [String]',
  'known: [String] = []','var queue = modelQueue(model, known)','var listed = !known.isEmpty','!e.notFound && !e.net && !e.busy',
  'if e.busy && busyError == nil','sovraccarico su tutti i modelli provati','tried.count < 6');
assert.ok(!api.includes('withDetail'),'niente funzioni di comodo inutili');
has(ops,'known: cfg.gmodels','if let l = r.models, !l.isEmpty { c.gmodels = l }','if !c.gmodel.isEmpty && r.model != c.gmodel && !r.quotaSkipped { c.gmodel = r.model }');
has(set,'Recognizer.preferredModel(store.cfg.gmodel, store.cfg.gmodels)','if !c.gmodel.isEmpty && !list.contains(c.gmodel) { c.gmodel = "" }','Text("Automatico" + (store.cfg.gmodels.first');
assert.ok(!set.includes('store.cfg.gmodel.isEmpty ? "gemini-flash-latest"'),'la prova non usa più l\'alias fisso');

// regole rifatte in JS
const alias='gemini-flash-latest';
const pref=(m,k)=>m||k[0]||alias;
const queue=(m,k)=>{const q=[];for(const x of [pref(m,k),...k.slice(0,4),alias]) if(!q.includes(x)) q.push(x);return q;};
const L=['gemini-3.6-flash','gemini-3.5-flash','gemini-3.6-flash-lite'];
assert.deepStrictEqual(queue('',[]),[alias]);
assert.deepStrictEqual(queue('',L),[...L,alias]);
assert.deepStrictEqual(queue('gemini-3.5-flash',L),['gemini-3.5-flash','gemini-3.6-flash','gemini-3.6-flash-lite',alias]);
assert.strictEqual(pref('',L),'gemini-3.6-flash');
// simulazione: risposte per modello -> modello usato o errore finale
function recognize(model,known,resp,listed=['gemini-3.6-flash','gemini-3.5-flash']){
  let q=queue(model,known), tried=[], isListed=known.length>0, busy=false, net=false, models=null;
  while(q.length && tried.length<6){ const m=q.shift(); if(tried.includes(m)) continue; tried.push(m);
    const r=resp[m]||'404';
    if(r==='ok') return {model:m,tried,models};
    if(!['404','503','net'].includes(r)) return {err:r,tried};
    if(r==='503') busy=true; if(r==='net') net=true;
    if(!q.length && !isListed){ isListed=true; models=listed; q.push(...listed.slice(0,4)); } }
  return {err: busy?'busy':net?'net':'none',tried};
}
// il caso dello screen: elenco vuoto, alias in 503 -> legge l'elenco e usa un modello concreto
let r=recognize('',[],{[alias]:'503','gemini-3.6-flash':'ok'});
assert.strictEqual(r.model,'gemini-3.6-flash'); assert.deepStrictEqual(r.models,['gemini-3.6-flash','gemini-3.5-flash']);
// elenco noto: si parte dal modello concreto, l'alias non si tocca
r=recognize('',L,{'gemini-3.6-flash':'ok',[alias]:'503'}); assert.deepStrictEqual(r.tried,['gemini-3.6-flash']);
// primo modello carico -> secondo
r=recognize('',L,{'gemini-3.6-flash':'503','gemini-3.5-flash':'ok'}); assert.strictEqual(r.model,'gemini-3.5-flash');
// tutti carichi -> messaggio di sovraccarico, non "nessun modello"
r=recognize('',L,{'gemini-3.6-flash':'503','gemini-3.5-flash':'503','gemini-3.6-flash-lite':'503',[alias]:'503'}); assert.strictEqual(r.err,'busy');
// errori veri (chiave, 429) si fermano subito
r=recognize('',L,{'gemini-3.6-flash':'429'}); assert.strictEqual(r.err,'429'); assert.strictEqual(r.tried.length,1);
// salvataggio del modello: "Automatico" resta automatico
const save=(g,used)=>(g && used!==g)?used:g;
assert.strictEqual(save('','gemini-3.5-flash'),''); assert.strictEqual(save('gemini-x','gemini-3.5-flash'),'gemini-3.5-flash');
console.log('ios_busy_test: ok, errori: nessuno');
