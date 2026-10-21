# Allineamento del sito all'app nativa (20/10/2026), parte 4:
# ricerca con risultati "deboli" (Venusaur 30/165), lettura Gemini come la nativa (modello Automatico, coda dei modelli,
# sovraccarico = modello successivo, limite al minuto con attesa suggerita e conto alla rovescia, quota giornaliera con coda ferma
# e "Riprendi"), immagine inglese di ripiego per le carte senza immagine, "Riprova" sulle carte in errore, piccole correzioni.
import re
p='/mnt/user-data/outputs/album-carte-pokemon.html'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(old[:100],s.count(old))
    s=s.replace(old,new)
def rep_between(start,end,new):
    global s
    assert s.count(start)==1,('start',start[:80],s.count(start))
    i=s.index(start); j=s.index(end,i+len(start))
    s=s[:i]+new+s[j:]

rep('.dlnote{', '.qwarn{display:flex;align-items:center;gap:10px;border-color:color-mix(in srgb,var(--orange) 45%,transparent);color:var(--orange)}\n.qwarn span{flex:1}\n.dlnote{')

# ---------- testi: l'icona delle Impostazioni non è più un ingranaggio ----------
rep("(ingranaggio nella Home)", "(icona in alto a destra nella Home)", 4)

# ---------- Gemini come la nativa ----------
rep_between("// Gemini \"ragiona\" prima di rispondere:", "async function recognizeClaude(dataUrl, raw){",
r"""// Gemini "ragiona" prima di rispondere: per leggere una carta non serve e rallenta molto. Si prova a ridurlo al minimo;
// se il modello non accetta l'impostazione si passa alla successiva, e si ricorda quella che funziona.
const THINK = [{thinkingLevel:'minimal'}, {thinkingBudget:0}, null];
const GEMINI_TIMEOUT = 45000, GEMINI_TRIES = 2, GEMINI_ALIAS = 'gemini-flash-latest';
const gemErr = (msg, flags) => Object.assign(new Error(msg), flags || {});
// risposta 429 di Google: quota del giorno (QuotaFailure con "PerDay") e attesa suggerita (RetryInfo "34s"); se mancano, dal testo
function quotaInfo(j){
  const err = j && j.error, details = Array.isArray(err && err.details) ? err.details.filter(d => d && typeof d === 'object') : [];
  let daily = false, retry = null;
  for (const d of details){
    const t = String(d['@type'] || '');
    if (/QuotaFailure$/.test(t)) for (const v of (Array.isArray(d.violations) ? d.violations : [])) if (v && /per ?day/i.test(String(v.quotaId || '') + ' ' + String(v.quotaMetric || ''))) daily = true;
    if (/RetryInfo$/.test(t)){ const m = String(d.retryDelay || '').match(/^([0-9]+(?:\.[0-9]+)?)s$/i); if (m) retry = parseFloat(m[1]); }
  }
  const msg = String((err && err.message) || '');
  if (!details.length && /per ?day|daily/i.test(msg)) daily = true;
  if (retry == null){ const m = msg.match(/retry in ([0-9]+(?:\.[0-9]+)?) ?s/i); if (m) retry = parseFloat(m[1]); }
  return {daily, retry};
}
// la quota giornaliera gratuita si azzera a mezzanotte, ora del Pacifico (9:00 in Italia, 8:00 nelle settimane di sfasamento dell'ora legale)
function laOffset(t){
  const p = {}; for (const x of new Intl.DateTimeFormat('en-US', {timeZone:'America/Los_Angeles', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'}).formatToParts(new Date(t))) p[x.type] = x.value;
  return {off: Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(t / 1000) * 1000, p};
}
function nextDailyReset(now = Date.now()){
  try {
    const {off, p} = laOffset(now), midnight = Date.UTC(+p.year, +p.month - 1, +p.day + 1, 0, 0, 0);
    let r = midnight - off; r = midnight - laOffset(r).off; return r;
  } catch(e){ return now + 864e5; }
}
const hhmm = t => new Date(t).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
// modelli con la quota del giorno finita (solo in memoria): non si richiamano fino all'azzeramento
const dailyBlocked = {};
// "Automatico": il primo modello concreto dell'elenco; l'alias solo se l'elenco manca (l'alias è spesso il più carico)
const preferredModel = (model, known) => model || (known && known[0]) || GEMINI_ALIAS;
function modelQueue(model, known){
  const q = []; for (const m of [preferredModel(model, known)].concat((known || []).slice(0, 4), [GEMINI_ALIAS])) if (!q.includes(m)) q.push(m);
  return q;
}
async function callGemini(model, dataUrl, raw, thinkStart){
  for (let i = thinkStart || 0; i < THINK.length; i++){
    const gc = {temperature:0, maxOutputTokens:1024, responseMimeType:'application/json'};
    if (THINK[i]) gc.thinkingConfig = THINK[i];
    const body = JSON.stringify({
      systemInstruction:{parts:[{text:buildPrompt()}]},
      contents:[{role:'user', parts:[{inline_data:{mime_type:'image/jpeg', data:dataUrl.split(',')[1]}}].concat(raw ? [{inline_data:{mime_type:'image/jpeg', data:raw.split(',')[1]}}] : [], [{text:rawNote(raw)}])}],
      generationConfig:gc
    });
    let res = null;
    for (let attempt = 1; ; attempt++){
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), GEMINI_TIMEOUT);
      try {
        res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {method:'POST', signal:ctl.signal, headers:{'content-type':'application/json', 'x-goog-api-key':cfg.gkey}, body});
        clearTimeout(to); break;
      } catch(e){
        clearTimeout(to);
        if (e && e.name === 'AbortError'){
          if (attempt < GEMINI_TRIES) continue;
          throw new Error('Gemini non risponde (' + GEMINI_TRIES + ' tentativi da ' + Math.round(GEMINI_TIMEOUT / 1000) + ' s, modello ' + model + ', invio ' + Math.round(body.length / 1024) + ' KB): riprova, o usa "Prova la connessione" in Impostazioni.');
        }
        throw netErr(e);
      }
    }
    if (!res.ok){
      let j = null; try { j = await res.json(); } catch(e){}
      const msg = (j && j.error && j.error.message) || '';
      if (res.status === 400 && /think/i.test(msg) && i < THINK.length - 1) continue;
      if (res.status === 400 && /api key/i.test(msg)) throw new Error('Chiave Gemini non valida.');
      if (res.status === 429){
        const q = quotaInfo(j);
        if (q.daily) throw gemErr('Quota giornaliera di Gemini finita per ' + model + '.', {rate:true, daily:true, retryAfter:q.retry});
        throw gemErr('Limite al minuto di Gemini (' + model + ').', {rate:true, retryAfter:q.retry});
      }
      if (res.status === 404) throw gemErr('Modello Gemini non disponibile.', {notFound:true});
      if (res.status >= 500) throw gemErr('Gemini momentaneamente sovraccarico (' + model + '), riprova.', {busy:true});
      throw new Error('Errore da Gemini (' + res.status + '). ' + msg);
    }
    const data = await res.json();
    const day = new Date().toISOString().slice(0, 10), g = usage.gemDay && usage.gemDay.d === day ? usage.gemDay : {d:day, n:0};
    g.n++; usage.gemDay = g; LS.set('pkm_usage', usage);
    const cand = data.candidates && data.candidates[0];
    const parts = (cand && cand.content && cand.content.parts) || [];
    try { return {rec:parseRec(parts.map(p => p.text || '').join('')), think:i}; }
    catch(e){
      const why = cand && cand.finishReason;
      throw new Error('Gemini non ha dato una risposta leggibile' + (why && why !== 'STOP' ? ' (motivo: ' + why + ')' : '') + ': riprova, o con un altro scatto.');
    }
  }
  throw new Error('Gemini non ha dato una risposta leggibile: riprova.');
}
async function recognizeGemini(dataUrl, raw){
  const known = Array.isArray(cfg.gmodels) ? cfg.gmodels : [], model = cfg.gmodel || '', queue = modelQueue(model, known), tried = [];
  let listed = known.length > 0, listedModels = null, netError = null, busyError = null, dailyHit = false;
  while (queue.length && tried.length < 6){
    const m = queue.shift(); if (tried.includes(m)) continue; tried.push(m);
    if (dailyBlocked[m] && dailyBlocked[m] > Date.now()) dailyHit = true;   // quota del giorno già finita: non lo si richiama
    else {
      try {
        const r = await callGemini(m, dataUrl, raw, m === model && typeof cfg.gthink === 'number' ? cfg.gthink : 0);
        if (listedModels && listedModels.length) cfg.gmodels = listedModels;
        // con "Automatico" resta automatico; un modello scelto che non risponde viene sostituito da quello che ha funzionato
        if (cfg.gmodel && m !== cfg.gmodel && !dailyHit) cfg.gmodel = m;
        cfg.gthink = r.think; LS.set('pkm_cfg', cfg);
        return r.rec;
      } catch(e){
        // limite al minuto e altri errori veri: si ferma qui (la coda aspetta); quota del giorno o sovraccarico: modello successivo
        if (!e.notFound && !e.net && !e.busy && !e.daily) throw e;
        if (e.net && !netError) netError = e;
        if (e.busy && !busyError) busyError = e;
        if (e.daily){ dailyHit = true; dailyBlocked[m] = nextDailyReset(); }
      }
    }
    if (!queue.length && !listed){
      listed = true; let l = []; try { l = await fetchGModels(cfg.gkey); } catch(e2){}
      if (l.length) listedModels = l;
      queue.push(...(l.length ? l.slice(0, 4) : ['gemini-3.6-flash', 'gemini-3.5-flash']));
    }
  }
  if (!busyError && dailyHit){
    const reset = nextDailyReset();
    throw gemErr('Quota giornaliera gratuita di Gemini finita su tutti i modelli provati (' + tried.join(', ') + '). Si azzera alle ' + hhmm(reset) + ': tocca Riprendi da allora, oppure passa a Claude in Impostazioni.', {rate:true, daily:true, resumeAt:reset});
  }
  if (busyError) throw gemErr('Gemini è sovraccarico su tutti i modelli provati (' + tried.join(', ') + '): riprova tra qualche minuto.', {busy:true});
  if (netError) throw netError;
  throw new Error('Nessun modello Gemini disponibile con questa chiave: controlla l’elenco in Impostazioni (icona in alto a destra nella Home).');
}

""")
rep("    if (res.status === 429) throw new Error('Troppe richieste, riprova tra poco.');",
    "    if (res.status === 429) throw gemErr('Troppe richieste a Claude, riprova tra poco.', {rate:true});")

