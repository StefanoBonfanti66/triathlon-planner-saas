# Agent rules

- Read PROJECT_AI_NOTES.md before doing major work.
- Prefer small diffs.
- Ask before touching secrets, .env, deployment, infra, auth, billing.
- Follow existing code style.
- Update PROJECT_AI_NOTES.md at meaningful checkpoints.

## Current Focus — 2026-09-24

### Session completed (24 settembre — bug fix dati: 2 atleti senza tempi gare)
- [x] **Bug: Livio Santalucia e Martine Maillard non vedevano i tempi delle loro gare** — bug di DATI, non di codice. Nessun file del repo toccato; fix applicato live su Supabase via REST (service_role).
- [x] **Martine Maillard** — il profilo attivo `156fdedb-7b2f-4a32-a0eb-242325d97cf0` aveva `license_number` NULL (nessuna fetch FITRI). Aggiornato con tessera `150105` + `is_licensed=true`; duplicato `eb687b1c-3746-4d39-932b-9f6f4888b5c0` soft-deletato (`deleted_at`); migrati i dati anagrafici residui dal duplicato (nascita 02/06/1973, genere F, certificato al 29/10/2026, socio). Verificato: risultato Mantova 20/09 01:39:52 pos 21.
- [x] **Livio Santalucia** — profilo OK (tessera `61035`, verificata su API FITRI) ma 0 `user_plans`. Inseriti 8 user_plans (gare fitri 2026: Ostia 3990-1, Tolentino 4026-1, Santa Marinella 4002-1, Manfredonia 4082-1, Trani 4052-5, Vieste 3926-1, Bardolino 4089-1, Iseo 3940-1).
- [x] **Setup accesso Supabase live** — server MCP `supabase` fuori uso ('Unauthorized'); workaround stabile via REST API con service_role (`API=https://bwzzvdwiimvdwkiytknc.supabase.co`, key in `/tmp/svc_key.txt`, token gestione `SUPABASE_MCP_TOKEN`).
- [x] **Fix deploy Vercel** — build falliva (vite: command not found, exit 127) perché la build partiva dalla radice del repo; config corretta: Root Directory `app`, Build Command `npm run build`; produzione e preview ora READY.

### Attivo
- [ ] **Rilascio gratuito MTT** — app live per Milano Triathlon Team, uso gratuito permanente per MTT; in prospettiva campagna pubblicitaria verso le società di triathlon italiane per acquisire nuovi utenti.

### Sessioni precedenti
- [x] **21/09 — bug fix FITRI data**: gara Iseo mancante per Andrea Paolo Lemma (user_plan + races via SQL). Debug logging temporaneo in `TeamCalendarPage.tsx` **ancora presente (da rimuovere)**.
- [x] **18/09 — feature FITRI**: risultati reali in-app via `getClassificheAtleta` (posizione, categoria, tempo, frazioni); `app/src/fitri.ts` + `FitriResultBadge.tsx`; badge in `DashboardPage` e `TeamCalendarPage`; commit `003a110` → `main` (`08beabc`).
- [x] Sessioni maggio-giugno: task sprint completati (vedi PROJECT_AI_NOTES.md).

### Next step
- Verificare su produzione che i badge FITRI di Livio (8 gare) e Martine (Mantova) compaiano su Dashboard e Team Calendar, e che l'anagrafica mostri Nome/Cognome corretti (MONSIGNY CHASSAGNARD Dorothee, MAILLARD SALINS Martine).
- Rimuovere il debug logging in `TeamCalendarPage.tsx` (riga ~55, era temporaneo per diagnostica).
- Ripartire dal **Backlog idee** in `PROJECT_AI_NOTES.md` (card condivisibile, leaderboard MTT con puntiFitri, storico/PB, confronto splits, meteo gara). Prioritizzare.