#!/usr/bin/env node
/**
 * build.js — generatore statico di comprarecasarivergaro.it
 * Solo moduli Node integrati: nessuna dipendenza npm, nessuna build cloud.
 *   node build.js            → rigenera le pagine da src/ nella radice del repo (root GitHub Pages)
 *   node build.js media      → scansiona img/ e video/, produce img/manifest.json + rapporto di controllo
 *   node build.js --check    → build + verifica (nessun link locale rotto, nessun 'DA CONFERMARE' nel pubblico)
 * input:  src/data/site-config.json, src/data/properties.json (opzionale in questa fase)
 * output: index.html, grazie.html, sitemap.xml, llms.txt, img/manifest.json, .nojekyll, CNAME
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = ROOT;
const PLACEHOLDER = 'DA CONFERMARE';

const readIf = (p, fb) => { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return fb; } };
const readJson = (p, fb) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } };
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const isConfirmed = (v) => v !== null && v !== undefined && v !== '' && String(v).trim() !== PLACEHOLDER;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/* Descrizione per <meta>: se supera il limite si taglia a fine parola (mai a meta' parola,
   che in SERP sembra un refuso) e si chiude con i puntini. */
function clipMeta(t, n = 155) {
  const s = String(t || '').replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const sp = cut.lastIndexOf(' ');
  return (sp > 60 ? cut.slice(0, sp) : cut).replace(/[\s,;:.\u2013-]+$/, '') + '\u2026';
}
const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cleanHtml = (s) => s.replace(/[ \t]+\n/g, '\n');
const abs = (base, p) => (typeof p === 'string' && /^https?:\/\//.test(p) ? p : base + p);
/* Elenco in italiano: "a, b e c" (niente virgola prima della e). */
function listaIt(arr) {
  const a = arr.filter(Boolean);
  return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1];
}

const rel = (from, to) => {
  if (/^https?:\/\//.test(to)) return to;
  const fromDir = path.posix.dirname(from);
  let r = path.posix.relative(fromDir === '.' ? '' : fromDir, to);
  return r || to;
};

/* Le ancore di menu e footer sono scritte a mano, invece gli id dei paragrafi nascono dal
   titolo nel markdown: se i due non coincidono il link non porta da nessuna parte. Qui si
   verifica che l'id esista nella pagina generata e in alternativa si usa il primo paragrafo
   utile, cosi' la navigazione interna non si rompe quando Davide riscrive un titolo. */
function mdSourceIds(file) {
  if (file === 'index.html') return mdIds('home.md');
  const p = PAGES.find((x) => x.path === file);
  return p && p.source ? mdIds(p.source) : null;
}
function mdIds(source) {
  const md = readIf(path.join(SRC, 'pages', source), '');
  if (!md) return null;
  const ids = new Map();
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^#{1,4}\s+(.*)$/);
    if (!h) continue;
    const forced = h[1].match(/\s*\{#([a-z0-9][a-z0-9-]*)\}\s*$/);
    const titolo = forced ? h[1].slice(0, forced.index) : h[1];
    const trailing = titolo.match(/^(.*?)\s*(\[[^\]]+\]\([^)]+\))\s*$/);
    const testo = trailing && trailing[1].trim() ? trailing[1] : titolo;
    /* vale la stessa regola del render: {#id} scritto a mano vince, poi lo slug del titolo.
       Se qui e li' non coincidessero, l'id dichiarato sarebbe IRRAGGIUNGIBILE dai menu. */
    ids.set(forced ? forced[1] : slugify(testo), testo);
  }
  return new Set(ids.keys());
}
/* Map id -> titolo, per il confronto di somiglianza */
function mdTitoli(file) {
  const md = readIf(path.join(SRC, 'pages', (PAGES.find((p) => p.path === file) || {}).source || '___'), '');
  const out = new Map();
  if (!md) return out;
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^#{2}\s+(.*)$/);
    if (!h) continue;
    const forced = h[1].match(/\s*\{#([a-z0-9][a-z0-9-]*)\}\s*$/);
    const titolo = forced ? h[1].slice(0, forced.index) : h[1];
    const trailing = titolo.match(/^(.*?)\s*(\[[^\]]+\]\([^)]+\))\s*$/);
    const testo = trailing && trailing[1].trim() ? trailing[1] : titolo;
    out.set(forced ? forced[1] : slugify(testo), testo);
  }
  return out;
}
/* Nessuna corrispondenza esatta: si prende il paragrafo della stessa pagina che condivide
   piu' parole con il titolo che cercavamo, cosi' un "La villa non fa per te?" diventato
   "Vuoi vedere altro?" continua a portare nel blocco dei contatti e non nel vuoto. */
function piuVicino(wanted, ids, file) {
  const titoli = mdTitoli(file);
  if (!titoli.size) return '';
  const t0 = new Set(slugify(wanted).split('-').filter((w) => w.length > 3));
  let best = ''; let bestScore = 0;
  titoli.forEach((titolo, id) => {
    if (titolo === wanted) return;
    const parole = new Set(slugify(titolo).split('-').filter((w) => w.length > 3));
    let n = 0; parole.forEach((w) => { if (t0.has(w)) n++; });
    if (n > bestScore) { bestScore = n; best = id; }
  });
  /* un solo punto di contatto non e' una somiglianza: meglio rinunciare al link che far
     fare al visitatore un salto in un paragrafo sbagliato */
  if (bestScore < 2 || !ids.has(best)) return '';
  console.log(`⚠ ancora "${wanted.replace(/\s+/g, '-')}" non trovata in ${file}: uso "${best}" (titolo cambiato nel markdown?)`);
  return best;
}
function pageIds(file) {
  return new Set([...readIf(path.join(ROOT, file), '').matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]));
}
/* Le ancore di menu e footer sono scritte a mano, gli id dei paragrafi invece nascono dal
   titolo nel markdown: se non coincidono il link non porta da nessuna parte (e Google lo
   segnala come broken fragment). Qui si cerca l'ancora nella pagina richiesta, poi nelle
   pagine di riserva; se non c'e' nemmeno il fallback si rinuncia al link, che e' sempre
   meglio di un link morto. */
/* L'ancora della sezione "raccontami cosa cerchi" e' un solo punto di verita': il titolo del
   paragrafo lo scrive Davide e ogni pulsante che ci punta deve seguirlo, non essere riscritto
   a mano in sei punti diversi. */
function anchorRicerca(from, prefix) {
  const t = (cfg.navigazione && cfg.navigazione.ancora_ricerca) || 'index.html#la-villa-non-fa-per-te';
  return anchorHref(from, t) || (exists(t.split('#')[0]) ? rel(from, t.split('#')[0]) : '') || '#top';
}
function anchorHref(from, target) {
  if (!target || !target.includes('#')) return target;
  const i = target.indexOf('#');
  const anchor = target.slice(i + 1);
  const wanted = anchor.replace(/-/g, ' ');
  const files = [target.slice(0, i) || from].concat((cfg.navigazione && cfg.navigazione.pagine_ancore) || []);
  const hits = [];
  for (const file of files) {
    if (!exists(file)) continue;
    const src = mdSourceIds(file);
    const ids = src && src.size ? src : pageIds(file);
    let id = ids.has(anchor) ? anchor : slugify(wanted) && ids.has(slugify(wanted)) ? slugify(wanted) : '';
    if (!id) id = piuVicino(wanted, ids, file);
    if (!id) continue;
    const href = rel(from, file) + '#' + id;
    if (!hits.length) hits[0] = { href, file, id };
    else if (!hits[1] && file !== from) hits[1] = { href, file, id };
  }
  if (!hits.length) return null;
  const pick = from === hits[0].file ? hits[0] : (hits[1] || hits[0]);
  if (pick.file === from) return '#' + pick.id; /* stessa pagina: basta l'ancora */
  if (pick.id !== anchor) console.warn(`⚠ ancora "${anchor}" inesistente in ${pick.file}: il link punta a "${pick.id}" (titolo di paragrafo cambiato?)`);
  else if (pick.file !== (target.slice(0, i) || from)) console.warn(`⚠ "${anchor}" non c'e' in ${target.slice(0, i) || from}: il link punta alla home, che e' la pagina con quella sezione`);
  return pick.href;
}

/* ------------------------------------------------------------------ config */

const cfg = readJson(path.join(SRC, 'data', 'site-config.json'), null);
if (!cfg) { console.error('Manca src/data/site-config.json'); process.exit(1); }
const props = readJson(path.join(SRC, 'data', 'properties.json'), null);
const BASE = cfg.site.url_canonica_base.replace(/\/$/, '');
const LANG = cfg.site.lingua || 'it-IT';
const year = new Date().getFullYear();

const pro = cfg.professionista;
const addr = isConfirmed(pro.indirizzo_studio) ? pro.indirizzo_studio : null;
/* Indirizzo strutturato senza la via: pubblico vuol dire solo comune, provincia e CAP
   (decisione di Davide 10/11/2026). La strada resta nei dati del config per la privacy
   policy e per la scheda Google nascosta, non nel markup. */
const addressObj = addr
  ? {
      '@type': 'PostalAddress',
      addressLocality: addr.localita,
      postalCode: addr.cap,
      addressRegion: addr.provincia,
      addressCountry: addr.paese || 'IT',
    }
  : undefined;

/* Opening hours: un solo posto dove scriverle (contatti_sezione.orari_structured) e da li'
   sia il testo leggibile in contatti_card sia l'orario macchina-leggibile nel JSON-LD. */
function openingHours() {
  const map = cfg.contatti_sezione.orari_gg || {};
  const out = [];
  Object.keys(cfg.contatti_sezione.orari_structured || {}).forEach((k) => {
    const days = map[k] || [k];
    (cfg.contatti_sezione.orari_structured[k] || []).forEach((o) => out.push({
      '@type': 'OpeningHoursSpecification', dayOfWeek: days, opens: o.opens, closes: o.closes,
    }));
  });
  return out;
}
/* La persona fisica, distinta dall'attivita': il nodo RealEstateAgent resta l'impresa
   (nome pubblico, ragione sociale, indirizzo, orari), questo e' Davide Scaglia.
   Solo dati che stanno gia' nel config: niente qualifiche o recapiti inventati. */
function personJsonLd() {
  const p = {
    '@type': 'Person',
    '@id': BASE + '/#davide-scaglia',
    name: pro.nome_completo,
    jobTitle: 'Agente immobiliare',
    url: BASE + '/chi-sono.html',
    telephone: pro.telefono_e164,
    email: pro.email,
    worksFor: { '@id': BASE + '/#agent' },
    knowsAbout: ['Case in vendita a Rivergaro', 'Val Trebbia', 'Acquisto di casa'],
  };
  /* Credenziale presa dal config, la stessa verificata in visura e gia' pubblicata in
     "Chi sono" e "Contatti": non e' un titolo aggiunto, e' quello che c'e'. */
  if (isConfirmed(pro.iscrizione_ruolo)) {
    p.hasCredential = {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'Iscrizione al Registro Imprese — Ruolo Agenti di Affari in Mediazione',
      description: pro.iscrizione_ruolo,
      recognizedBy: { '@type': 'Organization', name: 'Camera di Commercio di Piacenza' },
    };
  }
  return p;
}
function agentJsonLd() {
  const a = {
    '@type': 'RealEstateAgent', '@id': BASE + '/#agent',
    name: 'Immobili a Rivergaro', alternateName: pro.nome_completo,
    slogan: 'Agente immobiliare a Rivergaro e Val Trebbia, al fianco di chi compra',
    description: "Davide Scaglia, agente immobiliare iscritto al ruolo dal 2007: consulenza per chi compra casa a Rivergaro e nei comuni di Piacenza, Vigolzone, Podenzano, Gossolengo e Ponte dell'Olio.",
    legalName: pro.denominazione_legale || undefined,
    url: BASE + '/', telephone: pro.telefono_e164, email: pro.email,
  };
  if (addr) a.address = { '@type': 'PostalAddress', addressLocality: addr.localita, postalCode: addr.cap, addressRegion: addr.provincia, addressCountry: 'IT' };
  const ore = openingHours();
  if (ore.length) a.openingHoursSpecification = ore;
  if (isConfirmed(pro.anno_inizio_attivita)) a.foundingDate = String(pro.anno_inizio_attivita);
  const as = (cfg.area_servizio.areaServed_jsonld || []).filter(isConfirmed);
  if (as.length) a.areaServed = as.map((n) => ({ '@type': 'City', name: n }));
  const social = Object.keys(pro.social || {}).map((k) => pro.social[k]).filter((u) => /^https?:\/\//.test(u));
  if (social.length) a.sameAs = social;
  /* Logo dell'entita': il lockup di marca rigenerato il 09/11/2026 con il claim corretto
     per questo dominio ("IMMOBILI A RIVERGARO"), stessi font del sito e risoluzione
     doppia. Il PNG storico con il claim del sito gemello resta in archivio senza essere
     referenziato. Le dimensioni si leggono dai byte, cosi' non sono numeri scritti a mano. */
  const LOGO = 'img/brand/logo-rivergaro.png';
  const logoFile = path.join(ROOT, LOGO);
  if (fs.existsSync(logoFile)) {
    const dim = pngSize(fs.readFileSync(logoFile));
    a.logo = Object.assign({ '@type': 'ImageObject', url: BASE + '/' + LOGO }, dim && dim.w ? { width: dim.w, height: dim.h } : {});
  }
  if (isConfirmed(pro.pec)) a.contactPoint = [{ '@type': 'ContactPoint', contactType: 'sales', telephone: pro.telefono_e164, email: pro.email, availableLanguage: ['it'], areaServed: 'IT' }];
  if (exists('chi-sono.html')) a.additionalProperty = [{ '@type': 'PropertyValue', name: 'Profilo del professionista', value: BASE + '/chi-sono.html' }];
  return a;
}
function siteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [{
      '@type': 'WebSite',
      '@id': BASE + '/#website',
      name: 'Immobili a Rivergaro',
      url: BASE + '/',
      inLanguage: LANG,
    }, agentJsonLd()],
  };
}


function listingJsonLd(p) {
  const o = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': BASE + '/immobile/' + p.slug + '#listing',
    name: p.titolo,
    url: BASE + '/immobile/' + p.slug + '.html',
    description: (p.descrizione || '').slice(0, 300),
    identifier: p.id || p.slug,
  };
  const imgs = (p.immagini || []).filter(Boolean);
  if (imgs.length) {
    const captions = {};
    (p.gallerie || []).forEach((section) => (section.immagini || []).forEach((image) => {
      if (image && typeof image === 'object' && image.file && image.didascalia) captions[image.file] = image.didascalia;
    }));
    let all = imgs.map((file) => captions[file]
      ? { '@type': 'ImageObject', contentUrl: BASE + '/img/' + p.slug + '/' + file, caption: captions[file] }
      : BASE + '/img/' + p.slug + '/' + file);
    /* 192 voci nell'array `image` costavano 55KB di JSON-LD in ogni fetch (anche di
       Googlebot) senza dare alcun vantaggio: i motori ne usano poche. Si campiona in
       modo uniforme sulle gallerie, cosi' restano rappresentative di ogni ambiente. */
    const MAX_IMG = 10;
    if (all.length > MAX_IMG) all = Array.from({ length: MAX_IMG }, (_, i) => all[Math.floor((i * all.length) / MAX_IMG)]);
    o.image = all;
  }
  const addr = { '@type': 'PostalAddress' };
  if (p.zona) addr.streetAddress = p.zona;
  if (p.comune) addr.addressLocality = p.comune;
  if (cfg.area_servizio && cfg.area_servizio.provincia) addr.addressRegion = cfg.area_servizio.provincia;
  addr.addressCountry = 'IT';
  if (p.cap) addr.postalCode = p.cap;
  o.address = addr;
  const offer = { '@type': 'Offer' };
  const hasPrice = typeof p.prezzo === 'number' && p.prezzo > 0;
  /* Senza un prezzo NUMERICO l'offerta non viene proprio emessa: `price` popolato con una
     frase ("Prezzo riservato: te lo dico io al telefono") e' ammesso da schema.org ma non dalla specifica Google
     di Offer (il Rich Results Test lo segnala come valore non valido), ed e' il tipo di
     dato che un motore generativo legge male o scarta. La frase resta dove un lettore la
     capisce: nel testo visibile e nella <dl> dei dati. Appena arriva il numero, l'offerta
     esce da sola con price + priceCurrency + availability + validFrom. */
  if (hasPrice) { offer.price = String(p.prezzo); offer.priceCurrency = 'EUR'; }
  const map = cfg.seo_geo.jsonld.offers_schema || {};
  const av = p.stato === 'Disponibile' ? map.disponibile : p.stato === 'In trattativa' ? map.in_trattativa : map.chiuso;
  if (av) offer.availability = av;
  if (p.data_pubblicazione) offer.validFrom = p.data_pubblicazione;
  if (hasPrice && Object.keys(offer).length > 1) o.offers = offer;
  if (p.stato === 'Venduto') o.usedProd = { '@type': 'Product', name: 'immobile venduto' };
  if (p.superficie) o.floorSize = { '@type': 'QuantitativeValue', value: p.superficie, unitCode: 'MTK' };
  if (p.locali) o.numberOfRooms = p.locali;
  /* i vani sono un dato scritto da Davide: ammissibile qui e in caratteristiche, non come metratura.
     Si legge dall'elenco caratteristiche cosi' il numero resta scritto una volta sola. */
  else { const vani = vaniDaCaratteristiche(p); if (vani) o.numberOfRooms = vani; }
  if (p.anno_costruzione) o.yearBuilt = String(p.anno_costruzione);
  /* Superfici, rendite catastali e APE per unita' sono gia' pubblicati in HTML (tabella
     "Superfici, rendite catastali e APE"): qui entrano gli STESSI numeri, senza totali
     calcolati (la regola del progetto resta), cosi' un motore che chiede "quanto e'
     grande?" o "che classe energetica ha?" non deve sommare celle di una tabella. */
  const unitProps = (p.unita || []).filter((u) => u && u.nome).flatMap((u) => {
    const out = [];
    if (u.mq) out.push({ '@type': 'PropertyValue', name: 'Superficie — ' + u.nome, value: u.mq + ' m²' });
    if (u.rendita_catastale) out.push({ '@type': 'PropertyValue', name: 'Rendita catastale — ' + u.nome, value: euroIT(u.rendita_catastale) });
    if (u.ape_classe) out.push({ '@type': 'PropertyValue', name: 'Classe energetica (APE) — ' + u.nome, value: u.ape_classe + (u.ape_indice ? ' — ' + numIT(u.ape_indice) + ' kWh/m²anno' : '') });
    return out;
  });
  if (unitProps.length) o.additionalProperty = unitProps;
  if (p.lat && p.lng) o.geo = { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng };
  o.areaServed = { '@type': 'City', name: p.comune || cfg.area_servizio.comune_principale };
  if (p.data_pubblicazione) o.datePosted = p.data_pubblicazione;
  if (p.data_modifica) o.dateModified = p.data_modifica; /* il segnale di freschezza che motori e crawler AI leggono davvero */
  return o;
}

