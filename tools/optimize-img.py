#!/usr/bin/env python3
"""Allegerisce le immagini webp del sito senza toccare i nomi file.

Uso:  python3 tools/optimize-img.py            (serve Pillow: pip install Pillow)

Regole decise il 09/11/2026 per la scheda villa (32 MB di immagini, pagina da
246 KB di HTML): le thumbnail (-thumb.webp) scendono a massimo 640 px di larghezza
(bastano per le card anche su retina) e qualita' 68; le immagini intere a massimo
1600 px (sopra i 1600 non le mostra nessuno, e l'og:image resta valido) e qualita'
72. Si riscrive un file solo se la versione nuova pesa meno dell'originale, cosi'
un passaggio ripetuto non degrada mai due volte la stessa immagine. Le dimensioni
in pixel cambiano: build.js le rilegge dai file e aggiorna da solo width/height
nell'HTML e nel manifesto, quindi nessun markup da toccare a mano.
"""
import glob
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit('serve Pillow: pip install Pillow')

REGOLE = [('-thumb.webp', 640, 68), ('', 1600, 72)]  # suffisso, larghezza max, qualità


def regola(nome):
    for suff, w, q in REGOLE:
        if suff and nome.endswith(suff):
            return w, q
    return REGOLE[-1][1], REGOLE[-1][2]


def main():
    prima = 0
    dopo = 0
    toccati = 0
    for f in sorted(glob.glob('img/*/*.webp')):
        wmax, q = regola(os.path.basename(f))
        prima += os.path.getsize(f)
        im = Image.open(f).convert('RGB')
        if im.width > wmax:
            h = round(im.height * wmax / im.width)
            im = im.resize((wmax, h), Image.LANCZOS)
        out = f + '.tmp.webp'
        im.save(out, 'WEBP', quality=q, method=6)
        new = os.path.getsize(out)
        old = os.path.getsize(f)
        if new < old:
            os.replace(out, f)
            dopo += new
            toccati += 1
        else:
            os.remove(out)
            dopo += old
    print(f'immagini: {toccati} alleggerite, {prima // 1024} KB → {dopo // 1024} KB')


if __name__ == '__main__':
    main()
