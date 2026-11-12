# Report di ottimizzazione — comprarecasarivergaro.it

Programma in più giri nato dal brief del 10/11/2026. Questo documento tiene la tabella
prima/dopo con misure reali; ogni giro aggiunge la sua sezione. Le misure «dopo» sono
lette dai file generati dalla build; LCP/CLS/INP li misura la sorveglianza
(`site-watch.yml`, PageSpeed Insights mobile su home e scheda) a ogni merge: il numero
del giro è quello della run citata in fondo alla sezione.

## Giro 1 — galleria progressiva, peso, banda banner (10/11/2026)

| voce | prima | dopo | nota |
|---|---|---|---|
| foto della scheda realmente aperte all'avvio | 193 figure rese in sezioni aperte | 12 (1 hero eager + 11 lazy) | le altre 180 stanno in un `<details>` chiuso: zero byte scaricati e zero layout finché non si apre |
| pulsante «Mostra tutte le foto» | assente | `<summary>` nativo: funziona senza JavaScript, da tastiera e con lo screen reader | testo alternato «Chiudi le foto aggiuntive» a aperto |
| tagli immagine per foto | thumb 640w + piena 1600w | + intermedia 1240w su tutte le 192 foto | il retina non scarica più la piena per una card; srcset aggiornato da solo dalla build |
| js/main.js servito | 12.259 B | 9.968 B | minificazione in build senza dipendenze, con ricompila di sicurezza (vm.Script) |
| css/main.css su disco | 32.199 B | 29.182 B | idem; l'inline in pagina era già compresso dai giri scorsi, quindi l'html cala poco |
| html della scheda | 247.319 B | 265.932 B | cresce: i srcset con la terza taglia e le regole nuove pesano più del risparmio inline; il costo che conta (foto aperte, layout) cala |
| repo img/ | 16,2 MB (thumb+piene) | 25 MB | +192 tagli intermedi; thumb e piene nel frattempo alleggerite di 850 KB |
| banda «Se invece devi vendere» | carta con molto vuoto sopra il testo | sezione compattata (`section--cta`): il testo parte alto | richiesta di Davide del 10/11 |
| immagine che risponde 404 | icona rotta del browser | scatola con il testo alternativo (miglioramento progressivo in main.js) | |
| sorveglianza | 8 invarianti | 9: la galleria deve restare progressiva (blocco aperto ≤ 12 figure + «Mostra tutte le foto») | se una build futura la rompe, la run fallisce e apre Issue |

Scelta documentata contro la lettera del brief: le 180 foto chiuse restano nel markup
dentro `<details>` invece di essere iniettate da JavaScript. Motivo: senza JavaScript il
visitatore deve poter vedere tutte le foto (regola del brief e del sito), e un `<details>`
chiuso non scarica nulla e non fa layout. Il criterio che conta — «la galleria non carica
inutilmente tutte le immagini all'apertura» — è rispettato: alla apertura si scaricano
hero + 12 card.

Limiti dichiarati: LCP/INP/CLS non sono misurabili in locale in questo ambiente; li misura
la sorveglianza sul sito vivo a ogni merge (run PageSpeed Insights mobile). Il numero del
giro 1 è nella run citata qui sotto in chat e nel riassunto della workflow.

## TODO che aspettano dati o decisioni di Davide

- dicitura «Prezzo su richiesta» in scheda: oggi il prezzo non compare per sua regola («lo dico al telefono»); serve un sì o un no esplicito.
- analytics/tracking conversioni: su Pages statico non c'è backend; serve la sua scelta privacy (oggi: nessun tracker, cookie tecnici soli).
- SPF/DKIM/DMARC del dominio email: checklist da fare sul suo fornitore (i moduli passano da FormSubmit).
- testo delle guide nuove (costi e documenti, prima casa): solo parole sue, come sempre.
- clic residui sul pannello Google (descrizione senza la via, indirizzo nascosto + aree di servizio, categoria principale, telefono/orari/CAP) e spunta Enforce HTTPS su Pages.

## Giri successivi già pianificati

- Giro 2: barra fissa telefono/WhatsApp su smartphone, modulo rapido (nome, telefono o WhatsApp, richiesta, consenso), trust vicino alle CTA, breadcrumb a tre voci con JSON-LD coerente (la voce «Immobili» oggi punta alla scheda: bug confermato).
- Giro 3: vecchi URL (/guide/…, /zone/pieve-dugliara.html, /immobili/casa-indipendente-niviano.html) — Pages non fa 301 lato server: strategia 404 pulita + rimozioni GSC già fatte + zero link residui da verificare; fonti e date visibili su «Vivere a Rivergaro».
- Giro 4: audit accessibilità (tastiera, zoom 200%, contrasti, focus) e piano di monitoraggio 30 giorni.

## Giro 2 — conversione e breadcrumb (10/11/2026)

| voce | prima | dopo |
|---|---|---|
| contatto da smartphone | telefono solo nel testo e nel footer | barra fissa in basso «Chiama Davide / WhatsApp» sotto i 760px, con safe area, target 52px, spazio riservato al body (non copre nulla), nascosta in stampa |
| percorso di contatto | solo modulo dettagliato (8 campi) | modulo rapido in 3 campi (nome, telefono o WhatsApp, richiesta, consenso) in contatti#contatto-rapido, stesso FormSubmit, stesso honeypot, stessa pagina di grazie; il dettagliato resta |
| CTA sulla scheda | telefono/WhatsApp/email + ricerca personalizzata | aggiunto «Chiedi prezzo e disponibilità» verso il modulo rapido (la dicitura resta verificabile da Davide: il prezzo continua a non comparire) |
| fiducia vicino ai contatti | dati aziendali solo in footer/chi-sono | tre fatti confermati sotto i contatti della scheda: dal 2007, ruolo CCIAA Piacenza, una persona sola |
| breadcrumb scheda | JSON-LD Home → scheda con voce «Immobili» puntata alla scheda (bug del brief, confermato) | JSON-LD e briciole visibili Home → /immobili.html → «Villa con 3 unità ad Ancarano» |
| sorveglianza | 9 invarianti | 11: barra mobile + modulo rapido; breadcrumb a tre voci |

Nessun servizio esterno nuovo: la barra sono due link tel:/wa.me, il modulo rapido usa
l'endpoint FormSubmit gia' dichiarato in privacy e cookie policy.