# ---------- ricerca con risultati deboli (come la nativa) ----------
rep_between("async function searchTcgdex(name, num, tot, lang){", "function renderCands(){",
r"""/* Ricerca a gradini (come la nativa): "deboli" = stesso numero con altro nome, oppure stesso nome con altro numero.
   Ordine: TCGdex forte > Pokémon TCG API forte > TCGdex debole > Pokémon TCG API debole.
   Caso: Venusaur 30/165 di Expedition non deve diventare la carta 30 di Scarlatto e Violetto 151. */
const normName = v => String(v || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
async function searchTcgdexRanked(name, num, tot, lang){
  const lg = lang || 'it', sameNum = lid => normNum(String(lid)) === normNum(String(num)), nn = normName(name);
  let ids = [], weakIds = [];
  if (num && tot){
    const sets = await tdSetList(lg), cand = sets.filter(x => String(x.official) === String(tot)).slice(0, 12);
    const details = await Promise.all(cand.map(x => tdGet(lg + '/sets/' + encodeURIComponent(x.id)).catch(() => null)));
    const hits = [];
    for (const sd of details){ if (!sd || !Array.isArray(sd.cards)) continue; const m = sd.cards.find(c => sameNum(c.localId)); if (m) hits.push(m); }
    const byName = name ? hits.filter(h => { const hn = normName(h.name); return hn && (hn.includes(nn) || nn.includes(hn)); }) : [];
    if (!name || byName.length) ids = (name ? byName : hits).map(h => h.id); else weakIds = hits.map(h => h.id);
  }
  if (!ids.length && name){
    const list = await tdGet(lg + '/cards?name=' + encodeURIComponent(name));
    if (Array.isArray(list)){
      const f = num ? list.filter(c => sameNum(c.localId)) : list;
      if (f.length) ids = f.slice(0, 8).map(c => c.id); else if (!weakIds.length) weakIds = list.slice(0, 8).map(c => c.id);
    }
  }
  const weak = !ids.length; if (weak) ids = weakIds;
  if (!ids.length) return {cards:[], weak:false};
  const cards = await Promise.all(ids.slice(0, 8).map(id => tdGet(lg + '/cards/' + encodeURIComponent(id)).catch(() => null)));
  return {cards:cards.filter(Boolean).map(c => fromTcgdex(c, lg)), weak};
}
// con numero e totale si tengono le carte col nome giusto (30/165 è sia Venusaur di Expedition sia una carta di 151)
async function searchPtcgRanked(name, num, tot){
  const nn = normName(name), queries = [];
  if (num && tot) queries.push('number:"' + num + '" set.printedTotal:' + tot);
  if (name && num) queries.push('name:"' + name + '" number:"' + num + '"');
  if (name) queries.push('name:"' + name + '"');
  let weak = [], lastErr = null, anyOk = false, fails = 0;
  for (const q of queries){
    try {
      const f = await tcgGet(q, {}, 1, 12000); anyOk = true; if (!f.length) continue;
      const cs = f.map(c => Object.assign(c, {src:'ptcg'}, ptcgExtra(c)));
      if (q.includes('set.printedTotal:') && nn){
        const same = cs.filter(c => { const cn = normName(c.name); return cn && (cn.includes(nn) || nn.includes(cn)); });
        if (same.length) return {cards:same, weak:false};
        if (!weak.length) weak = cs; continue;
      }
      if (!q.includes('number:') && num){ if (!weak.length) weak = cs; continue; }
      return {cards:cs, weak:false};
    } catch(e){ lastErr = e; if (++fails >= 2) break; }
  }
  if (!anyOk && lastErr) throw lastErr;
  return {cards:weak, weak:weak.length > 0};
}
async function searchCards(name, num, tot, lang, tdName){
  const out = {found:[], source:'', errors:[], weak:false}; let weakTd = [];
  try { const r = await searchTcgdexRanked(tdName || name, num, tot, lang); if (r.weak) weakTd = r.cards; else { out.found = r.cards; out.source = 'TCGdex'; } } catch(e){ out.errors.push(e); }
  if (!out.found.length){
    try {
      const r = await searchPtcgRanked(name, num, tot);
      // un risultato debole della Pokémon TCG API non scavalca uno debole di TCGdex (che ha le carte italiane)
      if (r.cards.length && (!r.weak || !weakTd.length)){ out.found = r.cards; out.source = 'Pokémon TCG API'; out.weak = r.weak; }
    } catch(e){ out.errors.push(e); }
  }
  if (!out.found.length && weakTd.length){ out.found = weakTd; out.source = 'TCGdex'; out.weak = true; }
  return out;
}
const searchTcgdex = async (name, num, tot, lang) => (await searchTcgdexRanked(name, num, tot, lang)).cards;
const searchPtcg = async (name, num, tot) => (await searchPtcgRanked(name, num, tot)).cards;

async function search(){
  const name = cleanName($('f-name').value);
  let num = $('f-num').value.trim(), tot = $('f-tot').value.trim();
  if (num.includes('/')){ const p = num.split('/'); num = p[0]; if (!tot) tot = p[1]; }
  num = cleanNum(num); tot = tot.replace(/\D/g, '');
  if (!name && !num){ setStatus('Inserisci almeno il nome o il numero.', 'err'); return; }
  const lang = $('f-lang').value, rec = current.rec || {};
  // su TCGdex una carta italiana si cerca col nome stampato, se il nome non è stato cambiato a mano
  const tdName = (lang === 'it' && rec.name_printed && name === cleanName(rec.name_en || '')) ? cleanName(rec.name_printed) : name;
  setStatus('Cerco nel catalogo carte…');
  current.cands = []; current.sel = null; renderCands(); renderAdd();
  const o = await searchCards(name, num, tot, lang, tdName), found = o.found;
  current.cands = found;
  if (!found.length){
    setStatus(o.errors.length >= 2 || (o.errors[0] && o.errors[0].net) ? 'Catalogo carte non raggiungibile in questo momento: ' + o.errors[o.errors.length - 1].message + ' Riprova tra poco.'
      : 'Nessuna carta trovata. Prova con meno parole o senza il totale del set.', 'err');
    return;
  }
  setStatus(o.weak ? 'Nessuna carta con questo nome e questo numero: ecco le più vicine. Controlla nome, numero e totale. (fonte: ' + o.source + ')'
    : (found.length === 1 ? 'Trovata una carta. Controlla e aggiungi.' : 'Trovate ' + found.length + ' carte. Tocca quella giusta.') + ' (fonte: ' + o.source + ')', o.weak ? 'err' : 'ok');
  if (found.length === 1 && !o.weak) current.sel = 0;
  renderCands(); renderAdd();
}

""")
rep_between("async function lookupCandidates(rec){", "// aggiunta automatica solo se il risultato è uno,",
r"""async function lookupCandidates(rec){
  const lang = {it:'it', en:'en', ja:'ja'}[rec.language] || 'en';
  const num = cleanNum(String(rec.number || '').split('/')[0].trim()), tot = String(rec.printed_total || '').replace(/\D/g, '');
  const name = cleanName(rec.name_en || rec.name_printed || ''), tdName = lang === 'it' && rec.name_printed ? cleanName(rec.name_printed) : name;
  const o = await searchCards(name, num, tot, lang, tdName);
  if (!o.found.length && o.errors.length >= 2) throw o.errors[o.errors.length - 1];
  return o.found;
}
""")

