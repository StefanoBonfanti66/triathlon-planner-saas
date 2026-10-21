# Agent rules

- Read PROJECT_AI_NOTES.md before doing major work.
- Prefer small diffs.
- Ask before touching secrets, .env, deployment, infra, auth, billing.
- Follow existing code style.
- Update PROJECT_AI_NOTES.md at meaningful checkpoints.

## Current Focus — 2026-10-21

### Session completed (21 ottobre — fix visualizzazione DSQ Peschiera Luca Bacci)
- [x] **Fix badge FITRI per posizioni anomale/DSQ**: `app/src/fitri.ts` normalizza `posizione`/`posizione_categoria` quando `strPosizione` indica DSQ/SQUAL/RITIR/DNF/NON CLASS/ESCL/SQ o valori > 900000.
- [x] **Fix UI badge**: `app/src/FitriResultBadge.tsx` mostra badge rosso `DSQ` con icona AlertTriangle, nascondendo i badge "posizione generale" e "posizione di categoria" per risultati non classificati.
- [x] **Verifica dati FITRI**: per Luca Bacci (68660) a Peschiera 2026-10-03 (W11741) restituito `strPosizione: "DSQ"`, `posizione: 999998`, `posizione_categoria: 999998`. Ora correttamente mostrato come DSQ invece di `999998° cat`.

### Attivo
- [ ] **Rilascio gratuito MTT** — app live per Milano Triathlon Team, uso gratuito permanente per MTT; in prospettiva campagna pubblicitaria verso le società di triathlon italiane per acquisire nuovi utenti.

### Sessioni precedenti
- [x] **02/10 — sotto-gare Cervia 3905 e UNATRI 4139 corrette** (commit `c79eee9`, `5f23792`). 3 SQL consegnati da eseguire manualmente in Supabase SQL Editor.
- [x] **30/09 — catalogo gare congelato**: `races_full.json` fermo al 05/05/2026 (commit `6512ec2`) → rigenerato 374→464 con `tools/generate_races_full_json.py`, fix paginazione `mtt_api_scraper.py` (`fetch_all_events`, PAGE_SIZE 100), commit `1bc1956` in prod. **36 profili MTT senza `user_plan`** da screening. 4100 Cerveteri `is_removed=true` eseguito a mano.
- [x] **30/09 — Stefano Baldo**: `tools/2026-09-30_stefano_baldo_lecco_cervia.sql` — **già eseguito dall'utente**.
- [x] **24/09 — 2 atleti senza tempi**: Livio Santalucia (8 plan) e Martine Maillard (`150105`); fix deploy Vercel Root Directory `app` + nome/cognome in anagrafica (commits `e6d2803`, `b23f63b`, `6b52061`).
- [x] **21/09 — gara Iseo mancante** per Andrea Paolo Lemma (SQL diretto). Debug logging temporaneo in `TeamCalendarPage.tsx` **ancora presente (da rimuovere)**.
- [x] **18/09 — risultati FITRI in-app** (`getClassificheAtleta`, `fitri.ts`, `FitriResultBadge`; commit `003a110`).

### Next step
- **Eseguire a mano i 3 SQL** (ordine 1→2→3) nel Supabase SQL Editor e verificare in app che Baldo, Pellegrino e il gruppo Coppa Crono compaiano sotto le sotto-gare corrette.
- Screening dei **36 atleti MTT senza `user_plan`** (stesso sintomo: Dashboard vuota).
- Rimuovere il debug logging in `TeamCalendarPage.tsx` (riga ~55, era temporaneo per diagnostica).
- **Refresh periodico del catalogo**: dopo ogni export DB fresco `python3 tools/generate_races_full_json.py` (senza più `--force-removed 4100`) e commit.
- Ripartire dal **Backlog idee** in `PROJECT_AI_NOTES.md` (card condivisibile, leaderboard MTT con puntiFitri, storico/PB, confronto splits, meteo gara). Prioritizzare.
