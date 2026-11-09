#!/usr/bin/env node
/* ---------------------------------------------------------------------------
 * Genera le risorse di marca che mancano al sito, senza dipendenze esterne:
 *
 *   src/brand/favicon.ico           32×32  (ICO con PNG RGBA dentro)
 *   src/brand/apple-touch-icon.png 180×180  (opaco: iOS non gradisce trasparenza)
 *
 * Perche' esiste: /favicon.ico restituiva la pagina 404 (35KB di HTML con status
 * 404) a ogni visita. Nessuna grafica inventata: l'icona e' la stessa gia'
 * disegnata inline nel <link rel="icon"> del sito (quadrato arrotondato #0a0a0a
 * + profilo di casa #d4a520), rasterizzata qui con antialias a 4×4 sottopixel.
 *
 * Uso:  node tools/make-brand-assets.js
 * ------------------------------------------------------------------------- */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'src', 'brand');
const LOGO = path.join(ROOT, 'img', 'brand', 'logo-davide-scaglia-rivergaro.png');

const BG = [10, 10, 10];        /* --bg-primary  #0a0a0a */
const GOLD = [212, 165, 32];    /* oro del favicon inline #d4a520 */


/* ------------------------------------------------------------------ crc32 */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ------------------------------------------------------------- png encode */
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
/* pixels: Uint8Array w*h*4 (RGBA) */
function pngEncode(w, h, pixels) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; /* filtro None: semplice e comprime bene su aree piatte */
    pixels.copy ? pixels.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
      : Buffer.from(pixels.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   /* bit depth */
  ihdr[9] = 6;   /* colour type: RGBA */
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------- png decode */
function pngDecode(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('non e\' un PNG');
  let i = 8, w = 0, h = 0, depth = 0, colour = 0, interlace = 0;
  const idat = [];
  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('ascii', i + 4, i + 8);
    const data = buf.slice(i + 8, i + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      depth = data[8]; colour = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    i += 12 + len;
  }
  if (depth !== 8 || interlace !== 0 || (colour !== 2 && colour !== 6)) {
    throw new Error(`PNG non supportato dal decoder (depth ${depth}, colour ${colour}, interlace ${interlace})`);
  }
  const ch = colour === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(w * h * 4);
  const stride = w * ch;
  const prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.slice(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = Buffer.from(line);
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0;
      let v = cur[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[x] = v & 0xff;
    }
    for (let x = 0; x < w; x++) {
      out[(y * w + x) * 4] = cur[x * ch];
      out[(y * w + x) * 4 + 1] = cur[x * ch + 1];
      out[(y * w + x) * 4 + 2] = cur[x * ch + 2];
      out[(y * w + x) * 4 + 3] = ch === 4 ? cur[x * ch + 3] : 255;
    }
    cur.copy(prev);
  }
  return { w, h, data: out };
}

/* ---------------------------------------------------------------- disegno */
/* Distanza con segno da un segmento: serve per il tratto del profilo di casa. */
function distSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx, qy = y1 + t * dy;
  return Math.hypot(px - qx, py - qy);
}
/* Rettangolo arrotondato: distanza con segno (negativa = dentro). */
function distRoundRect(px, py, cx, cy, hw, hh, r) {
  const dx = Math.abs(px - cx) - (hw - r), dy = Math.abs(py - cy) - (hh - r);
  const ax = Math.max(dx, 0), ay = Math.max(dy, 0);
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(ax, ay) - r;
}
function put(px, x, y, w, h, rgb, alpha) {
  if (x < 0 || y < 0 || x >= w || y >= h || alpha <= 0) return;
  const i = (y * w + x) * 4;
  const a = Math.max(0, Math.min(1, alpha));
  px[i] = Math.round(px[i] * (1 - a) + rgb[0] * a);
  px[i + 1] = Math.round(px[i + 1] * (1 - a) + rgb[1] * a);
  px[i + 2] = Math.round(px[i + 2] * (1 - a) + rgb[2] * a);
  px[i + 3] = 255;
}
/* La stessa figura del favicon inline del sito: viewBox 32, rect rx=7 #0a0a0a,
   path "M4 14 L16 4 L28 14 V28 H4 Z" stroke #d4a520 width 2, senza fill.
   `size` e' la dimensione di destinazione: le coordinate sono scalate di size/32
   e il tratto viene campionato a 4×4 sottopixel per bordo per un antialias pulito. */
function drawIcon(size, opaque) {
  const px = Buffer.alloc(size * size * 4);
  if (opaque) for (let i = 0; i < size * size; i++) { px[i * 4] = BG[0]; px[i * 4 + 1] = BG[1]; px[i * 4 + 2] = BG[2]; px[i * 4 + 3] = 255; }
  const s = size / 32, r = 7 * s, stroke = 2 * s, half = stroke / 2;
  const pts = [[4, 14], [16, 4], [28, 14], [28, 28], [4, 28], [4, 14]].map(([x, y]) => [x * s, y * s]);
  const SS = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bg = 0, gold = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px_ = x + (sx + 0.5) / SS, py_ = y + (sy + 0.5) / SS;
          /* fuori dal riquadro arrotondato: trasparente, tranne quando serve opaco */
          if (distRoundRect(px_, py_, size / 2, size / 2, size / 2, size / 2, r) > 0) { if (opaque) { bg += 1; continue; } continue; }
          bg += 1;
          let d = Infinity;
          for (let k = 0; k < pts.length - 1; k++) {
            d = Math.min(d, distSegment(px_, py_, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]));
          }
          if (d <= half) gold += 1;
        }
      }
      const tot = SS * SS;
      if (!bg) continue;
      put(px, x, y, size, size, BG, bg / tot);
      if (gold) put(px, x, y, size, size, GOLD, gold / tot);
    }
  }
  return px;
}
/* ICO con un PNG RGBA incorporato (formato ammesso da Vista in poi). */
function ico(pngBuf, size) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size; entry[1] = size >= 256 ? 0 : size;
  entry[2] = 0; entry[3] = 0;
  entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuf.length, 8); entry.writeUInt32LE(22, 12);
  return Buffer.concat([head, entry, pngBuf]);
}
/* ------------------------------------------------------------------- main */
module.exports = { pngEncode, pngDecode, crc32, chunk, put };

if (require.main === module) main();

function main() {
fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(LOGO)) { console.error('Manca ' + LOGO); process.exit(1); }

const fav32 = pngEncode(32, 32, drawIcon(32, false));
fs.writeFileSync(path.join(OUT, 'favicon.ico'), ico(fav32, 32));
fs.writeFileSync(path.join(OUT, 'apple-touch-icon.png'), pngEncode(180, 180, drawIcon(180, true)));

for (const f of ['favicon.ico', 'apple-touch-icon.png']) {
  const q = path.join(OUT, f);
  console.log('✓ src/brand/' + f + '  ' + (fs.statSync(q).size / 1024).toFixed(1) + 'KB');
}
}