# ---------- coda: limite al minuto con attesa e conto alla rovescia, quota giornaliera con coda ferma ----------
rep("const QGAP = 4500; // con Gemini gratuito: una lettura ogni 4,5 secondi per restare nei limiti al minuto",
r"""const QGAP = 4500; // con Gemini gratuito: una lettura ogni 4,5 secondi per restare nei limiti al minuto
let qPauseUntil = 0, qPausedJob = null, qStopReason = '', qStopUntil = 0, qTick = null;
// attesa dopo un limite al minuto: quella suggerita dal servizio (+2 s), fra 5 s e 5 minuti; altrimenti 65 s
const pauseFor = sec => typeof sec === 'number' && isFinite(sec) ? Math.min(Math.max(sec + 2, 5), 300) : 65;
const mmss = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
function startTick(){
  if (qTick) return;
  qTick = setInterval(() => {
    const left = qPauseUntil - Date.now();
    document.querySelectorAll('.cdn').forEach(el => { el.textContent = mmss(left); });
    if (left <= 0){ clearInterval(qTick); qTick = null; }
  }, 1000);
}
// riprende la coda fermata per la quota giornaliera (anche dopo aver cambiato servizio o chiave)
function resumeQueue(){
  qStopReason = ''; qStopUntil = 0; for (const k of Object.keys(dailyBlocked)) delete dailyBlocked[k];
  for (const j of qJobs) if (j.status === 'queued' && j.msg){ j.msg = ''; jobSave(j); }
  clearTimeout(qTimer); qPauseUntil = 0; qPausedJob = null; qPaused = false; renderQuick(); runQueue();
}""")
rep("""  } catch(e){
    const m = String(e.message || ''), lim = /Limite gratuito|Troppe richieste/.test(m);
    if (lim || /Credito esaurito|Connessione|non risponde|sovraccarico/.test(m)){
      job.status = 'queued'; qPaused = true; jobSave(job);
      if (lim && !job.t429){ job.t429 = 1; qPauseMsg = 'Limite raggiunto: riprovo tra un minuto.'; clearTimeout(qTimer); qTimer = setTimeout(() => { qPaused = false; renderQuick(); runQueue(); }, 65000); }
      else qPauseMsg = m + (lim ? ' Le foto restano in coda.' : '');
    } else { job.status = 'error'; job.msg = m; jobSave(job); }
  }""","""  } catch(e){
    const m = String(e.message || '');
    if (e.rate && e.daily){
      // inutile aspettare un minuto: la coda si ferma finché la quota non si azzera o si tocca Riprendi
      job.status = 'queued'; job.msg = 'Ferma: quota giornaliera finita.'; jobSave(job);
      qStopReason = m; qStopUntil = e.resumeAt || 0; qPaused = true; return;
    }
    if (e.rate){
      const secs = pauseFor(e.retryAfter);
      job.status = 'queued'; job.msg = ''; jobSave(job);
      qPaused = true; qPausedJob = job.id; qPauseUntil = Date.now() + secs * 1000; qPauseMsg = '';
      clearTimeout(qTimer); qTimer = setTimeout(() => { qPauseUntil = 0; qPausedJob = null; qPaused = false; renderQuick(); runQueue(); }, secs * 1000);
      startTick(); return;
    }
    if (e.net || e.busy || /Credito esaurito|non risponde/.test(m)){ job.status = 'queued'; qPaused = true; qPauseMsg = m; jobSave(job); }
    else { job.status = 'error'; job.msg = m; jobSave(job); }
  }""")