/* ------------------------------------------------------------- markdown++ */

/* Estrae un oggetto JSON bilanciato che inizia su `firstChunk` (testa dopo il
   nome dello shortcode) oppure sulla riga successiva. Ritorna { opts, i } dove
   i = indice dell'ultima riga consumata. */
function readOptions(lines, from, firstChunk) {
  let buf = firstChunk === undefined || firstChunk === null ? '' : firstChunk;
  let start = from;
  if (!buf.trim().startsWith('{')) {
    const nx = (lines[from + 1] || '').trim();
    if (!nx.startsWith('{')) return { opts: {}, i: from };
    buf = nx;
    start = from + 1;
  }
  let depth = 0;
  let end = start;
  for (let k = start; k < lines.length; k++) {
    const raw = k === start ? buf : lines[k];
    if (k > start) buf += '\n' + lines[k];
    for (const ch of raw) { if (ch === '{') depth++; else if (ch === '}') depth--; }
    if (depth === 0) { end = k; break; }
    end = k;
  }
  let opts = {};
  try { opts = JSON.parse(buf); }
  catch (e) { console.warn('Shortcode: JSON non valido (' + e.message + ') — blocco ignorato, la pagina resta valida.'); opts = {}; }
  return { opts, i: end };
}

function inline(s) {
  let out = s === null || s === undefined ? '' : String(s);
  out = out.replace(/`([^`]+)`/g, (m, c) => '<code>' + c + '</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (m, t, href, title) => {
    const external = /^https?:\/\//.test(href);
    const attrs = external ? ' rel="noopener" target="_blank"' : '';
    return '<a href="' + href + '"' + (title ? ' title="' + title + '"' : '') + attrs + '>' + t + '</a>';
  });
  return out;
}

/* Regola del design system: slug e id in ASCII, niente accentini. Vale per i nomi dei file
   come per gli id dei paragrafi, che diventano le ancore del menu e finiscono negli URL. */
function slugify(t) {
  return String(t).replace(/<\/?[^>]+>/g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

function renderMarkdown(md) {
  const lines = md.split(/\r?\n/);
  const html = [];
  let para = [];
  let list = null;
  let quote = [];
  const flushPara = () => { if (para.length) { html.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
  const flushList = () => {
    if (!list) return;
    html.push('<' + list.tag + '>' + list.items.map((x) => '<li>' + inline(x) + '</li>').join('') + '</' + list.tag + '>');
    list = null;
  };
  const flushQuote = () => {
    if (!quote.length) return;
    html.push('<blockquote>' + inline(quote.join(' ')) + '</blockquote>');
    quote = [];
  };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const sc = line.match(/^\s*::([A-Za-z0-9_-]+)\b(.*)$/);
    if (sc) {
      flushAll();
      const name = sc[1];
      const res = readOptions(lines, i, sc[2]);
      i = res.i;
      html.push(shortcode(name, res.opts));
      continue;
    }

    /* Tabelle Markdown: | a | b | seguita dalla riga di separazione |---|---|.
       Prima restavano un paragrafo di barre verticali (Cookie Policy e Privacy). */
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
      flushAll();
      const celle = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      const testa = celle(line);
      i++;
      const righe = [];
      while (i + 1 < lines.length && /^\s*\|/.test(lines[i + 1])) righe.push(celle(lines[++i]));
      html.push('<div class="table-wrap"><table><thead><tr>' +
        testa.map((c) => '<th scope="col">' + inline(c) + '</th>').join('') +
        '</tr></thead><tbody>' +
        righe.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></div>');
      continue;
    }

    if (/^<\/?(div|section|table|ul|ol|li|p|figure|aside|details|summary|thead|tbody|tr|th|td|h[1-4])[\s>]/.test(line)) {
      flushAll(); html.push(line); continue;
    }

    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      flushAll();
      const lvl = m[1].length;
      let text = m[2];
      /* Un titolo che ha un link in coda o un {#id} finale non e' un paragrafo da usare come
         ancora: il link si sposta sotto il titolo (sennoe' l'H2 stesso a diventare il link) e
         l'id scritto a mano diventa la destinazione ufficiale, cosi' il titolo e' libero. */
      const forced = text.match(/\s*\{#([a-z0-9][a-z0-9-]*)\}\s*$/);
      if (forced) text = text.slice(0, forced.index);
      const trailing = text.match(/^(.*?)\s*(\[[^\]]+\]\([^)]+\))\s*$/);
      let after = '';
      if (trailing && trailing[1].trim()) { text = trailing[1]; after = trailing[2]; }
      const id = forced ? forced[1] : slugify(text);
      html.push('<h' + lvl + ((lvl === 1 || lvl === 2) && id ? ' id="' + id + '"' : '') + '>' + inline(text) + '</h' + lvl + '>' + (after ? '<p>' + inline(after) + '</p>' : ''));
      continue;
    }
    if (/^\s*-{3,}\s*$/.test(line)) { flushAll(); html.push('<hr>'); continue; }
    if ((m = line.match(/^\s*>\s?(.*)$/))) { flushPara(); flushList(); quote.push(m[1]); continue; }
    if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      flushPara(); flushQuote();
      if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; }
      list.items.push(m[1]); continue;
    }
    if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
      flushPara(); flushQuote();
      if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; }
      list.items.push(m[1]); continue;
    }
    if (line.trim() === '') { flushAll(); continue; }
    flushList(); flushQuote();
    para.push(line.trim());
  }
  flushAll();
  return wrapSections(html.join('\n'));
}

/* Raggruppa il contenuto tra H2 in sezioni con ancoraggio: meno markup a mano,
   stessa struttura visiva in tutte le pagine. L'id vive UNA volta sola, sul titolo:
   prima section e h2 condividevano lo stesso id (26 duplicati su 6 pagine, HTML non
   valido e WCAG 4.1.1), e l'ancora risolveva sul primo dei due per caso. La sezione
   resta agganciata al suo titolo con aria-labelledby, cosi' screen reader e motori
   leggono il nome della regione senza bisogno di un secondo id. */
function wrapSections(content) {
  if (!content.trim()) return content;
  const parts = content.split(/(?=<h2 )/);
  let first = parts[0] || '';
  const rest = parts.slice(1);
  let out = '';
  /* Il blocco prima del primo H2 (H1 + attacco) finiva fuori da qualsiasi contenitore:
     su chi-sono, contatti, 404 e legali il testo partiva sparato contro il bordo dello
     schermo (difetto visto dal vivo l'8/11/2026). Lo si mette nel wrap, tranne quando
     contiene gia' una sezione piena come l'hero della home, che e' full-bleed apposta. */
  if (first.trim()) out += (/<section[\s>]/.test(first) ? first.trim() : '<div class="wrap page-head">\n' + first.trim() + '\n</div>') + '\n';
  rest.forEach((chunk, idx) => {
    const m = chunk.match(/<h2 id="([^"]+)"/);
    const cls = 'section' + (idx % 2 ? ' section--alt' : '');
    if (m) out += `<section class="${cls}" aria-labelledby="${m[1]}"><div class="wrap">\n` + chunk.trim() + '\n</div></section>\n';
    else out += `<section class="${cls}" id="sezione-${idx + 1}"><div class="wrap">\n` + chunk.trim() + '\n</div></section>\n';
  });
  return out;
}

/* ---------------------------------------------------------------- shortcode */

function imgTag(src, alt, opts) {
  const w = opts.width || 1200, h = opts.height || 675;
  const lazy = opts.eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy" decoding="async"';
  return `<img src="${attr(src)}" alt="${attr(alt)}" width="${w}" height="${h}" ${lazy}${opts.sizes ? ` sizes="${attr(opts.sizes)}"` : ''}>`;
}

function formRicerca(prefix, submitLabel) {
  const grazie = abs(BASE, cfg.form.post_submit_redirect || '/index.html');
  const zone = (cfg.area_servizio.frazioni || []).map((f) => `<option value="${attr(f.nome)}">${esc(f.nome)}</option>`).join('');
  const aree = (cfg.area_servizio.aree || []).filter((a) => a.slug !== 'val-trebbia').map((a) => `<option value="${attr(a.nome)}">${esc(a.nome)}</option>`).join('');
  const tip = ['Appartamento', 'Villa / casa singola', 'Rustico / da recuperare', 'Terreno', 'Commerciale', 'Non lo so ancora']
    .map((t) => `<option value="${attr(t)}">${esc(t)}</option>`).join('');
  return `
      <form class="form" method="POST" action="${attr(cfg.form.action)}" id="modulo-ricerca">
        <input type="hidden" name="_subject" value="Nuova ricerca acquirente — Rivergaro">
        <input type="hidden" name="_captcha" value="false">
        <input type="hidden" name="_template" value="table">
        <input type="text" name="_honey" class="sr-only" tabindex="-1" autocomplete="off" aria-hidden="true">
        <input type="hidden" name="_next" value="${attr(grazie)}">
        <div class="field-grid">
          <p class="field"><label for="f-nome">Nome e cognome</label><input id="f-nome" name="nome" type="text" autocomplete="name" required></p>
          <p class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" inputmode="email" required></p>
          <p class="field"><label for="f-tel">Telefono (facoltativo)</label><input id="f-tel" name="telefono" type="tel" autocomplete="tel" inputmode="tel"></p>
          <p class="field"><label for="f-zona">Zona</label><select id="f-zona" name="zona"><option value="">Dove cerco</option>${aree}${zone}</select></p>
          <p class="field"><label for="f-tipo">Tipologia</label><select id="f-tipo" name="tipologia"><option value="">Che casa cerco</option>${tip}</select></p>
          <p class="field"><label for="f-budget">Budget indicativo</label><input id="f-budget" name="budget" type="text" inputmode="numeric" placeholder="es. 120.000" autocomplete="off"></p>
        </div>
        <p class="field"><label for="f-msg">Cosa cerchi, in parole tue</label><textarea id="f-msg" name="messaggio" rows="5" required placeholder="Es. appartamento con balcone, a Rivergaro o nelle frazioni vicine, da abitare subito, con un posto auto."></textarea></p>
        <p class="field field-check"><label for="f-privacy"><input id="f-privacy" type="checkbox" name="privacy" value="si" required> Ho letto l'<a href="${rel(prefix,'legal/privacy.html')}">informativa privacy</a> e acconsento al trattamento dei dati per essere ricontattato su questa ricerca.</label></p>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${esc(submitLabel || 'Invia la mia ricerca')}</button>
          <a class="btn btn-ghost" href="tel:${attr(pro.telefono_e164)}">Chiamami ora ${esc(pro.telefono_display)}</a>
        </div>
        <p class="form-note">Nessuna newsletter. Ti ricontatto appena possibile.</p>
      </form>`;
}

const shortcodes = {
  hero(o) {
    /* cta e' sempre [etichetta, destinazione]: la destinazione deve esistere, perche' il
       testo del paragrafo lo scrive Davide e il pulsante non deve restare orfano. */
    o = Object.assign({ eyebrow: '', h1: '', lead: [], cta: ['Scopri la villa', '#immobile-in-evidenza'] }, o);
    const wa = String(pro.whatsapp || pro.telefono_e164 || '').replace(/\D/g, '');
    const resolve = (t) => {
      if (!t) return '';
      if (t.startsWith('#')) return anchorHref('index.html', 'index.html' + t) || '';
      const file = t.split('#')[0];
      if (t.includes('#')) return anchorHref('index.html', t) || (file !== 'index.html' && exists(file) ? rel('index.html', file) : '');
      return exists(file) ? rel('index.html', file) : anchorHref('index.html', 'index.html#' + slugify(t)) || '';
    };
    const c = Array.isArray(o.cta) ? o.cta : [String(o.cta || ''), '#immobile-in-evidenza'];
    const cta = { label: c[0] || 'Scopri la villa', href: resolve(c[1]) };
    if (!cta.href) { console.log(`\u26a0 hero: la destinazione "${c[1]}" non esiste in nessuna pagina: il pulsante punta alla prima sezione con un id`); cta.href = '#immobile-in-evidenza'; }
    const c2 = Array.isArray(o.cta2) ? o.cta2 : [];
    const cta2 = c2.length ? { label: c2[0], href: resolve(c2[1]) } : null;
    if (cta2 && !cta2.href) console.log(`\u26a0 hero: il secondo pulsante "${c2[0]}" non ha destinazione (${c2[1]}) e non viene renderizzato`);
    return `<section class="hero hero--listing" id="top"><div class="wrap hero-grid">
      <div class="hero-copy">
        ${o.eyebrow ? `<p class="eyebrow">${inline(o.eyebrow)}</p>` : ''}
        <h1>${inline(o.h1)}</h1>
        ${o.lead && o.lead.length ? `<div class="lead">${o.lead.map((p) => '<p>' + inline(p) + '</p>').join('')}</div>` : ''}
        <div class="cta-row"><a class="btn btn-primary" href="${attr(cta.href)}">${esc(cta.label)}</a>${cta2 && cta2.href ? `<a class="btn btn-ghost" href="${attr(cta2.href)}">${esc(cta2.label)}</a>` : ''}<a class="btn btn-ghost" href="https://wa.me/${attr(wa)}" target="_blank" rel="noopener noreferrer">Scrivimi su WhatsApp</a><a class="hero-email-link" href="mailto:${attr(pro.email)}">${esc(pro.email)}</a></div>
      </div></div></section>`;
  },
  form_ricerca() {
    return `<div class="form-shell">${formRicerca('', 'Raccontami che casa cerchi')}</div>`;
  },
  immobile_evidenza() {
    return immobileEvidenza();
  },
  immobili(o) {
    const list = catalogo();
    const link = exists('immobili.html')
      ? `<a class="section-more" href="${rel('index.html', 'immobili.html')}">Apri il catalogo con i filtri per zona, tipologia e budget</a>`
      : `<a class="section-more" href="${attr(anchorRicerca('index.html'))}">Nel frattempo: chiamami e ti dico cosa si muove in valle</a>`;
    if (!list.length) {
      return `<div class="empty-state"><p>${inline(o.empty)}</p><a class="btn btn-primary" href="${attr(anchorRicerca('index.html'))}">${esc(cfg.contatti_sezione.cta_principale)}</a></div>${link}`;
    }
    return `<ul class="grid-cards">${list.map((p) => cardImmobile(p, 'index.html')).join('')}</ul>`;
  },
  bio() {
    /* Il testo lo scrive Davide in site-config.json -> professionista.bio_acquirenti (paragrafi
       separati da riga vuota). Finche' la bozza non e' confermata la pagina resta pubblicata ma
       dichiara il proprio stato: niente "DA CONFERMARE" in chiaro e niente autobiografie inventate. */
    const t = pro.bio_acquirenti;
    if (!isConfirmed(t)) return '<p class="muted">Questa pagina deve ancora essere completata con le parole di Davide.</p>';
    const par = String(t).trim().split(/\n\s*\n/).map((x) => '<p>' + inline(x.replace(/\s+/g, ' ').trim()) + '</p>').join('\n      ');
    const nota = pro.bio_stato === 'bozza-da-rivedere'
      ? '<p class="muted">Profilo in corso di revisione: i dati anagrafici e professionali qui sotto sono quelli del Registro Imprese.</p>' : '';
    return par + nota;
  },
  guida_stato(o) {
    return `<ol class="steps">${o.steps.map((s) => `<li><h3>${inline(s.titolo)}</h3><p>${inline(s.testo)}</p></li>`).join('')}</ol>`;
  },
  zona_coverage(o) {
    const fr = (cfg.area_servizio.frazioni || []).map((f) => `<li>${esc(f.nome)}</li>`).join('');
    const vicine = (cfg.area_servizio.aree_limitrofe || []).map((f) => `<span>${esc(f.nome)}</span>`).join('');
    return `<div class="zone-block"><ul class="zone-list">${fr}</ul><p class="muted">Zone limitrofe dove lavoro senza problemi: <span class="zone-inline">${vicine}</span></p></div>`;
  },
  guide_teaser() {
    const g = (cfg.contenuti.guide_previste || []).filter((x) => x.stato === 'disponibile');
    if (!g.length) {
      return `<div class="empty-state"><p>Le guide per chi compra sono in preparazione: le pubblico solo quando ho contenuto scritto da me, non testi generici.</p><a class="btn btn-ghost" href="${attr(anchorRicerca('index.html'))}">Chiedimi direttamente quello che vuoi sapere</a></div>`;
    }
    return `<ul class="grid-cards grid-cards--editorial">${g.map((x) => `<li class="card card--text"><h3><a href="${rel('','guide/'+x.slug+'.html')}">${esc(x.titolo)}</a></h3><p>${inline(x.anteprima||'')}</p></li>`).join('')}</ul>`;
  },
  sito_madre_cta() {
    const m = cfg.ecosistema.sito_madre;
    return `<aside class="cross-cta"><div><p class="cross-cta-k">Se invece devi vendere</p><p class="cross-cta-t">Su ${esc(m.nome)} trovi il percorso per chi mette in vendita casa, nella stessa zona e con lo stesso metodo.</p></div><a class="btn btn-outline" href="${attr(m.url)}" rel="noopener">Vai su ${esc(m.nome)}</a></aside>`;
  },
  /* Davide, 09/11/2026: nella card la riga "Studio + indirizzo" e' diventata la
     promessa di metodo "A CASA TUA" (gli incontri li apre lui, dal cliente).
     L'indirizzo della sede non sparisce dal sito: resta nel NAP del footer, in
     llms.txt, nel JSON-LD e nel paragrafo "Dove si trova lo studio". */
  contatti_card() {
    const albo = pro.qualifica_albo && isConfirmed(pro.qualifica_albo.iscrizione)
      ? `<li><span class="k">Qualifica</span><span class="v">${esc(pro.qualifica_albo.sezione)} — ruolo di Piacenza, iscritto dal ${esc(pro.qualifica_albo.iscrizione)}</span></li>` : '';
    const pec = isConfirmed(pro.pec) ? `<li><span class="k">PEC</span><span class="v"><a href="mailto:${attr(pro.pec)}">${esc(pro.pec)}</a></span></li>` : '';
    return `<div class="contact-card">
      <ul class="contact-list">
        <li><span class="k">Chi</span><span class="v">${esc(pro.nome_completo)} — ${esc(pro.ruolo)}</span></li>
        <li><span class="k">Telefono e WhatsApp</span><span class="v"><a href="tel:${attr(pro.telefono_e164)}">${esc(pro.telefono_display)}</a></span></li>
        <li><span class="k">Email</span><span class="v"><a href="mailto:${attr(pro.email)}">${esc(pro.email)}</a></span></li>
        <li class="contact-wide"><span class="k">A casa tua</span></li>
        ${isConfirmed(cfg.contatti_sezione.orari) ? `<li><span class="k">Orari</span><span class="v">${esc(cfg.contatti_sezione.orari)}</span></li>` : ''}
        ${isConfirmed(pro.partita_iva) ? `<li><span class="k">Dati aziendali</span><span class="v">P.IVA ${esc(pro.partita_iva)} · REA ${esc(pro.rea)}${isConfirmed(pro.pec) ? ' · PEC ' + esc(pro.pec) : ''}</span></li>` : ''}
        ${albo}
      </ul>
      <div class="contact-social">${socialList()}</div>
    </div>`;
  },
  home_faq() {
    const items = homeFaq();
    items.forEach((it) => FAQ.push({ d: String(it.d).trim(), r: String(it.r).trim(), in: CURRENT_PAGE }));
    return `<div class="faq">${items.map((it) => `<div class="faq-item"><h3>${inline(it.d)}</h3><p>${inline(it.r)}</p></div>`).join('')}</div>`;
  },
  risposte_pronte(o) {
    const items = (o.items || []).filter((it) => it && it.d && it.r);
    items.forEach((it) => FAQ.push({ d: String(it.d).trim(), r: String(it.r).trim(), in: CURRENT_PAGE }));
    return `<div class="faq">${items.map((it, i) => `<div class="faq-item"><h3>${inline(it.d)}</h3><p>${inline(it.r)}</p></div>`).join('')}</div>`;
  },
};
function shortcode(name, opts) {
  opts = opts || {};
  opts.h1 = opts.h1 || '';
  opts.cta1 = opts.cta1 || 'Raccontami che casa cerchi';
  opts.lead = opts.lead || [];
  opts.note = opts.note || [];
  opts.items = opts.items || [];
  opts.steps = opts.steps || [];
  opts.empty = opts.empty || '';
  const fn = shortcodes[name];
  if (!fn) { console.warn('Shortcode sconosciuto: ::' + name); return `<!-- shortcode sconosciuto: ${name} -->`; }
  return fn(opts || {});
}
function socialList() {
  const s = pro.social || {};
  const labels = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', youtube: 'YouTube' };
  return Object.keys(labels).filter((k) => isConfirmed(s[k])).map((k) => `<a href="${attr(s[k])}" rel="noopener" target="_blank">${labels[k]}</a>`).join('');
}

/* ---------------------------------------------------------------- catalogo */

function tutteProp() { return props && Array.isArray(props.immobili) ? props.immobili : []; }
/* In catalogo e in home: gli immobili con scheda pubblicabile (bozza esclusa).
   La pagina /immobile/<slug>.html viene invece generata ANCHE per le bozze, per poterle
   vedere e collaudare: esce pero' con meta noindex e fuori da sitemap e llms.txt. */
function catalogo() { return tutteProp().filter((p) => cfg.catalogo.anteprima_bozze ? pubblichi(p) : pubblicabili(p)); }
function inCatalogoSoloAnteprima(p) { return p.bozza && cfg.catalogo.anteprima_bozze; }
function schedaPagine() { return tutteProp().filter(pubblichi); }
function pubblichi(p) {
  const ok = ['Disponibile', 'In trattativa', 'Venduto', 'Sospeso', 'Ritirato'];
  return ok.includes(p.stato) && !(p.note_interne || '').includes('NON PUBBLICARE');
}
function pubblicabili(p) { return pubblichi(p) && !p.bozza; }
/* "12 vani" e' una delle righe di caratteristiche dettate da Davide: qui si legge quel numero,
   non lo si scrive a mano in un secondo punto (altrimenti i due valori divergono dopo una modifica). */
function vaniDaCaratteristiche(p) {
  if (p.vani) return Number(p.vani) || null;
  const v = (p.caratteristiche || []).map(String).find((x) => /^\s*\d+\s+vani\s*$/i.test(x));
  return v ? parseInt(v, 10) : null;
}
/* Prezzo in pagina SOLO se numerico e confermato. Decisione di Davide (10/11/2026):
   il prezzo non si pubblica, lo comunica lui al telefono; la stringa nel dato
   ("Prezzo riservato: te lo dico io al telefono") e' un promemoria interno e non
   va resa visibile. Appena arriva il numero, card, evidenza, hero e <dl> lo
   mostrano da soli, e il JSON-LD emette offers.price. */
function prezzo(p) {
  if (typeof p.prezzo === 'number' && p.prezzo > 0) return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p.prezzo);
  return '';
}
function prezzoCell(p) {
  const v = prezzo(p);
  return v ? `<p class="card-price">${v}</p>` : '';
}
function statoBadge(p) {
  return `<span class="badge badge--${(p.stato || '').toLowerCase().replace(/\s+/g, '-')}" role="img" aria-label="Stato: ${attr(p.stato)}">${esc(p.stato)}</span>`;
}
function dimsRow(p) {
  const items = [];
  if (p.superficie) items.push(esc(String(p.superficie)) + ' m²');
  if (p.locali) items.push(esc(String(p.locali)) + ' locali');
  if (p.unita_abitative) items.push(p.unita_abitative + ' unità abitative');
  if (p.zona) items.push(esc(p.zona));
  return items.join(' · ');
}
function imgMeta(slug, file) {
  const m = mediaCache.items.find((i) => i.path === 'img/' + slug + '/' + file);
  return m || null;
}
/* Dimensioni lette dai byte del file. Serve per i derivati (-thumb/-mid/-small), che
   per contratto NON sono nel manifesto media: prima la loro larghezza veniva DEDOTTA
   ("900 sul lato lungo") e finita nel descrittore `w` del srcset. Per un ritratto il
   lato lungo e' l'altezza, quindi un thumb largo 405px veniva dichiarato 900w: il
   browser credeva di avere 900px e serviva un'immagine morbida su retina. Il descrittore
   `w` deve essere la larghezza intrinseca reale, e qui si legge, non si indovina. */
function imgDims(slug, file) {
  const relp = 'img/' + slug + '/' + file;
  const m = mediaCache.items.find((i) => i.path === relp);
  if (m && m.width) return { w: m.width, h: m.height };
  const full = path.join(ROOT, relp);
  if (!fs.existsSync(full)) return null;
  const buf = fs.readFileSync(full);
  const ext = path.extname(full).toLowerCase();
  const d = ext === '.png' ? pngSize(buf) : (ext === '.jpg' || ext === '.jpeg') ? jpegSize(buf) : ext === '.webp' ? webpSize(buf) : null;
  return d && d.w ? d : null;
}
/* Numeri all'italiana: 764.36 -> "764,36". Serve per rendite catastali e indici APE. */
function numIT(n, dec = 2) {
  return Number(n).toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function euroIT(n) { return numIT(n) + ' €'; }

/* Dati per unità immobiliare (superficie, rendita catastale, APE). Si mostra solo quello che
   c'è nel dato: nessun valore inventato, nessuna superficie dedotta. */
function unitaSezione(p) {
  const unita = (p.unita || []).filter((u) => u && u.nome);
  if (!unita.length) return '';
  const righe = unita.map((u) => {
    const ape = u.ape_classe
      ? esc(u.ape_classe) + (u.ape_indice ? ' · ' + esc(numIT(u.ape_indice)) : '')
      : '—';
    return `<tr><th scope="row">${esc(u.nome)}</th><td>${u.mq ? esc(numIT(u.mq, 0)) + ' m²' : '—'}</td><td>${u.rendita_catastale ? esc(euroIT(u.rendita_catastale)) : '—'}</td><td>${ape}</td></tr>`;
  }).join('');
  /* Davide, 10/11/2026: la nota sotto la tabella ("Rendita catastale espressa in euro.
     Senza attestato energetico indicato: Box…") va tolta: la tabella parla da sola. */
  return `<section class="prop-units"><h2 id="unita">Superfici, rendite catastali e APE</h2>
        <div class="table-wrap"><table><caption class="sr-only">Dati per unità immobiliare</caption>
          <thead><tr><th scope="col">Unità</th><th scope="col">Superficie</th><th scope="col">Rendita catastale</th><th scope="col">APE</th></tr></thead>
          <tbody>${righe}</tbody>
        </table></div>
      </section>`;
}

function galleria(p, dopoPrimoGruppo = '') {
  const raw = (p.gallerie || []).filter((g) => Array.isArray(g.immagini) && g.immagini.length);
  const sections = raw.length ? raw : ((p.immagini || []).filter(Boolean).length
    ? [{ id: 'foto', titolo: 'Galleria fotografica', immagini: p.immagini.filter(Boolean).map((file) => ({ file })) }]
    : []);
  if (!sections.length) {
    return `<figure class="media-empty"><div class="media-empty-box"><span class="media-empty-ico" aria-hidden="true">◻</span><strong>Nessuna foto pubblicata</strong><p>Le immagini di questo immobile non sono ancora state scelte. Appena arrivano, la galleria e l'immagine principale si compilano da sole da <code>img/${esc(p.slug)}/</code>, con le dimensioni vere lette dal file.</p></div></figure>`;
  }
  let first = true;
  let inserito = false;
  const rendered = sections.map((section, sectionIndex) => {
    const items = section.immagini.filter((item) => typeof item === 'string' || (item && item.file));
    if (!items.length) return '';
    const id = 'foto-' + (section.id || ('sezione-' + (sectionIndex + 1)));
    const cards = items.map((item) => {
      const file = typeof item === 'string' ? item : item.file;
      const caption = (typeof item === 'object' && item.didascalia) || '';
      const alt = (typeof item === 'object' && item.alt) || caption || ((p.tipologia || 'Immobile') + ' a ' + (p.zona || p.comune || 'Rivergaro'));
      const thumb = (typeof item === 'object' && item.thumb) || file;
      const meta = imgMeta(p.slug, file) || {};
      const w = Number(meta.width) || 1200, h = Number(meta.height) || 800;
      const derivato = thumb !== file && exists('img/' + p.slug + '/' + thumb);
      /* descrittori `w` = larghezza intrinseca REALE di ogni candidato, letta dai byte
         (imgDims legge anche i derivati, che il manifesto per contratto non elenca).
         Prima si deduceva "900 sul lato lungo": per i 12 ritratti della villa il thumb
         e' largo 405px ma veniva dichiarato 900w, e il browser serviva foto morbide. */
      const td = derivato ? imgDims(p.slug, thumb) : null;
      const tw = td && td.w ? td.w : w;
      const pagePath = 'immobile/' + p.slug + '.html';
      const src = rel(pagePath, 'img/' + p.slug + '/' + file);
      const thumbSrc = rel(pagePath, 'img/' + p.slug + '/' + thumb);
      const isFeatured = first;
      first = false;
      const eager = isFeatured ? 'loading="eager" fetchpriority="high"' : 'loading="lazy" decoding="async"';
      /* il descrittore w e' il lato lungo reale: per i ritratti (lato lungo 1600-2000) il solo
         confronto tw < w avrebbe escluso lo srcset e il telefono avrebbe scaricato il pieno */
      /* taglia intermedia (-mid, 1240px) quando esiste: evita che il retina scarichi il pieno */
      const midFile = file.replace(/\.webp$/i, '-mid.webp');
      const midSrc = midFile !== file && exists('img/' + p.slug + '/' + midFile) ? rel(pagePath, 'img/' + p.slug + '/' + midFile) : '';
      const md = midSrc ? imgDims(p.slug, midFile) : null;
      const mw = md && md.w ? md.w : 0;
      const srcset = derivato && tw < w
        ? `srcset="${thumbSrc} ${tw}w, ${midSrc && mw ? midSrc + ' ' + mw + 'w, ' : ''}${src} ${w}w" sizes="${isFeatured ? '(max-width: 760px) 100vw, (max-width: 1200px) 62vw, 700px' : '(max-width: 640px) 90vw, (max-width: 960px) 45vw, 280px'}"` : '';
      const lightboxCaption = caption || ((p.titolo || 'Immobile') + ' — ' + (section.titolo || 'foto'));
      return `<figure class="gallery-card${isFeatured ? ' gallery-card--featured' : ''}" style="--gallery-ratio:${w} / ${h}">
        <a class="shot" href="${src}" data-lightbox="${attr(p.slug)}" data-caption="${attr(lightboxCaption)}" style="aspect-ratio:${w}/${h}">
          <img src="${thumbSrc}" ${srcset} alt="${attr(alt)}" width="${w}" height="${h}" ${eager}>
        </a>
        ${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}
        ${isFeatured ? statoBadge(p) : ''}
      </figure>`;
    }).join('');
    /* se la sezione corrisponde a un'unità, i suoi numeri stanno sotto il titolo */
    const u = (p.unita || []).find((x) => x && x.id === section.id);
    const rigaUnita = u
      ? ['<p class="gallery-sub">' + [
          u.mq ? esc(numIT(u.mq, 0)) + ' m²' : '',
          u.rendita_catastale ? 'rendita catastale ' + esc(euroIT(u.rendita_catastale)) : '',
          u.ape_classe ? 'APE classe ' + esc(u.ape_classe) + (u.ape_indice ? ' (' + esc(numIT(u.ape_indice)) + ')' : '') : '',
        ].filter(Boolean).join(' · ') + '</p>']
      : [];
    let out = `<section class="gallery-section" aria-labelledby="${attr(id)}">
      <h2 id="${attr(id)}">${esc(section.titolo || 'Foto')}</h2>
      ${rigaUnita.join('')}<div class="gallery-grid">${cards}</div>
    </section>`;
    /* la descrizione entra subito dopo il primo gruppo: si legge la casa dopo aver visto gli esterni */
    if (!inserito) { inserito = true; out += dopoPrimoGruppo; }
    return out;
  }).join('');
  return `<div class="gallery" role="group" aria-label="Galleria fotografica dell'immobile">${rendered}</div>`;
}

