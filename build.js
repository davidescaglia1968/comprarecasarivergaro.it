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

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = ROOT;
const PLACEHOLDER = 'DA CONFERMARE';

const readIf = (p, fb) => { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return fb; } };
const readJson = (p, fb) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } };
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const isConfirmed = (v) => v !== null && v !== undefined && v !== '' && String(v).trim() !== PLACEHOLDER;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cleanHtml = (s) => s.replace(/[ \t]+\n/g, '\n');
const abs = (base, p) => (typeof p === 'string' && /^https?:\/\//.test(p) ? p : base + p);
const rel = (from, to) => {
  if (/^https?:\/\//.test(to)) return to;
  const fromDir = path.posix.dirname(from);
  let r = path.posix.relative(fromDir === '.' ? '' : fromDir, to);
  return r || to;
};

/* ------------------------------------------------------------------ config */

const cfg = readJson(path.join(SRC, 'data', 'site-config.json'), null);
if (!cfg) { console.error('Manca src/data/site-config.json'); process.exit(1); }
const props = readJson(path.join(SRC, 'data', 'properties.json'), null);
const BASE = cfg.site.url_canonica_base.replace(/\/$/, '');
const LANG = cfg.site.lingua || 'it-IT';
const year = new Date().getFullYear();

const pro = cfg.professionista;
const addr = isConfirmed(pro.indirizzo_studio) ? pro.indirizzo_studio : null;
const addressObj = addr
  ? {
      '@type': 'PostalAddress',
      streetAddress: addr.street,
      addressLocality: addr.localita,
      postalCode: addr.cap,
      addressRegion: addr.provincia,
      addressCountry: addr.paese || 'IT',
    }
  : undefined;

function siteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [{
      '@type': 'WebSite',
      '@id': BASE + '/#website',
      name: 'Immobili a Rivergaro',
      url: BASE + '/',
      inLanguage: LANG,
    }],
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
  if (imgs.length) o.image = imgs.map((i) => BASE + '/img/' + p.slug + '/' + i);
  const addr = { '@type': 'PostalAddress' };
  if (p.zona) addr.streetAddress = p.zona;
  if (p.comune) addr.addressLocality = p.comune;
  if (cfg.area_servizio && cfg.area_servizio.provincia) addr.addressRegion = cfg.area_servizio.provincia;
  addr.addressCountry = 'IT';
  if (p.cap) addr.postalCode = p.cap;
  o.address = addr;
  const offer = { '@type': 'Offer' };
  const hasPrice = typeof p.prezzo === 'number' && p.prezzo > 0;
  if (hasPrice) { offer.price = String(p.prezzo); offer.priceCurrency = 'EUR'; }
  const map = cfg.seo_geo.jsonld.offers_schema || {};
  const av = p.stato === 'Disponibile' ? map.disponibile : p.stato === 'In trattativa' ? map.in_trattativa : map.chiuso;
  if (hasPrice && av) offer.availability = av;
  if (p.data_pubblicazione) offer.validFrom = p.data_pubblicazione;
  if (hasPrice && Object.keys(offer).length > 1) o.offers = offer;
  if (p.stato === 'Venduto') o.usedProd = { '@type': 'Product', name: 'immobile venduto' };
  if (p.superficie) o.floorSize = { '@type': 'QuantitativeValue', value: p.superficie, unitCode: 'MTK' };
  if (p.locali) o.numberOfRooms = p.locali;
  if (p.anno_costruzione) o.yearBuilt = String(p.anno_costruzione);
  if (p.lat && p.lng) o.geo = { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng };
  o.areaServed = { '@type': 'City', name: p.comune || cfg.area_servizio.comune_principale };
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

function slugify(t) {
  return String(t).replace(/<\/?[^>]+>/g, '').toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');
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

    if (/^<\/?(div|section|table|ul|ol|li|p|figure|aside|details|summary|thead|tbody|tr|th|td|h[1-4])[\s>]/.test(line)) {
      flushAll(); html.push(line); continue;
    }

    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      flushAll();
      const lvl = m[1].length;
      const text = m[2];
      html.push('<h' + lvl + ' id="' + slugify(text) + '">' + inline(text) + '</h' + lvl + '>');
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
   stessa struttura visiva in tutte le pagine, id = id del titolo (accessibile da nav). */
function wrapSections(content) {
  if (!content.trim()) return content;
  const parts = content.split(/(?=<h2 )/);
  let first = parts[0] || '';
  const rest = parts.slice(1);
  let out = '';
  if (first.trim()) out += first.trim() + '\n';
  rest.forEach((chunk, idx) => {
    const m = chunk.match(/<h2 id="([^"]+)"/);
    const id = m ? m[1] : 'sezione-' + (idx + 1);
    out += '<section class="section' + (idx % 2 ? ' section--alt' : '') + '" id="' + id + '"><div class="wrap">\n' + chunk.trim() + '\n</div></section>\n';
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
    o = Object.assign({ eyebrow: '', h1: '', lead: [], cta: 'Scopri la villa' }, o);
    const wa = String(pro.whatsapp || pro.telefono_e164 || '').replace(/\D/g, '');
    return `<section class="hero hero--listing" id="top"><div class="wrap hero-grid">
      <div class="hero-copy">
        ${o.eyebrow ? `<p class="eyebrow">${inline(o.eyebrow)}</p>` : ''}
        <h1>${inline(o.h1)}</h1>
        ${o.lead && o.lead.length ? `<div class="lead">${o.lead.map((p) => '<p>' + inline(p) + '</p>').join('')}</div>` : ''}
        <div class="cta-row"><a class="btn btn-primary" href="#immobile-in-evidenza">${esc(o.cta)}</a><a class="btn btn-ghost" href="https://wa.me/${attr(wa)}" target="_blank" rel="noopener noreferrer">Scrivimi su WhatsApp</a><a class="hero-email-link" href="mailto:${attr(pro.email)}">${esc(pro.email)}</a></div>
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
      : `<a class="section-more" href="#la-villa-non-fa-per-te">Nel frattempo: chiamami e ti dico cosa si muove in valle</a>`;
    if (!list.length) {
      return `<div class="empty-state"><p>${inline(o.empty)}</p><a class="btn btn-primary" href="#la-villa-non-fa-per-te">${esc(cfg.contatti_sezione.cta_principale)}</a></div>${link}`;
    }
    return `<ul class="grid-cards">${list.map((p) => cardImmobile(p, 'index.html')).join('')}</ul>`;
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
      return `<div class="empty-state"><p>Le guide per chi compra sono in preparazione: le pubblico solo quando ho contenuto scritto da me, non testi generici.</p><a class="btn btn-ghost" href="#la-villa-non-fa-per-te">Chiedimi direttamente quello che vuoi sapere</a></div>`;
    }
    return `<ul class="grid-cards grid-cards--editorial">${g.map((x) => `<li class="card card--text"><h3><a href="${rel('','guide/'+x.slug+'.html')}">${esc(x.titolo)}</a></h3><p>${inline(x.anteprima||'')}</p></li>`).join('')}</ul>`;
  },
  sito_madre_cta() {
    const m = cfg.ecosistema.sito_madre;
    return `<aside class="cross-cta"><div><p class="cross-cta-k">Se invece devi vendere</p><p class="cross-cta-t">Su ${esc(m.nome)} trovi il percorso per chi mette in vendita casa, nella stessa zona e con lo stesso metodo.</p></div><a class="btn btn-outline" href="${attr(m.url)}" rel="noopener">vai su ${esc(m.nome)}</a></aside>`;
  },
  contatti_card() {
    const albo = pro.qualifica_albo && isConfirmed(pro.qualifica_albo.iscrizione)
      ? `<li><span class="k">Qualifica</span><span class="v">${esc(pro.qualifica_albo.sezione)} — ruolo di Piacenza, iscritto dal ${esc(pro.qualifica_albo.iscrizione)}</span></li>` : '';
    const pec = isConfirmed(pro.pec) ? `<li><span class="k">PEC</span><span class="v"><a href="mailto:${attr(pro.pec)}">${esc(pro.pec)}</a></span></li>` : '';
    return `<div class="contact-card">
      <ul class="contact-list">
        <li><span class="k">Chi</span><span class="v">${esc(pro.nome_completo)} — ${esc(pro.ruolo)}</span></li>
        <li><span class="k">Telefono e WhatsApp</span><span class="v"><a href="tel:${attr(pro.telefono_e164)}">${esc(pro.telefono_display)}</a></span></li>
        <li><span class="k">Email</span><span class="v"><a href="mailto:${attr(pro.email)}">${esc(pro.email)}</a></span></li>
        ${addr ? `<li><span class="k">Studio</span><span class="v">${esc(addr.street)}, ${esc(addr.cap)} ${esc(addr.localita)} (${esc(addr.provincia)})${addr.frazione ? ' — fraz. ' + esc(addr.frazione) : ''}</span></li>` : ''}
        ${isConfirmed(cfg.contatti_sezione.orari) ? `<li><span class="k">Orari</span><span class="v">${esc(cfg.contatti_sezione.orari)}</span></li>` : ''}
        ${isConfirmed(pro.partita_iva) ? `<li><span class="k">Dati aziendali</span><span class="v">P.IVA ${esc(pro.partita_iva)} · REA ${esc(pro.rea)}${isConfirmed(pro.pec) ? ' · PEC ' + esc(pro.pec) : ''}</span></li>` : ''}
        ${albo}
      </ul>
      <div class="contact-social">${socialList()}</div>
    </div>`;
  },
  risposte_pronte(o) {
    return `<div class="faq">${o.items.map((it, i) => `<div class="faq-item"><h3>${inline(it.d)}</h3><p>${inline(it.r)}</p></div>`).join('')}</div>`;
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
function galleria(p) {
  const imgs = (p.immagini || []).filter(Boolean);
  if (!imgs.length) {
    return `<figure class="media-empty"><div class="media-empty-box"><span class="media-empty-ico" aria-hidden="true">◻</span><strong>Nessuna foto pubblicata</strong><p>Le immagini di questo immobile non sono ancora state scelte. Appena arrivano, la galleria e l'immagine principale si compilano da sole da <code>img/${esc(p.slug)}/</code>, con le dimensioni vere lette dal file.</p></div></figure>`;
  }
  const [prima, ...altre] = imgs;
  const meta = imgMeta(p.slug, prima) || {};
  const fig = (f, i, eager) => {
    const m = imgMeta(p.slug, f) || {};
    const w = m.width || 1200, h = m.height || 800;
    const src = 'img/' + p.slug + '/' + f;
    return `<a class="shot" href="${src}" data-lightbox="${attr(p.slug)}" data-caption="${attr((p.titolo || '') + ' — foto ' + (i + 1) + ' di ' + imgs.length)}"><img src="${src}" alt="${attr((p.tipologia || 'Immobile') + ' ad ' + (p.zona || p.comune || '') + ', foto ' + (i + 1))}" width="${w}" height="${h}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy" decoding="async"'}></a>`;
  };
  return `<div class="gallery" role="group" aria-label="Galleria fotografica">
    <div class="gallery-hero">${fig(prima, 0, true)}${statoBadge(p)}</div>
    ${altre.length ? `<div class="gallery-strip">${altre.map((f, i) => fig(f, i + 1, false)).join('')}</div>` : ''}
  </div>`;
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
        <p class="field field-check"><label for="i-privacy"><input id="i-privacy" type="checkbox" name="privacy" value="si" required> Ho letto l'<a href="${rel(prefix, 'legal/privacy.html')}">informativa privacy</a> e acconsento al trattamento dei dati per essere ricontattato su questo immobile.</label></p>
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
  const geo = (p.descrizione || '').slice(0, 200);
  const resto = (p.descrizione || '').slice(200).trim();
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
      ${galleria(p)}
      ${bozza}
      <section class="prop-desc"><h2 id="descrizione">L'immobile</h2>
        <p class="prop-answer">${esc(geo)}</p>
        ${resto ? '<p>' + esc(resto) + '</p>' : ''}
      </section>
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
        <a class="btn btn-outline btn-sm" href="${rel(prefix + 'immobile/' + p.slug + '.html', 'index.html')}#la-villa-non-fa-per-te">Ricerca personalizzata</a>
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
      + '<h1>Immobili a Rivergaro</h1>'
      + '<p class="muted">Le proposte pubblicate riguardano Rivergaro. In questo momento non ci sono schede con dati completi da pubblicare: è una scelta di metodo, non un\'assenza di case in zona.</p>'
      + '<div class="empty-state"><p>Se mi dici cosa cerchi, la ricerca parte oggi e ti contatto quando trovo qualcosa di coerente — anche prima che finisca in vetrina.</p><a class="btn btn-primary" href="index.html#la-villa-non-fa-per-te">' + esc(cfg.contatti_sezione.cta_principale) + '</a></div>'
      + '<p class="draft-note">Schede in bozza (non indicizzate, solo per te): ' + tutteProp().filter((p) => p.bozza).map((p) => `<a href="immobile/${esc(p.slug)}.html">${esc(p.slug)}</a>`).join(', ') + '</p>'
      + '</div></section>';
  }
  return '<section class="section"><div class="wrap">'
    + '<h1>Immobili a Rivergaro</h1>'
    + '<p class="muted">Ogni scheda pubblicata qui è una scheda verificata: i dati che non ho in mano non vengono scritti, nemmeno come "circa".</p>'
    + filterBar(list)
    + '<ul class="grid-cards" id="catalogo">' + list.map((p) => cardImmobile(p, 'immobili.html')).join('') + '</ul>'
    + '<div class="catalog-cta"><p>Ti serve qualcosa che qui non c\'è?</p><a class="btn btn-outline" href="index.html#la-villa-non-fa-per-te">' + esc(cfg.contatti_sezione.cta_principale) + '</a></div>'
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

function head(page, prefix) {
  const c = [];
  const title = page.title || cfg.site.titolo_home;
  if (page.robots_off) page.noindex = true;
  const desc = page.description || cfg.site.description_home;
  const url = BASE + '/' + (page.canonical || '').replace(/^\//, '');
  c.push('<meta charset="utf-8">');
  c.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  c.push(`<title>${esc(title)}</title>`);
  c.push('<meta name="description" content="' + attr(desc) + '">');
  if (page.noindex || page.robots_off || !cfg.site.robots_indexable) c.push('<meta name="robots" content="noindex, nofollow">');
  else c.push('<meta name="robots" content="index, follow">');
  c.push('<meta name="author" content="Immobili a Rivergaro">');
  c.push(`<meta name="theme-color" content="${attr(cfg.site.theme_color)}">`);
  c.push('<link rel="canonical" href="' + attr(url) + '">');
  c.push('<meta property="og:type" content="' + (page.immobile ? 'article' : 'website') + '">');
  c.push('<meta property="og:site_name" content="' + attr(cfg.site.dominio) + '">');
  c.push('<meta property="og:locale" content="it_IT">');
  c.push('<meta property="og:url" content="' + attr(url) + '">');
  c.push('<meta property="og:title" content="' + attr(title) + '">');
  c.push('<meta property="og:description" content="' + attr(desc) + '">');
  if (isConfirmed(cfg.seo_geo.og_image)) c.push('<meta property="og:image" content="' + attr(abs(BASE, '/' + cfg.seo_geo.og_image)) + '">');
  c.push('<meta name="twitter:card" content="' + attr(cfg.seo_geo.twitter_card) + '">');
  if (page.description) c.push('<meta name="keywords" content="' + attr((cfg.site.keywords || []).join(', ')) + '">');
  c.push('<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 rx=%227%22 fill=%22%230a0a0a%22/%3E%3Cpath d=%22M4 14L16 4l12 10v14H4z%22 fill=%22none%22 stroke=%22%23d4a520%22 stroke-width=%222%22/%3E%3C/svg%3E">');
  c.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
  c.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
  c.push('<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&amp;family=Inter:wght@400;500;600&amp;display=swap" rel="stylesheet">');
  c.push('<link rel="stylesheet" href="' + rel(page.path || 'index.html', 'css/main.css') + '">');
  if (page.critical_css && exists(page.critical_css)) c.push('<style>' + readIf(path.join(ROOT, page.critical_css), '') + '</style>');
  let ld;
  if (page.immobile) ld = { '@context': 'https://schema.org', '@graph': [listingJsonLd(page.immobile), { '@type': 'WebSite', '@id': BASE + '/#website', name: cfg.site.dominio, url: BASE + '/' }] };
  else if (page.jsonld === 'none') ld = null;
  else ld = siteJsonLd();
  if (page.breadcrumb) ld['@graph'].push({ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: BASE + '/' }, { '@type': 'ListItem', position: 2, name: page.breadcrumb }] });
  if (page.faq) {
    ld['@graph'].push({
      '@type': 'FAQPage',
      mainEntity: page.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  if (ld) c.push('<script type="application/ld+json">\n' + JSON.stringify(ld, null, 1) + '\n</script>');
  return c.join('\n  ');
}

function buildPage(page) {
  const prefix = page.path.includes('/') ? '../' : '';
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
    .replace('{{FOOTER}}', footer)
    .replace('{{COOKIE_BANNER}}', banner)
    .replace('{{PREFIX}}', prefix)
    .replace('{{P0}}', page.path.includes('/') ? '../' : '')
    .replace('{{SCRIPT}}', `<script src="${rel(page.path, 'js/main.js')}" defer></script>`);
  return out;
}

function fill(tpl, prefix, page) {
  page = page || {};
  if (!page.path) page.path = 'index.html';
  const nav = (page.nav || ['immobili', 'ricerca', 'zona', 'guide', 'contatti']);
  const labels = { proposta: 'Immobile', richiesta: 'Contatti', ricerca: 'Se cerchi altro', immobili: 'Immobili', zona: 'Zone', guide: 'Guide', contatti: 'Contatti' };
  const links = nav
    .map((k) => {
      const target = { proposta: '#immobile-in-evidenza', richiesta: '#la-villa-non-fa-per-te', ricerca: '#la-villa-non-fa-per-te', immobili: 'immobili.html', zona: '#zona', guide: '#guide', contatti: 'index.html#la-villa-non-fa-per-te' }[k];
      if (k === 'immobili' && !exists('immobili.html')) return `<a href="#immobili">${labels[k]}</a>`;
      if (!target) return '';
      const href = target.startsWith('#') ? target : target.includes('#') ? rel(page.path, target.split('#')[0]) + '#' + target.split('#').slice(1).join('#') : exists(target) ? rel(page.path, target) : '#immobili';
      return `<a href="${href}">${labels[k]}</a>`;
    })
    .join('\n        ');
  const map = {
    NAV: links,
    BRAND: 'Rivergaro',
    BRAND_FULL: 'Immobili a Rivergaro',
    BRAND_MARK: '⌂',
    CLAIM: 'Case in vendita',
    TEL: attr(pro.telefono_e164),
    TEL_LABEL: esc(pro.telefono_display),
    EMAIL: attr(pro.email),
    YEAR: String(year),
    FOOTER_NAV: footerNav(prefix, page),
    NAP: page.path.startsWith('legal/') ? napText()
      : `<a href="tel:${attr(pro.telefono_e164)}">Telefono: ${esc(pro.telefono_display)}</a> · <a href="https://wa.me/${attr(String(pro.whatsapp || pro.telefono_e164).replace(/\D/g, ''))}" target="_blank" rel="noopener noreferrer">WhatsApp</a> · <a href="mailto:${attr(pro.email)}">${esc(pro.email)}</a>`,
    SOCIAL: '',
    PREFIX: prefix,
    P0: prefix,
  };
  return tpl.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m0, k) => (map[k] !== undefined ? map[k] : m0));
}
function napText() {
  const parts = [pro.denominazione_legale ? 'Immobiliare Scaglia di Scaglia Davide' : pro.brand];
  if (addr) parts.push(addr.street + ', ' + addr.cap + ' ' + addr.localita + ' (' + addr.provincia + ')' + (addr.frazione ? ', fraz. ' + addr.frazione : ''));
  parts.push(pro.telefono_display);
  parts.push(pro.email);
  return parts.map(esc).join(' · ');
}
function footerNav(prefix, page) {
  const items = [];
  if (exists('immobili.html')) items.push(['Immobili', 'immobili.html']);
  items.push(['Ricerca personalizzata', 'index.html#la-villa-non-fa-per-te']);
  if (exists('contatti.html')) items.push(['Contatti', 'contatti.html']);
  if (exists('chi-sono.html')) items.push(['Chi sono', 'chi-sono.html']);
  items.push(['Privacy', 'legal/privacy.html']);
  items.push(['Cookie', 'legal/cookie.html']);
  items.push(['Termini', 'legal/termini.html']);
  return items
    .filter(([, f]) => (f.includes('#') ? exists(f.split('#')[0]) : exists(f)))
    .map(([l, f]) => `<a href="${rel(page.path, f)}">${l}</a>`)
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
  for (const f of files.concat(incoming)) {
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
    ? `<img src="img/${attr(p.slug)}/${attr(file)}" alt="${attr((p.tipologia || 'Immobile') + ' a ' + (p.zona || p.comune || ''))}" width="${meta && meta.width || 1200}" height="${meta && meta.height || 800}" loading="lazy" decoding="async">`
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
  const excerpt = (p.descrizione || '').slice(0, 150);
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
      ${excerpt ? `<p class="card-excerpt">${esc(excerpt)}${(p.descrizione || '').length > 150 ? '…' : ''}</p>` : ''}
      <p class="card-ref"><a href="${url}">Apri la scheda →</a></p>
    </div></article></li>`;
}

function robots() {
  const linee = ['User-agent: *'];
  linee.push((cfg.site.robots_indexable ? 'Allow' : 'Disallow') + ': /');
  linee.push('');
  linee.push('Sitemap: ' + BASE + '/sitemap.xml');
  linee.push('');
  return linee.join('\n');
}

/* --------------------------------------------------------------- sitemap++ */

function pagesList() {
  const out = [];
  ['index.html', 'immobili.html', 'ricerca-personalizzata.html', 'contatti.html', 'chi-sono.html', 'zona/val-trebbia.html', 'legal/privacy.html', 'legal/cookie.html', 'legal/termini.html'].forEach((f) => { if (exists(f)) out.push(f); });
  return out;
}
function pagineIndicizzabili() {
  const out = [];
  const indicizzabili = tutteProp().filter(pubblicabili);
  ['index.html', 'immobili.html', 'ricerca-personalizzata.html', 'contatti.html', 'chi-sono.html', 'zona/val-trebbia.html', 'legal/privacy.html', 'legal/cookie.html', 'legal/termini.html'].forEach((f) => { if (exists(f)) out.push(f); });
  for (const p of indicizzabili) out.push('immobile/' + p.slug + '.html');
  return out;
}
function sitemap() {
  const mods = pagineIndicizzabili().map((f0) => { const f = f0 === 'index.html' ? '' : f0;
    let last = null;
    try { last = fs.statSync(path.join(ROOT, f0)).mtime.toISOString().slice(0, 10); } catch (e) {}
    return `  <url>\n    <loc>${BASE}/${f}</loc>${last ? `\n    <lastmod>${last}</lastmod>` : ''}\n    <changefreq>${f.startsWith('immobile') ? 'weekly' : 'monthly'}</changefreq>\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${mods.join('\n')}\n</urlset>\n`;
}
function llms() {
  const elencoLlms = tutteProp().filter(pubblicabili);
  const L = [];
  L.push('# Annunci immobiliari a Rivergaro — ' + cfg.site.dominio, '');
  L.push('> Una proposta immobiliare a Rivergaro, con informazioni pubblicate solo quando disponibili e confermate.', '');
  L.push('## Contatti');
  L.push('- Telefono: ' + pro.telefono_display);
  L.push('- WhatsApp: ' + pro.telefono_display);
  L.push('- Email: ' + pro.email, '');
  L.push('## Zona');
  L.push('- Rivergaro (PC), in Val Trebbia. La Val Trebbia è un riferimento geografico, non una dichiarazione di copertura dell’intera valle.', '');
  L.push('## Immobili pubblicati');
  if (!elencoLlms.length) L.push('Nessun immobile pubblicato al momento.');
  else elencoLlms.forEach((p) => {
    const details = [[p.zona, p.comune].filter(Boolean).join(', '), p.tipologia, p.unita_abitative ? p.unita_abitative + ' unità abitative' : null, p.caratteristiche && p.caratteristiche.includes('12 vani') ? '12 vani' : null].filter(Boolean);
    L.push(`- ${p.titolo} — ${details.join(' · ')} · ${BASE}/immobile/${p.slug}.html`);
    if (p.descrizione) L.push('  ' + p.descrizione);
  });
  L.push('', 'Non sono pubblicati prezzi né superfici non confermati. Le immagini sono mostrate solo quando vengono fornite foto reali dell’immobile.');
  return L.join('\n') + '\n';
}

/* -------------------------------------------------------------------- main */

const PAGES = [
  { path: 'index.html', source: 'home.md', title: cfg.site.titolo_home, description: cfg.site.description_home, canonical: '/', jsonld: 'site', nav: ['proposta', 'richiesta'] },
  { path: 'grazie.html', source: 'grazie.md', title: 'Richiesta inviata | ' + cfg.site.dominio, canonical: '/grazie.html', jsonld: 'none', nav: [], noindex: true },
  { path: 'legal/privacy.html', source: 'privacy.md', title: 'Privacy Policy | ' + cfg.site.dominio, canonical: '/legal/privacy.html', jsonld: 'none', nav: [] },
  { path: '404.html', source: '404.md', title: 'Pagina non trovata | comprarecasarivergaro.it', canonical: '/404.html', jsonld: 'none', nav: [], noindex: true },
  { path: 'legal/cookie.html', source: 'cookie.md', title: 'Cookie Policy | ' + cfg.site.dominio, canonical: '/legal/cookie.html', jsonld: 'none', nav: [] },
];

function main() {
  const argv = process.argv.slice(2);
  const mode = argv.find((a) => !a.startsWith('--'));

  if (mode === 'media') {
    const s = mediaScan();
    fs.writeFileSync(path.join(ROOT, 'img', 'manifest.json'), JSON.stringify(s, null, 2));
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
  // catalogo + dati pubblici per i filtri client-side
  const catHtml = '<!doctype html>\n<html lang="' + LANG + '">\n<head>\n  ' + head({ title: 'Immobili a Rivergaro | comprarecasarivergaro.it', description: 'Case e ville in vendita a Rivergaro, con schede verificate. Filtri per zona, tipologia e budget.', path: 'immobili.html', canonical: '/immobili.html', jsonld: 'site', breadcrumb: 'Immobili' }) + '\n</head>\n<body>\n  <a class="skip" href="#contenuto">Vai al contenuto</a>\n' + fill(readIf(path.join(SRC, 'templates', 'header.html'), ''), '', { nav: ['immobili', 'ricerca', 'zona', 'guide', 'contatti'], path: 'immobili.html' }) + '\n  <main id="contenuto">\n' + catalogoPage() + '\n  </main>\n' + fill(readIf(path.join(SRC, 'templates', 'footer.html'), ''), '', { nav: [], path: 'immobili.html' }) + '\n' + fill(readIf(path.join(SRC, 'templates', 'cookie-banner.html'), ''), '', {}) + '\n  <script src="js/main.js" defer></script>\n</body>\n</html>\n';
  fs.writeFileSync(path.join(OUT, 'immobili.html'), cleanHtml(catHtml));
  console.log('✓ immobili.html (' + (catHtml.length / 1024).toFixed(1) + 'KB, ' + catalogo().length + ' schede in catalogo)');
  fs.mkdirSync(path.join(OUT, 'data'), { recursive: true });
  const pubblici = catalogo().map((p) => ({
    slug: p.slug, titolo: p.titolo, stato: p.stato, tipologia: p.tipologia || null,
    comune: p.comune || null, zona: p.zona || null, prezzo: typeof p.prezzo === 'number' ? p.prezzo : null,
    superficie: p.superficie || null, locali: p.locali || null, data_modifica: p.data_modifica || null,
    immagini: (p.immagini || []).filter(Boolean).length, url: '/immobile/' + p.slug + '.html',
  }));
  fs.writeFileSync(path.join(OUT, 'data', 'properties.json'), JSON.stringify({ generato: new Date().toISOString().slice(0, 10), immobili: pubblici }, null, 2) + '\n');
  for (const p of schedaPagine()) {
    const page = {
      path: 'immobile/' + p.slug + '.html', source: null, immobile: p,
      title: (p.titolo || 'Immobile').slice(0, 60) + ' | ' + cfg.site.dominio,
      description: (p.descrizione || '').slice(0, 155),
      canonical: '/immobile/' + p.slug + '.html',
      breadcrumb: 'Immobili',
      noindex: !!p.bozza, robots_off: !!p.bozza,
    };
    const content = schedaPage(p, 'immobile/');
    const shell = readIf(path.join(SRC, 'templates', 'layout.html'), '');
    const html = shell
      .replace('{{LANG}}', LANG)
      .replace('{{HEAD}}', head(page, 'immobile/'))
      .replace('{{HEADER}}', fill(readIf(path.join(SRC, 'templates', 'header.html'), ''), '../', { nav: ['immobili', 'ricerca', 'contatti'], path: page.path }))
      .replace('{{CONTENT}}', content)
      .replace('{{FOOTER}}', fill(readIf(path.join(SRC, 'templates', 'footer.html'), ''), '../', { nav: [], path: page.path }))
      .replace('{{COOKIE_BANNER}}', fill(readIf(path.join(SRC, 'templates', 'cookie-banner.html'), ''), '../', {}))
      .replace('{{SCRIPT}}', `<script src="${rel(page.path, 'js/main.js')}" defer></script>`)
      .replace(/\{\{[A-Z0-9_]+\}\}/g, '');
    fs.mkdirSync(path.join(OUT, 'immobile'), { recursive: true });
    fs.writeFileSync(path.join(OUT, page.path), cleanHtml(html));
    console.log('✓ ' + page.path + (p.bozza ? '  [BOZZA · noindex]' : '') + ' (' + (html.length / 1024).toFixed(1) + 'KB)');
  }
  for (const p of PAGES) {
    if (!readIf(path.join(SRC, 'pages', p.source), '')) { console.warn('pagina saltata: ' + p.source); continue; }
    const html = buildPage(p);
    fs.mkdirSync(path.dirname(path.join(OUT, p.path)), { recursive: true });
    fs.writeFileSync(path.join(OUT, p.path), cleanHtml(html));
    console.log('✓ ' + p.path + ' (' + (html.length / 1024).toFixed(1) + 'KB)');
  }
  fs.copyFileSync(path.join(SRC, 'css', 'main.css'), path.join(OUT, 'css', 'main.css'));
  fs.copyFileSync(path.join(SRC, 'js', 'main.js'), path.join(OUT, 'js', 'main.js'));
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap());
  fs.writeFileSync(path.join(OUT, 'llms.txt'), llms());
  fs.writeFileSync(path.join(OUT, 'robots.txt'), robots());
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
  fs.writeFileSync(path.join(OUT, 'CNAME'), cfg.site.dominio + '\n');
  const m = mediaScan();
  fs.writeFileSync(path.join(ROOT, 'img', 'manifest.json'), JSON.stringify(m, null, 2));

  if (argv.includes('--check')) runCheck();
}

function runCheck() {
    let problems = 0;
    for (const f of pagesList().concat(['immobili.html', 'data/properties.json', 'css/main.css', 'js/main.js', 'sitemap.xml', 'llms.txt'])) {
      if (!exists(f)) { console.log('✗ manca ' + f); problems++; }
    }
    for (const f of pagesList()) {
      const s = readIf(path.join(ROOT, f), '');
      const leaks = s.match(/DA CONFERMARE/g);
      if (leaks) { console.log(`✗ ${f}: ${leaks.length} segnaposto nel markup pubblico`); problems++; }
      for (const m2 of s.matchAll(/<a [^>]*href="([^"#]+)(#[^"]*)?"/g)) {
        const h = m2[1];
        if (/^(https?:|mailto:|tel:|data:)/.test(h) || h === '') continue;
        if (!exists(path.join(path.dirname(f), h))) { console.log(`✗ ${f}: link rotto ${h}`); problems++; }
      }
      for (const m3 of s.matchAll(/<img [^>]*src="([^"]+)"/g)) {
        if (!exists(path.join(path.dirname(f), m3[1]))) { console.log(`✗ ${f}: immagine mancante ${m3[1]}`); problems++; }
      }
      const h1 = (s.match(/<h1/g) || []).length;
      if (h1 !== 1) { console.log(`✗ ${f}: ${h1} H1 (deve essere 1)`); problems++; }
      const nimg = [...s.matchAll(/<img [^>]*>/g)].filter((x) => !/width="\d+" height="\d+"/.test(x[0])).length;
      if (nimg) { console.log(`✗ ${f}: ${nimg} img senza width/height (rischio CLS)`); problems++; }
    }
    problems += privacyGuard();
    console.log(problems ? '\n' + problems + ' problemi trovati' : '\n✓ check superato: nessun dato personale della visura, nessun segnaposto, nessun link rotto, un H1 per pagina, immagini con dimensioni esplicite');
    if (problems) process.exitCode = 1;
}
main();
