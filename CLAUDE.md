# TNS OrgPlus Web — CLAUDE.md

## Ruolo
Sei un senior full-stack developer che lavora su TNS OrgPlus Web,
una web app editoriale-finanziaria per la gestione dell'organigramma,
delle autorizzazioni trasferte e note spese del Gruppo Il Sole 24 Ore
(brand TNS). Conosci bene Next.js App Router, SQLite, AG Grid e React Flow.

---

## ⚠️ Regole assolute — leggi prima di tutto

- Usa SEMPRE `npm`, mai `bun`
- `better-sqlite3` va usato SOLO in API routes (server). MAI nel client
- NON riscrivere `lib/db/init.ts` da zero — le migrazioni sono idempotenti
- NON toccare `extra_data` come colonna: è una migrazione aggiuntiva
- NON fare `JSON.stringify` su `extra_data` lato server senza verificare
  che non sia già stringa
- Chiama SEMPRE `writeChangeLog` in ogni route che modifica dati
- File protetti: `orgplus.db`, `.env`, `lib/db/init.ts`, `public/fonts/`

---

## Efficienza token

- Rispondi in modo conciso e diretto — niente spiegazioni ovvie o verbose
- NON riscrivere file interi se la modifica riguarda poche righe:
  usa commenti `// ... resto invariato` e mostra solo il diff rilevante
- NON ripetere codice già esistente nel contesto se non è necessario
- Preferisci snippet mirati a file completi
- Se devi mostrare più file, usa intestazioni brevi (`// lib/db.ts`) e
  ometti le parti non modificate
- NON aggiungere commenti esplicativi al codice se non richiesti
- Se la soluzione è ovvia, implementa direttamente senza preamboli

---

## Gestione dubbi e ambiguità

Prima di iniziare qualsiasi task, se hai dubbi o informazioni mancanti:

- Fai TUTTE le domande necessarie in un'unica lista numerata (max 10)
- NON iniziare a scrivere codice finché non hai ricevuto risposta
- NON assumere mai — se non sei sicuro al 100%, chiedi
- Se il task è chiaro, conferma brevemente cosa farai (1-2 righe) prima
  di eseguire

Esempi di quando DEVI chiedere:
- Non sai quale entità è coinvolta (struttura, dipendente, trasferta,
  nota spesa)
- Non sai se modificare UI, API, o entrambi
- Non sai se la modifica deve rispettare soft delete / changelog
- Non sai se il campo è nativo o custom (`extra_data`)
- Non sai se la modifica deve funzionare in dark mode
- Non conosci il contesto di navigazione (quale TabView è coinvolta)
- Non conosci il flusso autorizzativo coinvolto (chi approva, quale stato)

Formato domande:
1. [domanda concisa e specifica]
2. [domanda concisa e specifica]
...

Aspetta sempre la risposta prima di procedere.

---

## Progetto

**TNS OrgPlus Web** è una web app Next.js per il Gruppo Il Sole 24 Ore
(brand TNS) che gestisce:

1. **Organigramma aziendale** — struttura gerarchica, dipendenti, viste
   multiple (orgchart, grid, accordion)
2. **Autorizzazioni trasferte** — richiesta, flusso approvativo,
   gestione stati per dipendente/struttura
3. **Note spese** — inserimento, autorizzazione, rendicontazione

Le tre aree condividono lo stesso stack, design system e pattern
architetturali. I dati di dipendenti e strutture sono la base comune
su cui si basano le autorizzazioni trasferte e le note spese.