/* ---------------------------------------------------------------- privacy */

/* Dati presenti nella visura che non devono mai comparire nel markup pubblico
   (persona fisica: codice fiscale, nascita, residenza, storico protocolli). */
function privacyGuard() {
  const divieto = [
    { re: /SCGDVD68E26G842Y/i, motivo: 'codice fiscale della persona fisica' },
    { re: /26\/05\/1968/, motivo: 'data di nascita' },
    { re: /Ponte dell.Olio \(PC\)/i, motivo: 'luogo di nascita in chiaro' },
    { re: /\bnato a\b/i, motivo: 'luogo di nascita' },
    { re: /T ?610879435/, motivo: 'protocollo della visura (documento interno)' },
  ];
  let bad = 0;
  const pubblicati = walk(path.join(ROOT, 'legal')).map((f) => path.relative(ROOT, f).split(path.sep).join('/'))
    .concat(walk(path.join(ROOT, 'immobile')).map((f) => path.relative(ROOT, f).split(path.sep).join('/')))
    .filter((f) => f.endsWith('.html'));
  const targeti = ['index.html', 'grazie.html', 'immobili.html', 'contatti.html', 'chi-sono.html', 'llms.txt', 'sitemap.xml']
    .filter(exists).concat(pubblicati);
  for (const f of targeti) {
    const txt = readIf(path.join(ROOT, f), '');
    for (const g of divieto) {
      if (g.re.test(txt)) { console.log('✗ PRIVACY ' + f + ': presente ' + g.motivo + ' → non pubblicabile.'); bad++; }
    }
  }
  return bad;
}


