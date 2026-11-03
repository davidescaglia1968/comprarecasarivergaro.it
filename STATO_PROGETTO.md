# STATO_PROGETTO — comprarecasarivergaro.it
Aggiornato: 2026-10-23 (sera) · **Fase 3 anticipata su richiesta**: prima scheda reale (bozza) visibile e pubblicabile. Fase 2 e anagrafica da visura: complete.

## Pubblicazione (23/10/2026, ore serali)

Sito pubblicato su GitHub Pages dal root del ramo `main`, dominio `comprarecasarivergaro.it` (CNAME + `.nojekyll` nel repo, `robots.txt` e `404.html` generati dalla build).

**Scelta presa insieme a Davide:** la scheda ANC-001 esce **già indicizzata** (`bozza:false`) anche se priva di prezzo, superfici e foto. Motivazione: una pagina `noindex` non viene considerata da Google e non accumula nulla, mentre una pagina vera e parziale può essere aggiornata nel tempo. Conseguenze applicate per non ingannare nessuno:
- nessun campo vuoto esposto (non esiste "0 locali" o "— m²"), nessun valore ipotizzato;
- in vece del prezzo: **"Prezzo riservato"** nella scheda e **"Prezzo riservato — da confermare con il proprietario"** nella card;
- nel testo della scheda una riga che dice che prezzo, superfici e dati tecnici arrivano con la conferma del proprietario;
- `publish_policy` in config: se una scheda resta senza prezzo oltre 14 giorni, stato "Riservato" e fuori da catalogo;
- ogni nuovo dato aggiorna `data_modifica` → `lastmod` in sitemap + "scheda aggiornata il": è qui il segnale di freschezza che Davide si aspetta, non nelle parole in più.

## Fase 3 — cosa è stato costruito e come si comporta la bozza

Prima scheda inserita: `villa-tre-unita-ancarano` (rif. `ANC-001`). Il testo è **quello scritto da Davide, alla lettera**; `bozza: true` perche' mancano prezzo, superfici, locali, stato catastale, APE e foto.

Meccanismo "bozza" (deciso per farti vedere l'impaginazione senza pubblicizzare dati incompleti):

| Dove | Bozza (`bozza: true`) | Scheda completa |
|---|---|---|
| Pagina `/immobile/<slug>.html` | generata, con tag "ANTEPRIMA INTERNA · BOZZA" | generata, nessun tag |
| `<meta robots>` | `noindex, nofollow` | `index, follow` |
| `sitemap.xml` | **esclusa** | inclusa |
| `llms.txt` | **esclusa** | inclusa |
| Home + `immobili.html` | visibile **solo se** `catalogo.anteprima_bozze = true` (ora true, con badge tratteggiato "BOZZA") | sempre visibile |
| `data/properties.json` (filtri) | inclusa come dato strutturale, valori nulli | completa |
| JSON-LD `RealEstateListing` | `address`, `identifier`, `name`, `description` | + `offers.price`, `floorSize`, `numberOfRooms`, `image` |

`offers` viene emesso **solo se esiste un prezzo numerico**: un `Offer` senza `price` sarebbe markup dichiarato e non veritiero, quindi viene omesso del tutto (non compilato con 0 né con "su richiesta").
**Prima di puntare il dominio sul sito: mettere `catalogo.anteprima_bozze: false`** o completare la scheda — cosi' nulla di incompleto resta esposto.

`node build.js --check` verifica anche questo: se una pagina `bozza` finisse in sitemap o contenesse `DA CONFERMARE`, la build fallisce.

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

## Arrivata la visura camerale (23/10/2026) — dati aggiornati

Estratto in `PROFESSIONISTA.md` (non pubblicato), riversato in `site-config.json`:

| Campo | Prima | Ora (verificato) |
|---|---|---|
| Sede | "DA CONFERMARE" (presi Via Cavallotti 3 dal llms.txt) | Via Felice Cavallotti 3, 29029 Rivergaro (PC) — **frazione Pieve Dugliara** |
| P.IVA / REA | da llms.txt | 01493570335 / PC-168637 (confermati) |
| Iscrizione ruolo | assente | **Ruolo Agenti di Affari in Mediazione, sez. Agenti Immobiliari, PC — 07/12/2007** |
| Denominazione | "Davide Scaglia — Consulente Immobiliare" | **Immobiliare Scaglia di Scaglia Davide**, impresa individuale, piccolo imprenditore |
| PEC | assente | **immobiliarescaglia@pec.it** (in footer e Privacy; il vecchio d.scaglia@pec.it è solo storico) |
| **Anno "2007 vs 2008"** | conflitto aperto, anno omesso | **Risolto**: attività dal **12/12/2007** (e ruolo dal 07/12/2007), Registro Imprese 21/05/2008. Il sito dice "dal 2007", `foundingDate: 2007` |
| Attività | — | Agenzia di mediazione immobiliare, ATECO 68.31.00, 1 addetto |

**Privacy by build:** codice fiscale della persona fisica, data/luogo di nascita e protocollo della visura sono in una **lista di blocco**: `privacyGuard()` scansiona ogni HTML pubblicato (+ `llms.txt`, `sitemap.xml`) e **fallisce la build** se uno di quei valori esce. Testato in negativo: ho iniettato le tre stringhe in `grazie.md` → la build ha risposto `✗ PRIVACY … → non pubblicabile` (4 problemi), poi ho rimosso il test.

## Nuove capacità di Fase 2 (dopo la visura)

- `node build.js media` → `MEDIA_RAPPORTO.md` + `src/data/properties.draft.json`: dimensioni **lette dai byte del file** (PNG/JPEG/WebP, senza ImageMagick), peso, nominativi da correggere, foto >2600px o >400KB, file in `img/_in/` senza immobile assegnato, riga `<img width height>` già pronta.
- Bozza dati generata **senza valori inventati**: campi anagrafici `null`/`DA CONFERMARE`, array immagini già popolato. Diventa `properties.json` solo dopo la tua conferma.
- `--check` non ricompila più: è un comando di sola verifica, cosi' lo puoi lanciare mille volte senza toccare i file.

## Note di contenuto decise da Davide (23/10/2026)

- **"Niviano" rimossa dall'elenco zone**: non pertinente. Era finita nella home perche' il copy ripeteva l'elenco delle frazioni del config. Doppio intervento: (1) l'elenco in `site-config.json` ora e' quello che mi hai indicato (Pieve Dugliara per prima, perche' li c'e' la sede; niente Niviano); (2) **la home non elenca piu' frazioni a mano**: il copy dice solo "tutto il comune di Rivergaro e l'asta della Val Trebbia, sede in frazione Pieve Dugliara". Regola in config: `elenco_in_ui = solo filtri e pagina zona, mai nel copy fisso`, cosi' il nome di una frazione non puo' piu' saltar fuori dove non serve.
- **Regola pagine-frazione** (`zone_policy`): una pagina per frazione esiste solo con contenuto originale e verificabile fornito da Davide; fino ad allora la frazione e' solo un valore di filtro. Evitiamo pagine-satellite scritte a mano dai motori di riempimento.
- **Primo annuncio in arrivo**: casa/villa con 3 unita abitative + terreno circostante. Nessun dato ancora inserito. Template per il testo e per i nominativi delle cartelle: `src/media/_TESTO-ANNUNCIO.md`.

