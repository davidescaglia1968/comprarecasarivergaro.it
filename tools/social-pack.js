#!/usr/bin/env node
/* Pacchetto social deterministico, giro del 10/11/2026.

   Da ogni contenuto nuovo o modificato (pagine markdown, immobili pubblicati) genera i
   testi pronti per i cinque canali: LinkedIn, Facebook + Google Business Profile,
   Instagram/TikTok (carosello in 5 slide + script parlato), X (thread in 3 tweet),
   YouTube (post community). Nessuna invenzione: usa soltanto titolo, descrizione,
   intestazioni e primo paragrafo del contenuto pubblicato, piu' i dati verificati del
   professionista (nome, telefono, zona, metodo). Niente prezzi, niente indirizzo: le
   regole di Davide valgono anche sui social.

   Output: social-pack.md (da leggere e approvare) e social-pack.json (da inoltrare a
   Make/n8n se il webhook e' configurato). Il workflow apre una issue con il pacchetto:
   niente viene pubblicato senza il suo ok. */
const fs = require('fs');

const cfg = JSON.parse(fs.readFileSync('src/data/site-config.json', 'utf8'));
const pro = cfg.professionista || {};
const BASE = 'https://comprarecasarivergaro.it';
const TEL = pro.telefono_display || '+39 328 693 0033';
const ZONA = 'Rivergaro e Val Trebbia';

function front(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  const o = {};
  if (m) for (const riga of m[1].split('\n')) {
    const i = riga.indexOf(':');
    if (i > 0) o[riga.slice(0, i).trim()] = riga.slice(i + 1).trim();
  }
  return o;
}
function corpo(md) {
  return md.replace(/^---\n[\s\S]*?\n---\n/, '');
}
function titoli(md) {
  return (corpo(md).match(/^## .+$/gm) || []).map((r) => r.replace(/^## /, '').replace(/\s*\{#[^}]*\}/, ''));
}
function primoParagrafo(md) {
  const t = corpo(md).split(/\n\n+/).find((p) => !p.startsWith('#') && !p.startsWith('::') && p.trim().length > 40);
  return (t || '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim();
}
function clip(s, n) {
  s = String(s || '').trim();
  if (s.length <= n) return s;
  const t = s.slice(0, n);
  return t.slice(0, t.lastIndexOf(' ')) + '…';
}

function piattaforme(o) {
  const gancio = o.gancio || o.titolo;
  return {
    linkedin: clip(`${o.titolo}\n\n${o.sostanza}\n\nCome lavoro: dati e documenti verificati, una persona sola dall'appuntamento alla firma, dal 2007 a ${ZONA}. Se stai valutando una scelta simile, parliamone: ${TEL}.\n\n${o.url}`, 700),
    facebook_gbp: clip(`${gancio}\n\n${o.sostanza}\n\nNiente call center e niente moduli infiniti: una telefonata o un WhatsApp al ${TEL} e ti rispondo io, negli orari indicati. ${BASE}`, 500),
    instagram_tiktok: {
      slide: [
        clip(gancio, 60),
        clip(o.punti[0] || o.sostanza, 90),
        clip(o.punti[1] || 'Dati e documenti verificati, sempre', 90),
        clip(o.punti[2] || `Una persona sola, dal 2007 a ${ZONA}`, 90),
        `Chiamami o scrivimi su WhatsApp: ${TEL}`,
      ],
      script: clip(`Parliamone in un minuto. ${gancio}. ${o.sostanza} Il metodo è sempre lo stesso: dati verificati, documenti controllati, e una persona sola che ti segue dall'appuntamento alla firma. Sono a ${ZONA} dal 2007. Se ti riconosci, chiamami al ${TEL} o scrivimi su WhatsApp: ti rispondo io.`, 620),
    },
    x_thread: [
      clip(`${gancio} 🧵`, 260),
      clip(o.sostanza, 260),
      clip(`Se cerchi casa a ${ZONA}: ${TEL}, oppure ${o.url}`, 260),
    ],
    youtube_community: clip(`${o.titolo} — novità sul sito.\n\n${o.sostanza}\n\nDomanda per voi: qual è la prima cosa che guardate di una casa, prima ancora del prezzo? Rispondetemi nei commenti.\n${o.url}`, 400),
  };
}

function packPagina(file) {
  const md = fs.readFileSync(file, 'utf8');
  const f = front(md);
  if (!f.title) return null;
  const slug = (f.canonical || '').replace(/^\//, '') || file;
  const h2 = titoli(md);
  return {
    origine: file,
    url: BASE + '/' + slug,
    titolo: f.title.split('|')[0].trim(),
    sostanza: clip(primoParagrafo(md) || f.description || '', 300),
    punti: h2.slice(0, 3),
    gancio: h2[0] ? `${h2[0]}: parliamone chiaro` : f.title.split('|')[0].trim(),
  };
}
function packImmobile(p) {
  return {
    origine: 'immobile:' + p.slug,
    url: BASE + '/immobile/' + p.slug + '.html',
    titolo: p.titolo,
    sostanza: clip((p.descrizione || '').split(/\.\s/)[0] + '.', 300) || 'Una proposta verificata, con foto reali e documenti controllati.',
    punti: [
      p.zona ? 'Zona: ' + p.zona : '',
      p.unita_abitative ? p.unita_abitative + ' unità abitative indipendenti' : '',
      p.vani ? p.vani + ' vani' : '',
    ].filter(Boolean),
    gancio: p.titolo,
  };
}

const items = [];
for (const file of process.argv.slice(2)) {
  if (!fs.existsSync(file)) continue;
  if (file.endsWith('properties.json')) {
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const p of (d.immobili || []).filter((x) => x && !x.bozza)) items.push(packImmobile(p));
  } else if (file.startsWith('src/pages/')) {
    const o = packPagina(file);
    if (o) items.push(o);
  }
}
if (!items.length) process.exit(0);

const packs = items.map((o) => ({ origine: o.origine, url: o.url, piattaforme: piattaforme(o) }));
fs.writeFileSync('social-pack.json', JSON.stringify({ evento: 'nuovi_contenuti', data: new Date().toISOString().slice(0, 10), items: packs }, null, 2));

let md = `# Pacchetto social da approvare — ${new Date().toISOString().slice(0, 10)}\n\n`;
md += `**Non pubblicare niente senza l'ok di Davide su questa issue.** I testi derivano solo da contenuti già pubblicati sul sito e dai suoi dati verificati: niente prezzi, niente indirizzo, niente promesse.\n\n`;
for (const o of items) {
  const p = piattaforme(o);
  md += `## ${o.titolo}\nOrigine: \`${o.origine}\` · ${o.url}\n\n`;
  md += `### LinkedIn\n${p.linkedin}\n\n### Facebook + Google Business Profile\n${p.facebook_gbp}\n\n`;
  md += `### Instagram / TikTok — carosello\n${p.instagram_tiktok.slide.map((s, i) => (i + 1) + '. ' + s).join('\n')}\n\n`;
  md += `### Instagram / TikTok — script parlato (45-60 s)\n${p.instagram_tiktok.script}\n\n`;
  md += `### X — thread\n${p.x_thread.map((t, i) => (i + 1) + '/ ' + t).join('\n')}\n\n`;
  md += `### YouTube — community\n${p.youtube_community}\n\n---\n\n`;
}
fs.writeFileSync('social-pack.md', md);
console.log('pacchetto social generato: ' + items.length + ' contenuto/i');