rep("""async function runQueue(){
  if (qBusy) return;""","""async function runQueue(){
  if (qBusy) return;
  if (qStopReason && qStopUntil && Date.now() >= qStopUntil){ qStopReason = ''; qStopUntil = 0; for (const k of Object.keys(dailyBlocked)) delete dailyBlocked[k]; qPaused = false; }
  if (qStopReason) return;""")
rep("""  $('q-banner').innerHTML = qPaused && cnt('queued') ? '<div class="status home-note"><span>' + esc(qPauseMsg || 'Elaborazione in pausa.') + '</span><button class="btn small" type="button" data-q="resume">Riprendi</button></div>' : '';""",
"""  $('q-banner').innerHTML = qStopReason ? '<div class="status qwarn"><span>' + esc(qStopReason) + '</span><button class="pbtn solid" type="button" data-q="resume">Riprendi</button></div>'
    : qPauseUntil > Date.now() ? '<div class="status qwarn"><span>Limite al minuto del servizio gratuito: riprendo da solo tra <b class="cdn">' + mmss(qPauseUntil - Date.now()) + '</b>.</span></div>'
    : qPaused && cnt('queued') ? '<div class="status home-note"><span>' + esc(qPauseMsg || 'Elaborazione in pausa.') + '</span><button class="btn small" type="button" data-q="resume">Riprendi</button></div>' : '';""")
