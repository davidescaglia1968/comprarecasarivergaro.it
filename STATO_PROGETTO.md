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

## Cucina del Piano rialzato 2: 11 foto (03/11/2026)

**Cosa hai mandato.** Le foto **(27)…(37)** di `scelte via Bersanti 13 Ancarano Rivergaro Ai Piano T2`, tutte **orizzontali 4000×2250**: la cucina della seconda unità, con la tua richiesta secca "ora pubblica la cucina".

- `villa-ancarano-piano-rialzato-p2-cucina-{131..141}.webp`, 2200×1238, ricetta standard (qualità 82, `-strip`) + miniature 900×506. Pesi **105–222KB**: nessuno sopra il budget.
- Descrittore **`p2-cucina`**, coerente con `p2-ingresso`, `p2-corridoio`, `p2-soggiorno`. La cucina della prima unità resta `cucina-pranzo-76…84`: descrittori distinti perché sono due unità diverse, non due nomi dello stesso locale.
- Gruppo `piano-rialzato-2`: 26 → **37 foto**. Scheda a **157 foto** — Esterni 20 · Piano primo 57 · Piano rialzato 1 43 · **Piano rialzato 2 37**. `data_modifica` 2026-11-03.
- Aggiornati **entrambi** gli elenchi di `properties.json` (galleria + array piatto) e verificati identici nello stesso ordine: 157 = 157.

**Cosa si vede (dalle foto convertite, una per una).** Cucina componibile in **legno chiaro con piano di lavoro scuro**: colonna con **forno incassato**, basi a cassettoni lungo due pareti, **pensili** con un'anta aperta, **piano cottura a gas a quattro fuochi**, **lavello a due vasche con gocciolatoio**, **rivestimento a piastrelle decorate** (a destra effetto marmo), **caldaia a parete con sportello in legno** e passaggio dei tubi a vista sopra la fascia dei pensili. Al centro una **penisola con piano chiaro e due sgabelli** (è la zona pranzo di questa unità: da qui il descrittore resta `cucina`, come deciso), **finestra con termosifone**, quadri a parete, **pavimento in cotto a quadrotte** come nel resto del piano. Una porta collega la cucina alle altre stanze.

**Casa abitata.** Nelle foto ci sono un **casco da moto**, una scatola «GP2», tovagliette e oggetti sui piani: **non sono in nessuna didascalia** e non ho commentato gli arredi personali, come per la coperta e il saccone del soggiorno. Due cose che ho lasciato di proposito generiche perché dalla foto non si possono verificare: l'**elettrodomestico bianco** vicino alla porta (non ho scritto "lavatrice" né "lavastoviglie") e la **stanza oltre la porta** (scritto "l'altra stanza", non "camera").

**Verificato.** `node build.js media` → **157 file, 3 avvisi**, gli stessi tre preesistenti degli esterni, nessuno degli 11 nuovi. `node build.js` ✓ scheda 207.3KB · `node build.js --check` ✓ ("nessun segnaposto, nessun link rotto, un H1 per pagina, immagini con dimensioni esplicite"). Nella scheda **157 `<figure>`, 157 `srcset`**, 0 `<img>` senza `width`/`height`, 4 sottogruppi con i loro `<h2>`, JSON-LD `image` = **157**, `sitemap.xml` `<lastmod>2026-11-03`.

## Prima camera del Piano rialzato 2: 9 foto (03/11/2026)

**Cosa hai mandato.** Le foto **(38)…(46)**, tutte **orizzontali 4000×2250**: una delle **due camere** della seconda unità ("ecco le prime 9 di una delle 2 camere"). Le altre arriveranno dopo.

- `villa-ancarano-piano-rialzato-p2-camera-{142..150}.webp`, 2200×1238, ricetta standard (qualità 82, `-strip`) + miniature 900×506. Pesi **104–315KB**: tutti dentro il budget, nessuna riconversione.
- Descrittore **`p2-camera`**: quando arriverà la seconda camera il descrittore sarà **`p2-camera-2`**, come per la prima unità (`camera-85…97` e `camera-2-98…100`). Così i due locali restano distinguibili senza rinominare niente.
- Gruppo `piano-rialzato-2`: 37 → **46 foto**. Scheda a **166 foto** — Esterni 20 · Piano primo 57 · Piano rialzato 1 43 · **Piano rialzato 2 46**. `data_modifica` 2026-11-03.
- Galleria e array piatto aggiornati e verificati identici nello stesso ordine (166 = 166).

**Cosa si vede (dalle foto convertite, una per una).** Camera matrimoniale con **armadio a parete ad ante laccate** che occupa un'intera parete, **letto matrimoniale** con testata imbottita, **cassettone in legno** a cassetti (con un oggetto in vetro blu sopra), **appendiabiti da camera** in legno accanto al cassettone, **sedia a fascia in legno scuro**, **quadro con figura rossa** sopra la testata, **finestra con termosifone** nella nicchia color terracotta, **porta in legno** verso il corridoio, **plafoniera quadrata** a soffitto. **Il pavimento qui è in parquet a listoni chiari**, non in cotto come soggiorno e cucina: differenza reale tra i locali, scritta in didascalia.
- Lesene e nicchie delle finestre **color terracotta** su pareti chiare: è l'unico elemento decorativo forte della stanza e l'ho descritto per come appare.

**Cosa non ho scritto.** Federe, copriletto e oggetti personali non sono commentati: la camera è abitata, la regola è la stessa del soggiorno (coperta e saccone) e della cucina (casco, scatola «GP2»). Nessuna ipotesi su cosa ci sia dietro la porta aperta: la didascalia dice "la porta aperta sul corridoio", che è quello che si vede.

**Verificato.** `node build.js media` → **166 file, 3 avvisi** (i soliti tre degli esterni, nessuno dei 9 nuovi). `node build.js` ✓ scheda 219.5KB · `node build.js --check` ✓. Nella scheda **166 `<figure>`, 166 `srcset`**, 0 `<img>` senza `width`/`height`, 9 file `p2-camera` presenti, JSON-LD `image` = **166**, `sitemap.xml` `<lastmod>2026-11-03`.

## Prima camera del Piano rialzato 2: altre 2 foto, e una scartata (03/11/2026)

**Cosa hai mandato.** Tre scatti ancora della stessa camera, **(47) (48) (49)**, orizzontali 4000×2250.

- **Pubblicate 2**: `villa-ancarano-piano-rialzato-p2-camera-{151,152}.webp` (2200×1238, qualità 82) + miniature 900×506. Pesi **113 e 125KB**, dentro il budget.
- Gruppo `piano-rialzato-2`: 46 → **48 foto**. Scheda a **168 foto** — Esterni 20 · Piano primo 57 · Piano rialzato 1 43 · **Piano rialzato 2 48**. Galleria e array piatto allineati (168 = 168).
- Didascalie lette sui file convertiti: la **parete dell'armadio con il cassettone** e la porta sul corridoio (151); il **cassettone, l'appendiabiti e il quadro sopra la testata** (152). Nessun oggetto personale commentato.

**La (49) non l'ho pubblicata, ed è una scelta.** Guardando il file convertito si vede che è **mossa**: il letto e la fascia del telaio sono sdoppiati, il parquet e la parete dell'armadio sono fuori fuoco su tutta l'inquadratura. Non è un problema di compressione (133KB, come le altre): è il mosso dello scatto, e la conversione non lo recupera. Su una scheda di vendita una foto così toglie credibilità alle altre 167, che sono nitide.
- Il JPG originale **è ancora in `/tmp/arena-coding-uploads/`**, non l'ho cancellato: se la vuoi comunque pubblica, dimmi "metti anche la 49" e la aggiungo come `-153` in un comando (con la sua didascalia, che descrive solo il parquet e il bordo del letto).
- Se invece preferisci, posso provare a salvarla con una passata leggera di nitidezza: te la mostro prima, senza pubblicarla.

**Verificato.** `node build.js media` → **168 file, 3 avvisi** (i soliti tre degli esterni). `node build.js` ✓ scheda 222.2KB · `node build.js --check` ✓. Nella scheda **168 `<figure>`, 168 `srcset`**, 0 `<img>` senza `width`/`height`, **nessun riferimento a `p2-camera-153`** (la scartata non è rimasta appesa a nessun elenco), JSON-LD `image` = **168**, `sitemap.xml` `<lastmod>2026-11-03`.

## Seconda camera del Piano rialzato 2: 9 foto, doppia esposizione sulla loggia (03/11/2026)

**Cosa hai mandato.** Le foto **(50)…(58)** con la sola indicazione "camera 2": 7 orizzontali 4000×2250 e **2 verticali** (2250×4000).

- `villa-ancarano-piano-rialzato-p2-camera-2-{153..161}.webp`, ricetta standard (qualità 82, `-strip`) + miniature. Orizzontali 2200×1238 (69–248KB); **le due verticali (158 e 160) restano verticali a 900×1600** (122 e 204KB) con miniatura 506×900, come `ingressi-59`: ritagliarle in 16/9 avrebbe tagliato soglia e parapetto, che sono il motivo per cui le hai scattate in verticale.
- Descrittore **`p2-camera-2`**, come annunciato quando è arrivata la prima camera. Gruppo `piano-rialzato-2`: 48 → **57 foto**. Scheda a **177 foto** — Esterni 20 · Piano primo 57 · Piano rialzato 1 43 · **Piano rialzato 2 57**. Galleria e array piatto allineati (177 = 177).
- **Nessun buco di numerazione**: la 153 era rimasta libera proprio per questa camera (la foto mossa del lotto precedente non è mai entrata negli elenchi).