## Campi aperti ("DA CONFERMARE", nessuno esposto al pubblico)

2. **Bio acquirenti** per la pagina Chi Sono.
3. **Orari di studio** e indirizzo postale da mettere in privacy (se diverso da Via Cavallotti 3).
4. **`og-image`**: serve un'immagine reale (foto studio Davide o cover con brand). Nessun placeholder grafico inventato.
5. **Attivazione FormSubmit**: al primo invio arriva una mail di attivazione a `info@immobiliarescaglia.com` da confermare. Fino ad allora il form è nel sito ma non va pubblicizzato come attivo.
6. **Termini e Condizioni** (Fase 4) e conservazione dati nelle mailbox.
6. **Immobile segnaposto per collaudare la Fase 3**: aspetto i tuoi file in `img/_in/` + descrizione. Con loro la scheda si collauda su dati veri, non su un demo.
8. **Cartella immagini/video da monitorare**: percorso, branch o repo. Appena lo inserisci in `media.cartella_incoming`, `node build.js media` diventa il controllo qualità dei tuoi contenuti.
9. **Google Fonts**: al momento CDN + `preconnect` (come da brief). Il self-hosting dei `.woff2` è pronto da attivare in un passaggio se preferisci azzerare il trasferimento di IP.
10. **Verifica Search Console** per il dominio, quando sarà attivo.

## Verifica del pubblicato e correzioni (28/10/2026)