/* ------------------------------------------------------- pagina immobile */

/* Le domande che compaiono in pagina vengono registrate qui durante il render e usate dopo per
   il blocco FAQPage: se una domanda non e' in pagina non finisce nemmeno nel markup. */
const FAQ = [];
let CURRENT_PAGE = 'index.html';
function dataRow(p) {
  const righe = [
    ['Prezzo', prezzo(p)],
    ['Tipologia', p.tipologia],
    ['Zona', [p.zona, p.comune].filter(Boolean).join(' · ')],
    ['Superficie', p.superficie ? p.superficie + ' m²' : null],
    ['Locali', p.locali ? String(p.locali) : null],
    ['Unità abitative', p.unita_abitative ? String(p.unita_abitative) : null],
    ['Pertinenze', p.pertinenze],
    ['Classe energetica', p.classe_energetica],
    ['Stato', p.stato],
    ['Riferimento', p.id],
    ['Aggiornato il', p.data_modifica],
  ].filter((r) => r[1] !== null && r[1] !== undefined && isConfirmed(r[1]));
  return '<dl class="specs">' + righe.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(String(v))}</dd></div>`).join('') + '</dl>';
}

function formImmobile(p, prefix) {
  const thanks = abs(BASE, cfg.form.post_submit_redirect || '/index.html');
  return `<form class="form" method="POST" action="${attr(cfg.form.action)}" id="modulo-immobile">
        <input type="hidden" name="_subject" value="Richiesta info — ${attr(p.id || p.slug)} — ${attr(p.titolo)}">
        <input type="hidden" name="_captcha" value="false">
        <input type="hidden" name="_template" value="table">
        <input type="hidden" name="_next" value="${attr(thanks)}">
        <input type="text" name="_honey" class="sr-only" tabindex="-1" autocomplete="off" aria-hidden="true">
        <input type="hidden" name="immobile" value="${attr(p.slug)}">
        <div class="field-grid">
          <p class="field"><label for="i-nome">Nome e cognome</label><input id="i-nome" name="nome" type="text" autocomplete="name" required></p>
          <p class="field"><label for="i-email">Email</label><input id="i-email" name="email" type="email" autocomplete="email" required></p>
          <p class="field"><label for="i-tel">Telefono</label><input id="i-tel" name="telefono" type="tel" autocomplete="tel" inputmode="tel"></p>
          <p class="field"><label for="i-quando">Quando puoi vedere l'immobile</label><input id="i-quando" name="disponibilita" type="text" placeholder="es. sabato mattina"></p>
        </div>
        <p class="field"><label for="i-msg">Domande o note per la visita</label><textarea id="i-msg" name="messaggio" rows="4" required placeholder="Es. le tre unità sono accatastate separatamente?"></textarea></p>
        <p class="field field-check"><label for="i-privacy"><input id="i-privacy" type="checkbox" name="privacy" value="si" required> Ho letto l'<a href="${rel('immobile/' + p.slug + '.html', 'legal/privacy.html')}">informativa privacy</a> e acconsento al trattamento dei dati per essere ricontattato su questo immobile.</label></p>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Chiedi informazioni</button>
          <a class="btn btn-ghost" href="tel:${attr(pro.telefono_e164)}">Telefonami: ${esc(pro.telefono_display)}</a>
        </div>
        <p class="form-note">Su documenti, conformità e prezzi rispondo dopo aver verificato: se una cosa non è ancora verificata, ti scrivo che non lo è.</p>
      </form>`;
}

function schedaPage(p, prefix) {
  const bozza = p.bozza
    ? '<div class="draft-bar"><strong>Scheda in bozza, non ancora pubblicabile.</strong> Mancano dati che non invento io: prezzo, superfici, stato catastale delle tre unità, classe energetica, foto. La pagina è marcata <code>noindex</code> e non è in sitemap.</div>'
    : '';
  /* Descrizione: se c'e' `testo` (capoversi, sottotitoli, firma) si rende cosi' com'e' e il
     primo capoverso fa da paragrafo-risposta. Senza `testo` si usa `descrizione` come
     unico capoverso. Niente taglio a 200 caratteri: spezzava le frasi a meta' quando la
     descrizione era scritta in piu' capoversi. */
  const blocchiDesc = Array.isArray(p.testo) ? p.testo.filter((b) => b && b.testo) : [];
  let primoCapoverso = true;
  const corpoDesc = blocchiDesc.length
    ? blocchiDesc.map((b) => {
        if (b.tipo === 'h3') return `<h3>${inline(esc(b.testo))}</h3>`;
        if (b.tipo === 'firma') return `<p class="prop-firma">${inline(esc(b.testo))}</p>`;
        const cls = primoCapoverso ? ' class="prop-answer"' : '';
        primoCapoverso = false;
        return `<p${cls}>${inline(esc(b.testo))}</p>`;
      }).join('\n        ')
    : `<p class="prop-answer">${inline(esc(p.descrizione || ''))}</p>`;
  const descSection = `<section class="prop-desc"><h2 id="descrizione">L'immobile</h2>
        ${corpoDesc}
      </section>`;
  const haGalleria = (p.gallerie || []).some((g) => Array.isArray(g.immagini) && g.immagini.length)
    || (p.immagini || []).filter(Boolean).length > 0;
  const manca = [
    !p.superficie && 'superficie (totale e per unità)',
    !p.locali && 'numero di locali per unità',
    !(p.immagini || []).length && 'foto (con dimensioni reali lette dai file)',
    !p.pertinenze && 'pertinenze e terreno circostante (metratura, destinazione)',
    !p.classe_energetica && "classe energetica / APE",
    !p.stato_catastale && 'stato catastale e urbanistico delle tre unità',
    !p.accesso && 'accesso, strada, servitù di passo',
    !p.cap && 'indirizzo esatto (se vuoi esporlo)',
  ].filter(Boolean);
  const todo = p.bozza && manca.length
    ? `<section class="todo"><h2 id="da-verificare">Informazioni in attesa di conferma</h2><ul>${manca.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>`
    : '';
  const chars = (p.caratteristiche || []).filter((c) => isConfirmed(c));
  return `<article class="prop">
  <header class="prop-hero"><div class="wrap">
    <p class="eyebrow">${inCatalogoSoloAnteprima(p) ? '<span class="tag-bozza">ANTEPRIMA INTERNA · BOZZA</span> ' : ''}${esc(p.tipologia || ('Immobile · ' + (p.zona || cfg.area_servizio.comune_principale)))}</p>
    <h1>${esc(p.titolo)}</h1>
    <p class="prop-loc">${esc([p.zona, p.comune + ' (PC)'].filter(Boolean).join(' · '))}</p>
    <div class="prop-meta">${statoBadge(p)}${prezzo(p) ? `<span class="prop-price">${esc(prezzo(p))}</span>` : ''}</div>
    ${p.data_modifica ? `<p class="prop-updated">Scheda aggiornata il ${esc(p.data_modifica)} · rif. ${esc(p.id || p.slug)}</p>` : ''}
  </div></header>
  <div class="wrap prop-grid">
    <div class="prop-main">
      ${unitaSezione(p)}
      ${haGalleria ? '' : descSection}
      ${galleria(p, haGalleria ? descSection : '')}
      ${bozza}
      ${chars.length ? '<section class="props"><h2 id="caratteristiche">Caratteristiche</h2><ul class="pills">' + chars.map((c) => `<li>${esc(c)}</li>`).join('') + '</ul></section>' : ''}
      <section class="prop-ask"><h2 id="richiesta">Chiedi informazioni su questo immobile</h2>
        <p>Scrivimi qui: il messaggio arriva a me con già dentro il riferimento della scheda.</p>
        <div class="form-shell">${formImmobile(p, prefix)}</div>
      </section>
      ${todo}
    </div>
    <aside class="prop-side">
      ${dataRow(p)}
      <div class="side-box">
        <p class="side-k">Contatti per l'immobile</p>
        <a class="side-tel" href="tel:${attr(pro.telefono_e164)}">${esc(pro.telefono_display)}</a>
        <p class="side-note"><a href="https://wa.me/${attr(String(pro.whatsapp || pro.telefono_e164).replace(/\D/g, ''))}" target="_blank" rel="noopener noreferrer">WhatsApp</a> · <a href="mailto:${attr(pro.email)}">${esc(pro.email)}</a></p>
      </div>
      <div class="side-box side-box--alt">
        <p class="side-k">Non è quella giusta?</p>
        <p class="side-note">Dimmi cosa cerchi: la ricerca parte da te, non da quello che ho in vetrina.</p>
        <a class="btn btn-outline btn-sm" href="${attr(anchorRicerca('immobile/' + p.slug + '.html', prefix))}">Ricerca personalizzata</a>
        ${paginaViva('vivere-a-rivergaro.html') ? `<p class="side-note">Com'è vivere a Rivergaro? <a href="${rel('immobile/' + p.slug + '.html', 'vivere-a-rivergaro.html')}">Servizi, distanze e tempo libero, raccontati da chi lavora</a>.</p>` : ''}
      </div>
    </aside>
  </div>
</article>`;
}

/* ------------------------------------------------------- catalogo (lista) */

function filterBar(list) {
  const zone = [...new Set(list.map((p) => p.zona).filter((z) => isConfirmed(z)))];
  const tipi = [...new Set(list.map((p) => p.tipologia).filter((t) => isConfirmed(t)))];
  const prezzi = list.map((p) => p.prezzo).filter((x) => typeof x === 'number');
  const max = prezzi.length ? Math.max(...prezzi) : null;
  return `<div class="filters" id="filtri">
    <div class="filter-row">
      <p class="field"><label for="fl-zona">Zona</label><select id="fl-zona" data-filter="zona"><option value="">Tutte le zone</option>${zone.map((z) => `<option>${esc(z)}</option>`).join('')}</select></p>
      <p class="field"><label for="fl-tipo">Tipologia</label><select id="fl-tipo" data-filter="tipologia"><option value="">Tutte le tipologie</option>${tipi.map((t) => `<option>${esc(t)}</option>`).join('')}</select></p>
      ${max ? `<p class="field"><label for="fl-prezzo">Budget massimo</label><input id="fl-prezzo" data-filter="prezzo" type="number" min="0" step="10000" inputmode="numeric" placeholder="es. 300000"></p>` : ''}
      <p class="filter-reset"><button type="button" class="btn btn-ghost btn-sm" id="fl-reset">Azzera filtri</button></p>
    </div>
    <p class="filter-count" id="fl-count" role="status" aria-live="polite"></p>
  </div>`;
}

function catalogoPage() {
  const list = catalogo();
  if (!list.length) {
    return '<section class="section"><div class="wrap">'
      + '<h1>Immobili in vendita a Rivergaro e in Val Trebbia</h1>'
      + '<p class="muted">Le proposte pubblicate riguardano Rivergaro e le sue frazioni. In questo momento non ci sono schede con dati completi da pubblicare: è una scelta di metodo, non un\'assenza di case in zona.</p>'
      + '<div class="empty-state"><p>Se mi dici cosa cerchi, la ricerca parte oggi e ti contatto quando trovo qualcosa di coerente — anche prima che finisca in vetrina.</p><a class="btn btn-primary" href="' + anchorRicerca('immobili.html') + '">' + esc(cfg.contatti_sezione.cta_principale) + '</a></div>'
      + '<p class="draft-note">Schede in bozza (non indicizzate, solo per te): ' + tutteProp().filter((p) => p.bozza).map((p) => `<a href="immobile/${esc(p.slug)}.html">${esc(p.slug)}</a>`).join(', ') + '</p>'
      + '</div></section>';
  }
  /* H1 con la chiave di ricerca + un H2 che apre la lista: prima il titolo della scheda
     era un <h3> figlio diretto dell'<h1> (salto di gerarchia, contro la regola interna
     seo_geo.regole_geo[2]) e la pagina aveva ~90 parole di contenuto unico. */
  const frazioni = (cfg.area_servizio.frazioni || []).map((f) => f.nome).filter(Boolean);
  return '<section class="section"><div class="wrap">'
    + '<h1>Immobili in vendita a Rivergaro e in Val Trebbia</h1>'
    + '<p class="muted">Ogni scheda pubblicata qui è una scheda verificata: i dati che non ho in mano non vengono scritti, nemmeno come "circa". Se un prezzo o una metratura non compaiono, è perché non li ho ancora confermati: meglio una scheda in meno che un dato sbagliato.</p>'
    + (frazioni.length ? '<p class="muted">Cerco e pubblico immobili nel comune di Rivergaro — ' + frazioni.map((f) => esc(f)).join(', ') + ' — e nei comuni intorno: ' + listaIt((cfg.area_servizio.area_coperta_servizio || []).map((x) => x.nome).filter((n) => n && n !== cfg.area_servizio.comune_principale)) + '.</p>' : '')
    + '<h2 id="proposte-disponibili">Proposte disponibili in questo momento</h2>'
    + filterBar(list)
    + '<ul class="grid-cards" id="catalogo">' + list.map((p) => cardImmobile(p, 'immobili.html')).join('') + '</ul>'
    + '<div class="catalog-cta"><h2 id="non-trovi-quello-che-cerchi">Non trovi quello che cerchi?</h2><p>La ricerca personalizzata parte da te: dimmi zona, tipo di casa e budget, e lavoro sui proprietari che contatto e su ciò che arriva prima di finire in vetrina.</p><a class="btn btn-outline" href="' + anchorRicerca('immobili.html') + '">' + esc(cfg.contatti_sezione.cta_principale) + '</a></div>'
    + '</div></section>';
}


/* ------------------------------------------------------------------- front */

function parseFrontMatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  let key = null;
  let target = data;
  for (const line of m[1].split(/\r?\n/)) {
    if (/^\s*#/.test(line) || !line.trim()) continue;
    const kv = line.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (kv) { key = kv[1]; target = data; data[key] = kv[2].trim(); continue; }
    const sub = line.match(/^\s+([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (sub && key) {
      if (typeof data[key] !== 'object' || Array.isArray(data[key])) data[key] = {};
      data[key][sub[1]] = sub[2].trim();
      continue;
    }
  }
  const num = (v) => (v !== undefined && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v);
  Object.keys(data).forEach((k) => { if (k !== 'jsonld' && k !== 'faq') data[k] = num(data[k]); });
  if (data.jsonld && typeof data.jsonld === 'object') {
    data.jsonld = Object.fromEntries(Object.entries(data.jsonld).map(([a, b]) => [a, num(b)]));
  }
  return { data, body: raw.slice(m[0].length) };
}

/* CSS che finisce dentro ogni pagina: caratteri (@font-face con %P% da sostituire) + main.css.
   Si legge una volta sola e si riusa per tutte le pagine. */
let CSS_RAW = null;
function cssInline(prefix) {
  if (CSS_RAW === null) {
    CSS_RAW = readIf(path.join(SRC, 'css', 'fonts.css'), '') + '\n' + readIf(path.join(SRC, 'css', 'main.css'), '');
    if (!CSS_RAW.trim()) throw new Error('CSS non trovato: controlla src/css/fonts.css e src/css/main.css');
  }
  /* i commenti non servono al browser: -3 KB in ogni pagina (il gzip quasi non cambia,
     ma il parser ha meno da leggere e il file resta piu' leggero da solo) */
  return CSS_RAW
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/%P%/g, prefix)
    .trim();
}

function head(page, prefix) {
  const c = [];  const title = page.title || cfg.site.titolo_home;
  if (page.robots_off) page.noindex = true;
  const desc = page.description || cfg.site.description_home;
  const url = BASE + '/' + (page.canonical || '').replace(/^\//, '');
  c.push('<meta charset="utf-8">');
  c.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  c.push(`<title>${esc(title)}</title>`);
  c.push('<meta name="description" content="' + attr(desc) + '">');
  if (page.noindex || page.robots_off || !cfg.site.robots_indexable) c.push('<meta name="robots" content="noindex, nofollow">');
  else c.push('<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">');
  c.push('<meta name="author" content="Immobili a Rivergaro">');
  c.push(`<meta name="theme-color" content="${attr(cfg.site.theme_color)}">`);
  /* niente canonical sulle pagine noindex (404, grazie): un canonico verso una pagina
     d'errore o di ringraziamento e' un URL canonico che non dovrebbe esistere */
  if (!(page.noindex || page.robots_off || !cfg.site.robots_indexable)) c.push('<link rel="canonical" href="' + attr(url) + '">');
  /* Discoverability di llms.txt (voce "Navigazione agentica" di PageSpeed, 2/3
     prima di questa riga): il file esisteva ed era valido, ma nessuna pagina lo
     dichiarava. Il link rel="llms-txt" nell'head e' il meccanismo con cui un
     agente che arriva su una pagina qualsiasi scopre l'indice dei contenuti,
     senza dover conoscere a memoria la convenzione sul percorso. */
  if (!(page.noindex || page.robots_off || !cfg.site.robots_indexable)) c.push('<link rel="llms-txt" href="' + attr(rel(page.path || 'index.html', 'llms.txt')) + '">');
  c.push('<meta property="og:type" content="' + (page.immobile ? 'article' : 'website') + '">');
  c.push('<meta property="og:site_name" content="Immobili a Rivergaro">');
  c.push('<meta property="og:locale" content="it_IT">');
  c.push('<meta property="og:url" content="' + attr(url) + '">');
  c.push('<meta property="og:title" content="' + attr(title) + '">');
  c.push('<meta property="og:description" content="' + attr(desc) + '">');
  /* og:image: solo file reali. Per la home si usa il file indicato nel config (foto vera),
     per la scheda la copertina della sua galleria: cosi' ogni condivisione mostra casa sua.
     Le pagine di servizio (privacy, cookie, grazie, 404) NON portano la foto di una casa:
     prima la stessa copertina finiva anche come anteprima della Privacy Policy. */
  const cover = page.immobile && (page.immobile.immagini || []).filter(Boolean)[0];
  const ogImg = page.jsonld === 'none' ? ''
    : cover ? 'img/' + page.immobile.slug + '/' + cover : (isConfirmed(cfg.seo_geo.og_image) ? cfg.seo_geo.og_image : (page.og_img || ''));
  if (ogImg) {
    c.push('<meta property="og:image" content="' + attr(abs(BASE, '/' + ogImg)) + '">');
    const ogm = mediaCache.items.find((i) => i.path === ogImg);
    if (ogm && ogm.width) c.push('<meta property="og:image:width" content="' + ogm.width + '"><meta property="og:image:height" content="' + ogm.height + '">');
    /* l'alt descrive l'immagine che si vede, non la pagina: se la condivisione mostra la
       copertina di un immobile, l'alt e' quello dell'immobile */
    /* anche quando la copertina arriva dal config (home), l'alt deve descrivere quella foto */
    const ogProp = page.immobile || tutteProp().find((x) => (x.immagini || []).filter(Boolean).some((f) => 'img/' + x.slug + '/' + f === ogImg));
    const ogAlt = page.og_image_alt
      || (ogProp ? ((ogProp.tipologia || 'Immobile') + ' a ' + (ogProp.zona || ogProp.comune || 'Rivergaro'))
                 : 'Davide Scaglia — Immobili a Rivergaro');
    c.push('<meta property="og:image:alt" content="' + attr(ogAlt) + '">');
    c.push('<meta name="twitter:image" content="' + attr(abs(BASE, '/' + ogImg)) + '">');
    c.push('<meta name="twitter:image:alt" content="' + attr(ogAlt) + '">');
  }  c.push('<meta name="twitter:card" content="' + attr(ogImg ? cfg.seo_geo.twitter_card : 'summary') + '">');
  c.push('<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 rx=%227%22 fill=%22%230a0a0a%22/%3E%3Cpath d=%22M4 14L16 4l12 10v14H4z%22 fill=%22none%22 stroke=%22%23d4a520%22 stroke-width=%222%22/%3E%3C/svg%3E">');
  /* /favicon.ico restituiva la pagina 404 (35KB di HTML con status 404) a ogni visita:
     il file ora esiste, generato da tools/make-brand-assets.js con la stessa figura
     dell'icona inline. apple-touch-icon copre iOS/macOS, che ignorano l'SVG. */
  c.push(`<link rel="icon" type="image/x-icon" href="${attr(rel(page.path || 'index.html', 'favicon.ico'))}" sizes="32x32">`);
  c.push(`<link rel="apple-touch-icon" href="${attr(rel(page.path || 'index.html', 'apple-touch-icon.png'))}">`);
  /* prefisso relativo alla radice calcolato sulla pagina: per le schede `prefix` non e' '../' */
  const cssBase = rel(page.path || 'index.html', 'css');
  const rootPfx = cssBase.replace(/css$/, '');
  /* solo la home ha la copertina in evidenza: le altre pagine non preloadano nulla */
  if ((page.path || 'index.html') === 'index.html' && !page.immobile) {
    const pre = evidenzaPreload(rootPfx);
    if (pre) c.push(pre);
  }
  /* Caratteri serviti da qui: il primo carattere del titolo (Playfair 700) parte subito,
     gli altri li scopre il browser leggendo il CSS inline qui sotto. */
  c.push('<link rel="preload" href="' + cssBase + '/fonts/playfair-display-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>');
  /* CSS dei caratteri + foglio di stile, tutto dentro la pagina: prima non c'era nessun
     file che bloccava il disegno. Il CSS non ha url() quindi puo' stare qui senza
     cambiare i percorsi; i font invece hanno bisogno del prefisso giusto ('' o '../'). */
  c.push('<style>' + cssInline(rootPfx) + '</style>');
  if (page.critical_css && exists(page.critical_css)) c.push('<style>' + readIf(path.join(ROOT, page.critical_css), '') + '</style>');
  let ld;
  if (page.immobile) ld = { '@context': 'https://schema.org', '@graph': [listingJsonLd(page.immobile), agentJsonLd(), { '@type': 'WebSite', '@id': BASE + '/#website', name: cfg.site.dominio, url: BASE + '/' }] };
  else if (page.jsonld === 'none') ld = null;
  else ld = siteJsonLd();
  /* Person solo dove serve (la home): le altre pagine restano come sono. Il legame e' un
     riferimento @id, non una copia, cosi' non ci sono due descrizioni della stessa entita'. */
  if (page.person && ld && Array.isArray(ld['@graph'])) {
    ld['@graph'].push(personJsonLd());
    const agente = ld['@graph'].find((n) => n && n['@type'] === 'RealEstateAgent');
    if (agente) agente.founder = { '@id': BASE + '/#davide-scaglia' };
  }
  if (page.breadcrumb) ld['@graph'].push({ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: BASE + '/' }, { '@type': 'ListItem', position: 2, name: page.breadcrumb, item: BASE + '/' + (page.canonical || page.path || '').replace(/^\//, '') }] });
  /* Blocchi JSON-LD aggiuntivi specifici della pagina (es. ItemList del catalogo). */
  if (page.jsonld_extra && ld && Array.isArray(ld['@graph'])) ld['@graph'].push(...page.jsonld_extra);
  /* FAQPage: le righe Q&A che il visitatore sta vedendo, non domande inventate per il markup.
     Google dal 07/05/2026 non mostra piu' il risultato arricchito FAQ (lo aveva gia' limitato ai
     siti sanitari/governativi dal 2023), ma il tipo resta valido e viene letto da Bing e dai
     motori AI per estrarre risposte citabili: lo teniamo per quello, non come arricchimento SERP. */
  const faq = (page.faq || []).concat(FAQ.filter((f) => f.in === page.path)).map((f) => ({ q: f.q || f.d, a: f.a || f.r }));
  if (faq.length) {
    ld['@graph'].push({
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  if (ld) c.push('<script type="application/ld+json">\n' + JSON.stringify(ld, null, 1) + '\n</script>');
  return c.join('\n  ');
}

/* Banner «se invece devi vendere» in fondo alla pagina, richiesto da Davide il 10/11/2026.
   Vive sulla home e sulle pagine editoriali (chi-sono, contatti, territorio); NON sulla
   scheda immobile, dove la regola ecosistema del config lo vieta per non distrarre chi
   sta gia' leggendo una casa, e niente su legali/grazie/404. */
function vendeCta(page) {
  const dove = ['index.html', 'chi-sono.html', 'contatti.html', 'vivere-a-rivergaro.html'];
  if (!dove.includes(page.path)) return '';
  return '<section class="section section--alt"><div class="wrap">' + shortcodes.sito_madre_cta() + '</div></section>';
}
function buildPage(page) {
  /* La 404 viene servita da GitHub Pages sotto QUALSIASI percorso inesistente, anche in
     sottocartelle (/zone/x.html, /immobili/y.html): con il prefisso relativo logo, menu,
     css e link si rompono proprio nel momento in cui servono. Per lei prefisso assoluto
     dalla radice, cosi' la pagina d'errore e' integra da qualunque URL arrivi. */
  const prefix = page.path === '404.html' ? '/' : (page.path.includes('/') ? '../' : '');
  CURRENT_PAGE = page.path;
  const md = readIf(path.join(SRC, 'pages', page.source), '');
  const { data, body } = parseFrontMatter(md);
  const merged = Object.assign({}, page, data, { jsonld: (data.jsonld && Object.keys(data.jsonld).length) ? data.jsonld : page.jsonld, faq: page.faq });
  const content = renderMarkdown(body);
  const shell = readIf(path.join(SRC, 'templates', 'layout.html'), '');
  const header = fill(readIf(path.join(SRC, 'templates', 'header.html'), ''), prefix, page);
  const footer = fill(readIf(path.join(SRC, 'templates', 'footer.html'), ''), prefix, page);
  const banner = fill(readIf(path.join(SRC, 'templates', 'cookie-banner.html'), ''), prefix, merged);
  let out = shell
    .replace('{{LANG}}', LANG)
    .replace('{{HEAD}}', head(merged, prefix))
    .replace('{{HEADER}}', header)
    .replace('{{CONTENT}}', content)
    .replace('{{VENDE_CTA}}', vendeCta(merged))
    .replace('{{FOOTER}}', footer)
    .replace('{{COOKIE_BANNER}}', banner)
    .replace('{{PREFIX}}', prefix)
    .replace('{{P0}}', prefix === '/' ? '/' : (page.path.includes('/') ? '../' : ''))
    .replace('{{SCRIPT}}', `<script src="${prefix === '/' ? '/js/main.js' : rel(page.path, 'js/main.js')}" defer></script>`);
  return out;
}

/* Una pagina conta come viva se esiste il file generato OPPURE esiste il suo markdown
   sorgente: menu e footer devono poter linkare una pagina nuova gia' al primo build,
   quando l'output non e' ancora stato scritto (con la sola exists() la voce spariva
   al primo giro e compariva dal secondo: visto il 11/11/2026 con vivere-a-rivergaro). */
function paginaViva(f) {
  if (exists(f)) return true;
  const pg = PAGES.find((x) => x.path === f);
  return !!pg && !!readIf(path.join(SRC, 'pages', pg.source), '');
}
function fill(tpl, prefix, page) {
  page = page || {};
  if (!page.path) page.path = 'index.html';
  /* le voci di default si allargano da sole quando esiste la pagina markdown corrispondente */
  /* Niente voci "Zone"/"Guide" nel menu finche' non esistono pagine con quei paragrafi:
     prima il generatore le dichiarava e poi le scartava con un avviso a ogni build. */
  const nav = (page.nav || ['immobili', 'ricerca', 'contatti'].concat(navExtra()))
    .filter((k) => k !== page.nav_key);
  const labels = { proposta: 'In evidenza', richiesta: 'Contatti', ricerca: 'Se cerchi altro', immobili: 'Immobili', zona: 'Zone', guide: 'Guide', vivere: 'Vivere qui', contatti: 'Contatti', 'chi-sono': 'Chi sono' };
  const links = nav
    .map((k) => {
      const ric = (cfg.navigazione && cfg.navigazione.ancora_ricerca) || 'index.html#la-villa-non-fa-per-te';
      /* se la pagina di una voce esiste (perche' qualcuno ha scritto il suo markdown) la voce
         del menu punta a quel paragrafo: le "voci fantasma" spariscono da sole appena la pagina c'e' */
      const verso = (k) => { const pg = PAGES.find((x) => x.source === k + '.md'); return pg && exists(pg.path) ? pg.path + '#' + (pg.nav_id || k) : null; };
      const target = { proposta: '#immobile-in-evidenza', richiesta: ric, ricerca: ric, immobili: 'immobili.html', zona: '#zona', guide: '#guide', vivere: readIf(path.join(SRC, 'pages', 'vivere-rivergaro.md'), '') ? 'vivere-a-rivergaro.html' : null, 'chi-sono': verso('chi-sono') || 'index.html', contatti: verso('contatti') || ric }[k];
      if (k === 'immobili' && !exists('immobili.html')) return `<a href="#immobili">${labels[k]}</a>`;
      if (!target) return '';
      let href;
      if (target.startsWith('#')) href = page.path === 'index.html' && pageIds('index.html').has(target.slice(1)) ? target : anchorHref(page.path, 'index.html' + target);
      else if (target.includes('#')) href = anchorHref(page.path, target);
      else href = paginaViva(target) ? rel(page.path, target) : anchorHref(page.path, 'index.html#' + k);
      if (!href) { console.warn(`⚠ voce di menu "${labels[k]}" rimossa: nessuna pagina contiene un paragrafo utile (${target})`); return ''; }
      return `<a href="${href}">${labels[k]}</a>`;
    })
    .join('\n        ');
  const map = {
    NAV: links,
    /* Se il menu e' vuoto il pulsante hamburger non ha nulla da aprire: prima
       restava in pagina (privacy, cookie, grazie, 404) con un aria-controls verso
       una nav vuota. Si spegne da solo insieme alle voci. */
    BURGER: links.trim()
      ? '<button class="burger" id="burger" aria-expanded="false" aria-controls="nav" aria-label="Apri il menu"><span></span><span></span><span></span></button>'
      : '',
    BRAND: 'Rivergaro',
    BRAND_FULL: 'Immobili a Rivergaro',
    BRAND_MARK: '⌂',
    CLAIM: 'Case in vendita',
    TEL: attr(pro.telefono_e164),
    TEL_LABEL: esc(pro.telefono_display),
    EMAIL: attr(pro.email),
    YEAR: String(year),
    FOOTER_NAV: footerNav(prefix, page),
    /* NAP identico su TUTTE le pagine, legali comprese: prima le pagine legal/
       ricevevano una variante di testo e le altre i soli recapiti cliccabili, e in
       nessun caso il footer riportava l'indirizzo (la "A" di NAP mancava). */
    NAP: `<a href="tel:${attr(pro.telefono_e164)}">Telefono: ${esc(pro.telefono_display)}</a> · <a href="https://wa.me/${attr(String(pro.whatsapp || pro.telefono_e164).replace(/\D/g, ''))}" target="_blank" rel="noopener noreferrer">WhatsApp</a> · <a href="mailto:${attr(pro.email)}">${esc(pro.email)}</a>`,
    /* La "A" di NAP mancava dal footer: solo telefono/WhatsApp/email, e la regola
       interna seo_geo.regole_geo[1] chiede il NAP identico su tutte le pagine.
       L'indirizzo e' lo stesso verificato in visura e gia' pubblicato in contatti. */
    /* DECISIONE DI DAVIDE 10/11/2026: l'indirizzo di casa-sede non e' pubblico. In footer
       resta solo il comune; la via vive unicamente nella privacy policy (obbligo legale)
       e nella scheda Google come indirizzo nascosto. Sorvegliato da watch-site. */
    NAP_ADDR: addr
      ? `<p class="f-addr">${esc(addr.localita)} (${esc(addr.provincia)})</p>`
      : '',
    /* Partita IVA nella home page e in footer: obbligo per i soggetti IVA (art. 35
       DPR 633/72). Prima index.html non conteneva la P.IVA in nessun punto. */
    LEGAL: [
      isConfirmed(pro.denominazione_legale) ? esc(pro.denominazione_legale) : '',
      isConfirmed(pro.partita_iva) ? 'P.IVA ' + esc(pro.partita_iva) : '',
      isConfirmed(pro.rea) ? 'REA ' + esc(pro.rea) : '',
    ].filter(Boolean).join(' · '),
    /* Profili social pubblicati nel footer con rel="me": gli stessi URL che il
       JSON-LD dichiara in sameAs, cosi' pagina e dati strutturati si confermano
       a vicenda (segnale di entita' per Google e per i motori AI). */
    SOCIAL: (() => {
      const labels = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', youtube: 'YouTube' };
      const link = Object.entries(pro.social || {})
        .filter(([, u]) => /^https?:\/\//.test(u || ''))
        .map(([k, u]) => `<a href="${attr(u)}" rel="me noopener" target="_blank">${labels[k] || esc(k)}</a>`);
      return link.length ? '<p class="f-social"><span class="f-social-t">Seguimi:</span> ' + link.join(' · ') + '</p>' : '';
    })(),
    PREFIX: prefix,
    P0: prefix,
  };
  return tpl.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m0, k) => (map[k] !== undefined ? map[k] : m0));
}
/* Voci nate insieme alle pagine: 'Chi sono' entra nel menu quando esiste src/pages/chi-sono.md. */
function navExtra() {
  const fonti = { 'chi-sono': 'chi-sono.md', vivere: 'vivere-rivergaro.md' };
  return Object.keys(fonti).filter((k) => { const pg = PAGES.find((x) => x.source === fonti[k]); return !!pg && exists(pg.path); });
}
function footerNav(prefix, page) {
  const items = [];
  if (exists('immobili.html')) items.push(['Immobili', 'immobili.html']);
  items.push(['Ricerca personalizzata', (cfg.navigazione && cfg.navigazione.ancora_ricerca) || 'index.html#la-villa-non-fa-per-te']);
  if (exists('contatti.html')) items.push(['Contatti', 'contatti.html']);
  if (exists('chi-sono.html')) items.push(['Chi sono', 'chi-sono.html']);
  if (paginaViva('vivere-a-rivergaro.html')) items.push(['Vivere a Rivergaro', 'vivere-a-rivergaro.html']);
  items.push(['Privacy', 'legal/privacy.html']);
  items.push(['Cookie', 'legal/cookie.html']);
  items.push(['Termini', 'legal/termini.html']);
  return items
    .filter(([, f]) => (f.includes('#') ? exists(f.split('#')[0]) : paginaViva(f)))
    .map(([l, f]) => [l, f.includes('#') ? anchorHref(page.path, f) : rel(page.path, f)])
    .filter(([l, href]) => { if (!href) console.warn(`⚠ voce di footer "${l}" rimossa: nessuna destinazione valida`); return !!href; })
    .map(([l, href]) => `<a href="${href}">${l}</a>`)
    .join('\n        ');
}

/* ------------------------------------------------------------------- media */

const IMG_EXT = new Set(['.webp', '.avif', '.jpg', '.jpeg', '.png']);
const VID_EXT = new Set(['.mp4', '.webm', '.mov', '.m4v']);
function walk(dir) {
  const out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}
function pngSize(buf) { return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }; }
function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}
function webpSize(buf) {
  const fourcc = buf.toString('utf8', 12, 16);
  if (fourcc === 'VP8X') return { w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 };
  if (fourcc === 'VP8L') { const b = buf.readUInt32LE(21); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }; }
  if (fourcc === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  return null;
}
function mediaScan() {
  const isMedia = (f) => IMG_EXT.has(path.extname(f).toLowerCase()) || VID_EXT.has(path.extname(f).toLowerCase());
  const files = [...walk(path.join(ROOT, 'img')), ...walk(path.join(ROOT, 'video'))]
    .filter(isMedia)
    .filter((f) => !f.includes(path.join('img', '_in')));
  const incoming = walk(path.join(ROOT, 'img', '_in')).filter((f) => IMG_EXT.has(path.extname(f).toLowerCase()) || VID_EXT.has(path.extname(f).toLowerCase()));
  const items = [];
  const warnings = [];
  const derivati = (f) => /-(thumb|mid|small)\.(webp|avif|jpg|jpeg|png)$/.test(path.basename(f)) || /(^|\/)(brand|legale)(\/|$)/.test(f.replace(ROOT + '/', ''));
  for (const f of files.concat(incoming)) {
    /* le miniature (-thumb) sono derivate dai file pieni e i loghi/documenti non sono content
       di un annuncio: contarli qui significa raddoppiare il rapporto e generare bozze fantasma */
    if (derivati(f)) continue;
    const relp = path.relative(ROOT, f).split(path.sep).join('/');
    const ext = path.extname(f).toLowerCase();
    const st = fs.statSync(f);
    const item = { path: relp, tipo: VID_EXT.has(ext) ? 'video' : 'immagine', bytes: st.size, nome: path.basename(f), cartella: path.basename(path.dirname(f)), stato: ext === '.webp' || ext === '.avif' ? 'ok' : 'da convertire', eta: null };
    if (IMG_EXT.has(ext)) {
      try {
        const buf = fs.readFileSync(f);
        const d = ext === '.png' ? pngSize(buf) : ext === '.jpg' || ext === '.jpeg' ? jpegSize(buf) : ext === '.webp' ? webpSize(buf) : null;
        if (d) { item.width = d.w; item.height = d.h; item.eta = (st.size / 1024).toFixed(0) + 'KB'; } else warnings.push(`${relp}: formato immagine non leggibile per le dimensioni (usa WebP/JPG/PNG)`);
      } catch (e) { warnings.push(`${relp}: lettura fallita`); }
    }
    if (item.width && Math.max(item.width, item.height) > 2600) warnings.push(`${relp}: ${item.width}×${item.height} troppo grande, ridimensiona a 2400px`);
    if (item.bytes > 400 * 1024) warnings.push(`${relp}: ${(item.bytes / 1024 / 1024).toFixed(2)}MB sopra budget, comprimi`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*\.(webp|avif|jpg|png|mp4|webm|mov|m4v)$/.test(item.nome)) warnings.push(`${relp}: nome non conforme (usa minuscole, kebab-case, es. villa-giardino-rivergaro-1.webp)`);
    if (relp.startsWith('img/_in')) item.stato = 'in arrivo';
    items.push(item);
  }
  const byProp = {};
  for (const it of items) {
    if (it.path.startsWith('img/_in') || it.path.startsWith('img/legale')) continue;
    const slug = it.cartella;
    (byProp[slug] = byProp[slug] || { immagini: [], video: [] })[it.tipo === 'video' ? 'video' : 'immagini'].push(it);
  }
  return { items, byProp, warnings, generato: new Date().toISOString() };
}
function mediaReport(s) {
  const lines = ['# Rapporto media — ' + s.generato, ''];
  if (!s.items.length) lines.push('Nessuna immagine o video nel repository. Cartelle controllate: img/, video/, img/_in/.', '', 'Deposita i file in `img/_in/` (o dimmi il percorso della tua cartella) e li smisto io: rinomina in kebab-case, WebP, width/height reali e aggiornamento di `properties.json`.');
  for (const slug of Object.keys(s.byProp)) {
    const g = s.byProp[slug];
    lines.push(`## ${slug}`, `immagini ${g.immagini.length} · video ${g.video.length}`);
    for (const i of g.immagini.concat(g.video)) lines.push(`- \`${i.path}\` ${i.width ? i.width + '×' + i.height : ''} ${(i.bytes / 1024).toFixed(0)}KB ${i.stato !== 'ok' ? '· ' + i.stato : ''}`);
    lines.push('');
  }
  if (s.warnings.length) lines.push('## Avvisi', ...s.warnings.map((w) => '- ' + w));
  const schedi = s.items.filter((i) => i.tipo === 'immagine' && i.width);
  if (schedi.length) {
    lines.push('', "## Riga <img> pronta (dimensioni reali lette dal file)");
    for (const i of schedi) lines.push('- `<img src="' + i.path + '" alt="DESCRIVI cosa si vede" width="' + i.width + '" height="' + i.height + '" loading="lazy" decoding="async">`');
  }
  const inArrivo = s.items.filter((i) => i.path.startsWith('img/_in'));
  if (inArrivo.length) {
    lines.push('', '## In arrivo (da smistare)', ...inArrivo.map((i) => `- \`${i.path}\` ${i.width ? i.width + '×' + i.height : ''} · assegna uno slug prima della pubblicazione`));
  }
  return lines.join('\n') + '\n';
}

