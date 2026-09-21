# Agent rules

- Read PROJECT_AI_NOTES.md before doing major work.
- Prefer small diffs.
- Ask before touching secrets, .env, deployment, infra, auth, billing.
- Follow existing code style.
- Update PROJECT_AI_NOTES.md at meaningful checkpoints.

## Current Focus — 2026-09-21

### Session completed (21 settembre — bug fix FITRI data)
- [x] **Fix gara Iseo mancante per Andrea Paolo Lemma** — causa: user_plan assente per race 3940-2 + gara mancante in DB `races`. Fixato via SQL diretto su Supabase (INSERT races + user_plans).
- [x] Debug logging temporaneo aggiunto in `TeamCalendarPage.tsx` per diagnostica flusso FITRI (da rimuovere).
- [x] Verificato end-to-end: FITRI API restituisce risultato, matching per data+località funziona.

### Sessione precedente (18 settembre — feature FITRI)
- [x] **Risultati FITRI in-app** — l'atleta iscritto a una gara passata vede risultato reale (posizione, categoria, tempo, frazioni) nel planner. Nuovi `app/src/fitri.ts` + `app/src/FitriResultBadge.tsx`; integrati in `DashboardPage` ("Le mie gare") e `TeamCalendarPage` (per partecipante).
- [x] Endpoint FITRI pubblici senza auth (`getClassificheAtleta/<anno>/<tessera>-FITRI`), match gara per data+località.
- [x] Tested su preview + prod: deploy `https://triathlon-planner-saas.vercel.app` live.
- [x] Commit `003a110` su develop + merge su main (`08beabc`).

### Sessioni precedenti (14-28 maggio, 10 giugno)
- [x] Tutti i task sprint precedenti completati (vedi PROJECT_AI_NOTES.md)

### Next step (lunedì)
- Rimuovere debug logging da `TeamCalendarPage.tsx` (era temporaneo per diagnostica).
- Ripartire dal **Backlog idee** in `PROJECT_AI_NOTES.md` (card condivisibile, leaderboard MTT con puntiFitri, storico/PB, confronto splits, meteo gara). Prioritizzare.
