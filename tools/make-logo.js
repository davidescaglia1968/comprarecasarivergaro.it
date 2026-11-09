/* ---------------------------------------------------------------------------
   comprarecasarivergaro.it — generatore del logo di marca (versione Rivergaro)

   Ricrea il lockup di famiglia — monogramma DS sfumato rosa→blu, filetto oro,
   nome e cognome in Playfair Display maiuscolo spaziato, claim di zona in oro —
   ma con il claim CORRETTO per questo dominio: «IMMOBILI A RIVERGARO».
   Il file storico img/brand/logo-davide-scaglia-rivergaro.png contiene infatti
   il claim del sito gemello («VENDERE CASA A PIACENZA») e resta in archivio
   senza essere referenziato.

   I glifi vengono rasterizzati dai woff2 auto-ospitati del sito (gli stessi
   che legge il browser), quindi il logo è tipograficamente identico al testo
   del sito, a risoluzione doppia e con sfondo trasparente: si posa sull'header
   scuro senza riquadri e resta nitido su retina.

   Uso:  cd tools && npm install && npm run logo
   Output: img/brand/logo-rivergaro.png  (2x, da esporre con width/height dimezzati)
   La build del sito (build.js) NON dipende da questo tool: copia soltanto il PNG.
   ------------------------------------------------------------------------- */
'use strict';
const fs = require('fs');
const path = require('path');
const fontkit = require('fontkit');
const { pngEncode } = require('./make-brand-assets.js');

const ROOT = path.join(__dirname, '..');
const FONTS = path.join(ROOT, 'src', 'fonts');
const OUT = path.join(ROOT, 'img', 'brand', 'logo-rivergaro.png');

const F_TITLE = path.join(FONTS, 'playfair-display-latin-700-normal.woff2');
const F_CLAIM = path.join(FONTS, 'playfair-display-latin-500-normal.woff2');

const SS = 3;               // supersampling: qualita' dei bordi
const PAD = 16;             // margine trasparente attorno al lockup
const COL_NAME = [245, 245, 245];
const COL_CLAIM = [224, 189, 102];
const COL_RULE = [212, 165, 32];
const GRAD_A = [236, 72, 153];   // rosa di famiglia
const GRAD_B = [59, 130, 246];   // blu di famiglia

/* ------------------------------------------------- layout dei glifi (woff2) */
function run(text, font, size, tracking) {
  const scale = size / font.unitsPerEm;
  const laid = font.layout(text);
  const glyphs = [];
  let pen = 0;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const g of laid.glyphs) {
    const cmds = [];
    for (const c of g.path.commands) {
      const a = c.args.map((v, i) => (i % 2 === 0 ? v * scale + pen : v * scale));
      cmds.push({ command: c.command, args: a });
      for (let i = 1; i < a.length; i += 2) {
        if (a[i] < minY) minY = a[i];
        if (a[i] > maxY) maxY = a[i];
      }
    }
    if (cmds.length) glyphs.push(cmds);
    pen += g.advanceWidth * scale + tracking;
  }
  if (!glyphs.length) { minY = 0; maxY = 0; }
  return { glyphs, width: pen - tracking, minY, maxY, h: maxY - minY };
}

/* Flatten di bezier in poligoni, in coordinate supersample (y verso il basso). */
function toPolys(r, ox, oy) {
  const polys = [];
  for (const cmds of r.glyphs) {
    let cur = null;
    let x = 0;
    let y = 0;
    const P = (px, pyUp) => [ (ox + px) * SS, (oy - pyUp) * SS ];
    for (const c of cmds) {
      if (c.command === 'moveTo') {
        if (cur && cur.length > 2) polys.push(cur);
        cur = [P(c.args[0], c.args[1])];
        x = c.args[0]; y = c.args[1];
      } else if (c.command === 'lineTo') {
        cur.push(P(c.args[0], c.args[1]));
        x = c.args[0]; y = c.args[1];
      } else if (c.command === 'quadraticCurveTo') {
        const [cx, cy, ex, ey] = c.args;
        for (let i = 1; i <= 14; i++) {
          const t = i / 14;
          const u = 1 - t;
          cur.push(P(u * u * x + 2 * u * t * cx + t * t * ex, u * u * y + 2 * u * t * cy + t * t * ey));
        }
        x = ex; y = ey;
      } else if (c.command === 'bezierCurveTo') {
        const [c1x, c1y, c2x, c2y, ex, ey] = c.args;
        for (let i = 1; i <= 20; i++) {
          const t = i / 20;
          const u = 1 - t;
          cur.push(P(
            u * u * u * x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex,
            u * u * u * y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey,
          ));
        }
        x = ex; y = ey;
      } else if (c.command === 'closePath') {
        if (cur && cur.length > 2) polys.push(cur);
        cur = null;
      }
    }
    if (cur && cur.length > 2) polys.push(cur);
  }
  return polys;
}

