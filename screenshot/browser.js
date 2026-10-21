// Avvia il browser per screenshot e test con Chromium vero.
// Mac: Chrome (o Chromium/Edge/Brave) installato in /Applications. Linux: Chromium di @sparticuz/chromium.
// Ovunque: CHROME_PATH=/percorso/del/browser per sceglierne uno a mano.
const fs=require('fs');
const puppeteer=require('puppeteer-core');
const MAC=['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge','/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'];
function trovaBrowser(){
  if(process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if(process.platform==='darwin') return MAC.find(p=>fs.existsSync(p))||null;
  return null;
}
async function launch(){
  let exe=trovaBrowser(), args=['--no-sandbox'], headless=true;
  if(!exe && process.platform==='linux'){
    const c=require('@sparticuz/chromium').default; exe=await c.executablePath(); args=[...c.args,'--no-sandbox']; headless='shell';
  }
  if(!exe) throw new Error('Browser non trovato: installa Google Chrome oppure imposta CHROME_PATH');
  return puppeteer.launch({args,executablePath:exe,headless});
}
module.exports={launch,trovaBrowser};
