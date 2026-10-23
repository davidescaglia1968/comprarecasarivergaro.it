# DESIGN SYSTEM — comprarecasarivergaro.it

`v0.2.0` · Fase 2 (aggiornato dopo la verifica sui siti fratelli) · tema scuro + gradiente rosa-blu
`source dei dati: src/data/site-config.json` (i valori qui citati ne sono copia dichiarativa: da Fase 3 li inietta `build.js` nel CSS generato, quindi **non mantenere gli stessi dati in due posti**).

---

## 0. Regole non negoziabili

1. **Nessun dato inventato.** Prezzi, recensioni, testimonianze, "4.9/5", "+100 immobili", "a partire da…" sono vietati. Campo non confermato = blocco rimosso dal markup, non segnaposto visibile all'utente.
2. **Catalogo vuoto = CTA "Ricerca personalizzata".** Mai schede demo spacciate per reali.
3. **Un passaggio alla volta.** Ogni fase si chiude con: codice esatto, cosa fa e perché, istruzioni di test, conferma "nessun dato inventato", attesa di approvazione.
4. **HTML5 + CSS3 + JS nativo.** Niente Tailwind, React, WordPress, jQuery.
5. **Coerenza di ecosistema** (riconoscibile come sito di Davide Scaglia) **ma tono da pagina acquirenti**, non da pagina venditori.

---

## 1. Palette (token)

| token CSS | valore | uso |
|---|---|---|
| `--bg-primary` | `#0a0a0a` | sfondo primario (nome identico a casepodenzano.it) |
| `--bg-secondary` | `#1a1a1a` | card, moduli, box |
| `--bg-tertiary` | `#262626` | input, superfici annidate |
| `--line` | `#2e2e2e` | bordi 1px |
| `--text-primary` | `#ffffff` | testo primario (19.8:1) |
| `--text-secondary` | `#a1a1aa` | testo secondario (7.72:1) |
| `--pink` | `#ec4899` | accento di marca (5.61:1 su sfondo) |
| `--pink-strong` | `#db2777` | fondo quando serve testo bianco sopra al rosa (4.60:1) |
| `--pink-text` | `#f472b6` | testo rosa su scuro (7.48:1) |
| `--blue` | `#3b82f6` | link e testo blu (5.38:1) |
| `--blue-text` | `#93c5fd` | link su scuro ad alto contrasto (10.98:1) |
| `--grad` | `linear-gradient(135deg,#ec4899 0%,#3b82f6 100%)` | hero, bordi attivi, underline titoli, CTA primarie |
| `--ok` / `--warn` / `--bad` + `-text` | `#16a34a` `#d97706` `#b91c1c` / `#4ade80` `#fbbf24` `#fca5a5` | badge Disponibile · In trattativa · Venduto |

**Contrasto — misura, non supposizione.** Correzione pubblica di Fase 1: avevo calcolato `#ec4899 = 3.96:1`, era sbagliato. Valori reali su `#0a0a0a` (formula WCAG, verificata con script in build): **rosa 5.61:1 ✅, blu 5.38:1 ✅, testo secondario 7.72:1 ✅**. Il punto critico è invece il **bianco sopra il rosa: 3.53:1** → per questo i bottoni usano il gradiente con testo **grande/semigrande** (15-16px bold è "large text" solo sopra 18.66px, quindi abbiamo aggiunto varianti dedicate) e i badge di stato usano il **colore chiaro come testo** su fondo `rgba(10,10,10,.82)` invece di "testo bianco su colore pieno" (che sarebbe stato 2.7-3.7:1). Regola pratica: **testo piccolo su `--grad` solo se ≥18px bold; altrimenti usa `--pink-text` o `--blue-text` su sfondo scuro.**
**Stato di focus.** `:focus-visible { outline: 2px solid #60a5fa; outline-offset: 3px; }` su ogni elemento interattivo; mai `outline: none` senza sostituto visibile.
**Verifica:** in Fase 5 con Lighthouse + axe DevTools su home, catalogo, scheda, contatti.

---

## 2. Tipografia

