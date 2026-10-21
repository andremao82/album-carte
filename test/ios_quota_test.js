// 18/10/2026: la coda dell'app nativa restava "In pausa per il limite del servizio" all'infinito (429 di Gemini).
// Ora: limite al minuto -> attesa col retryDelay di Google e conto alla rovescia; quota giornaliera -> modello successivo,
// e se è finita su tutti la coda si ferma con messaggio, orario di azzeramento e tasto Riprendi.
const fs=require('fs'), assert=require('assert');
const D=require('./percorsi').SWIFT;
const S=n=>fs.readFileSync(D+n,'utf8');
const api=S('API.swift'), q=S('ScanQueue.swift'), add=S('AddView.swift'), ops=S('StoreOps.swift');
const has=(s,...ks)=>{ for(const k of ks) assert.ok(s.includes(k),'manca: '+k); };
for (const [n,s] of Object.entries({api,q,add,ops})) for (const [a,b] of [['{','}'],['(',')'],['[',']']]) assert.ok(s.split(a).length===s.split(b).length,n+': parentesi '+a+b);

// --- codice Swift: punti chiave
has(api,'var rate = false','var daily = false','var retryAfter: Double? = nil','var resumeAt: Date? = nil',
  'rate: Bool = false, daily: Bool = false, retryAfter: Double? = nil, resumeAt: Date? = nil',
  'static func quotaInfo(_ j: JSON?) -> (daily: Bool, retry: Double?)','hasSuffix("QuotaFailure")','hasSuffix("RetryInfo")',
  'static func nextDailyReset(after d: Date) -> Date','"America/Los_Angeles"',
  'nonisolated(unsafe) static var dailyBlocked: [String: Date] = [:]','static func clearDailyBlocks()',
  'if let until = dailyBlocked[m], until > Date() {','!e.notFound && !e.net && !e.busy && !e.daily',
  'dailyBlocked[m] = nextDailyReset(after: Date())','quotaSkipped: dailyHit','if busyError == nil && dailyHit {',
  'Quota giornaliera gratuita di Gemini finita su tutti i modelli provati','rate: true, daily: true, resumeAt: reset',
  'AppError("Troppe richieste, riprova tra poco.", rate: true)','Limite al minuto di Gemini');
assert.ok(!api.includes('Limite gratuito di Gemini raggiunto'),'vecchio messaggio unico tolto');
// la lettura dell'elenco dei modelli avviene anche dopo un modello saltato per quota (fuori dal catch)
const loop=api.slice(api.indexOf('var dailyHit = false'),api.indexOf('if busyError == nil && dailyHit'));
assert.ok(loop.indexOf('if queue.isEmpty && !listed')>loop.lastIndexOf('catch let e as AppError'),'elenco modelli fuori dal catch');
has(ops,'&& !r.quotaSkipped { c.gmodel = r.model }');
has(q,'var pausedJob: UUID?','var stopReason: String?','var stopUntil: Date?','static func pauseFor(_ suggested: Double?) -> Double',
  'if let u = stopUntil, Date() >= u { stopReason = nil; stopUntil = nil }','guard runner == nil, stopReason == nil else { return }',
  'while stopReason == nil, let next','func resumeQueue()','Recognizer.clearDailyBlocks()','if let ae = error as? AppError, ae.rate {',
  'stopReason = ae.message','stopUntil = ae.resumeAt','Self.pauseFor(ae.retryAfter)','pausedJob = id','pausedJob = nil',
  'if stopReason != nil { resumeQueue() } else { kick() }');
assert.ok(!q.includes('isRateLimit'),'niente più riconoscimento dal testo del messaggio');
assert.ok(!q.includes('In pausa per il limite del servizio, riprendo da solo.'),'vecchio testo fisso tolto');
has(add,'if let why = queue.stopReason {','Button("Riprendi", systemImage: "play.fill") { queue.resumeQueue() }',
  'Text(timerInterval: countdownRange(until), countsDown: true)','func countdownRange(_ until: Date) -> ClosedRange<Date>','return now...max(now, until)','case .waiting where queue.stopReason != nil:',
  'if queue.pausedJob == j.id, let until = queue.pauseUntil','riprendo da solo tra');