**Cosa si vede (dalle foto convertite, una per una).** Seconda camera con **letto singolo**, **armadio a parete con ante scorrevoli** (pannelli chiari e fascia in vetro verde) che occupa una parete intera, **scrivania con sedia da ufficio** sotto lo **specchio con decoro a palme e cammelli**, **quadro astratto grande** su un'altra parete, **plafoniera a bracci** a soffitto, **parquet a listoni** come nella prima camera. La stanza ha **due esposizioni**: una **portafinestra con soglia in marmo** che dà sulla **loggia con pavimento in cotto**, parapetto in mattoni pieni con feritoie e **scala esterna in metallo** verso il giardino.
- Nella 159 e nella 160 il pavimento in cotto della loggia è ripreso dall'alto: è esterno, non un altro locale — l'ho scritto così, senza farlo passare per una stanza.

**Casa abitata.** Giacca sulla sedia, libri e riviste sulla scrivania, targhette e pannelli accostati alla parete, **i piedi in due scatti**: niente di tutto questo è in didascalia. Stessa regola di soggiorno, cucina e prima camera.

**Verificato.** `node build.js media` → **177 file, 3 avvisi** (i soliti tre degli esterni, nessuno dei 9 nuovi). `node build.js` ✓ scheda 234.5KB · `node build.js --check` ✓. Nella scheda **177 `<figure>`, 177 `srcset`**, 0 `<img>` senza `width`/`height`, **le due verticali dichiarano 900×1600** nell'HTML (quindi nessun salto di layout), JSON-LD `image` = **177**, `sitemap.xml` `<lastmod>2026-11-03`.

## Seconda camera del Piano rialzato 2: altre 6 foto, e una già pubblicata (03/11/2026)

**Cosa hai mandato.** Sette file, **(58)…(64)**. La **(58) era già online**: è lo stesso scatto del lotto precedente, pubblicato come `p2-camera-2-161`. Verificato prima di toccare qualsiasi cosa — riconvertito il JPG e confrontato con il `.webp` in repository: **stesso byte per byte** (`md5 306013e0…`). Quindi nessun doppione in galleria e nessun file nuovo creato per lei.

- **6 foto nuove**: `villa-ancarano-piano-rialzato-p2-camera-2-{162..167}.webp` (2200×1238, qualità 82) + miniature 900×506. Pesi **67–121KB**, tutti dentro il budget.
- Gruppo `piano-rialzato-2`: 57 → **63 foto**. Scheda a **183 foto** — Esterni 20 · Piano primo 57 · Piano rialzato 1 43 · **Piano rialzato 2 63**. Galleria e array piatto allineati (183 = 183) e **zero duplicati** controllati nell'elenco del JSON-LD.
- Didascalie lette sui 6 file convertiti, tutte diverse da quelle già in pagina: il letto singolo **con la struttura in metallo**, la scrivania sotto lo **specchio con il decoro a palme**, la **portafinestra aperta sulla loggia**, l'armadio a parete, il parquet a listoni. Nella 162 si vede anche il **secondo tavolo con i cassetti e i cesti in vimini** accanto alla scrivania.

**Casa abitata.** Giacca sullo sgabello, libri e riviste, pannelli accostati alla parete, cestini e il riflesso della persona nello specchio della 167: **niente di questo è in didascalia**, come nei lotti precedenti.
- Un dettaglio che ho lasciato generico: nel pannello accostato alla parete non ho scritto "lavagna" né "quadro" — dalla foto è un telaio con superficie chiara, e non serve attribuirgli un nome per descrivere la stanza.

**Verificato.** `node build.js media` → **183 file, 3 avvisi** (i soliti tre degli esterni, nessuno dei 6 nuovi). `node build.js` ✓ scheda 242.7KB · `node build.js --check` ✓. Nella scheda **183 `<figure>`, 183 `srcset`**, 0 `<img>` senza `width`/`height`, 15 file `p2-camera-2` distinti, JSON-LD `image` = **183 con 0 duplicati**, `sitemap.xml` `<lastmod>2026-11-03`.

## Il bagno del Piano rialzato 2 e un'altra vista del corridoio: 9 foto (03/11/2026)

**Cosa hai mandato.** Nove file, **(65)…(73)**. Otto sono il **bagno della seconda abitazione**, la **(73) però non è il bagno**: è il **corridoio** visto verso il fondo. L'ho messa lì, non nel bagno — è una vista diversa dalle quattro già in galleria (`-107…-110`, che sono il tratto verso la porta del bagno), quindi è entrata come `p2-corridoio-176`.

- **`p2-bagno-168…175`** — 8 foto (2 verticali: 168 a 900×1600, 169 a 900×1366; 6 orizzontali a 2200×1238) + **`p2-corridoio-176`** verticale 900×1600. Tutte le miniature 900px. Pesi **47–223KB**, tutti dentro budget.
- Gruppo `piano-rialzato-2`: 63 → **72 foto**. Scheda a **192 foto** — Esterni 20 · Piano primo 57 · Piano rialzato 1 43 · **Piano rialzato 2 72**. Galleria e array piatto allineati (192 = 192), **0 duplicati** nel JSON-LD.

**Il nome.** L'unità 1 usa `bagno-3`, ma qui l'unità ha **un bagno solo**: chiamarlo "3" avrebbe creato un numero senza senso. Quindi descrittore **`p2-bagno`** senza numerazione, e didascalie che dicono "**il bagno della seconda abitazione**", coerente con "la seconda camera della seconda abitazione" già in pagina.

**Cosa dicono le foto** (lette tutte prima di scrivere): rivestimento in **ceramica bianca a decoro blu floreale** con fascia a greca, **pavimento in cotto a posa diagonale**, **lavabo** su colonna, **bidet**, **water**, **vasca** con miscelatore e doccetta, **termosifone** sotto la finestra, **mobile pensile in legno con mensole e faretti**, **specchio con mensole in vetro**, **mobile con cassetti**, un **pensile a stecche giallo** sulla parete di fronte, plafoniera a **vetro blu** sul soffitto, finestra con vista sul cortile e sullo stendibiancheria.

**Casa abitata.** Asciugamani sulla vasca e appesi alla porta, boccette e flaconi sul mobiletto bianco, spazzolini, il **riflesso della persona nello specchio** della 173: tutto lasciato fuori dalle didascalie. Il **mobiletto bianco accanto al termosifone** resta descritto per quello che è, senza attribuirgli un nome di elettrodomestico.

**Una nota onesta.** Le foto **170 e 171 sono quasi identiche** (stessa inquadratura, scarto di pochi centimetri). Le ho messe entrambe con didascalie che mettono a fuoco cose diverse (il pensile e la finestra / il lavabo e i sanitari), ma se preferisci una galleria più asciutta la 170 si toglie in un minuto: dimmelo.

**Verificato.** `node build.js media` → **192 file, 3 avvisi** (i soliti tre degli esterni). `node build.js` ✓ scheda 255.2KB · `node build.js --check` ✓. Nella scheda **192 `<figure>`, 192 `srcset`**, 0 `<img>` senza `width`/`height`, dimensioni dichiarate corrette per i tre verticali (900×1600, 900×1366, 900×1600), JSON-LD `image` = **192 con 0 duplicati**, `sitemap.xml` 7 `<lastmod>2026-11-03`.

## Il testo generale della proprietà, e il blocco descrizione portato in cima (03/11/2026)

**Cosa è cambiato nella pagina.** La descrizione non sta più dopo la galleria: adesso è **il primo blocco della scheda**, subito sotto l'intestazione e **sopra la prima foto degli esterni**. È quello che serviva per far leggere la casa prima di guardarla.

**Il testo** è quello che mi hai dato, pubblicato **alla lettera**: titolo «Una proprietà, tante possibilità: tre abitazioni indipendenti in Val Trebbia», i sei capoversi, le due sezioni **La posizione** e **Una casa da scoprire**, e in chiusura la firma «Davide Scaglia – Consulenza immobiliare.». Non ho riscritto niente: le correzioni di tono le avevi scartate, e il testo è tuo.

**Il testo era incollato due volte** (dalla prima riga fino a «…tradizionale casa indipendente.» e poi da capo, con la firma solo alla fine della seconda copia). Ho pubblicato **una copia sola**, con la firma in chiusura: se volevi davvero due blocchi identici, dimmelo e li rimetto.

**Come è fatto tecnicamente** (per i prossimi testi):
- in `src/data/properties.json` c'è un campo nuovo **`testo`**: un elenco di blocchi, `h3` per i sottotitoli, `p` per i capoversi, `firma` per la riga finale. Si scrive il testo lì, senza toccare il codice;
- il **primo capoverso** è quello evidenziato come paragrafo-risposta (lo stile `.prop-answer`), quindi non c'è più il **taglio a 200 caratteri** che spezzava le frasi a metà: via quella riga da `build.js`;
- `descrizione` contiene solo il primo capoverso (191 caratteri): è quello che finisce in `meta description`, nei dati strutturati, nelle anteprime social e in `llms.txt`;
- i sottotitoli sono **H3** sotto l'H2 «L'immobile»: la gerarchia resta pulita (un solo H1 in pagina);
- piccolo ritocco in `src/css/main.css`: margini per i sottotitoli dentro la descrizione e stile della firma.