rep("""    const label = j.status === 'edges' ? 'Bordi da controllare' : j.status === 'queued' ? 'In coda' :""",
    """    const label = j.status === 'edges' ? 'Bordi da controllare' : j.status === 'queued' ? (qPausedJob === j.id && qPauseUntil > Date.now() ? 'In pausa, riprendo tra <span class="cdn">' + mmss(qPauseUntil - Date.now()) + '</span>' : j.msg ? esc(j.msg) : 'In coda') :""")
rep("""    const acts = j.status === 'edges' ? fix + del : j.status === 'review' || j.status === 'error' ? '<button class="btn small solid" type="button" data-q="review" data-id="' + id + '">Controlla</button>' + fix + del : j.status === 'queued' ? del : '';""",
    """    const retry = j.status === 'error' ? '<button class="btn small" type="button" data-q="retry" data-id="' + id + '">Riprova</button>' : '';
    const acts = j.status === 'edges' ? fix + del : j.status === 'review' || j.status === 'error' ? '<button class="btn small solid" type="button" data-q="review" data-id="' + id + '">Controlla</button>' + retry + fix + del : j.status === 'queued' ? del : '';""")
rep("""  else if (a === 'resume'){ clearTimeout(qTimer); qPaused = false; renderQuick(); runQueue(); }""",
    """  else if (a === 'resume') resumeQueue();
  else if (a === 'retry' && job){ job.status = 'queued'; job.msg = ''; job.rec = null; jobSave(job); if (qStopReason) resumeQueue(); else { if (!qPauseUntil) qPaused = false; renderQuick(); runQueue(); } }""")

