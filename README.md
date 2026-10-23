# comprarecasarivergaro.it
Sito immobiliare per chi cerca casa a Rivergaro - Davide Scaglia - Comprare Casa a Rivergaro

---

---

## Stato: Fase 2 completata (in attesa di verifica)

| Fase | Contenuto | Stato |
|---|---|---|
| 1 | Struttura, `site-config.json`, `DESIGN_SYSTEM.md` | ✅ approvata |
| 2 | `build.js`, layout, header/footer, hero acquirenti, CSS nativo, banner cookie, modulo di ricerca, Privacy + Cookie, `llms.txt`, `sitemap.xml`, check automatici | ✅ **da verificare** |
| 3 | `properties.json` + pagine `/immobile/<slug>.html`, catalogo filtrante, lightbox, JSON-LD per immobile | ⏳ |
| 4 | Ricerca dedicata, hub Zone, Contatti, Termini, test | ⏳ |
| 5 | `STATO_PROGETTO.md`, accessibilità/performanze, guida "nuovo immobile" | ⏳ |

### Layout del repository (root = GitHub Pages, come i siti fratelli)

```
index.html  grazie.html  sitemap.xml  llms.txt  robots.txt?  CNAME  .nojekyll   ← generati (non editarli)
css/main.css  js/main.js                                                        ← generati
img/<slug>/*.webp   video/<slug>/*.mp4   img/_in/   img/legale/                ← media reali (nessuno stock)
src/css/main.css  src/js/main.js  src/templates/*  src/pages/*.md  src/data/*.json  ← SORGENTI da editare
build.js   DESIGN_SYSTEM.md   STATO_PROGETTO.md   MEDIA_RAPPORTO.md
```

### Comandi

```bash
node build.js            # rigenera HTML/CSS/JS + sitemap + llms.txt
node build.js --check    # build + verifica: link rotti, "DA CONFERMARE" nel pubblico, H1, width/height
node build.js media      # scansiona img/ e video/ → img/manifest.json + MEDIA_RAPPORTO.md
npm run serve            # anteprima locale su :8080 (equivalente: python3 -m http.server 8080)
```

**Regola d'oro di manutenzione:** si editano **solo** i file in `src/`. `index.html`, `css/`, `js/`, `sitemap.xml`, `llms.txt` sono output: se li cambi a mano, la build li sovrascrive.

### Deploy (una volta sola)

GitHub → Settings → Pages → **Source: Deploy from a branch** → `main` / **`/(root)`**. Il repository contiene già `CNAME` (`comprarecasarivergaro.it`) e `.nojekyll` (necessario perché i `.json` non vengano scartati). DNS: `A` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; `CNAME` `www` → `davidescaglia1968.github.io`; poi **Enforce HTTPS**.

### Dati non ancora confermati (vedi `STATO_PROGETTO.md`)

Anno di attività (2007 vs 2008) · bio dell'agente · orari studio · `og-image` · attivazione FormSubmit · Termini e Condizioni · elenco immobili (nessuno inserito). Ogni campo "DA CONFERMARE" viene **omesso** dal markup pubblico, non mostrato.

### Immagini e video

`node build.js media` è il mio strumento di controllo: legge le dimensioni reali dai byte dei file (PNG/JPEG/WebP) senza dipendenze, segnala formati da convertire, pesi oltre budget (400KB), nomi non `kebab-case`, immagini sopra 2600px, e raggruppa per `slug` di cartella. Dimmi solo **dove** sono i file da pubblicare (cartella locale, branch, repo) e li smisto io: rinomina in SEO-friendly, conversione, aggiornamento di `properties.json`.

