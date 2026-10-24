# Agent rules

- Read PROJECT_AI_NOTES.md before doing major work.
- Prefer small diffs.
- Ask before touching secrets, .env, deployment, infra, auth, billing.
- Follow existing code style.
- Update PROJECT_AI_NOTES.md at meaningful checkpoints.

## Current Focus — 2026-10-24

### Session completed (24 ottobre — allineamento repo + pulizie)
- [x] **Repo allineato a origin/main**: pull con rebase/autostash completato, `HEAD` a `7e59093` (incluso fix FITRI DSQ `af62333`).
- [x] **Fix badge FITRI per posizioni anomale/DSQ** (già in remoto): `app/src/fitri.ts` normalizza DSQ/SQUAL/RITIR/DNF/NON CLASS/ESCL/SQ e valori > 900000; `app/src/FitriResultBadge.tsx` mostra badge rosso `DSQ` nascondendo posizioni generali/categoria.
- [x] **Rimozione debug logging**: rimosso `console.log("Fetching team plans for team:", teamId)` da `app/src/pages/TeamCalendarPage.tsx` (rimane solo `console.error`).
- [x] **Correzioni iscrizioni Cervia 3905 e UNATRI 4139**: eseguiti in Supabase SQL Editor i 3 script nell'ordine corretto – Pellegrino spostato a `4139-2` (UNATRI), gruppo Coppa Crono spostato da `3905-3` a `3905-4`, rimosse iscrizioni `3905-5` (Mixed Relay). Verificati in app.

### Attivo
- [ ] **Rilascio gratuito MTT** — app live per Milano Triathlon Team, uso gratuito permanente per MTT; in prospettiva campagna pubblicitaria verso le società di triathlon italiane per acquisire nuovi utenti.

### Sessioni precedenti
- [x] **02/10 — sotto-gare Cervia 3905 e UNATRI 4139 corrette** (script SQL eseguiti manualmente il 24/10).
- [x] **30/09 — catalogo gare congelato**: `races_full.json` fermo al 05/05/2026 (commit `6512ec2`) → rigenerato 374→464 con `tools/generate_races_full_json.py`, fix paginazione `mtt_api_scraper.py` (`fetch_all_events`, PAGE_SIZE 100), commit `1bc1956` in prod. **36 profili MTT senza `user_plan`** da screening. 4100 Cerveteri `is_removed=true` eseguito a mano.
- [x] **30/09 — Stefano Baldo**: `tools/2026-09-30_stefano_baldo_lecco_cervia.sql` — **già eseguito dall'utente**.
- [x] **24/09 — 2 atleti senza tempi**: Livio Santalucia (8 plan) e Martine Maillard (`150105`); fix deploy Vercel Root Directory `app` + nome/cognome in anagrafica (commits `e6d2803`, `b23f63b`, `6b52061`).
- [x] **21/09 — gara Iseo mancante** per Andrea Paolo Lemma (SQL diretto).
- [x] **18/09 — risultati FITRI in-app** (`getClassificheAtleta`, `fitri.ts`, `FitriResultBadge`; commit `003a110`).

### Next step
- Screening dei **36 atleti MTT senza `user_plan`** (stesso sintomo: Dashboard vuota).
- Analizzare richiesta in `docs/requests/2026-10-23-mtt-telegram-allenamenti.md` (stato `DA ANALIZZARE` – invio allenamenti MTT via Telegram ogni lunedì).
- **Refresh periodico del catalogo**: dopo ogni export DB fresco `python3 tools/generate_races_full_json.py` (senza più `--force-removed 4100`) e commit.
- Ripartire dal **Backlog idee** in `PROJECT_AI_NOTES.md` (card condivisibile, leaderboard MTT con puntiFitri, storico/PB, confronto splits, meteo gara). Prioritizzare.