# ---------- immagine inglese di ripiego per le carte TCGdex senza immagine ----------
rep("""  const ne = catalog.find(x => x.key === key); if (ne) recordPrice(ne);
  save(); return key;""","""  const ne = catalog.find(x => x.key === key); if (ne) recordPrice(ne);
  save(); if (ne && needsImage(ne)) setTimeout(fillMissingImages, 0); return key;""")
rep_between("function itemRow(e){", "async function renderSetDetail(){",
r"""/* Immagini mancanti (come la nativa): per le carte TCGdex senza immagine si prova la stessa carta nella sua lingua, poi in inglese.
   Il risultato si salva (imgFrom: "EN"/"IT"... oppure "" = cercata senza esito), così non si ripete; errori di rete = si riprova dopo. */
const needsImage = e => !e.img && e.imgFrom === undefined && e.src === 'tcgdex' && !!e.srcId;
const imageLangs = l => { l = String(l || '').toLowerCase(); return !l || l === 'en' ? ['en'] : [l, 'en']; };
let imgFillRunning = false;
async function fillMissingImages(){
  if (imgFillRunning) return;
  const need = catalog.filter(needsImage); if (!need.length) return;
  imgFillRunning = true;
  try {
    const groups = new Map();
    for (const e of need){ const k = (e.srcLang || '') + '/' + e.srcId; if (!groups.has(k)) groups.set(k, {sid:e.srcId, lang:e.srcLang, keys:new Set()}); groups.get(k).keys.add(e.key); }
    let changed = false;
    for (const g of groups.values()){
      let found = null, from = '', failed = false;
      for (const l of imageLangs(g.lang)){
        try { const d = await tdGet(l + '/cards/' + encodeURIComponent(g.sid)), c = d && fromTcgdex(d, l); if (c && c.images.small){ found = c.images.small; from = l.toUpperCase(); break; } }
        catch(err){ failed = true; break; }
      }
      if (failed) continue;
      for (const e of catalog) if (g.keys.has(e.key) && needsImage(e)){ if (found) e.img = found; e.imgFrom = found ? from : ''; changed = true; }
    }
    if (changed){ save(); refreshViews(); }
  } finally { imgFillRunning = false; }
}
""")
rep("loadPhotos();\nif (!LS.get('pkm_bkstat', null))", "loadPhotos();\nif (navigator.onLine !== false) setTimeout(fillMissingImages, 1500);\nif (!LS.get('pkm_bkstat', null))")