let mediaCache = { items: [], byProp: {}, warnings: [] };
function refreshMediaCache() { mediaCache = mediaScan(); }

/* ------------------------------------------------------- intake media/dati */

/* Propone lo slug dall'intestazione del file: <slug>-<cosa>-<n>.webp.
   Da qui nasce src/data/properties.draft.json: struttura pronta, valori vuoti. */
function guessSlug(nome, cartella) {
  const generici = new Set(['img', 'video', '_in', 'proprieta', 'proprietá', 'im' + 'mobili', 'foto']);
  const perCartella = cartella && !generici.has(cartella.toLowerCase());
  if (perCartella) return cartella.toLowerCase();
  return nome.replace(/\.[a-z0-9]+$/i, '')            // senza estensione
    .replace(/\((\d+)\)$/, '')                        // "1 (3)" -> "1"
    .replace(/[_\s]+/g, '-')                          // spazi/underscore -> -
    .replace(/-\d+$/, '')                             // indice finale "-12"
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

function buildDraft() {
  const m = mediaScan();
  const groups = {};
  for (const it of m.items) {
    /* img/brand e img/legale contengono asset del sito e documenti: non sono foto di un
       immobile e non devono generare bozze-fantasma (era comparso uno "scheda" con slug "brand"). */
    const key = guessSlug(it.nome, it.cartella) || 'senza-nome';
    (groups[key] = groups[key] || []).push(it);
  }
  const immobili = Object.keys(groups)
    .filter((k) => groups[k].some((x) => x.tipo === 'immagine'))
    .map((k) => {
      const imgs = groups[k].filter((x) => x.tipo === 'immagine');
      const vid = groups[k].filter((x) => x.tipo === 'video');
      return {
        id: 'IMM-' + (1000 + Object.keys(groups).indexOf(k)),
        slug: k,
        stato: 'DA CONFERMARE',
        tipologia: null, comune: 'Rivergaro', zona: null,
        titolo: 'DA CONFERMARE', prezzo: null, superficie: null, locali: null,
        descrizione: 'DA CONFERMARE (primi 200 caratteri = risposta pronta per SEO e motori generativi)',
        caratteristiche: [], pertinenze: [],
        immagini: imgs.map((i) => path.posix.basename(i.path)),
        video: vid.map((i) => path.posix.basename(i.path)),
        dimensioni_immagini: imgs.map((i) => ({ file: path.posix.basename(i.path), width: i.width || null, height: i.height || null, kb: Math.round(i.bytes / 1024) })),
        data_pubblicazione: null, data_modifica: null,
        note_interne: 'Bozza generata da build.js il ' + new Date().toISOString().slice(0, 10) + ' dal contenuto di img/ e video/. Compilare solo i campi DA CONFERMARE e cancellare questa nota. ' + (imgs.length === 0 ? 'Nessuna immagine trovata.' : ''),
      };
    });
  if (!immobili.length) { fs.writeFileSync(path.join(SRC, 'data', 'properties.draft.json'), JSON.stringify({ immobili: [], _nota: 'Nessun media trovato: deposita i file in img/_in/ poi riesegui "node build.js media".' }, null, 2)); return 0; }
  fs.writeFileSync(path.join(SRC, 'data', 'properties.draft.json'), JSON.stringify({ immobili, _nota: 'Bozza generata automaticamente: non e un catalogo. Diventa properties.json solo dopo che Davide ha compilato e confermato i dati.' }, null, 2) + '\n');
  return immobili.length;
}


/* Domande di servizio: il config le contiene, la home le mostra e il FAQPage le riusa.
   Un solo testo, tre uscite: niente divergenze fra cio' che legge il visitatore e cio' che legge
   il motore. */
function homeFaq() {
  return (cfg.contatti_sezione.risposte_brevi || []).filter((x) => x && x.d && x.r);
}
/* LCP della home: la copertina e' la prima immagine visibile. Un <link rel="preload">
   in <head> la fa partire prima che il parser arrivi al markup. I descrittori sono gli
   stessi della <img> qui sotto: se coincidono il browser non la scarica due volte. */
function evidenzaPreload(prefix) {
  const list = catalogo();
  if (list.length !== 1) return '';
  const p = list[0];
  const file = (p.immagini || []).filter(Boolean)[0];
  if (!file) return '';
  const meta = imgMeta(p.slug, file);
  const fw = (meta && meta.width) || 0;
  if (!fw) return '';
  const thumb = file.replace(/\.webp$/i, '-thumb.webp');
  const mid = file.replace(/\.webp$/i, '-mid.webp');
  if (thumb === file || !exists('img/' + p.slug + '/' + thumb)) return '';
  const haMid = mid !== file && exists('img/' + p.slug + '/' + mid);
  const smallF = file.replace(/\.webp$/i, '-small.webp');
  const haSmall = smallF !== file && exists('img/' + p.slug + '/' + smallF);
  const src = prefix + 'img/' + p.slug + '/';
  /* descrittori = larghezze reali lette dai byte: il preload e la <img> dell'hero
     devono dichiarare gli stessi numeri, altrimenti il browser scarica due volte */
  const dThumb = imgDims(p.slug, thumb), dSmall = haSmall ? imgDims(p.slug, smallF) : null, dMid = haMid ? imgDims(p.slug, mid) : null;
  const tw = dThumb && dThumb.w ? dThumb.w : fw;
  const sw = dSmall && dSmall.w ? dSmall.w : 0;
  const mw = dMid && dMid.w ? dMid.w : 0;
  const set = `${haSmall && sw ? src + smallF + ' ' + sw + 'w, ' : ''}${src}${thumb} ${tw}w, ${haMid && mw ? src + mid + ' ' + mw + 'w, ' : ''}${src}${file} ${fw}w`;
  return `<link rel="preload" as="image" href="${attr(src + file)}" imagesrcset="${attr(set)}" imagesizes="(max-width: 900px) 100vw, 620px" fetchpriority="high">`;
}

function immobileEvidenza() {
  const list = catalogo();
  if (!list.length) {
    return '<div class="empty-state"><p>Al momento non ci sono proposte pubblicate. Se mi racconti cosa cerchi, posso capire da dove partire.</p></div>';
  }
  // Il layout mette in primo piano la singola proposta; se il catalogo crescerà,
  // mantiene visibili tutte le schede invece di nasconderne qualcuna.
  if (list.length > 1) {
    return '<ul class="grid-cards">' + list.map((p) => cardImmobile(p, 'index.html')).join('') + '</ul>';
  }
  const p = list[0];
  const url = rel('index.html', 'immobile/' + p.slug + '.html');
  const file = (p.immagini || []).filter(Boolean)[0];
  const meta = file ? imgMeta(p.slug, file) : null;
  const photo = file
    ? (() => {
        const thumb = file.replace(/\.webp$/i, '-thumb.webp');
        const mid = file.replace(/\.webp$/i, '-mid.webp');
        const smallF = file.replace(/\.webp$/i, '-small.webp');
        const fw = (meta && meta.width) || 1200;
        /* taglia intermedia: il riquadro della copertina e' largo al massimo 620px CSS, quindi a
           DPR 2 servono ~1240px. Senza la -mid il browser retina scaricava il pieno (357KB). */
        const haMid = mid !== file && exists('img/' + p.slug + '/' + mid);
        const haSmall = smallF !== file && exists('img/' + p.slug + '/' + smallF);
        const src = `img/${p.slug}/`;
        const dThumb = imgDims(p.slug, thumb), dSmall = haSmall ? imgDims(p.slug, smallF) : null, dMid = haMid ? imgDims(p.slug, mid) : null;
        const tw = dThumb && dThumb.w ? dThumb.w : fw;
        const sw = dSmall && dSmall.w ? dSmall.w : 0;
        const mw = dMid && dMid.w ? dMid.w : 0;
        const set = thumb !== file && exists('img/' + p.slug + '/' + thumb)
          ? ` srcset="${haSmall && sw ? src + smallF + ' ' + sw + 'w, ' : ''}${src}${thumb} ${tw}w, ${haMid && mw ? src + mid + ' ' + mw + 'w, ' : ''}${src}${file} ${fw}w" sizes="(max-width: 900px) 100vw, 620px"` : '';
        /* LCP: la copertina della home e' la prima immagine della pagina, non si carica lazy.
           Con srcset, pero', i telefoni scaricano la miniatura invece di 357KB. */
        return `<img src="img/${attr(p.slug)}/${attr(file)}"${set} alt="${attr((p.tipologia || 'Immobile') + ' a ' + (p.zona || p.comune || ''))}" width="${meta && meta.width || 1200}" height="${meta && meta.height || 800}" fetchpriority="high" decoding="async">`;
      })()
    : '<span class="featured-media-empty">Nessuna foto pubblicata</span>';
  const features = (p.caratteristiche || []).filter(isConfirmed);
  const place = [p.zona, p.comune].filter(isConfirmed).join(' · ');
  return `<article class="featured-property">
    <a class="featured-property-media" href="${url}" aria-label="Apri la scheda: ${attr(p.titolo)}">
      ${photo}${statoBadge(p)}
    </a>
    <div class="featured-property-content">
      <p class="eyebrow">${esc(place || 'Rivergaro')}</p>
      <h3><a href="${url}">${esc(p.titolo)}</a></h3>
      ${prezzo(p) ? `<p class="featured-property-price">${esc(prezzo(p))}</p>` : ''}
      ${p.descrizione && isConfirmed(p.descrizione) ? `<p class="featured-property-description">${esc(p.descrizione)}</p>` : ''}
      ${features.length ? `<ul class="featured-property-facts">${features.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <div class="featured-property-specs">${dataRow(p)}</div>
      <p class="featured-property-ref"><a href="${url}">Scheda completa, foto e contatti →</a></p>
    </div>
  </article>`;
}

function cardImmobile(p, prefix) {
  const img = (p.immagini || []).filter(Boolean)[0];
  const url = rel(prefix, 'immobile/' + p.slug + '.html');
  const m = img ? imgMeta(p.slug, img) : null;
  const media = img
    ? '<img src="' + 'img/' + p.slug + '/' + img + '" alt="' + attr((p.tipologia || 'Immobile') + ' a ' + (p.zona || p.comune || '')) + '" width="' + (m && m.width ? m.width : 1200) + '" height="' + (m && m.height ? m.height : 800) + '" loading="lazy" decoding="async">'
    : '<span class="media-placeholder">Foto in preparazione</span>';
  const draftTag = inCatalogoSoloAnteprima(p) ? '<span class="badge badge--bozza" aria-label="Scheda in bozza, anteprima interna">BOZZA</span>' : '';
  const excerpt = clipMeta(p.descrizione || '', 150);
  const attrs = [
    p.zona && isConfirmed(p.zona) ? `data-zona="${attr(p.zona)}"` : '',
    p.tipologia && isConfirmed(p.tipologia) ? `data-tipologia="${attr(p.tipologia)}"` : '',
    typeof p.prezzo === 'number' && p.prezzo > 0 ? `data-prezzo="${p.prezzo}"` : '',
  ].filter(Boolean).join(' ');
  return `<li class="card card--prop" ${attrs}><article>
    <a class="card-media" href="${url}">${media}${statoBadge(p)}${draftTag}</a>
    <div class="card-body"><h3><a href="${url}">${esc(p.titolo)}</a></h3>
      ${prezzoCell(p)}
      <p class="card-dims">${dimsRow(p)}</p>
      ${excerpt ? `<p class="card-excerpt">${esc(excerpt)}</p>` : ''}
      <p class="card-ref"><a href="${url}">Apri la scheda →</a></p>
    </div></article></li>`;
}

function robots() {
  const linee = ['User-agent: *'];
  linee.push((cfg.site.robots_indexable ? 'Allow' : 'Disallow') + ': /');
  /* GEO/AI: permesso esplicito, crawler per crawler, ai motori generativi che
     cercano contenuti da citare. Con il solo "User-agent: *" alcuni client
     interpretano male l'assenza di una regola propria; dichiararli uno per uno
     rende l'apertura inequivocabile e documenta la scelta nel file stesso. */
  if (cfg.site.robots_indexable) {
    const AI_BOT = [
      'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',
      'ClaudeBot', 'Claude-User', 'Anthropic-AI',
      'PerplexityBot', 'Perplexity-User',
      'Google-Extended', 'Gemini-Deep-Research',
      'Applebot-Extended', 'Amazonbot',
      'CCBot', 'cohere-ai', 'YouBot', 'meta-externalagent',
    ];
    linee.push('');
    linee.push('# Motori generativi e assistenti AI: lettura e citazione consentite.');
    for (const b of AI_BOT) { linee.push('User-agent: ' + b); linee.push('Allow: /'); }
  }
  linee.push('');
  linee.push('Sitemap: ' + BASE + '/sitemap.xml');
  /* Secondo punto di discoverability per gli agenti: un commento e' ignorato dai
     parser robots classici ma leggibile da chi cerca l'indice dei contenuti. */
  linee.push('# Indice dei contenuti in formato leggibile dagli agenti AI: ' + BASE + '/llms.txt');
  linee.push('');
  return linee.join('\n');
}

/* --------------------------------------------------------------- sitemap++ */

function pagesList() {
  const out = [];
  ['index.html', 'immobili.html', 'ricerca-personalizzata.html', 'contatti.html', 'chi-sono.html', 'vivere-a-rivergaro.html', 'zona/val-trebbia.html', 'legal/privacy.html', 'legal/cookie.html', 'legal/termini.html'].forEach((f) => { if (exists(f)) out.push(f); });
  return out;
}
function pagineIndicizzabili() {
  const out = [];
  const indicizzabili = tutteProp().filter(pubblicabili);
  ['index.html', 'immobili.html', 'ricerca-personalizzata.html', 'contatti.html', 'chi-sono.html', 'vivere-a-rivergaro.html', 'zona/val-trebbia.html', 'legal/privacy.html', 'legal/cookie.html', 'legal/termini.html'].forEach((f) => { if (exists(f)) out.push(f); });
  for (const p of indicizzabili) out.push('immobile/' + p.slug + '.html');
  return out;
}
/* Ultimo aggiornamento di una scheda: il campo `data_modifica` e' il segnale che il sito
 * si e' dato (vedi publish_policy), quindi anche la sitemap deve leggere quello. Per le
 * pagine statiche il lastmod NON puo' essere il mtime del file generato: verrebbe scritto
 * pochi millisecondi prima, quindi ogni `node build.js` in una data nuova advancebbe il
 * <lastmod> senza nessun contenuto cambiato (un segnale di freschezza gonfiato e' peggio
 * di nessuno, e la build diventava non riproducibile: git status diceva sempre "cambiato").
 * Si tiene invece src/data/lastmod.json: per ogni pagina l'hash del contenuto renderizzato
 * e la data dell'ULTIMO cambiamento reale. Se l'hash non cambia, la data non si tocca. */
const LASTMOD_FILE = path.join(SRC, 'data', 'lastmod.json');
let lastmodStore = readJson(LASTMOD_FILE, null) || {};
function contentHash(s) { return crypto.createHash('sha1').update(String(s), 'utf8').digest('hex').slice(0, 16); }
function touchLastmod(key, html) {
  const today = new Date().toISOString().slice(0, 10);
  const h = contentHash(html);
  const rec = lastmodStore[key];
  if (!rec || rec.hash !== h) lastmodStore[key] = { hash: h, data: today };
  return lastmodStore[key].data;
}
function saveLastmod() {
  const prev = readJson(LASTMOD_FILE, null);
  const next = JSON.stringify(lastmodStore, null, 2) + '\n';
  if (prev && JSON.stringify(prev, null, 2) + '\n' === next) return false;
  fs.writeFileSync(LASTMOD_FILE, next);
  return true;
}
function ultimaModifica(f0) {
  const m = f0.match(/^immobile\/([a-z0-9-]+)\.html$/);
  if (m) {
    const p = (JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'properties.json'), 'utf8')).immobili || [])
      .find((x) => x.slug === m[1]);
    if (p && p.data_modifica) return p.data_modifica;
  }
  const rec = lastmodStore[f0];
  if (rec && rec.data) return rec.data;
  return new Date().toISOString().slice(0, 10);
}

function sitemap() {
  const mods = pagineIndicizzabili().map((f0) => { const f = f0 === 'index.html' ? '' : f0;
    const last = ultimaModifica(f0);
    return `  <url>\n    <loc>${BASE}/${f}</loc>${last ? `\n    <lastmod>${last}</lastmod>` : ''}\n    <changefreq>${f.startsWith('immobile') ? 'weekly' : 'monthly'}</changefreq>\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${mods.join('\n')}\n</urlset>\n`;
}
function llms() {
  const elencoLlms = tutteProp().filter(pubblicabili);
  const L = [];
  L.push('# Annunci immobiliari a Rivergaro — ' + cfg.site.dominio, '');
  L.push('> Una proposta immobiliare a Rivergaro, con informazioni pubblicate solo quando disponibili e confermate.', '');
  /* llms.txt: gli stessi dati NAP e anagrafici che il sito mostra in footer, cosi' un
     motore generativo che cita lo studio non deve indovinarli ne' copiarli da un altro
     dominio dell'ecosistema (che dichiara una sede diversa). */
  L.push('## Chi risponde e dove');
  L.push('- Professionista: ' + pro.nome_completo + ' — Agente immobiliare a Rivergaro e Val Trebbia, consulente per gli acquirenti');
  L.push('- Impresa: ' + (pro.denominazione_legale || pro.forma_legale || pro.nome_completo));
  /* Sede pubblica: solo il comune (decisione di Davide 10/11/2026, come il footer). */
  if (addr) L.push('- Sede: ' + addr.localita + ' (' + addr.provincia + ')');
  L.push('- Telefono: ' + pro.telefono_display);
  L.push('- WhatsApp: ' + pro.telefono_display);
  L.push('- Email: ' + pro.email);
  if (isConfirmed(pro.partita_iva)) L.push('- Partita IVA: ' + pro.partita_iva);
  if (isConfirmed(pro.rea)) L.push('- REA: ' + pro.rea);
  if (isConfirmed(pro.iscrizione_ruolo)) L.push('- Iscrizione al ruolo: ' + pro.iscrizione_ruolo);
  L.push('', '## Zona');
  /* Area coperta: l'elenco deciso da Davide il 10/11/2026, con i CAP, identico a
     quello del profilo pubblico dell'attivita': un motore generativo che risponde
     "in quali comuni lavora?" deve leggere qui la stessa lista che trova altrove. */
  const area = (cfg.area_servizio.area_coperta_servizio || []).filter((x) => x && x.nome);
  L.push('- Area coperta dal servizio: ' + area.map((x) => x.nome + (x.cap ? ' (' + x.cap + ')' : '') + (x.provincia ? ' ' + x.provincia : '')).join('; ') + '.');
  L.push('- La Val Trebbia nel nome del sito è un riferimento geografico, non una dichiarazione di copertura dell’intera valle.', '');
  /* Territorio: gli stessi fatti della pagina /vivere-a-rivergaro.html, cosi' un motore
     generativo che risponde a «com'è vivere a Rivergaro?» cita noi e non un portale.
     La sezione compare solo se la pagina esiste davvero. */
  if (exists('vivere-a-rivergaro.html')) {
    L.push('## Territorio');
    L.push('- Pagina: [Vivere a Rivergaro e in Val Trebbia](' + BASE + '/vivere-a-rivergaro.html)');
    L.push('- Servizi in paese: polo scolastico di via Alberoni (nido, infanzia, primaria, media), asilo nido Sole e Luna, medicina di gruppo, farmacia Andena e farmacia di Niviano, biblioteca comunale, ufficio postale, pubblica assistenza, casa residenza anziani Villa Verde, palazzetto dello sport, tennis e padel.');
    L.push('- Contesto: fiume Trebbia con spiagge e meandri, Parco regionale del Trebbia, prime colline; la statale 45 sale ai borghi (Travo, Bobbio con il Ponte Gobbo e l’abbazia di San Colombano del 614) e ai castelli di Rivalta, Statto e Ancarano.');
    L.push('- Distanze: Piacenza una quindicina di chilometri (misura di Davide); tra comuni Vigolzone 5,5 km, Travo 6,7 km, Gazzola 6,8 km, Podenzano 8,6 km; il centro di Rivergaro dista circa 2,5 km da Ancarano.', '');
  }
  /* Le pagine vanno scritte come link Markdown [testo](url): l'audit Lighthouse
     `llms-txt` di «Navigazione agentica» controlla H1, almeno un link e lunghezza
     minima, e un URL nudo non conta come link. Le pagine elencate devono esistere. */
  const pagine = [
    ['index.html', 'Home: case in vendita a Rivergaro e Val Trebbia'],
    ['immobili.html', 'Catalogo degli immobili disponibili'],
    ['contatti.html', 'Contatti diretti'],
    ['chi-sono.html', 'Chi sono'],
    ['vivere-a-rivergaro.html', 'Vivere a Rivergaro e in Val Trebbia: servizi, distanze, tempo libero'],
  ].filter(([f]) => exists(f));
  if (pagine.length) {
    L.push('## Pagine');
    pagine.forEach(([f, t]) => L.push(`- [${t}](${BASE}/${f === 'index.html' ? '' : f})`));
    L.push('');
  }
  L.push('## Immobili pubblicati');
  if (!elencoLlms.length) L.push('Nessun immobile pubblicato al momento.');
  else elencoLlms.forEach((p) => {
    const details = [[p.zona, p.comune].filter(Boolean).join(', '), p.tipologia, p.unita_abitative ? p.unita_abitative + ' unità abitative' : null, p.vani ? p.vani + ' vani' : null].filter(Boolean);
    L.push(`- [${p.titolo}](${BASE}/immobile/${p.slug}.html) — ${details.join(' · ')}`);
    if (p.descrizione) L.push('  ' + p.descrizione);
    /* Le unita' con i dati verificati (m², rendita catastale, classe APE) sono il dato
       piu' citabile per un motore generativo: e' quello che i portali non hanno. */
    (p.unita || []).forEach((u) => {
      const bits = [];
      if (u.mq) bits.push(u.mq + ' m²');
      if (u.rendita_catastale) bits.push('rendita catastale ' + String(u.rendita_catastale).replace('.', ',') + ' €');
      if (u.ape_classe) bits.push('APE ' + u.ape_classe + (u.ape_indice ? ' · ' + String(u.ape_indice).replace('.', ',') + ' kWh/m² anno' : ''));
      if (bits.length) L.push('  - ' + (u.nome || u.id || 'Unità') + ': ' + bits.join(' · '));
    });
    if (typeof p.prezzo !== 'number') L.push('  - Prezzo: riservato — te lo dice Davide al telefono, ' + pro.telefono_display + '.');
  });
  if (isConfirmed(cfg.contatti_sezione.orari)) L.push('', '## Orari di apertura', cfg.contatti_sezione.orari, '');
  const qa = homeFaq();
  if (qa.length) { L.push('', '## Domande rapide'); qa.forEach((x) => { L.push('**' + x.d + '**'); L.push(x.r); L.push(''); }); }
  L.push('', 'Non sono pubblicati prezzi né superfici non confermati. Le immagini sono mostrate solo quando vengono fornite foto reali dell’immobile.');
  return L.join('\n') + '\n';
}

/* -------------------------------------------------------------------- main */

const PAGES = [
  { path: 'index.html', source: 'home.md', title: cfg.site.titolo_home, description: cfg.site.description_home, canonical: '/', jsonld: 'site', person: true, nav: ['immobili', 'proposta', 'vivere', 'contatti', 'chi-sono'] },
  { path: 'contatti.html', source: 'contatti.md', nav_id: 'contatti-diretti', title: 'Contatti — Davide Scaglia, agente immobiliare a Rivergaro', description: 'Telefono, WhatsApp ed email di Davide Scaglia, agente immobiliare a Rivergaro: contatti diretti per visite, informazioni e ricerca personalizzata in Val Trebbia.', canonical: '/contatti.html', jsonld: 'site', person: true, breadcrumb: 'Contatti', nav: ['immobili', 'ricerca', 'vivere', 'contatti'] },
  { path: 'chi-sono.html', source: 'chi-sono.md', nav_id: 'chi-sono', title: 'Chi sono — Davide Scaglia, agente immobiliare a Rivergaro', description: 'Davide Scaglia, agente immobiliare a Rivergaro dal 2007. Come lavoro con chi compra casa in Val Trebbia: sede, qualifiche e contatti diretti.', canonical: '/chi-sono.html', jsonld: 'site', person: true, breadcrumb: 'Chi sono', nav: ['immobili', 'ricerca', 'vivere', 'contatti', 'chi-sono'] },
  /* Pagina di territorio decisa da Davide il 09/11/2026: niente case e niente prezzi,
     solo servizi, distanze e vita quotidiana verificati — il contenuto che i portali
     non hanno e che motori e AI citano quando qualcuno chiede com'è vivere qui. */
  { path: 'vivere-a-rivergaro.html', source: 'vivere-rivergaro.md', title: 'Vivere a Rivergaro: servizi e territorio | Davide Scaglia', description: 'Come si vive a Rivergaro: servizi, scuole, sanità, sport, il Trebbia e i borghi vicini, con le distanze vere. Racconto di chi ci lavora dal 2007.', canonical: '/vivere-a-rivergaro.html', jsonld: 'site', breadcrumb: 'Vivere a Rivergaro', nav: ['immobili', 'ricerca', 'contatti', 'chi-sono'] },
  { path: 'grazie.html', source: 'grazie.md', title: 'Richiesta inviata — Davide Scaglia', description: 'Richiesta inviata a Davide Scaglia, agente immobiliare a Rivergaro: ti ricontatto appena possibile.', canonical: '/grazie.html', jsonld: 'none', nav: [], noindex: true },
  { path: 'legal/privacy.html', source: 'privacy.md', title: 'Privacy Policy | ' + cfg.site.dominio, canonical: '/legal/privacy.html', jsonld: 'none', nav: [] },
  { path: '404.html', source: '404.md', title: 'Pagina non trovata | comprarecasarivergaro.it', description: 'La pagina cercata non esiste. Torna alla home o apri il catalogo degli immobili disponibili a Rivergaro e in Val Trebbia.', canonical: '/404.html', jsonld: 'none', nav: [], noindex: true },
  { path: 'legal/cookie.html', source: 'cookie.md', title: 'Cookie Policy | ' + cfg.site.dominio, canonical: '/legal/cookie.html', jsonld: 'none', nav: [] },
];

/** Il campo `generato` non deve cambiare a ogni build: senza dati nuovi il file
 *  resta byte-per-byte identico, cosi' `git status` dopo un `node build.js` dice solo
 *  se e' cambiato qualcosa di vero (era l'unico rumore fisso nelle diff di verifica). */
function writeManifest(s) {
  const file = path.join(ROOT, 'img', 'manifest.json')
  const senza = (o) => { const c = Object.assign({}, o); delete c.generato; return JSON.stringify(c) }
  if (fs.existsSync(file)) {
    try {
      const prev = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (senza(prev) === senza(s)) s = Object.assign({}, s, { generato: prev.generato })
    } catch (e) { /* manifesto corrotto: si sovrascrive con un timestamp nuovo */ }
  }
  fs.writeFileSync(file, JSON.stringify(s, null, 2))
}

function main() {
  const argv = process.argv.slice(2);
  const mode = argv.find((a) => !a.startsWith('--'));

  if (mode === 'media') {
    const s = mediaScan();
    writeManifest(s);
    fs.writeFileSync(path.join(ROOT, 'MEDIA_RAPPORTO.md'), mediaReport(s));
    const n = buildDraft();
    console.log(`media: ${s.items.length} file, ${Object.keys(s.byProp).length} immobili, ${s.warnings.length} avvisi, bozza sched: ${n} immobile/i in src/data/properties.draft.json`);
    s.warnings.forEach((w) => console.log('  ! ' + w));
    return;
  }

  if (!exists('img')) fs.mkdirSync(path.join(ROOT, 'img'));
  const soloCheck = argv.includes('--check') && !argv.includes('--force');
  if (soloCheck) { runCheck(); return; }
  refreshMediaCache();
  // dati pubblici per i filtri client-side (la pagina catalogo si genera dopo le altre pagine)
  /* ItemList del catalogo: l'elenco strutturato delle schede pubblicate, con
     posizione e URL. Ai motori dice quant'e' profonda l'offerta e collega la
     pagina elenco alle schede senza ambiguita'. */
  const itemList = {
    '@type': 'ItemList',
    name: 'Immobili in vendita a Rivergaro e in Val Trebbia',
    url: BASE + '/immobili.html',
    numberOfItems: catalogo().length,
    itemListElement: catalogo().map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.titolo, url: BASE + '/immobile/' + p.slug + '.html' })),
  };
  const catHtml = '<!doctype html>\n<html lang="' + LANG + '">\n<head>\n  ' + head({ title: 'Immobili a Rivergaro e Val Trebbia | Davide Scaglia', description: 'Case e ville in vendita a Rivergaro e in Val Trebbia, con schede verificate: dati, foto reali e documenti controllati. Filtri per zona e tipologia.', path: 'immobili.html', canonical: '/immobili.html', jsonld: 'site', breadcrumb: 'Immobili', jsonld_extra: [itemList] }) + '\n</head>\n<body>\n  <a class="skip" href="#contenuto">Vai al contenuto</a>\n' + fill(readIf(path.join(SRC, 'templates', 'header.html'), ''), '', { nav: ['immobili', 'ricerca', 'vivere', 'contatti'], path: 'immobili.html' }) + '\n  <main id="contenuto">\n' + catalogoPage() + '\n  </main>\n' + fill(readIf(path.join(SRC, 'templates', 'footer.html'), ''), '', { nav: [], path: 'immobili.html' }) + '\n' + fill(readIf(path.join(SRC, 'templates', 'cookie-banner.html'), ''), '', {}) + '\n  <script src="js/main.js" defer></script>\n</body>\n</html>\n';
  fs.mkdirSync(path.join(OUT, 'data'), { recursive: true });
  const pubblici = catalogo().map((p) => ({
    slug: p.slug, titolo: p.titolo, stato: p.stato, tipologia: p.tipologia || null,
    comune: p.comune || null, zona: p.zona || null, prezzo: typeof p.prezzo === 'number' ? p.prezzo : null,
    superficie: p.superficie || null, locali: p.locali || null, data_modifica: p.data_modifica || null,
    immagini: (p.immagini || []).filter(Boolean).length, url: '/immobile/' + p.slug + '.html',
  }));
  /* come il manifesto media: senza dati nuovi il file resta identico, cosi' la data
     `generato` non dice "oggi" quando oggi non e' cambiato niente */
  const pubFile = path.join(OUT, 'data', 'properties.json');
  const pubPrev = readJson(pubFile, null);
  let gen = new Date().toISOString().slice(0, 10);
  if (pubPrev && JSON.stringify(pubPrev.immobili) === JSON.stringify(pubblici) && pubPrev.generato) gen = pubPrev.generato;
  fs.writeFileSync(pubFile, JSON.stringify({ generato: gen, immobili: pubblici }, null, 2) + '\n');
  for (const p of schedaPagine()) {
    const page = {
      path: 'immobile/' + p.slug + '.html', source: null, immobile: p,
      /* titolo SEO: se Davide ne scrive uno suo (`titolo_seo`) vince quello, altrimenti
         il titolo della scheda tagliato a parola + suffisso di brand, entro 60 caratteri
         (prima era 85: troncato in SERP) */
      title: p.titolo_seo ? p.titolo_seo : pageTitle(p.titolo || 'Immobile'),
      description: clipMeta(p.descrizione_meta || p.descrizione || '', 155),
      canonical: '/immobile/' + p.slug + '.html',
      breadcrumb: 'Immobili',
      noindex: !!p.bozza, robots_off: !!p.bozza,
    };
    const content = schedaPage(p, 'immobile/');
    const shell = readIf(path.join(SRC, 'templates', 'layout.html'), '');
    const html = shell
      .replace('{{LANG}}', LANG)
      .replace('{{HEAD}}', head(page, 'immobile/'))
      .replace('{{HEADER}}', fill(readIf(path.join(SRC, 'templates', 'header.html'), ''), '../', { nav: ['immobili', 'ricerca', 'contatti', 'chi-sono'], path: page.path, nav_key: page.path }))
      .replace('{{CONTENT}}', content)
      .replace('{{FOOTER}}', fill(readIf(path.join(SRC, 'templates', 'footer.html'), ''), '../', { nav: [], path: page.path }))
      .replace('{{COOKIE_BANNER}}', fill(readIf(path.join(SRC, 'templates', 'cookie-banner.html'), ''), '../', {}))
      .replace('{{SCRIPT}}', `<script src="${rel(page.path, 'js/main.js')}" defer></script>`)
      .replace(/\{\{[A-Z0-9_]+\}\}/g, '');
    fs.mkdirSync(path.join(OUT, 'immobile'), { recursive: true });
    fs.writeFileSync(path.join(OUT, page.path), cleanHtml(html));
    touchLastmod(page.path, cleanHtml(html));
    console.log('✓ ' + page.path + (p.bozza ? '  [BOZZA · noindex]' : '') + ' (' + (html.length / 1024).toFixed(1) + 'KB)');
  }
  for (const p of PAGES) {
    if (!readIf(path.join(SRC, 'pages', p.source), '')) { console.warn('pagina saltata: ' + p.source); continue; }
    const html = buildPage(p);
    fs.mkdirSync(path.dirname(path.join(OUT, p.path)), { recursive: true });
    fs.writeFileSync(path.join(OUT, p.path), cleanHtml(html));
    touchLastmod(p.path, cleanHtml(html));
    console.log('✓ ' + p.path + ' (' + (html.length / 1024).toFixed(1) + 'KB)');
  }
  fs.writeFileSync(path.join(OUT, 'immobili.html'), cleanHtml(catHtml));
  touchLastmod('immobili.html', cleanHtml(catHtml));
  console.log('✓ immobili.html (' + (catHtml.length / 1024).toFixed(1) + 'KB, ' + catalogo().length + ' schede in catalogo)');
  if (saveLastmod()) console.log('✓ src/data/lastmod.json (aggiornate solo le pagine il cui contenuto e\' cambiato)');
  fs.copyFileSync(path.join(SRC, 'css', 'main.css'), path.join(OUT, 'css', 'main.css'));
  /* caratteri self-hosted: .woff2 + licenza OFL accanto ai file */
  const fontSrc = path.join(SRC, 'fonts');
  if (fs.existsSync(fontSrc)) {
    fs.mkdirSync(path.join(OUT, 'css', 'fonts'), { recursive: true });
    for (const f of fs.readdirSync(fontSrc)) fs.copyFileSync(path.join(fontSrc, f), path.join(OUT, 'css', 'fonts', f));
  }
  fs.copyFileSync(path.join(SRC, 'js', 'main.js'), path.join(OUT, 'js', 'main.js'));
  /* icone di marca: se mancano si rigenerano con  node tools/make-brand-assets.js */
  const brandSrc = path.join(SRC, 'brand');
  if (fs.existsSync(brandSrc)) {
    for (const f of fs.readdirSync(brandSrc)) {
      if (f === 'favicon.ico' || f === 'apple-touch-icon.png') fs.copyFileSync(path.join(brandSrc, f), path.join(OUT, f));
    }
  } else console.warn('⚠ manca src/brand/: esegui  node tools/make-brand-assets.js  (favicon.ico e apple-touch-icon)');
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap());
  fs.writeFileSync(path.join(OUT, 'llms.txt'), llms());
  fs.writeFileSync(path.join(OUT, 'robots.txt'), robots());
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
  fs.writeFileSync(path.join(OUT, 'CNAME'), cfg.site.dominio + '\n');
  const m = mediaScan();
  writeManifest(m);

  if (argv.includes('--check')) runCheck();
}

function runCheck() {
    let problems = 0;
    for (const f of pagesList().concat(['immobili.html', 'data/properties.json', 'css/main.css', 'js/main.js', 'sitemap.xml', 'llms.txt'])) {
      if (!exists(f)) { console.log('✗ manca ' + f); problems++; }
    }
    const pagesToCheck = pagesList().concat(schedaPagine().map((p) => 'immobile/' + p.slug + '.html')).filter((f, i, a) => a.indexOf(f) === i && exists(f));
    for (const f of pagesToCheck) {
      const s = readIf(path.join(ROOT, f), '');
      const leaks = s.match(/DA CONFERMARE/g);
      if (leaks) { console.log(`✗ ${f}: ${leaks.length} segnaposto nel markup pubblico`); problems++; }
      for (const m2 of s.matchAll(/<a [^>]*href="([^"#]+)(#[^"]*)?"/g)) {
        const h = m2[1];
        if (/^(https?:|mailto:|tel:|data:)/.test(h) || h === '') continue;
        if (!exists(path.join(path.dirname(f), h))) { console.log(`✗ ${f}: link rotto ${h}`); problems++; }
      }
      for (const m4 of s.matchAll(/<a [^>]*href="([^"]*#[^"]+)"/g)) {
        const raw = m4[1];
        if (/^(https?:|mailto:|tel:)/.test(raw)) continue;
        const anchor = raw.slice(raw.indexOf('#') + 1);
        const file = raw.slice(0, raw.indexOf('#')) || f;
        if (!exists(file)) continue;
        const ids = new Set([...readIf(path.join(ROOT, file), '').matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]));
        if (!ids.has(anchor)) { console.log('\u2717 ' + f + ': ancora senza destinazione ' + raw); problems++; }
      }
      for (const m3 of s.matchAll(/<img [^>]*src="([^"]+)"/g)) {
        if (!exists(path.join(path.dirname(f), m3[1]))) { console.log(`✗ ${f}: immagine mancante ${m3[1]}`); problems++; }
      }
      const h1 = (s.match(/<h1/g) || []).length;
      if (h1 !== 1) { console.log(`✗ ${f}: ${h1} H1 (deve essere 1)`); problems++; }
      /* Gerarchia dei titoli: nessun salto di livello (h1→h3 ecc.). Regola interna
         seo_geo.regole_geo[2]: prima il catalogo aveva un h3 figlio diretto dell'h1. */
      const livelli = [...s.matchAll(/<h([1-6])[\s>]/g)].map((x) => Number(x[1]));
      for (let i = 1; i < livelli.length; i++) {
        if (livelli[i] > livelli[i - 1] + 1) {
          console.log(`✗ ${f}: salto di gerarchia h${livelli[i - 1]} → h${livelli[i]}`);
          problems++;
          break;
        }
      }
      const nimg = [...s.matchAll(/<img [^>]*>/g)].filter((x) => !/width="\d+" height="\d+"/.test(x[0])).length;
      if (nimg) { console.log(`✗ ${f}: ${nimg} img senza width/height (rischio CLS)`); problems++; }
      /* id univoci: l'attributo id deve esserlo per documento (HTML spec, WCAG 4.1.1).
         Prima section e h2 condividevano lo stesso id (26 duplicati su 6 pagine). */
      const idsAll = [...s.matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]);
      const dupIds = [...new Set(idsAll.filter((v, i) => idsAll.indexOf(v) !== i))];
      if (dupIds.length) { console.log(`✗ ${f}: ${dupIds.length} id duplicati (${dupIds.slice(0, 4).join(', ')})`); problems++; }
      /* descrittori srcset = larghezza intrinseca REALE della risorsa: un "900w" su un
         file largo 405px fa servire foto morbide su retina e non passa la validazione. */
      for (const set of s.matchAll(/srcset="([^"]+)"/g)) {
        for (const part of set[1].split(',')) {
          const m2 = part.trim().match(/^(\S+)\s+(\d+)w$/);
          if (!m2) continue;
          const target = path.join(path.dirname(f), m2[1]);
          if (!exists(target)) continue;
          const buf = fs.readFileSync(target);
          const ext = path.extname(target).toLowerCase();
          const d = ext === '.png' ? pngSize(buf) : (ext === '.jpg' || ext === '.jpeg') ? jpegSize(buf) : ext === '.webp' ? webpSize(buf) : null;
          if (d && d.w && d.w !== Number(m2[2])) { console.log(`✗ ${f}: srcset dichiara ${m2[2]}w ma ${path.basename(m2[1])} e' larga ${d.w}px`); problems++; }
        }
      }
      /* limiti SERP: title <= 62 e description <= 165 caratteri, altrimenti troncati */
      const t = (s.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
      if (t.length > 62) { console.log(`✗ ${f}: title di ${t.length} caratteri (> 62, troncato in SERP)`); problems++; }
      const dd = (s.match(/name="description" content="([^"]*)"/) || [])[1] || '';
      if (dd.length > 165) { console.log(`✗ ${f}: description di ${dd.length} caratteri (> 165, troncata in SERP)`); problems++; }
    }
    problems += privacyGuard();
    console.log(problems ? '\n' + problems + ' problemi trovati' : '\n✓ check superato: nessun dato personale della visura, nessun segnaposto, nessun link rotto, un H1 per pagina, immagini con dimensioni esplicite');
    if (problems) process.exitCode = 1;
}
main();
