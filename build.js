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
  const g = [];
  const agent = {
    '@type': 'RealEstateAgent',
    '@id': BASE + '/#agent',
    name: pro.brand,
    url: BASE + '/',
    telephone: pro.telefono_e164,
    email: pro.email,
    areaServed: (cfg.area_servizio.areaServed_jsonld || []).map((n) => ({ '@type': 'City', name: n })),
    sameAs: [cfg.ecosistema.sito_madre.url + '/', cfg.ecosistema.satellite.url + '/'],
  };
  if (pro.partita_iva && isConfirmed(pro.partita_iva)) agent.taxID = pro.partita_iva;
  if (isConfirmed(pro.iscrizione_ruolo)) agent.knowsAbout = 'Iscrizione ' + pro.iscrizione_ruolo;
  if (addr) agent.address = addressObj;
  if (isConfirmed(pro.anno_inizio_attivita)) agent.foundingDate = String(pro.anno_inizio_attivita);
  agent.founder = { '@type': 'Person', name: pro.nome_completo, jobTitle: 'Agente Immobiliare' };
  g.push(agent);
  return { '@context': 'https://schema.org', '@graph': g };
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

function formRicerca(prefix) {
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
          <button type="submit" class="btn btn-primary">Invia la mia ricerca</button>
          <a class="btn btn-ghost" href="tel:${attr(pro.telefono_e164)}">Chiamami ora ${esc(pro.telefono_display)}</a>
        </div>
        <p class="form-note">Nessuna newsletter, nessun dato ceduto a terzi. Rispondo io, di solito entro un giorno lavorativo.</p>
      </form>`;
}

const shortcodes = {
  hero(o) {
    const nImg = catalogo().length;
    const hasCatalogo = exists('immobili.html');
    const second = hasCatalogo
      ? `<a class="btn btn-ghost" href="${rel('', 'immobili.html')}">${nImg ? 'Vedi gli immobili (' + nImg + ')' : 'Vedi gli immobili'}</a>`
      : `<a class="btn btn-ghost" href="#contatti">Parliamone al telefono</a>`;
    return `<section class="hero" id="top"><div class="wrap hero-grid">
      <div class="hero-copy">
        <p class="eyebrow">Acquirenti · Rivergaro e Val Trebbia</p>
        <h1>${inline(o.h1)}</h1>
        <div class="lead">${o.lead.map((p) => '<p>' + inline(p) + '</p>').join('')}</div>
        <div class="cta-row"><a class="btn btn-primary" href="#ricerca">${esc(o.cta1)}</a>${second}</div>
        <p class="hero-meta">${esc(pro.nome_completo)} · ${esc(pro.ruolo)} · ${addr ? esc(addr.street + ', ' + addr.localita) : 'Rivergaro (PC)'}</p>
      </div>
      <div class="hero-card">
        <p class="hero-card-label">Parla con chi cerca nella tua zona</p>
        <p class="hero-card-phone"><a href="tel:${attr(pro.telefono_e164)}">${esc(pro.telefono_display)}</a></p>
        <p class="hero-card-mail"><a href="mailto:${attr(pro.email)}">${esc(pro.email)}</a></p>
        <hr>
        <p class="hero-card-note">${inline(o.note.join(' '))}</p>
        ${isConfirmed(pro.anno_inizio_attivita) ? `<p class="hero-card-since">In zona dal ${esc(pro.anno_inizio_attivita)}</p>` : ''}
      </div></div></section>`;
  },
  form_ricerca() {
    return `<div class="form-shell">${formRicerca('')}</div>`;
  },
  immobili(o) {
    const list = catalogo();
    const link = exists('immobili.html')
      ? `<a class="section-more" href="${rel('index.html', 'immobili.html')}">Apri il catalogo con i filtri per zona, tipologia e budget</a>`
      : `<a class="section-more" href="#contatti">Nel frattempo: chiamami e ti dico cosa si muove in valle</a>`;
    if (!list.length) {
      return `<div class="empty-state"><p>${inline(o.empty)}</p><a class="btn btn-primary" href="#ricerca">${esc(cfg.contatti_sezione.cta_principale)}</a></div>${link}`;
    }
    return `<ul class="grid-cards">${list.map((p) => cardImmobile(p, 'index.html')).join('')}</ul>`;
  },
  guida_stato(o) {
    return `<ol class="steps">${o.steps.map((s) => `<li><h3>${inline(s.titolo)}</h3><p>${inline(s.testo)}</p></li>`).join('')}</ol>`;
  },
  zona_coverage(o) {
    const fr = (cfg.area_servizio.frazioni || []).map((f) => `<li>${esc(f.nome)}</li>`).join('');
    const vicine = (cfg.area_servizio.aree_limitrofe || []).map((f) => `<li>${esc(f.nome)}</li>`).join('');
    return `<div class="zone-block"><ul class="zone-list">${fr}</ul><p class="muted">Zone limitrofe in cui mi muoio senza problemi: <span class="zone-inline">${vicine}</span></p></div>`;
  },
  guide_teaser() {
    const g = (cfg.contenuti.guide_previste || []).filter((x) => x.stato === 'disponibile');
    if (!g.length) {
      return `<div class="empty-state"><p>Le guide per chi compra sono in preparazione: le pubblico solo quando ho contenuto scritto da me, non testi generici.</p><a class="btn btn-ghost" href="#ricerca">Chiedimi direttamente quello che vuoi sapere</a></div>`;
    }
    return `<ul class="grid-cards grid-cards--editorial">${g.map((x) => `<li class="card card--text"><h3><a href="${rel('','guide/'+x.slug+'.html')}">${esc(x.titolo)}</a></h3><p>${inline(x.anteprima||'')}</p></li>`).join('')}</ul>`;
  },
  sito_madre_cta() {
    const m = cfg.ecosistema.sito_madre;
    return `<aside class="cross-cta"><div><p class="cross-cta-k">Se invece devi vendere</p><p class="cross-cta-t">Su ${esc(m.nome)} trovi il percorso per chi mette in vendita casa, nella stessa zona e con lo stesso metodo.</p></div><a class="btn btn-outline" href="${attr(m.url)}" rel="noopener">vai su ${esc(m.nome)}</a></aside>`;
  },
  contatti_card() {
    return `<div class="contact-card">
      <ul class="contact-list">
        <li><span class="k">Chi</span><span class="v">${esc(pro.nome_completo)} — ${esc(pro.ruolo)}</span></li>
        <li><span class="k">Telefono e WhatsApp</span><span class="v"><a href="tel:${attr(pro.telefono_e164)}">${esc(pro.telefono_display)}</a></span></li>
        <li><span class="k">Email</span><span class="v"><a href="mailto:${attr(pro.email)}">${esc(pro.email)}</a></span></li>
        ${addr ? `<li><span class="k">Studio</span><span class="v">${esc(addr.street)}, ${esc(addr.cap)} ${esc(addr.localita)} (${esc(addr.provincia)})</span></li>` : ''}
        ${isConfirmed(cfg.contatti_sezione.orari) ? `<li><span class="k">Orari</span><span class="v">${esc(cfg.contatti_sezione.orari)}</span></li>` : ''}
        ${isConfirmed(pro.partita_iva) ? `<li><span class="k">P.IVA</span><span class="v">${esc(pro.partita_iva)} · ${esc(pro.iscrizione_ruolo)}</span></li>` : ''}
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

function catalogo() {
  if (!props || !Array.isArray(props.immobili)) return [];
  const pubblicati = cfg.catalogo.regola_pubblicazione.includes('Disponibile');
  return props.immobili.filter((p) => (pubblichi(p) ? true : false));
}
function pubblichi(p) {
  const ok = ['Disponibile', 'In trattativa'];
  return ok.includes(p.stato) && !(p.note_interne || '').includes('NON PUBBLICARE');
}
function prezzo(p) {
  return typeof p.prezzo === 'number' ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p.prezzo) : '';
}
function cardImmobile(p, prefix) {
  const img = (p.immagini || [])[0];
  const url = rel(prefix, 'immobile/' + p.slug + '.html');
  const badge = `<span class="badge badge--${(p.stato || '').toLowerCase().replace(/\s+/g, '-')}" role="img" aria-label="Stato: ${attr(p.stato)}">${esc(p.stato)}</span>`;
  const dims = [p.superficie ? p.superficie + ' m²' : null, p.locali ? p.locali + ' locali' : null, p.zona ? esc(p.zona) : null].filter(Boolean);
  return `<li class="card card--prop"><article>
    <a class="card-media" href="${url}">${img ? imgTag('img/' + img, (p.titolo || '') + ' — ' + (p.zona || ''), {}) : '<span class="media-placeholder">Foto in preparazione</span>'}${badge}</a>
    <div class="card-body"><h3><a href="${url}">${esc(p.titolo)}</a></h3>
      <p class="card-price">${prezzo(p)}</p>
      <p class="card-dims">${dims.join(' · ')}</p>
      <p class="card-excerpt">${esc((p.descrizione || '').slice(0, 150))}${(p.descrizione || '').length > 150 ? '…' : ''}</p>
    </div></article></li>`;
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
  if (page.noindex) page.robots_off = true;
  const desc = page.description || cfg.site.description_home;
  const url = BASE + '/' + (page.canonical || '').replace(/^\//, '');
  c.push('<meta charset="utf-8">');
  c.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  c.push(`<title>${esc(title)}</title>`);
  c.push('<meta name="description" content="' + attr(desc) + '">');
  if (page.noindex || !cfg.site.robots_indexable) c.push('<meta name="robots" content="noindex, nofollow">');
  else c.push('<meta name="robots" content="index, follow">');
  c.push(`<meta name="author" content="${attr(pro.brand)}">`);
  c.push(`<meta name="theme-color" content="${attr(cfg.site.theme_color)}">`);
  c.push('<link rel="canonical" href="' + attr(url) + '">');
  c.push('<meta property="og:type" content="website">');
  c.push('<meta property="og:site_name" content="' + attr(cfg.site.dominio) + '">');
  c.push('<meta property="og:locale" content="it_IT">');
  c.push('<meta property="og:url" content="' + attr(url) + '">');
  c.push('<meta property="og:title" content="' + attr(title) + '">');
  c.push('<meta property="og:description" content="' + attr(desc) + '">');
  if (isConfirmed(cfg.seo_geo.og_image)) c.push('<meta property="og:image" content="' + attr(abs(BASE, '/' + cfg.seo_geo.og_image)) + '">');
  c.push('<meta name="twitter:card" content="' + attr(cfg.seo_geo.twitter_card) + '">');
  if (page.description) c.push('<meta name="keywords" content="' + attr((cfg.site.keywords || []).join(', ')) + '">');
  c.push('<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 rx=%227%22 fill=%22%230a0a0a%22/%3E%3Ctext x=%2216%22 y=%2222%22 font-family=%22Georgia,serif%22 font-size=%2217%22 font-weight=%22700%22 fill=%22%23ec4899%22 text-anchor=%22middle%22%3ED%3C/text%3E%3C/svg%3E">');
  c.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
  c.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
  c.push('<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&amp;family=Inter:wght@400;500;600&amp;display=swap" rel="stylesheet">');
  c.push('<link rel="stylesheet" href="' + rel(page.path || 'index.html', 'css/main.css') + '">');
  if (page.critical_css && exists(page.critical_css)) c.push('<style>' + readIf(path.join(ROOT, page.critical_css), '') + '</style>');
  const ld = page.jsonld === 'site' || page.jsonld === undefined ? siteJsonLd() : (page.jsonld === 'none' ? null : page.jsonld);
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
  const banner = readIf(path.join(SRC, 'templates', 'cookie-banner.html'), '');
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
  const nav = (page.nav || ['immobili', 'ricerca', 'zona', 'guide', 'contatti']);
  const labels = { immobili: 'Immobili', ricerca: 'Ricerca personalizzata', zona: 'Zone', guide: 'Guide', contatti: 'Contatti' };
  const links = nav
    .map((k) => {
      const target = { immobili: 'immobili.html', ricerca: '#ricerca', zona: '#zona', guide: '#guide', contatti: '#contatti' }[k];
      if (k === 'immobili' && !exists('immobili.html')) return `<a href="#immobili">${labels[k]}</a>`;
      if (!target) return '';
      const href = target.startsWith('#') ? target : exists(target) ? rel(page.path, target) : '#immobili';
      return `<a href="${href}">${labels[k]}</a>`;
    })
    .join('\n        ');
  const map = {
    NAV: links,
    BRAND: esc(pro.nome_completo),
    BRAND_FULL: esc(pro.brand),
    CLAIM: 'Case a Rivergaro',
    TEL: attr(pro.telefono_e164),
    TEL_LABEL: esc(pro.telefono_display),
    EMAIL: attr(pro.email),
    YEAR: String(year),
    FOOTER_NAV: footerNav(prefix, page),
    NAP: napText(),
    SOCIAL: socialList(),
    PREFIX: prefix,
    P0: prefix,
  };
  return tpl.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m0, k) => (map[k] !== undefined ? map[k] : m0));
}
function napText() {
  const parts = [pro.brand];
  if (addr) parts.push(addr.street + ', ' + addr.cap + ' ' + addr.localita + ' (' + addr.provincia + ')');
  parts.push(pro.telefono_display);
  parts.push(pro.email);
  return parts.map(esc).join(' · ');
}
function footerNav(prefix, page) {
  const items = [];
  if (exists('immobili.html')) items.push(['Immobili', 'immobili.html']);
  items.push(['Ricerca personalizzata', 'index.html#ricerca']);
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
  const inArrivo = s.items.filter((i) => i.path.startsWith('img/_in'));
  if (inArrivo.length) {
    lines.push('', '## In arrivo (da smistare)', ...inArrivo.map((i) => `- \`${i.path}\` ${i.width ? i.width + '×' + i.height : ''} · assegna uno slug prima della pubblicazione`));
  }
  return lines.join('\n') + '\n';
}