- **Playfair Display** (500/700) → titoli, prezzi in evidenza, numeri di sezione.
- **Inter** (400/500/600) → testo, label, bottoni, tabella caratteristiche. *(Nota: venderecasapiacenza.it usa "DM Sans"; qui Inter come da brief — la differenza è voluta e documentata in STATO_PROGETTO.md.)*
- `font-display: swap` e preconnect obbligatori:
  `<link rel="preconnect" href="https://fonts.googleapis.com">` · `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
  In Fase 2 valutiamo il **self-hosting dei `.woff2`**: risolve insieme LCP e l'osservazione GDPR sul trasferimento dell'IP (vedi `privacy_cookie.servizi_attivi` nel config).
- Scala mobile-first con `clamp()`:
  `display` 2 → 3rem /700/1.08 · `h1` 1.75 → 2.25rem · `h2` 1.375 → 1.75rem · `h3` 1.125 → 1.25rem · `body` 1rem /1.65 · `small` .875rem (mai sotto .8125rem).
- Prezzi e superfici: `font-variant-numeric: tabular-nums` per allineare le cifre nelle card.
- `letter-spacing: -.01em` sui titoli, `0` sul testo. Larghezza paragrafi max `68ch`.

---

## 3. Layout e spazio

Contenitore `min(1120px, 92vw)`. Spazi in multipli di 4 (`--s1…--s8` = 4/8/16/24/32/48/64/96).
Breakpoint `640px / 900px / 1200px`. Griglia catalogo `repeat(auto-fill, minmax(300px, 1fr))`.
Sezioni alternate `--bg` / `--surface` per creare ritmo senza card-in-card.
**Un solo H1 per pagina**, gerarchia H2→H3 senza salti (importante sia per screen reader sia per i motori generativi).

---

## 4. Componenti

- **Header** — logo testuale "Davide Scaglia" + micro-claim "Case a Rivergaro"; nav: Immobili · Ricerca personalizzata · Zone · Guide · Chi sono · Contatti; CTA `tel:` sempre visibile su mobile.
- **Hero acquirenti** — H1 a domanda ("Cerchi casa a Rivergaro in Val Trebbia?"), sottotitolo 40-60 parole, due CTA: primaria "Raccontami che casa cerchi", secondaria "Vedi gli immobili". Vietata la finta urgenza ("ultima occasione", "1 rimasta") e i countdown.
- **Card immobile** — immagine 16:10, badge stato in alto a sinistra, titolo link come H3, riga prezzo + mq + locali, zona, max 3 caratteristiche, "aggiornato il …" da `data_modifica`. Hover: bordo `--grad` + `translateY(-2px)` (solo `@media (hover: hover)`).
- **Badge stato** — pill con bordo 1px e colore da `catalogo.badge_stato`, `aria-label="Stato: Disponibile"`. Il colore non è l'unico canale: c'è sempre la parola.
- **Modulo** — label sopra il campo, `inputmode`/`autocomplete` corretti, `required` reale, messaggio d'errore testuale accanto al campo (mai solo colore), `action` FormSubmit in POST, checkbox di presa visione privacy con link.
- **CTA sito madre** — banner sobrio **solo** in homepage e in fondo alle pagine editoriali: "Stai anche valutando di vendere? → venderecasapiacenza.it". Non in header e non dentro la scheda immobile: lì l'obiettivo è la richiesta di visita.
- **Lightbox** — JS nativo su `<dialog>`: frecce, `Esc`, focus trap, contatore "3 di 8", `aria-modal`.
- **Banner cookie** — due scelte ("Essenziali" / "Accetta"), chiavi in `localStorage` da `privacy_cookie.banner.storage_key`; gli script non essenziali vengono innestati solo dopo "Accetta".
- **Stato "non più disponibile"** — barra neutra in testa alla scheda Venduto/Sospeso/Ritirato con la dicitura dello stato e la proposta di ricerca personalizzata; il prezzo non è esposto come offerta corrente, l'URL resta stabile (nessun 404, nessun redirect).

---

## 5. Immagini

- **WebP** primario (`AVIF` solo se la build lo supporta senza librerie esterne).
- Naming SEO: `villa-giardino-rivergaro-1.webp` → `<slug>-<descrittore>-<indice>.webp`, solo caratteri ASCII (le cartelle fisiche usano `docs/assets/img/proprieta/<slug>/`, senza accentini per evitare problemi di encoding negli URL).
- **`width` e `height` espliciti sempre**, per azzerare il CLS.
- `loading="lazy" decoding="async"` sotto la piega; `fetchpriority="high"` + `loading="eager"` sulla prima immagine della scheda (è l'LCP).
- `alt` descrittivo in italiano, mai il nome file e mai "immagine 1".
- Se non esiste una foto reale dell'immobile si mostra il blocco "foto in preparazione": **nessuna immagine stock** spacciata per la casa.

---

## 6. Performance budget

LCP < 2.5s · INP < 200ms · CLS < 0.1 · JS total < 30KB min+gzip (nessuna libreria) · CSS critico inline **solo** nelle pagine `/immobile/*.html` · peso sopra la piega < 300KB · immagini servite con dimensioni reali (no 2000px in una card da 380px).

---

## 7. Linguaggio (tono acquirenti)

"Ti seguo dalla ricerca alla firma", non "portiamo il tuo immobile al miglior offerente". Seconda persona singolare, frasi da 15-20 parole, nessuna promessa su tempi o prezzi.
Il blocco sotto i 200 caratteri deve essere una **risposta autonoma** (serve anche ai motori generativi) nell'ordine: *cosa* è, *dove* si trova, *per chi* è adatta, *numero* con unità di misura (mq, locali, prezzo).

---

## 8. Convenzioni di codice e nomi

Cartelle minuscole, file `kebab-case`, URL immobile `/immobile/<slug>.html` con **slug stabile** (mai rinumerato dopo la pubblicazione). JSON con chiavi in italiano secondo lo schema di `properties.json`; `note_interne` mai renderizzate. Ogni pagina: `<title>` unico ≤60car, `meta description` unica ≤155car, `link rel=canonical` assoluto, `og:*`, `JSON-LD` nel `<head>`.
`build.js` usa solo moduli Node integrati (`fs`, `path`) — nessun `npm install` richiesto per rigenerare il sito.

---

## 9. Definition of Done di ogni fase

1. Codice esatto dei file creati/modificati.
2. Spiegazione di cosa fa e perché.
3. Istruzioni per testarlo in locale (`python3 -m http.server -d docs 8080` oppure `npx serve docs`).
4. Conferma esplicita: nessun dato immobiliare o di contatto inventato.
5. Attesa dell'approvazione prima della fase successiva.

---

## 10. Allineamento con l'ecosistema (verificato sui siti pubblicati, 23/10/2026)

Letti direttamente i sorgenti di `venderecasapiacenza.it` e `casepodenzano.it`. Conseguenze sul design:

| Aspetto | Ecosistema |Questo sito | Motivo |
|---|---|---|---|
| Palette scura | `--bg-primary #0a0a0a`, `--bg-secondary #1a1a1a`, `--bg-tertiary #262626`, `--text-secondary #a1a1aa`, `--pink #ec4899`, `--blue #3b82f6` | **stessi nomi e stessi valori** | Riconoscibilità immediata + manutenzione unica |
| Testo su scuro | `--text-primary #ffffff` | idem | — |
| Font | Playfair Display + **DM Sans** (vendere) / **Inter** (podenzano) | Playfair + Inter | Il satellite acquirenti è gemello di casepodenzano.it |
| CSS | casepodenzano.it carica **Tailwind da CDN** | **zero framework**, CSS nativo con gli stessi token | Il brief lo vieta e il CDN è il collo di bottiglia LCP |
| Chiave consenso | `localStorage["cookie_consent"]`, valori `accetta`/`tecnici` | **identica** | Chi ha già scelto su casepodenzano.it non rivede il banner |
| Dati strutturati | `RealEstateAgent` + `RealEstateListing` + `FAQPage`, con `taxID`, `address`, `areaServed` come `City` | stesso impianto, stessi `@id` | Coerenza di entità per Google e per i motori generativi |
| `llms.txt` | presente su entrambi | presente, generato dalla build | GEO |
| NAP | Davide Scaglia · Via Cavallotti 3, 29029 Rivergaro (PC) · +39 328 693 0033 · info@immobiliarescaglia.com · P.IVA 01493570335 · REA PC-168637 | **identico** | Un solo errore da correggere se cambia |

**Anno di inizio attività: conflitto aperto.** Il brief dice *2008*, i due siti pubblicati dicono *dal 2007*. Finché non confermi, la UI non scrive nessun anno e `foundingDate` è omesso dal JSON-LD (meglio un campo in meno che un campo sbagliato in tutto l'ecosistema).

## 11. Media (immagini e video) — regole operative

- Struttura nel repository: `img/<slug-immobile>/*.webp`, `video/<slug-immobile>/*.mp4`; `img/legale/` per documenti da mostrare (planimetrie, atestati) e **mai** in galleria pubblica; `img/_in/` è il nastro di raccolta.
- **Chi immette i file non tocca l'HTML.** Depositi i file (o mi indichi il percorso/branch) e `node build.js media` produce `img/manifest.json` + `MEDIA_RAPPORTO.md` con: dimensioni reali lette dai byte del file (PNG/JPEG/WebP, senza librerie), peso, nome non conforme, immagine >2600px o >400KB, estensione da convertire, raggruppamento per immobile. Da Fase 3 gli stessi dati compilano l'array `immagini` di `properties.json`.
- Un immobile senza foto reale mostrata = blocco **"Foto in preparazione"**, mai stock photo.
- Naming: `<slug>-<cosa>-<n>.webp` in ASCII (`villa-giardino-rivergaro-1.webp`), minuscole, niente spazi né parentesi (i file `1 (1).jpg` di casepodenzano.it finiscono URL-encoded e sono ingestibili nei log e negli script).
- Video: `mp4` H.264 + poster WebP, `<video controls preload="none" poster="…">`, mai autoplay con audio, mai più di un video sopra la piega (pesa su LCP).
- `width`/`height` sempre quelli veri del file: è l'unica difesa seria contro il CLS.