assert.ok(!add.includes('In pausa per il limite del servizio gratuito, riprendo da solo.'),'vecchio banner tolto');
// il caso con where deve venire prima di quello generico, se no non scatta mai
assert.ok(add.indexOf('case .waiting where queue.stopReason')<add.indexOf('case .waiting, .reading, .searching'));

// --- regole rifatte in JS
function quotaInfo(j){
  const err=j&&j.error||{}, det=(err.details||[]).filter(x=>x&&typeof x==='object');
  let daily=false, retry=null;
  for(const d of det){ const t=d['@type']||'';
    if(t.endsWith('QuotaFailure')) for(const v of d.violations||[]) if(/per ?day/i.test((v.quotaId||'')+' '+(v.quotaMetric||''))) daily=true;
    if(t.endsWith('RetryInfo')){ const m=/^([0-9]+(?:\.[0-9]+)?)s$/i.exec(d.retryDelay||''); if(m) retry=+m[1]; } }
  const msg=err.message||'';
  if(!det.length && /per ?day|daily/i.test(msg)) daily=true;
  if(retry==null){ const m=/retry in ([0-9]+(?:\.[0-9]+)?) ?s/i.exec(msg); if(m) retry=+m[1]; }
  return {daily,retry};
}
const QF=(id)=>({'@type':'type.googleapis.com/google.rpc.QuotaFailure',violations:[{quotaMetric:'generativelanguage.googleapis.com/generate_content_free_tier_requests',quotaId:id}]});
const RI=(s)=>({'@type':'type.googleapis.com/google.rpc.RetryInfo',retryDelay:s});
// risposta tipica al giorno (anche Google mette un retryDelay: va ignorato per la decisione)
assert.deepStrictEqual(quotaInfo({error:{code:429,details:[QF('GenerateRequestsPerDayPerProjectPerModel-FreeTier'),RI('34s')]}}),{daily:true,retry:34});
// al minuto con decimali
assert.deepStrictEqual(quotaInfo({error:{code:429,details:[QF('GenerateRequestsPerMinutePerProjectPerModel-FreeTier'),RI('12.5s')]}}),{daily:false,retry:12.5});
// token al minuto
assert.strictEqual(quotaInfo({error:{details:[QF('GenerateContentInputTokensPerModelPerMinute-FreeTier')]}}).daily,false);
// senza dettagli: dal testo
assert.deepStrictEqual(quotaInfo({error:{message:'Quota exceeded. Please retry in 41.2s.'}}),{daily:false,retry:41.2});
assert.strictEqual(quotaInfo({error:{message:'Requests per day limit reached'}}).daily,true);
assert.deepStrictEqual(quotaInfo(null),{daily:false,retry:null});
assert.deepStrictEqual(quotaInfo({error:{details:[RI('abc')]}}),{daily:false,retry:null});

const pauseFor=s=>(s==null||!isFinite(s))?65:Math.min(Math.max(s+2,5),300);
assert.strictEqual(pauseFor(null),65); assert.strictEqual(pauseFor(34),36); assert.strictEqual(pauseFor(0),5); assert.strictEqual(pauseFor(9999),300);
assert.ok(q.includes('return min(max(s + 2, 5), 300)') && q.includes('return Double(pauseSeconds)'));

// azzeramento: mezzanotte del Pacifico -> in Italia le 9:00 (le 8:00 nelle settimane di sfasamento dell'ora legale)
function nextReset(d){ const f=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const p=Object.fromEntries(f.formatToParts(d).map(x=>[x.type,x.value]));
  const since=((+p.hour%24)*3600+(+p.minute)*60+(+p.second))*1000; return new Date(d.getTime()-since+86400000-d.getMilliseconds()); }
const rome=d=>new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit'}).format(d);
assert.strictEqual(rome(nextReset(new Date('2026-10-18T18:14:00Z'))),'09:00');   // 20:14 a Roma, come nello screen
assert.strictEqual(rome(nextReset(new Date('2026-10-28T10:00:00Z'))),'08:00');   // Italia già all'ora solare, USA no
assert.ok(nextReset(new Date('2026-10-18T18:14:00Z'))>new Date('2026-10-18T18:14:00Z'));