/* --------------------------------------------------------------- sitemap++ */

function pagesList() {
  const out = [];
  const push = (p) => out.push(p);
  ['index.html', 'immobili.html', 'ricerca-personalizzata.html', 'contatti.html', 'chi-sono.html', 'zona/val-trebbia.html', 'grazie.html', 'legal/privacy.html', 'legal/cookie.html', 'legal/termini.html'].forEach((f) => { if (exists(f) && f !== 'grazie.html') push(f); });
  for (const p of catalogo()) push('immobile/' + p.slug + '.html');
  return out;
}
function sitemap() {
  const mods = pagesList().map((f0) => { const f = f0 === 'index.html' ? '' : f0;
    let last = null;
    try { last = fs.statSync(path.join(ROOT, f0)).mtime.toISOString().slice(0, 10); } catch (e) {}
    return `  <url>\n    <loc>${BASE}/${f}</loc>${last ? `\n    <lastmod>${last}</lastmod>` : ''}\n    <changefreq>${f.startsWith('immobile') ? 'weekly' : 'monthly'}</changefreq>\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${mods.join('\n')}\n</urlset>\n`;
}
function llms() {
  const L = [];
  L.push('# ' + pro.brand + ' — ' + cfg.site.dominio, '');
  L.push('> ' + (isConfirmed(pro.anno_inizio_attivita) ? 'Seguo gli acquirenti su Rivergaro e in Val Trebbia dal ' + pro.anno_inizio_attivita + '.' : 'Seguo gli acquirenti su Rivergaro e in Val Trebbia.') + ' Ricerca personalizzata, visite accompagnate, verifica tecnica e documentale, trattativa e rogito.', '');
  L.push('## A chi serve questo sito');
  L.push('- Chi vuole comprare casa a Rivergaro, nelle sue frazioni o in Val Trebbia.');
  L.push('- Non è il sito per chi vende: quello è ' + cfg.ecosistema.sito_madre.url + '.', '');
  L.push('## Contatti');
  L.push('- Telefono e WhatsApp: ' + pro.telefono_display);
  L.push('- Email: ' + pro.email);
  if (addr) L.push('- Studio: ' + addr.street + ', ' + addr.cap + ' ' + addr.localita + ' (' + addr.provincia + ')');
  if (isConfirmed(pro.partita_iva)) L.push('- P.IVA: ' + pro.partita_iva);
  L.push('- Sito: ' + BASE + '/');
  const soc = Object.entries(pro.social || {}).filter(([, v]) => isConfirmed(v));
  if (soc.length) { L.push(''); L.push('## Canali social'); soc.forEach(([k, v]) => L.push('- ' + k + ': ' + v)); }
  L.push('', '## Zona coperta');
  L.push('- ' + (cfg.area_servizio.frazioni || []).map((f) => f.nome).join(', '));
  L.push('- Il comune è Rivergaro (PC), Emilia-Romagna, alta Val Trebbia.', '');
  const cat = catalogo();
  L.push('## Immobili pubblicati');
  if (!cat.length) L.push('Nessun immobile in vetrina al momento: gli acquirenti vengono guidati alla ricerca personalizzata, che intercetta anche immobili non ancora listati. Questa è una scelta, non una mancanza di offerta.');
  else cat.forEach((p) => L.push(`- ${p.titolo} — ${p.zona}, ${p.comune} · ${p.tipologia} · ${p.superficie} m² · ${prezzo(p)} · ${BASE}/immobile/${p.slug}.html`));
  L.push('', '## Metodo');
  L.push('1. Raccolta della richiesta (zona, tipologia, budget, vincoli reali).');
  L.push('2. Ricerca su più fonti, non solo sul portafoglio diretto.');
  L.push('3. Visite accompagnate con verifica urbanistica e catastale prima della proposta.');
  L.push('4. Trattativa e scrittura del preliminare, poi rogito dal notaio.', '');
  L.push('## Dati verificati');
  L.push('Nessun prezzo, metratura, rendita o dato di mercato è esposto se non documentato. Le pagine non contengono recensioni, punteggi o statistiche inventate.');
  return L.join('\n') + '\n';
}

/* -------------------------------------------------------------------- main */

const PAGES = [
  { path: 'index.html', source: 'home.md', title: cfg.site.titolo_home, description: cfg.site.description_home, canonical: '/', jsonld: 'site' },
  { path: 'grazie.html', source: 'grazie.md', title: 'Richiesta inviata | ' + cfg.site.dominio, canonical: '/grazie.html', jsonld: 'none', nav: [], noindex: true },
  { path: 'legal/privacy.html', source: 'privacy.md', title: 'Privacy Policy | ' + cfg.site.dominio, canonical: '/legal/privacy.html', jsonld: 'none', nav: [] },
  { path: 'legal/cookie.html', source: 'cookie.md', title: 'Cookie Policy | ' + cfg.site.dominio, canonical: '/legal/cookie.html', jsonld: 'none', nav: [] },
];

function main() {
  const argv = process.argv.slice(2);
  const mode = argv.find((a) => !a.startsWith('--'));

  if (mode === 'media') {
    const s = mediaScan();
    fs.writeFileSync(path.join(ROOT, 'img', 'manifest.json'), JSON.stringify(s, null, 2));
    fs.writeFileSync(path.join(ROOT, 'MEDIA_RAPPORTO.md'), mediaReport(s));
    console.log(`media: ${s.items.length} file, ${Object.keys(s.byProp).length} immobili, ${s.warnings.length} avvisi`);
    s.warnings.forEach((w) => console.log('  ! ' + w));
    return;
  }

  if (!exists('img')) fs.mkdirSync(path.join(ROOT, 'img'));
  for (const p of PAGES) {
    if (!readIf(path.join(SRC, 'pages', p.source), '')) { console.warn('pagina saltata: ' + p.source); continue; }
    const html = buildPage(p);
    fs.mkdirSync(path.dirname(path.join(OUT, p.path)), { recursive: true });
    fs.writeFileSync(path.join(OUT, p.path), html);
    console.log('✓ ' + p.path + ' (' + (html.length / 1024).toFixed(1) + 'KB)');
  }
  fs.copyFileSync(path.join(SRC, 'css', 'main.css'), path.join(OUT, 'css', 'main.css'));
  fs.copyFileSync(path.join(SRC, 'js', 'main.js'), path.join(OUT, 'js', 'main.js'));
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap());
  fs.writeFileSync(path.join(OUT, 'llms.txt'), llms());
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
  fs.writeFileSync(path.join(OUT, 'CNAME'), cfg.site.dominio + '\n');
  const m = mediaScan();
  fs.writeFileSync(path.join(ROOT, 'img', 'manifest.json'), JSON.stringify(m, null, 2));

  if (argv.includes('--check')) {
    let problems = 0;
    for (const f of pagesList().concat(['css/main.css', 'js/main.js', 'sitemap.xml', 'llms.txt'])) {
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
    console.log(problems ? `\n${problems} problemi trovati` : '\n✓ check superato: niente segnaposto, nessun link rotto, un H1 per pagina, immagini con dimensioni esplicite');
    if (problems) process.exitCode = 1;
  }
}
main();
