# Profilo professionale — verificato da visura camerale
Documento di lavoro. Fonte: visura storica dell'impresa **IMMOBILIARESCAGLIA DI SCAGLIA DAVIDE**,
documento **T 610879435**, estratto dal Registro Imprese il **07/07/2025** (CCIAA dell'Emilia).
Questo file **non viene pubblicato**: alimenta `src/data/site-config.json` ed è la prova d'origine dei dati anagrafici.

## Dati pubblicabili (usati nel sito)

| Voce | Valore verificato |
|---|---|
| Insegna / denominazione | IMMOBILIARESCAGLIA DI SCAGLIA DAVIDE |
| Forma giuridica | Impresa individuale, iscritta come **piccolo imprenditore** (sezione speciale) |
| Sede | Via Felice Cavallotti 3, 29029 **Rivergaro (PC)** — frazione **Pieve Dugliara** |
| P.IVA | 01493570335 |
| REA | PC-168637 |
| PEC (domicilio digitale) | immobiliarescaglia@pec.it |
| Attività | Agenzia di mediazione immobiliare — ATECO 68.31.00 |
| Qualifica | **Ruoli degli Agenti di Affari in Mediazione, sezione Agenti Immobiliari, provincia di Piacenza — dal 07/12/2007** |
| Inizio attività | 12/12/2007 |
| Iscrizione Registro Imprese | 21/05/2008 |
| Addetti | 1 (il titolare; nessuna unità locale, nessun dipendente) |
| Stato | attiva |

## Il "2007 vs 2008" non è più un problema
Sono due fatti diversi, entrambi veri: **07/12/2007** iscrizione al ruolo agenti, **12/12/2007** inizio attività, **21/05/2008** iscrizione al Registro Imprese. Il sito dice **"dal 2007"** e il JSON-LD usa `foundingDate: 2007`, che è il dato corretto e anche il più antico dei tre.

## Dati personali che NON vanno mai pubblicati
Il codice fiscale della persona fisica, data e luogo di nascita, la residenza privata e lo storico dei protocolli non compaiono né nel sito né nel config. `build.js --check` li tratta come **patto di riservatezza**: se una di quelle stringhe esce nel markup, la build fallisce. (Nota: la sede risulta nella stessa via della residenza indicata in visura — per il sito usiamo **solo** la qualifica di "Sede", senza dire che è anche abitazione.)

## Come aggiornare
1. Nuova visura / variazione → aggiorni questo file.
2. Riporti i valori in `src/data/site-config.json` (`professionista`, `privacy_cookie.titolare_blocco`).
3. `node build.js --check && git commit` → tutto il sito cambia in un colpo (footer, Chi Sono, JSON-LD, privacy).

## Da usare appena possibile (non inventato, serve confermarne l'uso)
- In **Privacy/Termini**: "PEC per comunicazioni ufficiali: immobiliarescaglia@pec.it".
- In **Chi Sono**: la qualifica da agente iscritto al ruolo, con data. È il differenziatore più forte verso un acquirente: "non un venditore di annunci, un mediatore iscritto al ruolo dal 2007".