// simulazione della scelta del modello con quota giornaliera
function recognize(model,known,resp,blocked={}){
  const alias='gemini-flash-latest', pref=model||known[0]||alias, queue=[];
  for(const x of [pref,...known.slice(0,4),alias]) if(!queue.includes(x)) queue.push(x);
  let tried=[], busy=false, daily=false, calls=[];
  while(queue.length && tried.length<6){ const m=queue.shift(); if(tried.includes(m)) continue; tried.push(m);
    if(blocked[m]){ daily=true; continue; }
    calls.push(m); const r=resp[m]||'404';
    if(r==='ok') return {model:m,quotaSkipped:daily,calls,blocked};
    if(r==='minute') return {err:'minute',calls,blocked};
    if(r==='day'){ daily=true; blocked[m]=true; } else if(r==='503') busy=true; else if(r!=='404') return {err:r,calls}; }
  if(!busy && daily) return {err:'daily',calls,blocked};
  return {err:busy?'busy':'none',calls,blocked};
}
const L=['gemini-3.6-flash','gemini-3.5-flash','gemini-3.6-flash-lite'], A='gemini-flash-latest';
// primo modello finito per oggi -> secondo, senza sostituire per sempre il modello scelto
let r=recognize('gemini-3.6-flash',L,{'gemini-3.6-flash':'day','gemini-3.5-flash':'ok'});
assert.strictEqual(r.model,'gemini-3.5-flash'); assert.strictEqual(r.quotaSkipped,true);
const save=(g,used,skip)=>(g && used!==g && !skip)?used:g;
assert.strictEqual(save('gemini-3.6-flash',r.model,r.quotaSkipped),'gemini-3.6-flash');
// carta successiva: il modello bloccato non viene più chiamato
r=recognize('',L,{'gemini-3.5-flash':'ok'},{'gemini-3.6-flash':true}); assert.deepStrictEqual(r.calls,['gemini-3.5-flash']);
// tutti finiti -> errore giornaliero (la coda si ferma); dopo, nessuna chiamata a vuoto
const blocked={};
r=recognize('',L,{[L[0]]:'day',[L[1]]:'day',[L[2]]:'day',[A]:'day'},blocked); assert.strictEqual(r.err,'daily'); assert.strictEqual(r.calls.length,4);
r=recognize('',L,{},blocked); assert.strictEqual(r.err,'daily'); assert.strictEqual(r.calls.length,0);
// limite al minuto: si ferma subito sullo stesso modello (la coda aspetta il retryDelay)
r=recognize('',L,{[L[0]]:'minute'}); assert.strictEqual(r.err,'minute'); assert.deepStrictEqual(r.calls,[L[0]]);
// giorno + sovraccarico misti: vale il sovraccarico (si riprova fra qualche minuto)
r=recognize('',L,{[L[0]]:'day',[L[1]]:'503',[L[2]]:'503',[A]:'503'}); assert.strictEqual(r.err,'busy');

// simulazione della coda: quota del giorno ferma tutto, Riprendi o l'orario di azzeramento la riavviano
function Queue(){ return {jobs:[],stop:null,until:null,runs:0,
  kick(now){ if(this.until && now>=this.until){this.stop=null;this.until=null;} if(this.stop) return; this.runs++; },
  fail(daily,reset){ if(daily){ this.stop='quota'; this.until=reset; } },
  resume(now){ this.stop=null; this.until=null; this.kick(now); } }; }
const Q=Queue(); Q.fail(true,1000); Q.kick(500); assert.strictEqual(Q.runs,0,'ferma prima dell\'azzeramento');
Q.kick(1000); assert.strictEqual(Q.runs,1,'riparte da sola dopo l\'azzeramento'); assert.strictEqual(Q.stop,null);
Q.fail(true,5000); Q.resume(600); assert.strictEqual(Q.runs,2,'Riprendi la riavvia subito');
assert.ok(!add.includes('Date.now...until'),'niente intervalli rovesciabili');
console.log('ios_quota_test: ok, errori: nessuno');