# ---------- Impostazioni: modello "Automatico" come la nativa ----------
rep_between("function fillGModels(){", "// elenco dei modelli Gemini \"flash\"",
r"""function fillGModels(){
  const list = Array.isArray(cfg.gmodels) ? cfg.gmodels : [], cur = cfg.gmodel || '';
  const opts = [['', 'Automatico' + (list[0] ? ' (' + list[0] + ')' : '')]].concat(list.map(n => [n, n]));
  if (cur && !list.includes(cur)) opts.push([cur, cur]);
  $('s-gmodel').innerHTML = opts.map(o => '<option value="' + esc(o[0]) + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('');
}
""")
rep("    cfg.gmodels = list; if (!list.includes(cfg.gmodel)) cfg.gmodel = list[0];",
    "    cfg.gmodels = list; if (cfg.gmodel && !list.includes(cfg.gmodel)){ cfg.gmodel = ''; delete cfg.gthink; }")
rep("  { const pm = cfg.gmodel; cfg.gmodel = $('s-gmodel').value || cfg.gmodel; if (pm !== cfg.gmodel) delete cfg.gthink; }",
    "  { const pm = cfg.gmodel; cfg.gmodel = $('s-gmodel').value; if (pm !== cfg.gmodel) delete cfg.gthink; }")
