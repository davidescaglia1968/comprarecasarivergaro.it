# STATO_PROGETTO — comprarecasarivergaro.it
Aggiornato: 2026-10-23 · Fase 2 completata, in attesa di approvazione per la Fase 3.

## Decisioni prese (e perché)

| # | Scelta | Motivazione |
|---|---|---|
| 1 | Pagine in `src/pages/*.md` + **shortcode** `::nome { json }`, layout e header/footer in `src/templates/` | Un solo posto per header, footer, `<head>`, JSON-LD e banner: impossibile che due pagine divergano. Il contenuto resta editabile senza toccare l'HTML. |
| 2 | Root del repository = sito pubblicato (niente `/docs`), come `venderecasapiacenza` e `casepodenzano` | Ho letto i due repo fratelli: layout piatto. Coerenza di ecosistema e un solo posto dove guardare. Con `CNAME`+`.nojekyll` in radice gli URL restano puliti (`/immobile/<slug>.html`). |
| 3 | Parser markdown + JSON bilanciato **scritti da zero** in `build.js` (zero dipendenze) | `npm install` su un repo di sole 4 persone che manterrà il sito è il modo più rapido per far morire la build. `node build.js` funziona anche fra tre anni. |
| 4 | `wrapSections()` in build: ogni H2 diventa `<section class="section">` con `id` | Struttura uniforme, ancore della nav sempre valide, zero markup ripetuto a mano. |
| 5 | Token CSS con **gli stessi nomi** di casepodenzano.it (`--bg-primary`, `--pink`, `--blue`…) | Se Davide apre due siti accanto, vede lo stesso sistema. Se serve cambiare un colore, il nome coincide in entrambi. |
| 6 | Nessuna dipendenza da Tailwind CDN | casepodenzano.it carica `cdn.tailwindcss.com` (blocca il rendering). Qui CSS nativo con la stessa palette: brand uguale, LCP migliore, nessun vincolo nuovo. |
| 7 | `localStorage["cookie_consent"]` con valori `accetta` / `tecnici` | Allineato al consenso già dato sugli altri siti: niente doppio banner per lo stesso utente. |
| 8 | `llms.txt` generato dalla build | Convenzione già usata dai due siti fratelli: il file che i motori generativi leggono viene mantenuto automaticamente, non a mano. |
| 9 | `node build.js media` = controllo media | Leggi dimensione **dai byte** del file (PNG/JPEG/WebP): niente ImageMagick. Da Fase 3 alimenta l'array `immagini` e garantisce `width`/`height` veri (CLS). |
| 10 | Privacy + Cookie Policy già scritte; **Termini rimandati** a Fase 4 | Il modulo di ricerca chiedeva un link all'informativa: pubblicare un form senza quel link è un rischio, non una rifinitura. I Termini richiedono scelte legali (foro, responsabilità) che non posso inventare. |
| 11 | Anno di attività rimosso dalla UI e da `foundingDate` | Conflitto reale: brief "2008", entrambi i siti pubblicati "dal 2007". Fino alla tua conferma non espongo nessun anno. |
| 12 | `DA CONFERMARE` come regola di **build**, non di buona volontà | `--check` fallisce se il markup pubblico contiene il segnaposto; i campi null/non confermati producono l'omissione del blocco. |

## Anagrafica verificata (non inventata)

Fonte: `llms.txt` e `index.html` di `casepodenzano.it` / `venderecasapiacenza.it`, letti via API GitHub il 23/10/2026.
Sede **Via Cavallotti 3, 29029 Rivergaro (PC)** · **P.IVA 01493570335** · **REA PC-168637** · tel/WhatsApp **+39 328 693 0033** · **info@immobiliarescaglia.com** · social Instagram/Facebook/LinkedIn/YouTube (da `venderecasapiacenza.it/llms.txt`).
`info@venderecasapiacenza.it` resta un altro indirizzo in uso sull'ecosistema: su questo sito, come da tuo brief, si usa `info@immobiliarescaglia.com`.

## Correzioni a quanto dichiarato in Fase 1

