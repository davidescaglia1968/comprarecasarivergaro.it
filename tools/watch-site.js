/* Sorveglianza del sito vivo: la esegue GitHub Actions (workflow site-watch.yml)
   dopo ogni deploy e ogni giorno alle 06:00, ma gira anche in locale con
   `node tools/watch-site.js`. Controlla, nell'ordine:
   1. ogni URL della sitemap viva risponde 200;
   2. gli URL storici rimossi dall'indice (seo.url_storici_rimossi nel config)
      rispondono ancora 404, cioe' nessuno li ha resurrecti per errore;
   3. nelle pagine pubbliche non compare nessuna dicitura di prezzo vietata
      (decisione di Davide: il prezzo lo comunica lui al telefono);
   4. PageSpeed Insights mobile su home e prima scheda: solo avviso, perche'
      l'API senza chiave ha quota limitata e un timeout non e' un guasto.
   Esce con codice 1 se fallisce uno dei controlli 1-3: il workflow apre una Issue. */
const fs = require('fs');
const BASE = 'https://comprarecasarivergaro.it';
const cfg = JSON.parse(fs.readFileSync('src/data/site-config.json', 'utf8'));
const fail = [];
const warn = [];
const ok = (m) => console.log('  ✓ ' + m);
const status = async (u) => (await fetch(u, { redirect: 'manual' })).status;

(async () => {
  console.log('== URL della sitemap (atteso 200)');
  const sm = await (await fetch(BASE + '/sitemap.xml?nocache=' + Date.now())).text();
  const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (!urls.length) fail.push('sitemap illeggibile o vuota');
  for (const u of urls) {
    const s = await status(u);
    if (s === 200) ok(u.replace(BASE, '') + ' → 200');
    else fail.push(u + ' risponde ' + s);
  }

  console.log('== URL storici rimossi (atteso 404)');
  for (const u of (cfg.seo && cfg.seo.url_storici_rimossi) || []) {
    const s = await status(u);
    if (s === 404) ok(u.replace(BASE, '') + ' → 404');
    else fail.push('URL storico di nuovo vivo: ' + u + ' risponde ' + s);
  }

  console.log('== Diciture di prezzo vietate');
  const vietate = ['Prezzo riservato', 'Prezzo in definizione'];
  const pagine = urls.filter((u) => !/legal|grazie|404/.test(u));
  for (const u of pagine) {
    const t = await (await fetch(u)).text();
    const corpo = t.slice(t.indexOf('<body'));
    const colpite = vietate.filter((v) => corpo.includes(v));
    if (colpite.length) fail.push(u + ': dicitura visibile ' + colpite.join(', '));
    else ok('nessun prezzo in ' + (u.replace(BASE, '') || '/'));
  }

  console.log('== Frasi e dati dettati da Davide (non devono cambiare)');
  /*Invarianti decisi da Davide nei giri precedenti: H1 e attacco della home parola per
    parola, perimetro dell'area coperta con i CAP, la riga che dice che il prezzo lo
    comunica lui, e la chiave IndexNow raggiungibile. Se una modifica futura ne altera
    una, la sorveglianza la segnala come guasto, non come dettaglio. */
  const casa = await (await fetch(BASE + '/')).text();
  const llmsTxt = await (await fetch(BASE + '/llms.txt')).text();
  const chiave = await (await fetch(BASE + '/d41e8b2f6a0c4e79b35f1a2c8e6d0497.txt')).text();
  const invarianti = [
    ['H1 home «Comprare casa a Rivergaro Val Trebbia»', casa.includes('<h1>Comprare casa a Rivergaro Val Trebbia</h1>')],
    ['attacco hero della home, parola per parola', casa.includes('Sono Davide Scaglia, agente immobiliare. Questo sito è dedicato a chi cerca casa A Rivergaro Val Trebbia.')],
    ['area coperta dal servizio con i CAP, in llms.txt', llmsTxt.includes('Area coperta dal servizio: Piacenza PC; Vigolzone (29020) PC; Podenzano (29027) PC; Rivergaro (29029) PC;') && llmsTxt.includes('Olio (29028) PC.')],
    ['riga «Prezzo: riservato — te lo dice Davide al telefono» in llms.txt', llmsTxt.includes('Prezzo: riservato — te lo dice Davide al telefono')],
    ['chiave IndexNow raggiungibile in radice', chiave.trim() === 'd41e8b2f6a0c4e79b35f1a2c8e6d0497'],
    /* Privacy di Davide (10/11/2026): la via di casa-sede non e' pubblica. Se ricompare
       in una pagina pubblica o in llms.txt e' un guasto, non un dettaglio. */
    ['indirizzo di casa assente dalle pagine pubbliche', !(await Promise.all(['/chi-sono.html', '/contatti.html', '/vivere-a-rivergaro.html', '/immobili.html'].map((u) => fetch(BASE + u).then((r) => r.text())))).some((t) => t.includes('Cavallotti')) && !casa.includes('Cavallotti') && !llmsTxt.includes('Cavallotti')],
    ['chi-sono senza la frazione nel capitolo sede', !(await fetch(BASE + '/chi-sono.html').then((r) => r.text())).includes('Pieve Dugliara')],
    /* Davide 10/11/2026: il rimando a chi vende in fondo alla home deve restare dov'e'. */
    ['banner «Se invece devi vendere» in fondo alla home', casa.includes('cross-cta') && casa.includes('https://venderecasapiacenza.it')],
  ];
  for (const [nome, va] of invarianti) {
    if (va) ok('invariante: ' + nome);
    else fail.push('invariante rotta: ' + nome);
  }

  console.log('== PageSpeed Insights mobile (solo avviso)');
  const psi = [BASE + '/', urls.find((u) => u.includes('/immobile/'))].filter(Boolean);
  for (const u of psi) {
    try {
      const j = await (await fetch('https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=' + encodeURIComponent(u) + '&strategy=mobile&category=PERFORMANCE')).json();
      const a = (j.lighthouseResult || {}).audits || {};
      const lcp = a['largest-contentful-paint'] && a['largest-contentful-paint'].numericValue;
      const cls = a['cumulative-layout-shift'] && a['cumulative-layout-shift'].numericValue;
      const score = ((j.lighthouseResult || {}).categories || {}).performance;
      const riga = u.replace(BASE, '') + ' → punteggio ' + Math.round((score && score.score || 0) * 100) + ', LCP ' + (lcp / 1000).toFixed(1) + 's, CLS ' + (cls || 0).toFixed(3);
      console.log('  · ' + riga);
      logLines.push('- · PSI ' + riga);
      if (lcp > 6000) warn.push('LCP lento: ' + riga);
    } catch (e) { warn.push('PSI non rispondente per ' + u + ' (' + e.message + ')'); }
  }

  warn.forEach((w) => console.log('  ⚠ ' + w));
  if (fail.length) {
    console.log('\nCONTROLLI FALLITI:');
    fail.forEach((f) => console.log('  ✗ ' + f));
    process.exit(1);
  }
  console.log('\n✓ sorveglianza sito: tutti i controlli passati');
})();
