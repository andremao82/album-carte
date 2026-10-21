// Trasloco su Cloudflare Pages (21/10/2026): il pacchetto non dipende da Netlify e il profilo punta al sito giusto.
const fs=require('fs'),assert=require('assert'),{execSync}=require('child_process');
const L=require('./percorsi'), P=L.SITE, ZIP=L.ZIP;
let n=0; const ok=(c,m)=>{assert.ok(c,m);n++;};
const html=fs.readFileSync(L.APP,'utf8');
ok(!/netlify/i.test(html),'nessun riferimento a Netlify nell\'app');
ok(html.includes('Apri il sito online con il browser.'),'avviso anteprima generico');
ok(html.includes('apri il sito online.'),'errore di rete generico');
const sh=fs.readFileSync(require('./percorsi').PACCHETTO,'utf8');
const sito=(sh.match(/^SITO="([^"]*)"/m)||[])[1];
ok(sito!==undefined,'SITO definito in pacchetto.sh');
const pronto=/^https:\/\/[a-z0-9.-]+\/$/.test(sito);
const mc=fs.readFileSync(P+'/carte.mobileconfig','utf8');
const urls=[...mc.matchAll(/<key>URL<\/key>\s*<string>([^<]*)<\/string>/g)].map(m=>m[1]);
ok(urls.length===1,'un solo URL nel profilo');
if(pronto){
  ok(urls[0]===sito,'il profilo punta a SITO: '+urls[0]);
  ok(!/netlify/i.test(mc),'profilo senza Netlify');
  if(fs.existsSync(ZIP)){
    const z=execSync('unzip -p "'+ZIP+'" carte.mobileconfig').toString();
    ok(z.includes('<string>'+sito+'</string>'),'lo zip contiene il profilo aggiornato');
    const zi=execSync('unzip -p "'+ZIP+'" index.html').toString();
    ok(zi===html,'lo zip contiene l\'app attuale');
  }
} else console.log('(SITO non ancora impostato: controlli sul profilo saltati)');
// _headers: stessa sintassi su Cloudflare Pages; il profilo deve uscire col tipo giusto
const hd=fs.readFileSync(P+'/_headers','utf8');
ok(/^\/carte\.mobileconfig\n\s+Content-Type: application\/x-apple-aspen-config/m.test(hd),'_headers per il profilo');
const sw=fs.readFileSync(P+'/sw.js','utf8');
ok(!/netlify|pages\.dev/i.test(sw),'service worker indipendente dal dominio');
// identificatori del profilo invariati: installandolo, iOS sostituisce la vecchia icona invece di aggiungerne una seconda
ok(mc.includes('<string>it.albumcarte.profile</string>')&&mc.includes('<string>it.albumcarte.profile.webclip</string>'),'identificatori invariati');
console.log('hosting_test: '+n+' controlli superati, errori: nessuno');