**Da verificare, e l'ho scritto anche nelle note interne**: i servizi elencati per Rivergaro, la distanza «circa 20 km, 20-25 minuti» per Piacenza (le fonti danno Rivergaro a 20 km e Ancarano tre chilometri più avanti), l'uso a **studio medico**, l'**accessibilità** dei piani rialzati e il progetto di **ospitalità/affitti brevi**. Sono affermazioni tue, pubblicate come le hai scritte: se una non regge, si toglie in un minuto.

**Verificato.** `node build.js media` → **192 file, 3 avvisi** (i soliti tre degli esterni). `node build.js` ✓ scheda **257.2KB** · `node build.js --check` ✓. Nella pagina: la descrizione viene **prima** della galleria (posizione 60954 contro 63491 della prima `<figure>`), i **13 blocchi** resi nell'ordine giusto (H3, primo capoverso in `.prop-answer`, cinque capoversi, H3 «La posizione», due capoversi, H3 «Una casa da scoprire», capoverso, firma), **1 H1, 7 H2, 3 H3**, **192 `<figure>`** e JSON-LD con **192 immagini**, `meta description` e `description` dei dati strutturati = primo capoverso.

## Testo della proprietà rifatto, e descrizione resa leggibile (03/11/2026)

**Il testo** è quello nuovo che mi hai dato, pubblicato **alla lettera**: titolo, due capoversi d'apertura, la sezione **«Una proprietà, diverse possibilità»**, i capoversi su studio professionale, ospitalità, accessibilità e finiture, la sezione **«La posizione: tranquillità e servizi a portata di mano»**, la sezione **«Una casa da scoprire»**, la frase finale in grassetto e la firma. Diciotto blocchi in tutto, nell'ordine in cui li hai scritti.

**Grassetti**: il testo ne prevede tre — «**2,5 km**», «**15 km**» e tutta la frase «**A volte il valore di una casa non è soltanto quello che offre oggi, ma anche quello che può diventare domani.**». Nei dati si scrivono con `**…**` e diventano `<strong>` in pagina. Il resto del testo non può produrre markup: viene scappato prima di essere convertito.

**Tipografia rifatta** (era la parte poco leggibile): corpo a **17px** con interlinea **1.8**, paragrafo-risposta a **19px**, colore bianco pieno, più aria fra un capoverso e l'altro (24px). I sottotitoli di sezione ora sono in **sans** invece del serif di titolo — a 20px il Playfair su schermo si impastava — con un filo di separazione sopra ciascuno. Firma in grigio leggero a 16px.

**Numeri aggiornati**: Rivergaro **2,5 km**, Piacenza **15 km**. Sono coerenti con le fonti: Ancarano di Sopra sta a 2,89 km dal centro di Rivergaro, e la zona è indicata a «poco più di 15 km» da Piacenza. Le vecchie indicazioni (20 km, 20-25 minuti) non ci sono più.

**Verificato.** `node build.js media` → **192 file, 3 avvisi** (i soliti tre degli esterni). `node build.js` ✓ scheda **258.0KB** · `node build.js --check` ✓. Nella pagina: **18 blocchi** resi nell'ordine giusto, **3 `<strong>`**, descrizione **prima** della galleria, **1 H1**, **192 `<figure>`**, `meta description` = 202 caratteri del primo capoverso. Anteprima locale servita per controllare la resa tipografica prima di pubblicare.

## Descrizione sotto le foto degli esterni, testo raccolto e leggibile, nome unico (03/11/2026)

**Posizione del testo.** La descrizione non sta più in cima a tutto: adesso entra **subito dopo il gruppo «Esterni»**, quindi si vedono prima le foto di fuori e poi si legge la casa, come chiedevi. Se una scheda non ha foto, il testo resta al suo posto in cima (fallback previsto nel codice).

**Tipografia.** Corpo da 17 a **18px**, interlinea 1.72; paragrafo-risposta a **21px**; sottotitoli a **22px**. Lo spazio fra un capoverso e l'altro scende da 24 a **16px** e i sottotitoli respirano meno (32/24 invece di 48/32): il testo ora si legge come **un blocco raccolto**, dentro un pannello con bordo arrotondato su fondo leggermente più chiaro, così sta insieme anche visivamente.

**Prezzo**: «Prezzo su richiesta» → **«Prezzo in definizione»**, cambiato nel dato: sparisce da scheda, riepilogo laterale, card in home, catalogo e dati strutturati, perché era un'unica stringa.

**Nome unico, «Davide Scaglia — Immobili a Rivergaro»**:
- l'occhiello del logo diceva **COMPRARE CASA A RIVERGARO**, ora **IMMOBILI A RIVERGARO**; alt del logo allineato;
- `professionista.brand` aggiornato; la firma in fondo al testo ora è «Davide Scaglia – Immobili a Rivergaro.»;
- dati strutturati: `name: "Immobili a Rivergaro"`, `alternateName: "Davide Scaglia"`, e la ragione sociale completa passa in **`legalName`** — così il nome pubblico è uno solo ma l'identità registrata non si perde;
- `og:site_name` non è più il dominio ma il nome;
- **privacy e cookie restano con la ragione sociale** («Immobiliare Scaglia di Scaglia Davide», P.IVA): è il titolare del trattamento, non un'etichetta di marketing, e non si cambia.

**Cose tolte.**
- **La nota di bozza**: sulla pagina *Chi sono* compariva «Profilo in corso di revisione: i dati anagrafici e professionali qui sotto sono quelli del Registro Imprese». Era pilotata da `professionista.bio_stato: "bozza-da-rivedere"` → ora **`confermato`**, la nota non viene più resa.
- **Le meta keywords**: riga rimossa da `head()` e chiave `keywords` tolta dal config. Non servono a Google da anni e sono un segnale di sito vecchio.
- **Il refuso**: la `meta description` veniva tagliata a 155 caratteri **a metà parola** («…ciascuna con il proprio ingresso, inserite»), e lo stesso succedeva all'estratto delle card. Ora c'è `clipMeta()`, che taglia a fine parola, e per la scheda una **descrizione dedicata** di 145 caratteri: «Tre abitazioni indipendenti ad Ancarano, Rivergaro, in Val Trebbia: 12 vani, giardino e spazi esterni. Ideale per più nuclei o per casa e studio.»

**Indicizzazione: cosa posso verificare e cosa no.** Non ho accesso alla Search Console: quello lo devi guardare tu. Quello che ho controllato nel codice pubblicato: `robots.txt` permette tutto e indica la sitemap; **nessuna pagina è noindex** (`index, follow` su tutte); canonical corretti e su dominio proprio (CNAME `comprarecasarivergaro.it`); sitemap con **7 URL**, scheda compresa, `lastmod` 2026-11-03; `llms.txt` presente; dati strutturati `RealEstateListing` con 192 immagini. Quindi tecnicamente il sito è indicizzabile: il fatto che per la descrizione escano Casa.it e Idealista è normale — quei portali hanno autorità e link che un sito nuovo non ha — e le pagine GitHub che uscivano prima sono normale residuo delle prime settimane.

**Verificato.** `node build.js media` → **192 file, 3 avvisi** (i soliti tre degli esterni). `node build.js` ✓ · `node build.js --check` ✓. Nella pagina: descrizione **dopo** gli esterni e **prima** di «Piano primo», **192 `<figure>`**, **1 H1 / 7 H2 / 4 H3**, nessuna `keywords`, nessun «Prezzo su richiesta», nessuna nota di bozza, firma nuova, `author` e `og:site_name` = «Immobili a Rivergaro».

## Home: title, description, H1, testo introduttivo, sezione territorio, Person (03/11/2026)

**File toccati: solo quelli che generano la home** (`src/pages/home.md`, `src/data/site-config.json`, `build.js`), più l'effetto collaterale su due pagine tecniche descritto in fondo. Nessun'altra pagina è stata modificata.

- **Title**: «Case in vendita a Rivergaro e Val Trebbia | Davide Scaglia» (58 caratteri). Prima era «Cerchi casa a Rivergaro in Val Trebbia? Le mie proposte».
- **Meta description**: quella richiesta, 155 caratteri esatti.
- **H1**: «Comprare casa a Rivergaro e in Val Trebbia: troviamo insieme la soluzione giusta.» — resta **un solo H1** in pagina.
- **Testo introduttivo**: via la frase che sminuiva il ruolo («senza agenzia con vetrina e senza una lista di decine di annunci»). Ora dice che il sito è dedicato a chi cerca casa a Rivergaro e nei comuni intorno, che gli immobili sono quelli effettivamente disponibili con dati verificati, e che se non c'è la casa giusta la ricerca si fa su richiesta.
- **Sezione territorio**: «Servizi a portata di mano» si rifiutava di elencare i servizi. Sostituita da **«Rivergaro: servizi, territorio e vita quotidiana»** con tre sottosezioni H3: *I servizi di tutti i giorni*, *Il contesto: la Val Trebbia*, *Dove lavoro*. I servizi elencati sono quelli che Davide ha già scritto nella scheda (supermercati, negozi, farmacia, ambulatori, banche, posta, scuole, asilo, bar, ristoranti, sport); 2,5 km da Ancarano e «una quindicina di chilometri» da Piacenza sono le sue indicazioni. Frazioni: Pieve Dugliara, Rivergaro centro, Diara, Ancarano, Bassano, Roveleto Landi (dal config).
- **Dati strutturati**: c'erano già `WebSite`, `RealEstateAgent` e `FAQPage`. Aggiunto **`Person`** (`#davide-scaglia`) con solo dati del config — nome, `jobTitle`, telefono, email, `worksFor` → `#agent`, `knowsAbout` — e nell'agente il rimando `founder` allo stesso `@id`, così non ci sono due descrizioni della stessa entità. Il nodo `Person` **entra solo nella home**: le altre pagine restano con il loro JSON-LD.
- **Regola del config riscritta**: `_regola_title_home` imponeva title = H1; da oggi non è più così, e la nota dice perché.