/* Riempimento nonzero-winding su griglia supersample, poi media a copertura. */
function raster(r, ox, oy, w, h) {
  const polys = toPolys(r, ox, oy);
  const W = w;
  const H = h;
  const edges = [];
  for (const p of polys) {
    for (let i = 0; i < p.length; i++) {
      const [x1, y1] = p[i];
      const [x2, y2] = p[(i + 1) % p.length];
      if (y1 === y2) continue;
      edges.push([x1, y1, x2, y2]);
    }
  }
  const cov = new Float32Array(w * h);
  const xs = [];
  for (let sy = 0; sy < H * SS; sy++) {
    const y = sy + 0.5;
    xs.length = 0;
    for (const [x1, y1, x2, y2] of edges) {
      const lo = Math.min(y1, y2);
      const hi = Math.max(y1, y2);
      if (y < lo || y >= hi) continue;
      const t = (y - y1) / (y2 - y1);
      xs.push([x1 + t * (x2 - x1), y2 > y1 ? 1 : -1]);
    }
    if (!xs.length) continue;
    xs.sort((a, b) => a[0] - b[0]);
    const py = Math.floor(sy / SS);
    if (py >= h || py < 0) continue;
    let wind = 0;
    let spanStart = -1;
    for (let i = 0; i < xs.length; i++) {
      const before = wind;
      wind += xs[i][1];
      if (before === 0 && wind !== 0) spanStart = xs[i][0];
      else if (before !== 0 && wind === 0) {
        const a = Math.max(0, Math.floor(spanStart / SS));
        const b = Math.min(w - 1, Math.floor(xs[i][0] / SS));
        for (let px = a; px <= b; px++) {
          const x0 = px * SS;
          const x1e = x0 + SS;
          const lo = Math.max(spanStart, x0);
          const hi = Math.min(xs[i][0], x1e);
          if (hi > lo) cov[py * w + px] += (hi - lo) / SS;
        }
        spanStart = -1;
      }
    }
  }
  /* La riga supersample contribuisce 1/SS alla copertura del pixel: si somma
     gia' sopra riga per riga, quindi cov e' gia in unita' di pixel-orizzontali;
     dividendo per SS si ottiene la copertura 0..1 del pixel. */
  for (let i = 0; i < cov.length; i++) cov[i] = Math.min(1, cov[i] / SS);
  return cov;
}

function blit(canvas, cov, colorAt) {
  for (let cy = 0; cy < canvas.h; cy++) {
    for (let cx = 0; cx < canvas.w; cx++) {
      const a = cov[cy * canvas.w + cx];
      if (a <= 0.002) continue;
      const [r, g, b] = colorAt(cx, cy);
      const i = (cy * canvas.w + cx) * 4;
      const da = canvas.data[i + 3] / 255;
      const oa = a + da * (1 - a);
      canvas.data[i] = (r * a + canvas.data[i] * da * (1 - a)) / oa;
      canvas.data[i + 1] = (g * a + canvas.data[i + 1] * da * (1 - a)) / oa;
      canvas.data[i + 2] = (b * a + canvas.data[i + 2] * da * (1 - a)) / oa;
      canvas.data[i + 3] = oa * 255;
    }
  }
}

/* ------------------------------------------------------------------- main */
const fTitle = fontkit.openSync(F_TITLE);
const fClaim = fontkit.openSync(F_CLAIM);

/* Misure del lockup, in pixel finali (il file e' gia' il 2x: si espone
   dimezzato con width/height, cosi' retina lo vede nativo). */
const mono = run('DS', fTitle, 148, -6);
const name = run('DAVIDE SCAGLIA', fTitle, 74, 10);
const claim = run('IMMOBILI A RIVERGARO', fClaim, 30, 9);

const gapMono = 44;      // monogramma → filetto
const gapRule = 44;      // filetto → testo
const gapLines = 26;     // nome → claim

const monoW = Math.ceil(mono.width);
const monoH = Math.ceil(mono.h);
const textW = Math.ceil(Math.max(name.width, claim.width));
const textH = Math.ceil(name.h + gapLines + claim.h);
const H = Math.max(monoH, textH) + PAD * 2;
const ruleX = PAD + monoW + gapMono;
const textX = ruleX + 3 + gapRule;
const W = textX + textW + PAD;

const canvas = { w: W, h: H, data: new Uint8ClampedArray(W * H * 4) };

/* monogramma: centrato in verticale, sfumato in orizzontale */
const monoTop = Math.round((H - monoH) / 2);
blit(canvas, raster(mono, PAD, monoTop + mono.maxY, W, H),
  (x) => {
    const t = Math.min(1, Math.max(0, (x - PAD) / monoW));
    return [
      Math.round(GRAD_A[0] + (GRAD_B[0] - GRAD_A[0]) * t),
      Math.round(GRAD_A[1] + (GRAD_B[1] - GRAD_A[1]) * t),
      Math.round(GRAD_A[2] + (GRAD_B[2] - GRAD_A[2]) * t),
    ];
  });

/* filetto oro verticale, alto quanto il blocco di testo */
const ruleTop = Math.round((H - textH) / 2);
for (let y = ruleTop; y < ruleTop + textH; y++) {
  for (let x = ruleX; x < ruleX + 3; x++) {
    const i = (y * W + x) * 4;
    canvas.data[i] = COL_RULE[0];
    canvas.data[i + 1] = COL_RULE[1];
    canvas.data[i + 2] = COL_RULE[2];
    canvas.data[i + 3] = 235;
  }
}

/* nome e claim, allineati al bordo sinistro del blocco testo */
const nameTop = ruleTop;
blit(canvas, raster(name, textX, nameTop + name.maxY, W, H), () => COL_NAME);
const claimTop = nameTop + Math.ceil(name.h) + gapLines;
blit(canvas, raster(claim, textX, claimTop + claim.maxY, W, H), () => COL_CLAIM);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, pngEncode(W, H, canvas.data));
console.log(`✓ img/brand/logo-rivergaro.png  ${W}×${H} (esporre a ${W / 2}×${H / 2})  ${(fs.statSync(OUT).size / 1024).toFixed(1)}KB`);