- Contrasto `#ec4899` su `#0a0a0a`: avevo scritto **3.96:1**, il valore corretto è **5.61:1** (e `#3b82f6` 5.38:1, non 6.3:1). Rifacendo il calcolo con la formula WCAG è emerso che il vero problema è il **bianco sopra il rosa (3.53:1)** e sui colori pieni dei badge (2.7–3.7:1): da qui `--pink-text`/`--blue-text` per il testo e badge con colore chiaro su fondo `rgba(10,10,10,.82)`.
- Progetto iniziale con output in `docs/`: sostituito dal root (vedi decisione 2). Le cartelle `docs/assets/img/*` sono state spostate in `img/`.

## Test eseguiti su questa Fase

| Test | Comando | Esito |
|---|---|---|
| Sintassi build | `node --check build.js` | ✅ |
| JSON config parsabile | `node -e "JSON.parse(...)"` | ✅ v0.2.0 |
| Build | `node build.js` | ✅ 4 pagine: index, grazie, legal/privacy, legal/cookie |
| Qualità markup | `node build.js --check` | ✅ "niente segnaposto, nessun link rotto, un H1 per pagina, immagini con dimensioni esplicite" |
| Servizi esterni | `curl` su `http://127.0.0.1:8080/...` | ✅ 200 su `/`, `/grazie.html`, `/legal/*`, `/css/main.css`, `/js/main.js`, `/sitemap.xml`, `/llms.txt`, `/CNAME`, `/.nojekyll` |
| JSON-LD | parse dello script nel `<head>` | ✅ `@graph` con `RealEstateAgent` (indirizzo, taxID, areaServed) — `foundingDate` omesso correttamente |
| Peso pagina | `du -b` | index 18.2KB · CSS 17.4KB · JS 5.8KB (non gzip) |
| Media | `node build.js media` | ✅ `0 file` (nessuna immagine pubblicata, come previsto: nessun dato inventato) |
| Robustezza editoriale | JSON shortcode volutamente invalido | ⚠️→✅ la build avvisa e continua: nessuna pagina rotta |

## Campi aperti ("DA CONFERMARE", nessuno esposto al pubblico)

1. **Anno inizio attività** — 2007 (siti pubblicati) o 2008 (brief)? Blocca il testo "dal …" e `foundingDate`.
2. **Bio acquirenti** per la pagina Chi Sono.
3. **Orari di studio** e indirizzo postale da mettere in privacy (se diverso da Via Cavallotti 3).
4. **`og-image`**: serve un'immagine reale (foto studio Davide o cover con brand). Nessun placeholder grafico inventato.
5. **Attivazione FormSubmit**: al primo invio arriva una mail di attivazione a `info@immobiliarescaglia.com` da confermare. Fino ad allora il form è nel sito ma non va pubblicizzato come attivo.
6. **Termini e Condizioni** (Fase 4) e conservazione dati nelle mailbox.
7. **Immobile segnaposto per collaudare la Fase 3**: preferisci `properties.json` vuoto o un immobile reale **tuo** (stato `Sospeso`, marcato `note_interne: DATO DI TEST - NON PUBBLICARE`) che mi passi tu con foto e prezzi veri?
8. **Cartella immagini/video da monitorare**: percorso, branch o repo. Appena lo inserisci in `media.cartella_incoming`, `node build.js media` diventa il controllo qualità dei tuoi contenuti.
9. **Google Fonts**: al momento CDN + `preconnect` (come da brief). Il self-hosting dei `.woff2` è pronto da attivare in un passaggio se preferisci azzerare il trasferimento di IP.
10. **Verifica Search Console** per il dominio, quando sarà attivo.

## Prossimo passo proposto (Fase 3)

`src/data/properties.json` + schema → generazione `/immobile/<slug>.html` con descrizione "risposta pronta", galleria lightbox nativa, `RealEstateListing`, `catalogo` filtrante via `data/properties.json` pubblicata, rigenerazione automatica sitemap, aggiornamento di `llms.txt`, sezione media→scheda. Nessuna pubblicazione senza conferma dei dati immobili.