**Effetto collaterale sistemato**: cambiando `description_home`, `404.html` e `grazie.html` — che non avevano una descrizione propria e la ereditavano — avrebbero preso quella della home. Hanno ora una descrizione propria e sensata per la loro funzione.

**Verificato davvero** (sul file costruito e con anteprima locale): `<title>` 58 caratteri · description 155 · `og:title`/`og:description`/`og:url`/`og:image`/`og:site_name`/`og:type`/`og:locale` presenti · canonical `https://comprarecasarivergaro.it/` · `robots: index, follow` · `<html lang="it-IT">` · nessun meta duplicato · **1 H1**, 6 H2, 8 H3 in ordine · JSON-LD valido con nodi `WebSite, RealEstateAgent, Person, FAQPage` · tag bilanciati (nessuna chiusura orfana) · link interni 15, esterni 8, WhatsApp 2, `tel:` 3, 1 form con 10 campi, 2 immagini: **identici a prima** · le sette pagine rispondono 200 dall'anteprima · `node build.js --check` ✓.

## Prestazioni: logo e copertina più leggeri, preload della copertina, tre foto rientrate nel budget (03/11/2026)

**Punto di partenza.** Il referto Lighthouse mobile che mi hai mandato dice **Prestazioni 97 · Accessibilità 100 · Best practice 100 · SEO 100 · Navigazione agentica 2/3**. Da qui sono partito per cercare il peso inutile. Nessuna modifica a testi, layout, colori o URL: solo byte in meno e metadati.

**Quello che ho potuto fare qui (e quello che no).** In questo ambiente non c'è nessun browser installabile e non riesco a raggiungere il sito pubblicato: Lighthouse, LCP, CLS, contrasto e resa a schermo **non li ho misurati**, e non li dichiaro. Ho lavorato su ciò che è verificabile con comandi: peso dei file, markup generato, dati strutturati, `node build.js media` / `--check`.

**Cosa è cambiato.**

- **Logo 60 KB → 8 KB.** `img/brand/logo-davide-scaglia-rivergaro.webp` (703×153, qualità 92): è la stessa immagine, confrontata a 300% di ingrandimento. Il PNG resta nel repository come originale d'archivio; l'header usa il WebP con `decoding="async"`.
- **Copertina della home: 357 KB → 131 KB sui telefoni.** Nuovo taglio intermedio `-mid` a 1240px (`…-ingresso-portico-01-mid.webp`, 128 KB) e `srcset` 900/1240/2200 sia nella copertina della home sia nelle foto della galleria della scheda. Il telefono prende la 900 (55 KB), il portatile retina la 1240, il pieno arriva solo se serve davvero.
- **Tre foto fuori budget rientrate** (erano gli unici 3 avvisi di `node build.js media`): cancello cortile 14 **482→362 KB**, facciata cancello 15 **402→306 KB**, lato prato 03 **529→394 KB**, portate da 2200 a 1900px sul lato lungo a qualità 82. Confronto pixel con l'originale: differenza RMSE **0,013** (impercettibile); le dimensioni reali sono lette dal manifesto, quindi `width`/`height`/`aspect-ratio` si aggiornano da soli. Non avendo i JPEG di partenza per queste tre, la ricodifica è di seconda generazione: per questo la qualità è tenuta alta.
- **`node build.js media` ora esce a 0 avvisi** invece di 1 (nessun file oltre i 400 KB).
- **Preload della copertina della home**: `<link rel="preload" as="image" imagesrcset imagesizes fetchpriority="high">` con **gli stessi descrittori della `<img>`** (se coincidono il browser non scarica due volte). Solo nella home: le altre pagine non preloadano nulla.
- **SEO tecnica**: `robots` → `index, follow, max-image-preview:large, max-snippet:-1` (anteprime grandi nelle SERP); `og:image:alt` e `twitter:image`/`twitter:image:alt` con la descrizione **della foto condivisa**, non della pagina; `Person` arricchito con `hasCredential` (`EducationalOccupationalCredential`, «Iscrizione al Registro Imprese — Ruolo Agenti di Affari in Mediazione», riconosciuto dalla Camera di Commercio di Piacenza) dai dati già confermati.

**Pesi misurati nel repository (percorso critico della home):** HTML 21 KB · `main.css` 29 KB (bloccante) · `main.js` 11 KB (defer) · logo 8 KB · copertina 128 KB su desktop retina, 55 KB su telefono. Il CSS della scheda non è cambiato.

**Verificato con comandi:** `node build.js media` → 192 file, **0 avvisi** · `node build.js` ✓ · `node build.js --check` ✓ (nessun dato personale, nessun segnaposto, nessun link rotto, un H1 per pagina, immagini con dimensioni esplicite) · preload presente **solo** in `index.html` (0 occorrenze in `contatti.html`, `chi-sono.html`, scheda) · nessun file immagine oltre 400 KB (massimo 396 KB) · nessun testo, titolo, descrizione o link modificato rispetto alla versione precedente.

