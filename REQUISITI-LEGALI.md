# Requisiti legali del sito — dove vive ciascun dato obbligatorio

Mappa decisa con Davide il 10/11/2026: ogni dato che la legge chiede sta nel punto che la
legge chiede, e in nessun altro posto. Regola operativa: se un dato non è richiesto da una
norma, non si pubblica. L'indirizzo completo della sede (che è casa del titolare e non un
ufficio aperto al pubblico) vive in UN solo punto pubblico del sito — la privacy policy,
raggiungibile dal footer di ogni pagina — perché è lì che il D.Lgs. 70/2003 chiede che le
informazioni sul prestatore siano «facilmente, direttamente e permanentemente accessibili».
Fuori dal web resta dove deve: visura camerale, fatture, contratti, e indirizzo nascosto
nel pannello Google Business Profile (attività con area di servizio: il pubblico non lo vede).

| norma | dato chiesto | dove vive su questo sito |
|---|---|---|
| D.Lgs. 70/2003, art. 7 | denominazione, indirizzo geografico della sede, email, P.IVA, iscrizione al registro/REA, estremi del ruolo per le professioni regolamentate | denominazione, P.IVA, REA, email, telefono e ruolo nel footer di ogni pagina; indirizzo completo nella sola privacy policy, linkata dal footer di ogni pagina |
| Art. 2250 c.c. (registro imprese e REA negli atti, esteso ai siti) | P.IVA e REA | footer di ogni pagina |
| GDPR artt. 13-14 | identità e dati di contatto del titolare del trattamento | privacy policy (denominazione, sede comunale, email, telefono, PEC) |
| L. 39/1989 (agenti d'affari in mediazione) | iscrizione al ruolo nella comunicazione al pubblico | footer, chi-sono, llms.txt: ruolo agenti di Piacenza dal 07/12/2007 |
| DPR 633/72, art. 35 | partita IVA | footer di ogni pagina |
| Provvedimento Garante privacy sui cookie (2022) | banner, informativa, consenso per i non tecnici | banner cookie + cookie policy; il sito usa soli cookie tecnici |
| Google Business Profile | indirizzo vero per la verifica; nascondibile al pubblico per le attività con area di servizio | solo nel pannello Google, come indirizzo nascosto; in pubblico «Rivergaro (PC)» e le aree di servizio |

## Cosa NON si pubblica e perché non è richiesto
- Indirizzo completo fuori dalla privacy policy: nessuna norma lo chiede in più punti;
  la molteplicità era solo esposizione del domicilio privato del titolare.
- Prezzo degli immobili: scelta editoriale di Davide (si comunica al telefono); nessuna
  norma lo impone negli annunci privati.
- Recensioni o valutazioni autodichiarate nei dati strutturati: vietate dalle linee guida
  Google sui dati strutturati e dalla regola di non inventare dati.

## Sorveglianza
`node build.js --check` e la sorveglianza giornaliera falliscono se l'indirizzo della sede
ricompare in qualsiasi file del progetto diverso da `src/pages/privacy.md` e dalla pagina
pubblica `legal/privacy.html`, o in una pagina pubblica diversa dalla privacy.
