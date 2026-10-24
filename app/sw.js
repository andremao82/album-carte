/* Service worker dell'Album carte Pokémon.
   - Il guscio dell'app (pagina, icone, manifest) viene conservato: l'app si apre anche senza rete e mostra il catalogo.
   - La pagina si cerca prima in rete (così gli aggiornamenti arrivano subito); se la rete non risponde entro 3 secondi o manca, si usa la copia conservata.
   - Le richieste verso altri siti (prezzi, immagini, riconoscimento) non vengono toccate. */
const VERSION = 'album-v4';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // tabella per l'esportazione verso Collectr: sempre dalla rete, così una tabella aggiornata arriva subito
  if (url.pathname.endsWith('/tcgplayer-ids.json')) return;
  // il profilo per l'icona (e ogni altro file scaricabile) passa direttamente dalla rete: non va mai scambiato per la pagina dell'app
  if (req.mode === 'navigate' && !(url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'))) return;
  if (req.mode === 'navigate'){
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const net = fetch(req).then(res => { if (res && res.ok) cache.put('./index.html', res.clone()); return res; });
      net.catch(() => {});
      try {
        const first = await Promise.race([net, new Promise(r => setTimeout(() => r(null), 3000))]);
        if (first && first.ok) return first;
        // rete lenta, o risposta di errore (per esempio sito sospeso): si usa la copia conservata, se c'è
        return (await cache.match('./index.html')) || first || net;
      } catch(err){
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && res.ok){ const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