**Cosa resta aperto e non è verificato:** resa desktop e mobile, LCP/CLS reali, contrasto, aree di tocco, errori in console, indicizzazione (Search Console non è accessibile) e **quale dei tre controlli di «Navigazione agentica» fallisce** — serve il JSON del referto Lighthouse. Per abbattere ancora il percorso critico restano due strade: CSS critico inline per la home (il meccanismo in `build.js` c'è, `src/css/critical.css` è ancora un segnaposto) e i tagli `-mid` per tutte le foto di galleria (+24 MB nel repository).

## Foto alleggerite, `llms.txt` sistemato, «Navigazione agentica» capita (04/11/2026)

**Foto: 45,5 MB → 31,4 MB (−14,1 MB, −31%).** Ho ripassato **tutto** il catalogo immagini con ImageMagick, da solo, senza toccare i file originali già pubblicati a mano:

- le **foto a piena dimensione** (quelle del lightbox) passano dal lato lungo 2200 a **1800px** a qualità 84; quelle che restavano sopra i 200 KB hanno avuto un secondo passaggio mirato (1700px q80, 1600px q78, 1500px q78 per la più rumorosa), fermandosi comunque **sotto i 230 KB**. Totale full-size: **36 MB → 22 MB (−39%)**;
- **nessuna immagine supera ora i 230 KB** (prima il massimo era 529 KB), e `node build.js media` resta a **0 avvisi**;
- le **miniature 900px** non sono state toccate (9,8 MB in tutto, in media 50 KB l'una): sono già leggere e sono quelle che si vedono nella griglia;
- confronto visivo su un ritaglio al 200% della foto più compressa (`esterno-lato-prato-03`, 529→220 KB): differenza **impercettibile**; RMSE misurato contro l'originale 0,022-0,024 sulle tre più aggressive, 0,010-0,013 sulle altre;
- `width`/`height`/`aspect-ratio` di ogni `<figure>` si sono aggiornati da soli dal manifesto: **192 figure**, tutte coerenti con il file reale.

**Il controllo che falliva in «Navigazione agentica».** Ho scaricato il pacchetto ufficiale di Lighthouse (`npm pack lighthouse`) e letto la configurazione `agentic-browsing`: la categoria pesa **7 audit** — `agent-accessibility-tree`, `webmcp-form-coverage`, `webmcp-registered-tools`, `webmcp-schema-validity`, `cumulative-layout-shift`, `llms-txt`, `ard-schema`. Sul nostro sito sono applicabili tre: l'albero di accessibilità (con Accessibilità 100 passa), il CLS, e **`llms-txt`**. Quello pretende, testualmente: un **H1**, **almeno un link Markdown `[testo](url)`** e almeno 50 caratteri. Il nostro `llms.txt` conteneva H1 e 2 KB di testo ma **zero link Markdown** — solo URL nudi, che per quell'audit non contano come link: era l'unico dei tre a poter fallire, ed è quello che spiega il **2/3**.

**Correzione**: `llms.txt` ora ha una sezione `## Pagine` con link a home, catalogo, contatti, chi sono, e la scheda è scritta come `[titolo](url)` invece che con l'URL in fondo. Verificato con **le stesse tre espressioni regolari dell'audit** sul file generato: H1 ✓, link ✓, 2314 caratteri ✓ → punteggio atteso 1. Nessun fatto nuovo: gli stessi contenuti, in forma linkabile. Gli altri audit della categoria restano non applicabili: i tre WebMCP perché il sito non espone strumenti WebMCP, `ard-schema` perché senza segnale esplicito e con `/.well-known/ard.json` assente Lighthouse lo segna come non applicabile (non come errore).

**Verificato:** `node build.js media` 192 file / **0 avvisi** · `node build.js` ✓ · `node build.js --check` ✓ · testo delle 5 pagine **identico** alla versione precedente (confronto del testo estratto dal markup) · `llms.txt` conforme ai criteri dell'audit.

**Resta fuori da qui:** nessun browser e nessun accesso diretto al sito (TLS chiuso), quindi **non misuro** LCP/CLS né vedo la resa a schermo. Il sito pubblicato lo leggo via HTML (ho verificato che la home online e il suo `llms.txt` corrispondono alla versione precedente al merge di questa PR).

## Niente più risorse che bloccano il disegno: caratteri self-hosted e CSS dentro la pagina (04/11/2026)

**Da dove si partiva.** PageSpeed Insights mobile sulla home (report del 4/11, 13:02): **Prestazioni 98 · Accessibilità 100 · Best practice 100 · SEO 100 · Navigazione agentica 3/3**. Il 3/3 conferma che la correzione del `llms.txt` ha chiuso il controllo che falliva. Per arrivare a 100 restavano due cose che bloccano il primo disegno: il CSS di Google Fonts (un dominio terzo da contattare *prima* di dipingere) e il foglio di stile di 29 KB.

**Cosa ho fatto.**

- **Caratteri serviti da questo sito.** I cinque `.woff2` del sottoinsieme *latin* (Playfair 500/700, Inter 400/500/600, 116 KB in tutto — gli stessi file che serviva Google) ora stanno in `css/fonts/`, con licenza **SIL OFL 1.1** accanto. Le `@font-face` sono in `src/css/fonts.css` con `font-display:swap` e lo stesso `unicode-range` di prima, quindi copertura identica (accenti italiani, virgolette, trattino lungo, euro). Spariscono i due `preconnect` e la richiesta a `fonts.googleapis.com`.
- **CSS dentro la pagina.** `main.css` (29 KB) più le `@font-face` finiscono in un `<style>` in `<head>`: **zero file che bloccano il rendering**. Il CSS non conteneva nessun `url()`, quindi inline non cambia nessun percorso; i font usano il prefisso giusto per ogni livello (`css/fonts/…` in radice, `../css/fonts/…` nelle schede e in `legal/`). Verificato byte per byte: il CSS estratto dalla pagina è **identico** al sorgente (32.171 caratteri, commenti esclusi).
- **Preload del carattere del titolo** (`playfair-display-latin-700-normal.woff2`, 22 KB): il titolo si disegna subito con il carattere giusto invece di lampeggiare col ripiego.
- **Testi di legge allineati alla realtà** (era la parte del config che diceva «in Fase 2 valutiamo il self-hosting dei .woff2: elimina il trasferimento dell'IP a Google»): tolta la riga Google Fonts dalla tabella della Cookie Policy e aggiunta la frase «I caratteri tipografici sono serviti direttamente da questo sito»; stessa precisazione nella Privacy; banner cookie riscritto di conseguenza («carica un servizio esterno — l'anteprima Street View, solo se lo chiedi»); voce del config aggiornata. **Nessun'altra parola del sito è cambiata.**

**Pesi.** Home: 52 KB di HTML (13 KB compressi) invece di 21 KB di HTML + 29 KB di CSS (12 KB compressi) + il CSS dei font di Google: **stessi byte, due giri di rete in meno** (il foglio di stile e il dominio `fonts.googleapis.com`/`fonts.gstatic.com`). Scheda: 289 KB raw / 28 KB compressi. Nessuna immagine toccata in questo giro.

**Verificato con comandi:** `node build.js` ✓ su 9 pagine · `node build.js --check` ✓ · **0** riferimenti a `fonts.googleapis`/`fonts.gstatic` in tutto l'output · **0** `<link rel="stylesheet">` residui · preload font presente in tutte le pagine con il prefisso corretto (controllato su radice, `immobile/`, `legal/`) · 5 `@font-face` per pagina, file `.woff2` validi (magic `wOF2`) · CSS inline identico al sorgente · diff del testo pagina per pagina: cambiano **solo** le frasi su Google Fonts, tutto il resto è identico.

**Non verificato:** resa a schermo e punteggio PSI (serve un browser). Se il pannello mostra ancora meno di 100, i sospetti residui sono il TTFB di GitHub Pages e il CLS da scambio carattere: su quest'ultimo si può lavorare con un fallback metrico (`size-adjust`), ma va tarato guardando la pagina.

**Bonus trovato strada facendo.** La tabella della Cookie Policy e di un paragrafo della Privacy usciva a schermo come **una riga di barre verticali** (`| Servizio | Cosa fa | …`): il generatore Markdown non conosceva la sintassi delle tabelle. Aggiunto il supporto (riga di separazione riconosciuta, `<th scope="col">` per l'intestazione, celle con corsivo/grassetto/link normali) e quattro regole CSS per la resa: ora sono tabelle vere, leggibili e con lo stesso testo di prima. Verificato: nessuna parola persa rispetto alla versione precedente.

## Ultimi ritocchi sul percorso critico (04/11/2026)

Dopo il deploy di font self-hosted e CSS inline il punteggio mobile resta **98**. Senza il referto non posso sapere quale dei cinque pesi perde i due punti (`TTFB`, `FCP`, `LCP`, `CLS`, `TBT`), quindi ho fatto solo ritocchi a rischio zero, ognuno verificabile:

- **Il logo non ruba più priorità.** Aveva `fetchpriority="high"` pur essendo 8 KB e non essendo l'elemento LCP: ora è un'immagine normale con `decoding="async"`, `width`/`height` espliciti. La priorità alta resta solo su quello che può essere l'elemento più grande della pagina.
- **Nuovo gradino 720w per la copertina** (`…-ingresso-portico-01-small.webp`, 43 KB): su un telefono a 412 px e DPR 1,75 il browser sceglieva la 900w da 53 KB, ora sceglie la 720w. `srcset` e preload allineati (stessi identici descrittori), `-small` trattato come derivato nel manifesto, quindi `node build.js media` non lo conta due volte.
- **CSS inline più asciutto**: via i commenti e le righe compattate prima di scrivere il `<style>`; la home scende da 52 a **50 KB** (12 KB compressi).

**Verificato:** `node build.js` ✓ 9 pagine · `node build.js --check` ✓ · `srcset` della copertina = `720w, 900w, 1240w, 1700w` sia nella `<img>` sia nel preload · logo senza `fetchpriority` · nessuna parola dei testi cambiata.

**Perché 98 è probabilmente il tetto su GitHub Pages.** A questo livello i due punti che mancano non stanno più nella pagina: il tempo di risposta del server (GitHub Pages non ha una CDN configurable e non permette header di cache lunghi) e la variabilità della misura. Le strade vere per il 100 sono due, entrambe fuori dal repository: mettere Cloudflare davanti al dominio, oppure spostare l'hosting. Con i numeri di LCP e CLS dalla sezione «Diagnostica» di PageSpeed si può invece capire se resta qualcosa da fare lato pagina.

## Superfici, rendite catastali e APE per ogni unità (04/11/2026)

**Dati pubblicati** (forniti da Davide, ora nella scheda come numeri veri, non come testo):

| Unità | Superficie | Rendita catastale | APE |
|---|---|---|---|
| Piano primo | 169 m² | 764,36 € | classe E · 228,80 |
| Piano rialzato 1 | 94 m² | 400,25 € | classe E · 230,33 |
| Piano rialzato 2 | 115 m² | 440,28 € | classe F · 326,51 |
| Box | 84 m² | 301,20 € | — (non indicato) |

**Dove vivono.** Nuovo blocco `unita` nel dato dell'immobile (`src/data/properties.json`), con un `id` che coincide con quello della galleria della stessa unità: così i numeri non sono scritti due volte. Nessun totale calcolato e nessuna superficie dichiarata "commerciale" o "calpestabile": solo quello che è stato detto.

**Come si vedono.**
- Una sezione **«Superfici, rendite catastali e APE»** con tabella vera (`<th scope="col">` per le colonne, `<th scope="row">` per il nome dell'unità, `<caption>` per i lettori di schermo), subito dopo il testo dell'immobile e prima delle foto degli interni. Sotto, una riga di nota: rendita in euro, Box senza attestato indicato, e che per l'APE sono riportati classe e indice dell'attestato.
- Sotto il titolo di **ogni galleria di unità** una riga sola con i suoi numeri: «169 m² · rendita catastale 764,36 € · APE classe E (228,80)». Chi guarda le foto del piano primo ha i suoi dati davanti, senza tornare indietro.
- Numeri formattati all'italiana (`toLocaleString('it-IT')`): 764,36 e non 764.36.

**Verificato:** `node build.js` ✓ · `node build.js --check` ✓ · ordine delle sezioni nella scheda = Esterni → L'immobile → Superfici/rendite/APE → Piano primo → Piano rialzato 1 → Piano rialzato 2 → Caratteristiche → richiesta · 4 righe di tabella con i valori esatti · 3 righe sotto i titoli delle gallerie (il Box non ha galleria) · nessun'altra pagina toccata.

## Passata SEO/GEO completa e ristrutturazione dei titoli (09/11/2026)

Giornata di lavoro partita da un'analisi integrale del sito (documento: `AUDIT_2026-11-09.md`), chiusa con le correzioni elencate qui. Obiettivo dichiarato: prima pagina su Google e risposte corrette dai motori generativi (GEO/AI).

### Titoli, H1 e gerarchia (richiesta esplicita di Davide)

- **H1 della home = `Comprare casa a Rivergaro Val Trebbia`**, esattamente come chiesto: senza «e in» e senza «: troviamo insieme la soluzione giusta.». La regola è annotata in `src/data/site-config.json` (`_regola_title_home`) perché nessuno la riscriva per sbaglio.
- Title della home e H1 restano distinti per funzione: il title porta chiave + marca entro 60 caratteri (`Case in vendita a Rivergaro e Val Trebbia | Davide Scaglia`), l'H1 porta la chiave decisa da Davide.
- Suffisso di brand unico su tutte le pagine indicizzabili: `| Davide Scaglia` (prima era un misto di `| comprarecasarivergaro.it` e domini nudi). Funzione `pageTitle()` in `build.js`: taglio a parola + suffisso, tetto 60 caratteri.
- Description riscritte dove sforavano o non dicevano niente: tutte entro 165 caratteri (verifica automatica in `--check`).
- H2 della home rinominati in chiave di ricerca e con ancore stabili scritte a mano: `## Case in vendita a Rivergaro in questo momento {#immobile-in-evidenza}`, `## Cerchi un'altra casa a Rivergaro? {#ricerca-personalizzata}`, `## Domande frequenti su Rivergaro e Val Trebbia` (prima «Tre domande veloci» con quattro domande sotto). L'ancora del menu «Se cerchi altro» ora punta a `#ricerca-personalizzata` (config `navigazione.ancora_ricerca`), non più a `#la-villa-non-fa-per-te` che etichettava «Contatti» una sezione che non c'entra.
- Catalogo (`immobili.html`): H1 nuovo `Immobili in vendita a Rivergaro e in Val Trebbia` + due H2 (`Proposte disponibili in questo momento`, `Non trovi quello che cerchi?`) e un paragrafo sulle frazioni: prima la pagina aveva un H1 nudo, un salto h1→h3 e ~90 parole. Le card ora stanno sotto un H2 vero.
- Contatti e Chi sono: H1 con nome e qualifica (`Contatti con Davide Scaglia, agente immobiliare a Rivergaro`, `Davide Scaglia, agente immobiliare a Rivergaro dal 2007`), H2 parlanti al posto di «I recapiti» / «Le qualifiche».
- Scheda immobile: title SEO dedicato (`titolo_seo` nel dato, `Villa con 3 unità abitative ad Ancarano, Rivergaro`, 50 caratteri) invece del titolo lungo 85 caratteri troncato in SERP.
- Nuovo controllo in `node build.js --check`: gerarchia senza salti (h1→h3 ecc.), id univoci per documento, descrittori `srcset` uguali alla larghezza reale del file, title ≤ 62 e description ≤ 165 caratteri.

### Roba tecnica che i motori vedono

- **26 id duplicati eliminati**: `wrapSections()` non copia più l'id dell'H2 sulla `<section>`; la sezione è etichettata con `aria-labelledby` (accessibilità uguale, HTML valido).
- **Favicon vera**: `/favicon.ico` restituiva la pagina 404 (35 KB di HTML con status 404) a ogni richiesta di browser e crawler. Ora esistono `favicon.ico` (32×32) e `apple-touch-icon.png` (180×180), generati da `tools/make-brand-assets.js` (zero dipendenze) con la stessa figura dell'icona inline, copiati in radice dalla build e dichiarati in `<head>` con percorso relativo corretto anche sotto `/legal/` e `/immobile/`.
- **Canonical tolto dalle pagine noindex** (404, grazie): dichiarare canonico un URL d'errore o di ringraziamento è un segnale contraddittorio.
- **og:image solo dove ha senso**: le pagine di servizio (privacy, cookie, grazie, 404) non condividono più la foto della villa; senza immagine il `twitter:card` passa a `summary`.
- **JSON-LD piùonesto**: `offers` pubblicato solo se il prezzo è un numero (prima usciva `"price": "Prezzo in definizione"`, che per un motore è un prezzo finto); `image` capped a 10 foto campionate uniformemente (prima 192 URL, 55 KB di JSON-LD nella scheda); le unità abitative entrano come `additionalProperty` con m², rendita e APE.
- **`lastmod` onesto fino in fondo**: nuovo archivio `src/data/lastmod.json` con hash del contenuto per pagina; la sitemap aggiorna la data solo quando la pagina cambia davvero, e la scheda resta a `data_modifica` dell'immobile (2026-11-03) anche se rigeneri il sito.
- **llms.txt da brochure a fonte citabile**: sede completa con frazione, denominazione dell'impresa, P.IVA, REA, iscrizione al ruolo, e per l'immobile pubblicato i dati di ogni unità (m², rendita catastale, classe APE e indice) più la riga «Prezzo: non pubblicato». Prima un motore generativo che cercava la sede trovava solo quella del sito gemello.
- **Menu senza voci fantasma**: «Zone» e «Guide» non vengono più dichiarate e scartate con avviso a ogni build; la home ora ha «Immobili» in menu (mancava).

### Il logo che diceva un'altra cosa

`img/brand/logo-davide-scaglia-rivergaro.png` contiene la scritta **«DAVIDE SCAGLIA — VENDERE CASA A PIACENZA»**: è il marchio del sito gemello, e in testata la riga sbagliata veniva coperta da un riquadro CSS in sovrapposizione (`background #1e1c18` allineato a percentuali fisse). Fragile e contraddittorio: l'header di un sito per chi *compra* a Rivergaro mostrava il claim di chi *vende* a Piacenza, e quel file era dichiarato `logo` nel JSON-LD. Ora la testata è un lockup tipografico con i font del sito (nome + claim «IMMOBILI A RIVERGARO»), il JSON-LD dichiara come logo il glifo di marca (`apple-touch-icon.png`), e il vecchio PNG resta in `img/brand/` non referenziato. **Quando Davide consegna un logo Rivergaro corretto si rimette l'immagine cambiando una costante in `build.js`.** Conseguenza positiva: l'elemento LCP della home non è più un'immagine nell'header.

### Cookie e privacy coerenti con la realtà

Banner e Cookie Policy promettevano un'«anteprima Street View» caricata solo col consenso: **sul sito non esiste nessun iframe Street View** (quella roba vive su `casepodenzano.it`). Testo del banner e tabella dei servizi esterni riscritti: resta solo FormSubmit, che vede l'IP quando invii un modulo, cioè quando glielo chiedi tu.

### Verifica

`node build.js` ✓ 9 pagine senza avvisi · `node build.js --check` ✓ (zero problemi) · title 40–58 caratteri su tutte le pagine · description 99–161 · un H1 per pagina · nessun id duplicato · srcset = larghezze reali · sitemap con lastmod per contenuto · `data/properties.json` pubblico invariato a parità di dato.

### Restano aperti, in mano a Davide (non risolvibili dal repository)

1. **Prezzo della villa**: i portali lo pubblicano (470.000 €) e la policy interna (`publish_policy.scadenza_bozza`, 14 giorni) è scaduta da 17; il sito dice «Prezzo in definizione». Serve una decisione: pubblicare il prezzo confermato o togliere la dicitura ambigua.
2. **Search Console**: verifica e copertura non verificabili da qui (`seo_geo.verifica_search_console` = DA CONFERMARE).
3. **HTTPS forzato** su GitHub Pages spento (`https_enforced: false`) e `www` che punta all'apice con certificato solo apice: vanno accesi/sistemati dal pannello, non dal codice.
4. **Attivazione FormSubmit**: al primo invio arriva la mail di conferma da cliccare.
5. **Logo Rivergaro** corretto da fornire (vedi sopra).

## Il logo di Davide è tornato in testata, ricreato corretto (09/11/2026, sera)

**Perché.** Dopo la merge della PR #59 Davide ha chiesto di rimettere il logo: è il suo marchio, nome e cognome devono restare riconoscibili in ogni sito pubblicato, e va reso «ancora più bello e visibile». Aveva ragione: toglierlo non era la strada giusta, la strada era ricrearlo senza la scritta sbagliata.

**Il file nuovo: `img/brand/logo-rivergaro.png`** (1077×141, sfondo trasparente, ~20 KB). Stesso linguaggio grafico della famiglia — monogramma **DS** sfumato rosa→blu, filetto oro verticale, **DAVIDE SCAGLIA** in Playfair Display 700 maiuscolo spaziato, claim in oro — ma con il claim giusto per questo dominio: **«IMMOBILI A RIVERGARO»**, non «VENDERE CASA A PIACENZA». I glifi sono rasterizzati dai woff2 auto-ospitati del sito (gli stessi che legge il browser), quindi il logo è tipograficamente identico al testo del sito; il file è a risoluzione doppia e in testata è esposto a metà dei pixel nativi: nitido su retina.

**Come si rigenera.** `tools/make-logo.js` (nuovo): `cd tools && npm install && npm run logo`. È l'unico tool con una dipendenza (`fontkit`, solo per leggere i woff2); la build del sito resta senza dipendenze e il PNG generato è committed, quindi a Davide non serve installare nulla. Cambiando la stringa del claim nello stesso script si produce la variante gemella per gli altri siti dell'ecosistema: il marchio resta identico, il claim diventa quello del dominio.

**In testata, più grande di prima.** Lockup immagine ripristinato in `src/templates/header.html`: larghezza `min(72vw,560px)` contro la precedente `min(68vw,480px)` del vecchio logo (e contro il lockup tipografico provvisorio), con `alt` veritiero e `width`/`height` nativi per il CLS. Sui breakpoint piccoli resta proporzionalmente più presente del vecchio (60vw/56vw contro 48vw/43vw).

**Dove punta ora il marchio.** Il JSON-LD dell'entità dichiara `logo` = il file nuovo con le dimensioni lette dai byte; favicon e apple-touch-icon restano il glifo quadrato coerente. Il PNG storico con il claim gemello rimane in `img/brand/` come archivio, non referenziato da nessuna pagina.

**Verificato:** `node build.js` ✓ 9 pagine · `node build.js --check` ✓ · logo presente in tutte le testate con dimensioni esplicite · JSON-LD `logo` = 1077×141 · anteprima su fondo #0a0a0a controllata a video: monogramma, filetto e claim leggibili e contrastati.

## Segnali espliciti per i motori AI + entità sociale (09/11/2026, terzo giro)

**robots.txt con permesso nominale ai crawler AI.** Oltre al `User-agent: *` aperto, il file generato ora dichiara uno per uno i client dei motori generativi — GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-User, Anthropic-AI, PerplexityBot, Perplexity-User, Google-Extended, Gemini-Deep-Research, Applebot-Extended, Amazonbot, CCBot, cohere-ai, YouBot, meta-externalagent — con `Allow: /` e un commento che spiega la scelta. Con la sola regola generica alcuni client interpretano male l'assenza di una riga propria; così l'apertura è inequivocabile e leggibile anche da chi audita il sito.

**Profili social nel footer con `rel="me"`.** Il token `{{SOCIAL}}` esisteva ma restava vuoto: i quattro profili dichiarati nel config (Instagram, Facebook, LinkedIn, YouTube) non erano pubblicati da nessuna parte, mentre il JSON-LD li dichiarava in `sameAs`. Ora il footer li mostra («Seguimi: …») con `rel="me noopener"`: pagina e dati strutturati si confermano a vicenda, che è il segnale di consolidamento dell'entità usato da Google e dai motori generativi per capire che profilo, sito e scheda parlano della stessa persona.

**`ItemList` nel JSON-LD del catalogo.** `immobili.html` dichiara ora l'elenco strutturato delle schede pubblicate (posizione, titolo, URL, `numberOfItems`): la pagina elenco e le schede sono collegate senza ambiguità anche per chi legge solo i dati strutturati. Quando il catalogo crescerà, l'elenco si aggiorna da solo perché nasce da `catalogo()`.

**HTTPS forzato: serve un clic di Davide.** Il tentativo di accendere `https_enforced` via API REST di GitHub risponde 403 con il token di questa integrazione («Resource not accessible by integration»): è un'impostazione che richiede i permessi di amministrazione del repository. Percorso esatto: GitHub → repository → **Settings → Pages → spuntare «Enforce HTTPS»**. Finché resta spento, `http://comprarecasarivergaro.it` non viene redirectato e l'URL dichiarato da GitHub è ancora quello in chiaro: è l'ultimo punto tecnico non risolvibile dal codice.

**Verificato:** `node build.js` ✓ 9 pagine · `node build.js --check` ✓ · robots.txt con 16 blocchi AI + sitemap · footer con 4 profili `rel="me"` su tutte le pagine · `immobili.html` con `ItemList` numberOfItems 1 · meta robots esteso (`max-image-preview:large, max-snippet:-1`) già presente sulle pagine indicizzabili.

## Navigazione agentica 2/3 → discoverability di llms.txt (09/11/2026, quarto giro)

**Il sintomo.** PageSpeed Insights del 09/11/2026 19:50 (mobile): Prestazioni 95, Accessibilità 100, Best practice 100, SEO 100, ma **Navigazione agentica 2/3**. Search Console, nel frattempo, pulita: l'indicizzazione è confermata.

**La causa.** Dei tre requisiti della voce agentica (file `llms.txt` presente e servito; file valido con intestazioni, collegamenti Markdown e pagine collegate complete; file **dichiarato dal sito**), il terzo mancava: `llms.txt` esisteva (3.159 byte, formato corretto) ma nessuna pagina lo annunciava — zero `<link rel="llms-txt">` nell'head, nessuna menzione in `robots.txt`. Un agente che arriva su una pagina qualsiasi senza conoscere la convenzione sul percorso non aveva modo di scoprirlo.

**La correzione.**
- `head()` emette `<link rel="llms-txt" href="…/llms.txt">` su tutte le pagine indicizzabili, con prefisso relativo corretto (`llms.txt` in radice, `../llms.txt` sotto `/legal/` e `/immobile/`), escluso sulle noindex come il canonical.
- `robots.txt` aggiunge, dopo la Sitemap, un commento con l'URL assoluto dell'indice: ignorato dai parser robots classici, leggibile da chi cerca l'indice dei contenuti.

**Da rifare dopo la merge.** Rilanciare PageSpeed sullo stesso URL: la voce agentica dovrebbe leggere 3/3. Il 95 di Prestazioni resta il tetto realistico su GitHub Pages (niente CDN configurabile, niente cache lunghe): i margini veri stanno dietro Cloudflare o un altro hosting, non nel repository.

## Hero senza indirizzo, FormSubmit attivo, Search Console confermata (09/11/2026, quinto giro)

**Rimosso su richiesta di Davide.** La riga «Studio in Via Felice Cavallotti 3, frazione Pieve Dugliara — 29029 Rivergaro (PC)» non apre più la home: il lead dell'hero adesso comincia direttamente con «Sono Davide Scaglia, agente immobiliare a Rivergaro…». L'indirizzo dello studio **resta dove serve ai motori e alla legge, ma non in vetrina**: riga NAP nel footer di ogni pagina, blocco «Chi risponde e dove» in `llms.txt`, `address` nel JSON-LD dell'entità. Coerenza NAP mantenuta, vetrina più pulita.

**FormSubmit: da «DA CONFERMARE» ad «ATTIVO».** Davide ha inviato il modulo di prova e cliccato il link di attivazione nella casella info@immobiliarescaglia.com: `form.stato_configurazione` passa ad ATTIVO con la data della conferma, e il campo esce dalla lista `campi_da_confermare`. I moduli del sito possono essere presentati come funzionanti.

**Search Console: da «DA CONFERMARE» a «CONFERMATA».** Proprietà verificata e copertura senza errori, sitemap inviata: annotato in `seo_geo.verifica_search_console` con la data. Anche questo campo esce dalla lista dei campi aperti, che ora contiene solo voci legali/privacy e contenuti che scrive Davide.

**HTTPS forzato: non ancora risultato attivo.** Al momento della scrittura l'API GitHub risponde ancora `https_enforced: false` e `html_url` in `http://`: o la spunta non è stata salvata o era disabilitata in attesa del certificato. Percorso da ricontrollare: GitHub → repository → **Settings → Pages → sezione HTTPS → spunta «Enforce HTTPS»** e attendere che la casella resti spuntata dopo un refresh. Nessun cambiamento di codice necessario: è un'impostazione del pannello.

**Verificato:** `node build.js` ✓ · `node build.js --check` ✓ · zero occorrenze della riga rimossa in `index.html` · NAP del footer intatto su tutte le pagine · hero con due paragrafi di lead.

### Copy dell'hero decisa da Davide (stesso giro, prima della merge di #63)
Primo paragrafo del lead sostituito verbatim con la frase dettata: «Sono Davide Scaglia, agente immobiliare. Questo sito è dedicato a chi cerca casa A Rivergaro Val Trebbia.» (maiuscola voluta da Davide). Il secondo paragrafo («Se tra le proposte non c'è quella giusta…») resta.

### Nella card contatti la riga «Studio» diventa «A CASA TUA» (09/11/2026)
Richiesta di Davide su chi-sono.html: al posto dell'etichetta «Studio» con l'indirizzo della sede, la card contatti (usata da `chi-sono.md` e `contatti.md`, quindi coerente su entrambe) mostra ora la riga a tutta larghezza **«A casa tua»** — la promessa di metodo: gli incontri li apre lui, dal cliente. L'indirizzo della sede **non è stato cancellato**: resta nel NAP del footer di ogni pagina, in `llms.txt`, nel JSON-LD `address` e nel paragrafo «Dove si trova lo studio: Rivergaro, frazione Pieve Dugliara» della stessa chi-sono. CSS: `.contact-list li.contact-wide{grid-template-columns:1fr}` per la riga a piena larghezza.

### Build Pages errored sul commit 9b659f8 e rilancio (10/11/2026)
La build GitHub Pages del merge #64 (commit `9b659f8`) è terminata con «Page build failed.» dopo una coda insolitamente lunga; nessuna causa nel repository (radice di `main` integra: `.nojekyll`, `CNAME`, source `main:/`; le stesse strutture avevano costruito senza errori nei cinque merge precedenti). Il sito nel frattempo continua a servire l'ultima build buona (`799397c`), quindi nessun visitatore vede errori: manca solo all'appello la riga «A casa tua» nelle card. L'API non permette di richiedere un rebuild con il token di questa integrazione (403), quindi il rimedio è un commit nuovo su `main`, che rilancia la build: è lo scopo di questa nota. Se in Settings → Pages compare un pulsante di retry, in alternativa basta quello.

### Copy asciugata dove dice Davide (10/11/2026)
Tre tagli/riscritture dettati da Davide, tutti nei sorgenti (`src/pages/home.md` e `professionista.bio_acquirenti` nel config):
1. **«Dove lavoro»** (home): resta solo «Seguo Rivergaro con le sue frazioni — Pieve Dugliara, Rivergaro centro, Diara, Ancarano, Bassano, Roveleto Landi.»; via la coda «— e i comuni vicini lungo l'asta del Trebbia. Se cerchi in una zona che non è la mia, te lo dico subito, invece di farti perdere tempo.»
2. **Hero**: via il secondo paragrafo del lead («Se tra le proposte non c'è quella giusta… venti annunci»); l'hero resta una frase sola, più secca.
3. **Bio di chi-sono**: riscritta con voce naturale ed empatica, senza fronzoli: tre paragrafi brevi (l'agente dal 2007 al fianco di chi compra; niente vetrina, solo case viste e documenti verificati, e se non c'è la cerco io; il primo incontro dove preferisci, anche a casa tua). Via il recapito dell'ufficio dal racconto: la sede resta in footer, llms.txt e JSON-LD. `_regola_bio` aggiornata con data e motivazione; `bio_stato` resta «confermato», quindi nessuna nota di revisione in pagina.
Nota di coerenza da decidere con Davide: la FAQ «Che zona segui?» e `areaServed` del JSON-LD citano ancora i comuni intorno lungo il Trebbia; il paragrafo «Dove lavoro» ora no. Se il perimetro vero è solo il comune di Rivergaro, vanno allineati; se invece i comuni vicini restano nel perimetro, il paragrafo può riaccogliere una menzione breve.

### Perimetro deciso da Davide e prezzo riservato (10/11/2026, sesto giro)
**Area coperta dal servizio**, incollata da Davide con CAP e provincia e messa come fonte di verità in `area_servizio.area_coperta_servizio`: Piacenza PC; Vigolzone 29020 PC; Podenzano 29027 PC; Rivergaro 29029 PC; Gossolengo 29020 PC; Ponte dell'Olio 29028 PC. Allineati tutti i punti che nominano la zona, che ora citano esattamente questi comuni: paragrafo «Dove lavoro» della home, paragrafo del catalogo, FAQ «Che zona segui?» (via la generica «asta del Trebbia»), blocco «Zona» di `llms.txt` (con i CAP, identico al profilo pubblico dell'attività). `areaServed` del JSON-LD era già questi sei comuni. Regola annotata nel config: nessun testo deve più nominare perimetri diversi.
**Prezzo villa: non si pubblica.** Decisione di Davide: «adesso non è ancora ora… al telefono lo dico io». La dicitura visibile diventa **«Prezzo riservato: te lo dico io al telefono»** (card, scheda, `<dl>` dei dati); `llms.txt` dice «Prezzo: riservato — te lo dice Davide al telefono, +39 328 693 0033»; il JSON-LD resta senza `offers.price` finché non arriva il numero, come già progettato. Aggiornata la nota interna dell'immobile con data e motivazione.

### FAQ orari: via l'invito a passare in sede (10/11/2026)
Correzione di Davide: la risposta «Quando è aperto lo studio?» diceva «…In quegli orari rispondono al telefono o si passa in Via Felice Cavallotti 3, frazione Pieve Dugliara, Rivergaro.»; la parte dopo «telefono» non è esatta e va tolta. Ora: «Lunedì–venerdì 09:00–12:30 e 15:00–19:00; sabato 09:00–12:30. In quegli orari rispondono al telefono.» Corretto nell'unico punto sorgente (config), quindi aggiornato in home, nel JSON-LD FAQPage e in llms.txt insieme.

### Scheda: tabella subito sotto il titolo, via la nota, via il prezzo visibile (10/11/2026)
Tre correzioni di Davide sulla scheda immobile, in ordine:
1. **Nota sotto la tabella eliminata**: «Rendita catastale espressa in euro. Senza attestato energetico indicato: Box. Per l'APE sono riportati la classe e l'indice dell'attestato.» non c'è più; la tabella parla da sola (tolta anche la regola CSS orfana `.prop-units-note`).
2. **Tabella «Superfici, rendite catastali e APE» spostata in alto**: è ora il primo blocco sotto l'hero con il titolo («Cerchi casa in Val Trebbia? Villa indipendente con 3 unità abitative ad Ancarano, Rivergaro»), prima di foto e descrizione: i numeri verificati sono la prima cosa che si legge.
3. **Prezzo non visibile da nessuna parte**: `prezzo()` rende qualcosa solo se il valore è un numero confermato; la stringa nel dato resta come promemoria interno. Spariti quindi la riga «Prezzo» nel `<dl>` laterale, il badge prezzo nell'hero della scheda, il prezzo del blocco evidenza in home e quello delle card del catalogo. Quando Davide deciderà la cifra, tutti i punti la mostrano di nuovo da soli e il JSON-LD emette `offers.price`. In `llms.txt` resta una riga per i motori AI («Prezzo: riservato — te lo dice Davide al telefono…»): evita che un motore generativo inventi o recuperi cifre dai portali; se Davide la vuole tolta anche lì, è una riga sola.

### Giro 09/11/2026: pagine markdown in contenitore, 404 integra, CTA che si nota, chiave «agente immobiliare Rivergaro», automazione GitHub
- **Layout**: il blocco prima del primo H2 delle pagine markdown (chi-sono, contatti, grazie, legali, 404) finiva fuori da qualsiasi contenitore: testo sparato contro il bordo dello schermo, logo e footer disallineati. Ora vive in `.wrap.page-head`; l'hero della home resta full-bleed per costruzione.
- **404 integra da qualsiasi URL**: prefisso assoluto `/` per header, css, script e template (prima i percorsi relativi rompevano logo e menu quando Pages serviva la 404 da una sottocartella, es. /zone/x.html); link del corpo assoluti con ancora vera `#ricerca-personalizzata`; «perché» con l'accento.
- **CTA dell'evidenza** «Scheda completa, foto e contatti →»: 1,25rem, oro #ffd700, battito lento di 2,2 s (non il lampeggio secco: oltre i 3 flash/s è rischio fotosensibile, WCAG 2.3.1), disattivato con `prefers-reduced-motion`.
- **Chiave «agente immobiliare Rivergaro»**: nuova sezione home `#agente-immobiliare-rivergaro` col perimetro dettato da Davide (Rivergaro con le frazioni + i cinque comuni); `slogan` e `description` sul nodo RealEstateAgent del JSON-LD; riga «Professionista» di llms.txt con la stessa dicitura; description della home riscritta per il clic (155 caratteri, col telefono): title e H1 restano quelli dettati.
- **Registro URL storici**: `seo.url_storici_rimossi` nel config elenca i sette indirizzi della versione 23/10 tolti dall'indice da Davide il 09/11; devono restare 404 e la sorveglianza lo verifica.
- **Automazione GitHub**: `ci.yml` (build + check a ogni push e PR), `site-watch.yml` (ogni giorno alle 06 e dopo ogni deploy: ogni URL della sitemap deve rispondere 200, gli URL storici 404, nessuna dicitura di prezzo visibile, PageSpeed mobile in avviso; se qualcosa fallisce apre una Issue da solo), `indexnow.yml` (notifica la sitemap a IndexNow — Bing, Copilot, Yandex e altri — a ogni deploy, con chiave pubblica `d41e8b2f6a0c4e79b35f1a2c8e6d0497.txt` in radice). La logica dei controlli vive in `tools/watch-site.js`, eseguibile anche in locale.

### Giro 09/11/2026 (secondo ramo): pagina territorio, immagini alleggerite, custode riparato
- **Nasce `/vivere-a-rivergaro.html`** (decisa da Davide il 09/11: niente case, niente prezzi, solo luogo). Attacco con la frase sua approvata lo stesso giorno, con la distanza da lui scelta («una quindina di chilometri da Piacenza», registrata in `area_servizio._nota_distanza_piacenza` perché nessuno la «corregga» sulle fonti esterne). Sezioni: servizi di tutti i giorni dall'elenco «Vivere il Comune» del sito del Comune di Rivergaro (verificato 09/11, fonte citata in pagina), sport e tempo libero, fiume Trebbia e Parco regionale, borghi e castelli dei dintorni, distanze, e quattro domande di luogo rese col shortcode `risposte_pronte` che le registra anche nel FAQPage della pagina. Niente frazioni, come da regola.
- **Collegata ovunque**: voce «Vivere qui» nel menu di home, contatti, chi-sono e catalogo; voce «Vivere a Rivergaro» nel footer; link dalla sezione «Vivere a Rivergaro» della home; sezione «## Territorio» in `llms.txt` con gli stessi fatti; sitemap e `pagesList()`.
- **`paginaViva()` nuovo in build.js**: una pagina conta come viva se esiste l'output o anche solo il suo markdown sorgente, cosi' menu e footer la linkano gia' al primo build pulito (prima la voce cadeva al primo giro e ricompariva dal secondo).
- **Immagini alleggerite** con `tools/optimize-img.py` (thumbnail ≤ 640 px q68, intere ≤ 1600 px q72, riscrive solo se pesa meno): cartella villa da 32 MB a 16 MB; width/height nell'HTML riallineati dal build da solo.
- **`site-watch.yml` riparato**: la riga che apre la Issue era uno scalar YAML non quotato con due punti dentro → il workflow moriva prima di partire; ora è quotata e il titolo usa un trattino.