- **Il sito e' vivo**: `https://comprarecasarivergaro.it/` risponde in HTTPS e mostra la versione corrente di `main` (titolo di prima della correzione copy, galleria villa con le foto reali). `sitemap.xml` online riporta i 5 URL indicizzati, compresa la scheda `immobile/villa-tre-unita-ancarano.html`.
- **Checker di link irrobustito** (`--check`): prima verificava solo che il *file* citato da un link esistesse. Ora verifica anche che **l'ancora punti a un paragrafo reale** (`id="..."` presente nella pagina di destinazione) e lo fa su ogni pagina generata, perche' `#la-villa-non-fa-per-te` era finito in `immobili.html` e nella scheda dove non esiste nessun paragrafo con quell'id.
- **Nav e footer non possono piu' puntare nel vuoto**: `anchorHref()` cerca l'ancora nella pagina richiesta, poi nelle pagine elencate in `site-config.json` → `navigazione.pagine_ancore`; se nessuna pagina ha quel paragrafo ne cerca uno utile di riserva e, in ultimo, **rinuncia alla voce di menu** invece di pubblicare un link morto. Le voci `Zone` e `Guide` sono quindi momentaneamente assenti perche' quelle pagine non esistono ancora (Fase 4).
- **Id e ancore in ASCII** (regola gia' scritta nel design system per i nomi dei file, estesa ai paragrafi): `slugify()` toglie gli accenti, quindi un titolo con accento genera un id senza accento, che si puo' scrivere a mano e non finisce percent-encoded negli URL.
- **Ancora che segue il titolo, non il contrario**: `anchorRicerca()` legge `site-config.json` → `navigazione.ancora_ricerca` e tutti i pulsanti "Raccontami che casa cerchi" (menu, footer, card della scheda, catalogo, stato vuoto, blocco guide) vengono generati da li'. Prima lo stesso `#la-villa-non-fa-per-te` era riscritto a mano in sei punti: basta un titolo cambiato per averne cinque vecchi.
- **`## Titolo {#mia-ancora}`**: un titolo di paragrafo puo' cambiare restando raggiungibile. Il test di regressione fatto oggi: cambiando "La villa non fa per te?" in un titolo senza parole in comune, le voci di menu si **rimuovono** con un avviso invece di restare link morti; condividendo due parole, il link viene riagganciato al paragrafo giusto con l'avviso `⚠ ancora ... non trovata: uso "..."`. Con `{#...}` non serve nemmeno l'avviso: i link restano validi a prescindere dal titolo.
- **Il catalogo si genera dopo le altre pagine**: `immobili.html` conteneva `#la-villa-non-fa-per-te` anche dopo il rinominare il paragrafo perche' veniva scritto *prima* della home, leggendo l'`index.html` vecchio ancora su disco. Gli id ora si leggono dai markdown (`mdIds()`), quindi non dipendono piu' dall'ordine di generazione.
- **Link con testo + link nello stesso titolo** (regola gia' nel design system, ora rispettata dal codice): un `[testo](url)` in coda a un `##` non finisce piu' dentro l'H2, che era la causa di `<h2>` cliccabili e di id sporchi.
- **JSON-LD completato senza inventare nulla**: ora esce anche `offers` con `price: "Prezzo su richiesta"` + `priceCurrency` + `availability: InStock` + `validFrom` (prima, senza prezzo numerico, l'offerta non veniva proprio emessa), `address.postalCode: 29029` e `numberOfRooms: 12`.
- **Il numero "12 vani" e' scritto una volta sola**: il JSON-LD lo legge dall'elenco `caratteristiche` dettato da Davide (`vaniDaCaratteristiche()`), non da un secondo campo dove il valore sarebbe divergito dopo una modifica. `superficie` e `locali` restano `null`, perche' i vani non sono metri quadri ne' locali.
- **Copy della home**: titolo `Case in vendita a Rivergaro Val Trebbia | Davide Scaglia`, description di taglio acquirenti ed eyebrow allineati in `src/pages/home.md` **e** in `site-config.json` (vince il front matter, ma i due non devono divergere); il lead dice come lavora Davide e invita a descrivere la casa cercata; aggiunto un secondo pulsante verso `immobili.html` (catalogo con i filtri, che prima dalla home non era raggiungibile). L'H1 con il nome della villa e' rimasto: e' il testo della home scelta nella PR #28, dimmi se lo vuoi in corsivo/normale invece che in maiuscolo.
- **"Servizi a portata di mano" ripulito**: elencava scuole, centro medico, farmacie, mensa, trasporto e fermata dell'autobus come fatti, con una fonte generica (`tuttitalia.it` senza pagina). Sono affermazioni non verificate e sono state tolte; al loro posto una riga che rimanda alla conferma diretta. Se vuoi quelle informazioni in home, dammi testo e fonte puntuale (pagina specifica) e le inserisco.
- `node build.js && node build.js --check` verde dopo ogni passaggio.

## Prossimo passo (Fase 4, da confermare)

Mancano le pagine `contatti.html` e `chi-sono.html` (le uniche due che posso scrivere con i soli dati verificati: NAP, qualifiche, numero d'iscrizione al Ruolo Agenti), l'hub `zona/val-trebbia.html` e `legal/termini.html`. Le guide restano chiuse fino a contenuto originale: la regola editoriale in `contenuti.regola_editoriale` non consente guide di riempimento, e `contenuti.guide_previste[*].stato` e' tuttora `DA CONFERMARE`.

## Immagini camera 3 + secondo bagno, H1 e pagina Contatti (02/11/2026)

- **6 nuove foto inserite nell'annuncio ANC-001** (camera 3 con balcone + secondo bagno): convertite in WebP con il profilo gia' usato per le altre (lato lungo 2200px, qualita' 82, ~110-153KB; miniature a 900px) e rinominate secondo la convenzione esistente, proseguendo la numerazione: `villa-ancarano-piano-primo-camera-3-balcone-56/57.webp`, `villa-ancarano-piano-primo-bagno-2-58/59/60/61.webp`. Galleria: 81 immagini, `data_modifica: 2026-11-02` ( quindi `lastmod` in sitemap ).
- **La foto del balcone e' verticale** (2250x4000): ridimensionata in proporzione a 1600px, non ritagliata. Nel riquadro orizzontale della galleria viene mostrata per intero (la griglia usa `object-fit: contain`), quindi occupa una riga piu' alta: se la preferisci ritagliata a 16/9 come le altre, dimmelo ed e' un comando solo.
- **Didascalie**: brevi e descrittive come le esistenti, scritte da me su cio' che si vede nel file ("Camera 3 con balcone.", "Bagno 2, con doccia e specchiera."); nessun dato di catastale, metratura o piano aggiunto.
- **H1 della home**: ora e' la frase che mi hai dettato, `Cerchi casa a Rivergaro in Val Trebbia? Ecco le mie proposte.` (61 caratteri, niente "e in" aggiunto di mia iniziativa), eyebrow `Case in vendita a Rivergaro · Val Trebbia`. Il `<title>` e' `Cerchi casa a Rivergaro in Val Trebbia? Le mie proposte` (57car, senza dominio: la domanda intera + dominio non sta nei 60 caratteri) e la regola di sincronia e' scritta in `site-config.json` → `site._regola_title_home`. Il nome della villa resta nell'H3 della card "Immobile in evidenza" e nell'H1 della scheda.
- **`og-image`**: ora esce davvero, usando una foto reale. Home = copertina della galleria della villa (2200x990, ~357KB, dentro il budget media); scheda = copertina di quella scheda. Con `og:image:width/height`. Nessuna grafica inventata: se vuoi una foto dello studio al posto di quella della villa, basta cambiare `seo_geo.og_image`.
- **`contatti.html` pubblicata** (Fase 4, primo pezzo): solo dati verificati — `::contatti_card` (cellulare/WhatsApp, email, studio Via Felice Cavallotti 3, fraz. Pieve Dugliara, P.IVA, REA, PEC, Ruolo Agenti di Piacenza dal 07/12/2007), modulo di ricerca, tre righe su cosa succede dopo il contatto. Gli orari restano `DA CONFERMARE` e non compaiono. La voce "Contatti" del menu ora esiste perche' la pagina c'e' (meccanismo `PAGES.nav_id` + `verso()` in build.js: la voce punta alla pagina appena il markdown esiste).
- **`grazie.html` ripulita**: conteneva due impegni non tuoi ("di norma entro un giorno lavorativo", "dopo 24 ore") e uno "salta la coda" per le urgenze, oltre al numero di telefono scritto a mano invece che letto dal config. Rimossi: ora dice solo che rispondi di persona, appena possibile.
- **Tre bug di `build.js` chiusi**, tutti emersi provando: (1) `buildDraft()` generava una scheda fantasma "brand" con le immagini del logo, e il rapporto media contava anche le miniature (162 "immagini" per una scheda da 81): ora i derivati `-thumb`, `img/brand` e `img/legale` sono esclusi da rapporto e bozza; (2) `--check` girava solo sulle pagine **indicizzabili**, quindi non vedeva mai `grazie.html` e `404.html`: ora controlla `PAGES` tutte; (3) un link in coda a un titolo H2 finiva dentro l'H2 e ne sporca l'id: ora scende sotto il titolo.
- **H1 su `#` di primo livello**: gli id valgono anche per gli H1, quindi una pagina che comincia con `# Titolo` e' raggiungibile via `pagina.html#titolo` dal menu.

### Verifica

```bash
node build.js && node build.js --check   # ✓ check superato (7 pagine + 1 scheda)
node build.js media                      # media: 81 file, 1 immobili, bozza sched: 1  (prima: 163 file, 2 immobili)
```

## Bozza "Chi sono" (02/11/2026) — da riscrivere con la tua voce

- **`chi-sono.html` pubblicata** con la sola struttura, senza dati inventati: H1 `Chi sono`, bio, "Come lavoro", "Le qualifiche" (riusa `::contatti_card`: dati visura + social), "Se vuoi venire a trovarmi". `data_pubblicazione` non serve: la pagina entra in sitemap (7 voci) e nel menu di **tutte** le pagine.
- **La bio vive nei dati, non nel markup**: `professionista.bio_acquirenti` in `src/data/site-config.json`, renderizzata dallo shortcode `::bio`. Lì dentro c'è una **BOZZA scritta da me** partendo da soli fatti verificati (dal 2007 nel Ruolo Agenti di Piacenza, impresa individuale con 1 addetto, sede in Via Cavallotti 3 a Pieve Dugliara, zero vetrina di annunci) + le due frasi che avevi già approvato in home. Riscrivila: i paragrafi si separano con riga vuota.
- **Nessun segnaposto pubblico, due protezioni**: (1) se `bio_acquirenti` è `null` lo shortcode stampa una frase neutra, non "DA CONFERMARE" — testato: `bio_acquirenti: null` → `✓ check superato` e frase di rimpiazzo al suo posto; (2) finché `professionista.bio_stato` resta `bozza-da-rivedere`, in fondo alla bio compare "Profilo in corso di revisione: i dati anagrafici e professionali qui sotto sono quelli del Registro Imprese." **Quando hai riscritto la bio, cancella `bio_stato`** e la nota sparisce.
- **Tre claim della bozza che devi confermare tu** (non sono nella visura e non me li hai detti): "verifico conformità urbanistica e catastale prima della visita", "nessun prezzo o metratura ipotizzata" (vera oggi, ma è un metodo), "seguo la trattativa fino alla firma del preliminare". Se uno non ti appartiene, cancellalo: è testo tuo, non un dato del sito.
- **Correzione in corsa**: nella bozza avevo scritto "quattro frazioni"; `area_servizio.frazioni` ne contiene **sei** (Pieve Dugliara, Rivergaro centro, Diara, Ancarano, Bassano, Roveleto Landi). La frase è stata tolta — per la regola che hai dato, i nomi delle frazioni restano nei filtri e nella pagina zona, non nel copy fisso.
- **Meccanismo nuovo nel menu**: `navExtra()` aggiunge "Chi sono" (e in futuro qualsiasi pagina) alle barre di navigazione **solo quando il markdown esiste**, e la voce punta all'id del suo H1/H2 (`nav_id` nel config delle pagine). Le pagine `contatti.html` e `chi-sono.html` ora hanno entrambe `nav` propria: nessuna pagina resta senza navigazione (prima `contatti.html` aveva il menu vuoto).
- **Tipografia**: nei testi nuovi ho usato apostrofi tipografici e accenti corretti (`, è, à), uniforme a `home.md`.

## Orari ricevuti + passa SEO/GEO (02/11/2026, ripubblicata sul ramo nuovo)

Prima nota, che riguarda il metodo: il lavoro di questa passa era stato committato nel workspace della sessione precedente ma **mai pushato** (la via GitHub era chiusa con `gnutls_handshake`). Il ramo nuovo e' ripartito da `main` = PR #31, quindi il commit locale era perso: **riapplicato da capo, pezza per pezza, con `assert` su ogni sostituzione**. Lezione scritta qui perche' si ripetera': un commit locale non e' pubblicazione, e dopo un merge lo stato dell'arte e' solo cio' che sta su `main`.

- **Orari inseriti** (comunicati da Davide il 02/11/2026): `Lunedì–venerdì 09:00–12:30 e 15:00–19:00; sabato 09:00–12:30` in `contatti_sezione.orari`. Un valore, quattro uscite: `::contatti_card` (Contatti e Chi sono), `openingHoursSpecification` nel JSON-LD (3 fasce), `llms.txt` → "Orari di apertura", domanda "Quando è aperto lo studio?" in home. La domenica **non** compare: nessun orario = nessuna riga, non un "chiuso" inventato.
- **Scoperto: il `RealEstateAgent` globale non veniva mai emesso.** Il brief lo chiedeva e `seo_geo.jsonld.globale` lo dichiarava, ma `head()` costruiva solo `WebSite`. Ora `agentJsonLd()` esce su ogni pagina indicizzabile **e nella scheda**: denominazione legale + nome, `+393286930033`, email, `PostalAddress` della sede, `foundingDate: 2007`, `areaServed` (6 comuni dal config), `sameAs` (4 social), `logo` con dimensioni **lette dai byte del PNG** (il manifesto media esclude `img/brand` per contratto), `contactPoint`, `additionalProperty` → `chi-sono.html`.
- **FAQPage agganciato alle domande vere**: `::risposte_pronte` e `::home_faq` registrano le coppie Q/R durante il render (`FAQ[]` + `CURRENT_PAGE`) e `head()` le usa nel markup — il contenuto del markup non puo' divergere da cio' che vede il visitatore. Contesto verificato: Google dal 07/05/2026 non mostra piu' il risultato arricchito FAQ (gia' limitato a sanitario/governativo dal 2023), il tipo resta pero' valido e letto da Bing e dai motori AI per estrarre risposte citabili. Lo teniamo per questo, non come arricchimento SERP.
- **`datePosted` / `dateModified`** ora escono anche nel `RealEstateListing` (2026-10-23 / 2026-11-02): il segnale di freschezza c'era gia' in sitemap ma non nel markup della scheda.
- **"In evidenza" in home**: tabella `dataRow` dei soli dati confermati (filtra i null) + link alla scheda. Un motore che leggesse solo la home ora trova rif, zona, unita, stato e data in forma chiave/valore.
- **LCP corretto**: la copertina della home era `loading="lazy"` (sopra la piega non si fa). Ora `fetchpriority="high"` + `srcset` sulla miniatura: su telefono scarica ~54KB invece di 357KB. Le larghezze sono calcolate (lato lungo miniatura = min(900, largo pieno)) perche' `-thumb` non e' nel manifesto.
- **Autocorrezione**: la domanda "Quanto costa farti cercare casa?" nella bozza precedente conteneva condizioni di incarico non confermate; riscritta in forma di metodo, senza cifre, percentuali o durate.
- `node build.js && node build.js --check` verde su 8 pagine; tutti i blocchi JSON-LD validano come JSON; nessun termine inglese nel testo visibile.

## Galleria: doppia foto rimossa + gruppo "Piano rialzato" (02/11/2026, sera)

- **Il duplicato era mio, non tuo.** `camera-3-balcone-56` (1238x2200) e `camera-3-balcone-57` (900x1600) sono **lo stesso scatto**: l'avevo registrato due volte durante l'intake della foto verticale del balcone, una come "balconi" e una come "camera 3 con balcone". Rimossi entrambi i file (`villa-ancarano-piano-primo-balconi-56.webp`, `...camera-3-balcone-56.webp`) e le miniature: resta il ritaglio 900x1600 che hai visto in galleria. Le foto del Bagno 2 (4 scatti) sono **lo stesso bagno da angolazioni diverse**: non le ho toccate, ti chiedo solo se le vuoi ridurre.
- **Nuovo gruppo `piano-rialzato`** ("Piano rialzato") con la prima foto reale della prima abitazione: `villa-ancarano-piano-rialzato-ingressi-59.webp` 900x2000 (130KB) + miniatura 405x900. Didascalia: "Portico d'ingresso al piano rialzato, con archi in mattoni a vista, due porte d'ingresso indipendenti e pavimentazione in cotto." - descrive solo cio' che si vede; se il portico e' condiviso con la seconda abitazione dimmi la frase giusta e la sostituisco. Numerazione globale: esterni 01-29, piano primo 21-61 (meno i due rimossi), rialzato 59. Totale **80 foto** (ridotte a 78 nella ripresa notturna qui sotto).
- **Bug del srcset, trovato qui e corretto in `galleria()`**: `imgMeta()` non conosce i `-thumb` (esclusi dal manifesto per contratto), quindi `tw = w` e lo srcset **non veniva mai emesso nella scheda**. Ora le dimensioni della miniatura si ricavano dalla regola di generazione (900px sul lato lungo) e i descrittori `w` usano il lato lungo, non il lato corto: su un ritratto il `405w` reale sarebbe stato scartato dal browser e lo srcset non si apriva mai. 80 `<img>` su 80 con srcset, prima zero.
- `node build.js media` + `node build.js && node build.js --check` verdi: 80 file, 3 avvisi di peso (preesistenti, esterni), bozza riallineata a 80 immagini, `RealEstateListing.image` senza residui dei file cancellati.

### Ripresa 02/11/2026 (notte): la pulizia persa e' stata rifatta, con la tua ultima richiesta

Il commit locale della sessione scorsa (`11f4c43`) era **effettivamente perso**: la sandbox si e' ricostruita su `main` = `7537f68` e il ramo vecchio non c'era piu'. La procedura in tre passi scritta qui sopra ha funzionato: riapplicate le stesse identiche modifiche in un minuto, senza doverle riconcordare.

- 2 foto del Bagno 2 di nuovo rimosse (`-60`, `-61` + miniature): **78 foto** (Esterni 20, Piano primo 57, Piano rialzato 1).
- Ultimo apostrofo ASCII delle didascalie corretto (`vista dall'alto` → `vista dall’alto`).
- **Titolo del gruppo: `Piano rialzato 1`** (Richiesta di Davide: "nella scritta metti piano rialzato 1"). Cambiato solo il testo visibile: l'`id` della sezione resta `foto-piano-rialzato`, perche' un id numerato si rompe appena arriva il "Piano rialzato 2" e trascinerebbe via tutti i link interni gia' condivisi.
- Didascalia del portico **confermata da Davide** ("si va bene"): non serve piu' chiedere se e' condivisa con la seconda abitazione, resta la descrizione di cio' che si vede.
- Le 2 foto di bagno "ridondanti" che avevo tenuto in sospetto (52-55, 58, 59) restano: sei scatti dello stesso locale, non duplicati.

### Ingresso della prima abitazione: 2 foto in piu' nel gruppo "Piano rialzato 1" (02/11/2026, 20:13)

Davide ha mandato due scatti dello stesso locale (un ritratto 2250x4000 e un orizzontale 4000x2250, stesso disimpegno ripreso da due punti). Nomi dei file originali: `scelte via Bersanti 13 Ancarano RivergaroPiano T appart.1 (1)/(3).jpg` -> il nome dice **Piano T**, ma il lotto e' arrivato mentre lavoravamo al piano rialzato e ritrae lo stesso atrio della foto del portico gia' nel gruppo: inseriti in `piano-rialzato`, titolata "Ingresso della prima abitazione". Se Davide mi dice che e' il piano terra, il gruppo si rinomina in un campo e le foto si spostano senza toccare i file.

- `villa-ancarano-piano-rialzato-ingresso-disimpegno-62.webp` 900x1600 (61KB) + miniatura 506x900 - "Ingresso della prima abitazione: disimpegno con pavimentazione in ceramica, porte e cornici in legno a contrasto e finiture rosa alle pareti."
- `villa-ancarano-piano-rialzato-ingresso-disimpegno-63.webp` 2200x1238 (110KB) + miniatura 900x506 - "Il disimpegno visto verso le stanze, con quattro porte e il citofono a muro."
- Copertina della scheda **non toccata** ("lascia cosi per ora"): resta `villa-ancarano-esterno-ingresso-portico-01.webp`.
- Totale **80 foto** (78 + 2), gruppo Piano rialzato 1 = 3. Numerazione globale continuata: -62, -63. Nessun avviso nuovo: le due foto stanno dentro il budget (61 e 110KB).

### Soggiorno prima abitazione, ripubblicato dopo la seconda perdita (02/11/2026, 20:40)

Il lotto delle 10 foto del soggiorno era di nuovo **solo in un commit locale** quando la sandbox si e' ricostruita: `dd79e2f` non c'era piu', `main` era fermo a `c7a1716` (80 foto). Ricostruito da zero in due minuti perche' i JPG originali erano ancora in `/tmp/arena-coding-uploads/`: le conversioni rifatte sono **byte-per-byte identiche** (94378, 106600, 162622, 102286, 112150, 90872, 91282, 103750, 151832, 94720 B) e le didascalie sono state riprese da questo file, non dalla memoria. Spinto e pubblicato finche' la via GitHub era di nuovo aperta.

- 10 foto `villa-ancarano-piano-rialzato-soggiorno-64..73.webp` (2200x1238, 91-163KB) + miniature nel gruppo `Piano rialzato 1`: totale **90 foto** (Esterni 20, Piano primo 57, Piano rialzato 1 = 13).
- Nessuna didascalia inventata: la "65" era in bozza "verso il camino", verificando l'immagine ritagliata non c'e' nessun camino (e' lo spigolo del tavolo) -> scritto "verso la finestra e il termosifone".
- Copertina della scheda invariata perche' Davide ha detto "lascia cosi per ora".
- Da qui in poi: **mai piu' attendere la fine del turno per spingere**. La spinta parte subito dopo il check verde, perche' due lotti su tre oggi sono stati persi una volta .

## Cucina con zona pranzo: 9 foto + rimozione richiesta, e `<lastmod>` finalmente onesto (03/11/2026)

- **"togli la 75" eseguito.** La foto del soggiorno col cartone in basso a destra non e' mai stata pubblicata (era nel commit perso di ieri sera), quindi non e' mai entrata in nessun file: nessun reindirizzamento rotto, nessuna immagine orfana, nessun URL da disdire. La **74** dello stesso lotto e' stata invece riconvertita e inserita: byte-per-byte identica a ieri (73456 B).
- **9 foto reali della cucina con zona pranzo**: `villa-ancarano-piano-rialzato-cucina-pranzo-76..84.webp` (2200x1238, 100-161KB) + miniature. Restano nel gruppo `piano-rialzato` perche' quei gruppi organizzano la galleria **per piano**, non per stanza (il piano primo ha gia' soggiorno, camere e bagni dentro un solo blocco). Totale **100 foto**: Esterni 20, Piano primo 57, Piano rialzato 1 = 23.
- Due didascalie corrette prima di scrivere: avevo messo "piano a induzione **sottovuoto**" (non esiste: e' un normale piano a induzione) e "**termoarredo** sotto il davanzale" (guardando bene e' un termosifone). Un'immagine non va descritta con termini che non si possono verificare.
- **`<lastmod>` della sitemap leggeva il mtime del file HTML**, non `data_modifica`: cosi' ogni `node build.js` in una data nuova spostava in avanti il segnale di freschezza senza che fosse cambiato niente. Ora per le schede si legge `data_modifica` (2026-11-03), allineato a `dateModified` del JSON-LD e alla riga "Aggiornato il". Le pagine senza immobile restano al mtime.
- `data_modifica` portato a 2026-11-03: a quest'ora a Roma e' gia' il 3 (l'orologio di sistema in UTC segna 02/11 22:00), quindi la data e' reale e non anticipata.

## Camera da letto del piano rialzato: 13 foto (03/11/2026) - e la domanda "piano T o rialzato" non esiste piu'

Davide ha risposto **"rialzato"**: i nomi dei JPG continuano a dire "Piano T" ma il gruppo giusto resta `piano-rialzato` / titolo **"Piano rialzato 1"**. Domanda chiusa, nessuna rinomina da fare: i file non si toccano e nessun link cambia.

- 13 foto reali della camera matrimoniale: `villa-ancarano-piano-rialzato-camera-85..97.webp` (2200x1238, **69-224KB**, tutte dentro il budget) + 13 miniature a 900px.
- Totale scheda: **113 foto** - Esterni 20, Piano primo 57, **Piano rialzato 1 = 36**. `RealEstateListing.image` = 113 voci, `dateModified` e `<lastmod>` della sitemap allineati a 2026-11-03.
- Dodici scatti sono lo stesso locale da angolazioni diverse (il piu' bello e' l'armadio a otto ante dal pavimento al soffitto); la **92** e la **90** hanno vestiti sulla poltroncina in midollino: **le ho tenute** perche' la casa e' abitata e la didascalia non lo nega ne' lo Commenta. Se preferisci un album solo con le stanze in ordine dimmi "togli 90 e 92".
- Didascalie scritte una per una guardando i file convertiti (13/13), non i nomi degli originali: nessun termine tecnico non verificabile, nessuna ipotesi su cosa ci sia dietro le porte aperte (per la 91 mi sono fermato a "parete color pesca", senza inventarmi un balcone).

## Seconda camera + bagno del piano rialzato: 7 foto (03/11/2026, mattina)

- 3 foto seconda camera `villa-ancarano-piano-rialzato-camera-2-{98,99,100}.webp` e 4 foto bagno `...-bagno-3-{101..104}.webp` (2200x1238, 70-179KB: tutte dentro il budget) + miniature. **Totale scheda 120 foto**: Esterni 20, Piano primo 57, **Piano rialzato 1 = 43**.
- **Scelta di numerazione dei bagni, per non creare ambiguita':** il bagno di questo piano si chiama `bagno-3` perche' "Bagno 2" e' gia' il secondo bagno della prima abitazione (piano primo). Un "Bagno 1" del rialzato avrebbe fatto credere che esistesse un "Bagno 2" sullo stesso piano. Se Davide mi dice che i bagni delle tre unita' si contano diversamente, rinominare il descrittore e' un campo solo.
- Nelle foto `(39)` e `(40)` della seconda camera si vedono **giacca e pantaloni sullo scaldino pieghevole e uno zaino rosso sulla sedia**: le ho tenute (casa abitata, stessa scelta gia' discussa e non contestata per le foto 90 e 92 della camera matrimoniale) e **non l'ho scritto in didascalia**: non e' un dato della casa, e commentarlo sarebbe un giudizio.
- Nessuna didascalia oltre il verificabile: lo specchio del 101-103 e' "grande specchio a muro", non "specchiera con luce alogena"; la vasca angolare della 104 e' "vasca doccia angolare" perche' e' quello che si vede dal basso.
- `data_modifica` resta 2026-11-03 (oggi): identico a quello del lotto di ieri sera, perche' la data della scheda non deve correre piu' veloce dei contenuti.

## Seconda abitazione: il gruppo "Piano rialzato 2" con ingresso e corridoio (03/11/2026, pomeriggio)
**Cosa hai mandato.** Sei scatti di un'altra unità dello stesso stabile (i tuoi file `...Ai Piano T2 (1..6).jpg`), con la tua indicazione: **(1)(2) = ingresso, (3)(4)(5)(6) = corridoio**.

**Cosa si vede (dalle foto, senza aggiungere nulla).**
| Foto | File | Cosa mostra |
|---|---|---|
| 1 (verticale) | `p2-ingresso-105` | Portico con archi in mattoni a vista, pavimento in cotto a quadrotte, porta d'ingresso aperta, finestra con persiane in legno. |
| 2 | `p2-ingresso-106` | Lo stesso portico ripreso verso il giardino/strada, con la ringhiera in pietra. |
| 3 | `p2-corridoio-107` | Locale d'ingresso: parete con pannello decorato rosso, sedia in midollino, porta in legno scuro socchiusa. |
| 4 | `p2-corridoio-108` | Corridoio con porte in legno, pavimento in marmo, citofono a parete; bagno in fondo. |
| 5 (verticale) | `p2-corridoio-109` | Il pavimento in cotto del corridoio. |
| 6 (verticale) | `p2-corridoio-110` | Il corridoio con porta a vetro smerigliato e il bagno in fondo. |

**Scelte tecniche.** Il gruppo `piano-rialzato-2` (titolo **Piano rialzato 2**) sta dopo `Piano rialzato 1`: 20 + 57 + 43 + 6 = **126 foto** nella scheda, `data_modifica` fermo al 03/11. Numerazione `-105…-110` sulla sequenza globale (il 75 resta bucato di proposito). Tre sono verticali (le tue foto fatte col telefono in verticale): le ho lasciate verticali come `ingressi-59`, con il lato lungo a 1600 px, perché ritagliarle in 16/9 avrebbe tagliato gli archi del portico e la porta del bagno. Peso finale 50–281 KB, nessuno oltre la soglia di guardia.

**Perché la scheda resta onesta.** Il testo che mi dettasti dice "composta da 3 unità indipendenti": ora la scheda mostra foto dell'unità 1 (piano rialzato 1 + piano primo) e l'ingresso/corridoio dell'unità 2. Non ho aggiunto vani, superfici o prezzi: per il Piano rialzato 2 le didascalie dicono solo cosa si vede. Se vuoi che la seconda unità esca dalla pagina pubblica finché non ha i suoi dati, sposto il gruppo in `bozza`: è una modifica di una riga.

**Verificato.** `node build.js --check` ✓, 4 sottogruppi resi con i loro `<h2>` (`foto-esterni`, `foto-piano-primo`, `foto-piano-rialzato`, `foto-piano-rialzato-2`), 6/6 `srcset` + `width/height` espliciti, 6 didascalie uniche, lightbox su 6 figure, JSON-LD `image` = 126 (6 nuovi), `sitemap.xml` con `<lastmod>2026-11-03`.

## Soggiorno del Piano rialzato 2: prime 10 foto (03/11/2026, sera)

**Cosa hai mandato.** Le foto **(7)…(16)** di `scelte via Bersanti 13 Ancarano Rivergaro Ai Piano T2`, tutte **orizzontali 4000×2250** (nomi originali `... Ai Piano T2 (7).jpg` … `(16).jpg`). Il lotto era di 20 scatti: sono arrivate le prime 10, le **(17)…(26)** restano da mandare.

**Cosa si vede (dalle foto convertite, una per una).** Soggiorno della seconda unità: due finestre a doppia anta con infissi in legno e davanzale in marmo, termosifoni sotto le finestre, **pavimento in cotto a quadrotte**, pareti con **finitura decorativa gialla a spugna**, sospensione a braccio con diffusore in vetro. Arredi: **libreria in legno con vetrina**, **credenza intarsiata con rosoni a stella** sormontata da una vetrinetta, due diffusori neri ai lati, divano chiaro, porta in legno **a vetro smerigliato**, pannello a bande verticali su una parete.

**Scelte tecniche.**
- Numerazione sulla sequenza globale: `p2-soggiorno-111…120` (prosegue da -110, il 75 resta bucato). File `villa-ancarano-piano-rialzato-p2-soggiorno-{111..120}.webp`, 2200×1238, + miniature a 900×506 (900×506 = 38–69KB).
- Ricetta standard: lato lungo 2200 px, qualità 82, `-strip`. Unica eccezione la **117**, che a qualità 82 pesava **441KB** (sopra il budget di 400KB): riconvertita a **qualità 78 + `webp:method=6` → 325KB**, differenza non percepibile a schermo. Pesi finali **171–325KB**.
- Gruppo `piano-rialzato-2` già esistente: 6 → **16 foto**. Scheda a **136 foto** (Esterni 20 · Piano primo 57 · Piano rialzato 1 43 · Piano rialzato 2 16), `data_modifica` 2026-11-03.
- **Doppio elenco aggiornato**: oltre a `gallerie[].immagini` ho aggiunto i 10 file anche all'array piatto `immagini`, che è quello che alimenta `RealEstateListing.image` del JSON-LD, la copertina e i conteggi. Senza questo la galleria mostrava 136 figure ma il JSON-LD ne dichiarava 126 (errore trovato e corretto in questo lotto, e ora i due elenchi sono verificati identici nello stesso ordine).
- Didascalie scritte **dopo aver riletto i 10 file convertiti**, non i nomi originali. Nessun riferimento a **coperta e peluche sul divano** (casa abitata, tua richiesta esplicita): il divano è citato come arredo in due didascalie, gli oggetti personali no. Il pannello a bande è descritto per quello che si vede (bande verticali chiare e scure), senza attribuirgli una funzione che dalla foto non si può verificare.

**Verificato.** `node build.js media` → 136 file, 3 avvisi (tutti e tre preesistenti: `esterno-cancello-cortile-14`, `esterno-facciata-cancello-15`, `esterno-lato-prato-03`, nessuno dei nuovi file). `node build.js` ✓ · `node build.js --check` ✓ ("nessun segnaposto, nessun link rotto, un H1 per pagina, immagini con dimensioni esplicite"). Nella scheda **136 figure**, **136 `srcset`**, 0 `<img>` senza `width`/`height`, 4 sottogruppi con i loro `<h2>`, JSON-LD `image` = **136**, `sitemap.xml` `<lastmod>2026-11-03`.

**In attesa.** Le foto **(17)…(26)** per chiudere il gruppo: numero `-121…-130`, stesso descrittore `p2-soggiorno`, stessa ricetta. Dimmi se dalla (17) in poi cambia la stanza (cucina, camera…) e il descrittore cambia di conseguenza.

## Soggiorno del Piano rialzato 2, secondo tempo: le altre 10 foto — gruppo chiuso (03/11/2026)

**Cosa hai mandato.** Le foto **(17)…(26)**, tutte **orizzontali 4000×2250**. Con le **(7)…(16)** del lotto precedente il soggiorno della seconda unità è completo: **20 scatti**, come previsto.

- `villa-ancarano-piano-rialzato-p2-soggiorno-{121..130}.webp`, 2200×1238, stessa ricetta (qualità 82, `-strip`) + miniature 900×506. Pesi **162–288KB**, nessuno sopra il budget: nessuna eccezione da segnalare come per la 117.
- Gruppo `piano-rialzato-2`: 16 → **26 foto**. Scheda a **146 foto** — Esterni 20 · Piano primo 57 · Piano rialzato 1 43 · **Piano rialzato 2 26**. `data_modifica` 2026-11-03.
- Aggiornati **entrambi** gli elenchi (`gallerie[].immagini` e l'array piatto `immagini`) e verificati identici nello stesso ordine: senza il secondo il JSON-LD sarebbe rimasto a 136 su 146 figure.

**Cosa si vede nelle nuove (dalle foto convertite, una per una).** Lo stesso soggiorno ripreso dagli altri lati: il **divano** bianco con il **tavolino dal piano in vetro**, la **teca in legno e vetro** con una scultura in legno sopra, il **quadro a parete con i dischi colorati**, il **mobiletto a cassetti** chiaro con l'oggetto in vetro azzurro, il **mobile alto in legno scuro**, la **libreria a vetri**, la **porta a vetro smerigliato** e le **due finestre con i termosifoni** (una con l'anta aperta). Il pavimento è sempre il **cotto a quadrotte** e le pareti la finitura gialla a spugna.

**Regola "casa abitata" rispettata.** La coperta e il saccone a macchie sul divano compaiono in quasi tutti questi scatti (la 130 li ha in primo piano, la 126 è centrata sul divano): **non sono nominati in nessuna didascalia** e non ho commentato gli oggetti personali. Il divano è citato solo come arredo, nella 126 e nella 130.

**Verificato.** `node build.js media` → **146 file, 3 avvisi**, gli stessi tre preesistenti degli esterni (`cancello-cortile-14`, `facciata-cancello-15`, `lato-prato-03`), nessuno dei 10 nuovi. `node build.js` ✓ scheda 192.4KB · `node build.js --check` ✓. Nella scheda **146 `<figure>`, 146 `srcset`**, 0 `<img>` senza `width`/`height`, 4 sottogruppi con i loro `<h2>`, JSON-LD `image` = **146**, `sitemap.xml` `<lastmod>2026-11-03`. Nessuna didascalia inventata: le dieci sono state scritte leggendo i file convertiti, non i nomi originali.
