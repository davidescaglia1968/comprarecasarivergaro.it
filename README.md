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


---

## Media e descrizioni: come me li passi (regola operativa)

Non devi preparare nulla di formattato. **Depositami i file così come sono** e il resto lo faccio io con la build.

```
img/_in/                     ← qui butti foto e video di qualsiasi immobile, anche coi nomi
                                 del portale o del telefono (es. "1 (3).jpg", "WhatsApp Video 2026-09-01.mp4")
img/<slug>/                  ← dove finiscono, ordinati, quando lo slug è deciso
video/<slug>/                ← idem per i video
src/media/<slug>.md          ← la tua descrizione libera: metratura, stato, cosa hay da sapere
img/legale/                  ← planimetrie, atti, pezzami da mostrare solo se serve (mai in galleria)
```

Dopo ogni caricamento:

```bash
node build.js media
```

Ti restituisce **`MEDIA_RAPPORTO.md`** con, per ogni file:
- **dimensioni reali lette dentro il file** (PNG/JPEG/WebP) → da Fase 3 sono i `width`/`height` che metto nell'HTML, così non c'è salto di layout (CLS)
- peso, e **avviso automatico** se supera 400KB o se un lato va oltre 2600px (troppo grande = pagina lenta)
- **nome non conforme** (proposta in `kebab-case`, niente spazi né parentesi: i nomi tipo `1 (1).jpg` di casepodenzano.it rompono gli script)
- estensione **da convertire** in WebP
- file in `img/_in/` **senza immobile assegnato** (te li segnalo: non publico niente senza lo slug giusto)
- la riga `<img …>` già pronta con i valori veri

Inoltre genera **`src/data/properties.draft.json`**: la struttura delle schede con `immagini` già riempiti e **tutti i valori anagrafici vuoti o "DA CONFERMARE"** (prezzo, mq, locali, classe, titolo). Non inventa niente: compili tu (o me li detti), la bozza diventa `properties.json` e la build pubblica.

**Cosa ti chiedo per ogni immobile**, alla fine: `titolo`, `prezzo`, `superficie`, `locali`, `tipologia`, `zona/frazione`, 3-6 `caratteristiche`, 2-4 righe di descrizione (le prime ~200 caratteri le riscrivo come "risposta pronta" per SEO e motori generativi, ma solo con i tuoi dati), `stato`.
