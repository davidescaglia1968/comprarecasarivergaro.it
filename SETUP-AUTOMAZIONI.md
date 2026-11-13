# Automazioni: cosa c'è, cosa costa, come si collega

Situazione al 10/11/2026. Principio: ogni automazione toglie lavoro ripetitivo ma lascia
a Davide l'ultima parola su ciò che esce in pubblico con il suo nome.

## Già attive, costo zero
| automazione | dove | cosa fa |
|---|---|---|
| CI build + check | `ci.yml` | a ogni PR e push: build, sintassi workflow, check dati/link/H1 |
| IndexNow | `indexnow.yml` | a ogni push su main notifica Bing (e quindi ChatGPT Search, Perplexity) |
| Sorveglianza sito vivo | `site-watch.yml` | ogni giorno alle 06:00 e a ogni merge: 13 invarianti + PageSpeed mobile; se fallisce apre una Issue |
| Pacchetto social | `social-pack.yml` | a ogni contenuto nuovo genera i testi per 5 canali e apre una issue-bozza da approvare |

## Il flusso social, passo per passo
1. Un contenuto nuovo (pagina o immobile) viene fuso in main.
2. `social-pack.yml` genera `social-pack.md` (testi leggibili) e `social-pack.json` (dati
   per le macchine) con `tools/social-pack.js`: LinkedIn, Facebook+GBP, carosello
   Instagram/TikTok in 5 slide con script parlato, thread X in 3 tweet, post YouTube.
   I testi derivano SOLO dal contenuto pubblicato e dai dati verificati: niente prezzi,
   niente indirizzo, niente promesse inventate.
3. Si apre una **issue-bozza**: niente parte senza l'ok di Davide lì sopra.
4. Se (e solo se) il segreto `SOCIAL_WEBHOOK_URL` è configurato, il JSON viene inoltrato a
   Make.com o n8n, che pubblica sui profili dopo l'approvazione. Senza webhook, il flusso
   resta manuale: copi i testi approvati e li incolli: cinque minuti.

## Collegare Make/n8n (quando vorrai)
1. Account Make.com (piano gratis: 1.000 operazioni/mese, bastano) o n8n (cloud ~24 €/mese).
2. Crea uno scenario: Webhook custom → router verso i moduli dei social (Meta, LinkedIn,
   YouTube, TikTok sono gratuiti per pubblicare sui propri profili; X ha limiti severi sul
   piano gratuito: valutalo solo se i volumi lo giustificano).
3. Copia l'URL del webhook in GitHub: repo → Settings → Secrets and variables → Actions →
   New repository secret → nome `SOCIAL_WEBHOOK_URL`.
4. Da quel momento il passo 4 qui sopra si accende da solo. Fino ad allora, spento.

## Costi mensili dello stack consigliato
- GitHub free + Cloudflare free (quando lo metterai davanti ai domini) + Make free: **0 €**.
- GitHub Pro 4 €: solo se privatizzi il repo (GitHub Pages da repo privato richiede Pro).
- Voci opzionali: n8n cloud ~24 € al posto di Make; API di X a pagamento solo per volumi alti.

## Avvertenze che valgono più di qualsiasi automazione
- **Lead via webhook**: se un giorno i moduli dovranno arrivare a Make/n8n/CRM, quel
  fornitore tocca dati personali: prima si aggiornano privacy e cookie policy, poi si
  collega. Non il contrario.
- **Pubblicità professionale**: un messaggio immobiliare automatico sbagliato (prezzo,
  disponibilità, promesse) è una sanzione potenziale per un agente iscritto al ruolo.
  Per questo la bozza passa da te.
- **Tono**: i template scrivono come te (prima persona, niente fronzoli). Se un testo non
  ti somiglia, si corregge il template in `tools/social-pack.js`, una volta per tutte.

## Privatizzazione del repo (decisa, non ancora fatta)
1. Verifica GitHub Pro (Settings → Billing): senza Pro, GitHub Pages non pubblica repo
   privati e il sito andrebbe giù al momento della privatizzazione.
2. Repo → Settings → General → Danger Zone → Change repository visibility → Private.
3. Non toccare altro: Pages resta sul ramo main; CI, sorveglianza e pacchetto social
   funzionano anche da privato; le issue-aperte-dalla-sorveglianza restano visibili a te.
4. Effetti: storia git e PR spariscono dalla vista pubblica; le pagine GitHub che oggi
   escono nelle ricerche col nome del sito cadranno dall'indice.
5. Dopo il clic: verifica che sito, deploy e sorveglianza restino verdi (lo faccio io nel
   ramo successivo).

## Decisioni chiuse il 10/11/2026
- **Tracker: no.** Niente Google Analytics o pixel: si misura con Search Console (chi ti
  trova e su quali parole), lead in arrivo (FormSubmit) e sorveglianza (velocità e salute
  del sito). Aggiungere osservatori esterni costerebbe consenso, privacy e fiducia senza
  cambiare nessuna decisione reale.
- **sameAs del profilo Google: in attesa** del link pubblico copiato dal pannello (Condividi
  → copia link). Meglio aspettare che cucire un'entità sbagliata nei dati strutturati.
