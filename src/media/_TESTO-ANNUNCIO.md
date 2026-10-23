# Testo annuncio — casa/villa con 3 unità abitative e terreno circostante

Scrivi qui, come ti viene. Non serve l'HTML, non serve il tono "da agenzia":
io ripulisco, metto in forma, e **i primi ~200 caratteri li riscrivo come risposta pronta**
(cosa è, dove, per chi, con i numeri) per Google e per i motori generativi.
Quello che non mi scrivi resta **vuoto**, non lo invento: se un campo manca, il blocco non compare nella pagina.

## Da compilare

```
titolo breve (serve anche per l'URL: /immobile/<slug>.html):
prezzo richiesto:
comune + frazione:
via o riferimento di zona (se vuoi esporlo):
superficie totale (mq) :: e per singola unità, se diverse:
unità abitative (n°, e mq/locali di ciascuna):
terreno (mq, e cosa ci si può fare: orto, box, parcheggio, edificabile?):
anno di costruzione / ultimi interventi:
riscaldamento e impianti:
classe energetica (se hai l'APE; se no scrivi "da fare"):
stato manutentivo (abitabile subito / da ristrutturare / parzialmente):
annesse pertinenze (box, cantina, portico, fienile, annessi rurali):
vincoli (paesaggistico, idrogeologico, distanze, servitù di passo):
catasto: categorie e se c'è qualcosa da sanare:
riscaldamento/acqua/fose: allaccio o pozzo/fossa biologic:
strada di accesso e parcheggio:
distanze indicative (scuole, negozi, Piacenza):
spese/IMU se conosci, o "da verificare":
perché conviene (in 2 righe, oneste):
stato attuale: Disponibile | In trattativa | Riservato
data inizio commercializzazione:
```

## Cartelle immagini / video

Scrivi qui i **nominativi delle cartelle da cui prendere i file**, nell'ordine in cui devono apparire nella galleria.
Per ciascuna dimmi che cosa contiene, così associo lo slug senza sbagliare:

```
cartella 1:              → immobile:              (n° foto previste: )
cartella 2 (video):      → immobile:
note:                    (es. "la 1 e la 2 sono la facciata", "salta le foto con le persone")
```

## Cosa faccio io quando arriva la roba

1. sposto i file in `img/<slug>/` rinominandoli `casa-tre-unita-pieve-dugliara-1.webp` (kebab-case, niente spazi/parentesi),
2. leggo le dimensioni reali da ogni file e le scrivo nell'HTML (niente salto di layout),
3. se un file è troppo pesante (>400KB) o troppo grande (lato >2600px) te lo segnalo prima di pubblicarlo,
4. converto in WebP,
5. compilo `src/data/properties.json` e genero `index.html`, la scheda, `sitemap.xml`, `llms.txt`, dati strutturati `RealEstateListing`;
6. ti mostro l'anteprima **prima** di ogni commit/push.