rep("  if (list && list.length){ cfg.gmodels = list; if (!list.includes(cfg.gmodel)){ cfg.gmodel = list[0]; delete cfg.gthink; } }",
    "  if (list && list.length){ cfg.gmodels = list; if (cfg.gmodel && !list.includes(cfg.gmodel)){ cfg.gmodel = ''; delete cfg.gthink; } }")
rep("  const model = cfg.gmodel || 'gemini-flash-latest', base = 'https://generativelanguage.googleapis.com/v1beta/models';",
    "  const model = preferredModel(cfg.gmodel, cfg.gmodels), base = 'https://generativelanguage.googleapis.com/v1beta/models';")

# ---------- grafico: con euro interi le tacche sono numeri interi ----------
rep("""function niceTicks(lo, hi, want = 3){
  if (!(hi > lo)){ const pad = Math.max(Math.abs(hi) * 0.05, 0.5); lo -= pad; hi += pad; }
  const raw = (hi - lo) / Math.max(1, want - 1), mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(x => x >= raw) || 10 * mag;""",
"""function niceTicks(lo, hi, want = 3, whole = false){
  if (!(hi > lo)){ const pad = Math.max(Math.abs(hi) * 0.05, 0.5); lo -= pad; hi += pad; }
  const raw = (hi - lo) / Math.max(1, want - 1), mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = Math.max(whole ? 1 : 0, (whole ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10]).map(k => k * mag).find(x => x >= raw) || 10 * mag);""")
rep("""  const vals = pts.map(p => p.value), ticks = niceTicks(Math.min(...vals), Math.max(...vals));""",
    """  const vals = pts.map(p => p.value), whole = chartWholeEuros(vals), ticks = niceTicks(Math.min(...vals), Math.max(...vals), 3, whole);""")
rep("""  const whole = chartWholeEuros(vals), tk = chartTickDays(pts.map(p => p.day));""",
    """  const tk = chartTickDays(pts.map(p => p.day));""")

# ---------- ritocchi dopo le schermate: carattere delle note, date del grafico non sovrapposte ----------
rep(".chnote{font-size:.82rem;", "textarea.note{font:inherit;font-size:.95rem}\n.chnote{font-size:.82rem;")
rep("""  const tk = chartTickDays(pts.map(p => p.day));""",
"""  // date troppo vicine (meno di 44 punti) si saltano: restano sempre la prima e l'ultima
  const tk = chartTickDays(pts.map(p => p.day)).filter((d, i, a) => i === 0 || i === a.length - 1 || (X(d) - X(a[0]) >= 44 && X(a[a.length - 1]) - X(d) >= 44));""")

open(p,'w',encoding='utf-8').write(s)
open('/home/claude/app.js','w',encoding='utf-8').write(re.search(r'<script>\n(.*)</script>',s,re.S).group(1))
print('ok')
