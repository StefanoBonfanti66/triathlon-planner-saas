# Agent rules

- Read PROJECT_AI_NOTES.md before doing major work.
- Prefer small diffs.
- Ask before touching secrets, .env, deployment, infra, auth, billing.
- Follow existing code style.
- Update PROJECT_AI_NOTES.md at meaningful checkpoints.

## Current Focus — 2026-10-25

### Session completed (25 ottobre — Allenamenti MTT via Telegram: test reale OK)
- [x] **Feature "allenamenti MTT via Telegram"** implementata su branch `feature/mtt-weekly-telegram-workouts` (commit `b21e5d2`, `b17858f`): tab Admin con generate/approve/send, storico in-app `/allenamenti-mtt`, Edge Function `mtt-weekly-workouts` protetta (Bearer + service_role/admin MTT, CORS allowlist), helper Telegram lato client **rimosso** (leak del bot token), workflow Actions con `npm ci` e `working-directory: app`.
- [x] **Deploy produzione**: Edge Function deployata su Supabase `bwzzvdwiimvdwkiytknc`; secret Edge `TELEGRAM_BOT_TOKEN` e `MTT_SERVICE_ROLE_KEY` impostati; tabella `team_workouts` già presente, aggiunta FK `team_id → teams.id`.
- [x] **Test reale (1 workout, solo testo)**: generata settimana 43/2026 → approvata → inviata con successo, **11 messaggi**, `status='sent'`, `telegram_message_ids` 56–66, `sent_at` registrato.
- [x] **Rollback definito**: eliminare i messaggi di prova con `deleteMessage`, riportare il record a `approved`, `supabase functions delete` + `supabase secrets delete` per annullare il deploy.

### Attivo
- [ ] **Rilascio gratuito MTT** — app live per Milano Triathlon Team, uso gratuito permanente per MTT; in prospettiva campagna pubblicitaria verso le società di triathlon italiane per acquisire nuovi utenti.
- [ ] **Allenamenti MTT — da completare**: bot Telegram definitivo MTT (sostituire il token del bot temporaneo nel secret Edge), invio il **lunedì** (attuale workflow: domenica 20:00 CEST), **immagini + testo** (ora solo testo), decidere proprietario del bot e destinatari.

### Sessioni precedenti
- [x] **24/10 — allineamento repo + pulizie**
- [x] **Repo allineato a origin/main**: pull con rebase/autostash completato, `HEAD` a `7e59093` (incluso fix FITRI DSQ `af62333`).
- [x] **Fix badge FITRI per posizioni anomale/DSQ** (già in remoto): `app/src/fitri.ts` normalizza DSQ/SQUAL/RITIR/DNF/NON CLASS/ESCL/SQ e valori > 900000; `app/src/FitriResultBadge.tsx` mostra badge rosso `DSQ` nascondendo posizioni generali/categoria.
- [x] **Rimozione debug logging**: rimosso `console.log("Fetching team plans for team:", teamId)` da `app/src/pages/TeamCalendarPage.tsx` (rimane solo `console.error`).
- [x] **Correzioni iscrizioni Cervia 3905 e UNATRI 4139**: eseguiti in Supabase SQL Editor i 3 script nell'ordine corretto – Pellegrino spostato a `4139-2` (UNATRI), gruppo Coppa Crono spostato da `3905-3` a `3905-4`, rimosse iscrizioni `3905-5` (Mixed Relay). Verificati in app.
- [x] **02/10 — sotto-gare Cervia 3905 e UNATRI 4139 corrette** (script SQL eseguiti manualmente il 24/10).
- [x] **30/09 — catalogo gare congelato**: `races_full.json` fermo al 05/05/2026 (commit `6512ec2`) → rigenerato 374→464 con `tools/generate_races_full_json.py`, fix paginazione `mtt_api_scraper.py` (`fetch_all_events`, PAGE_SIZE 100), commit `1bc1956` in prod. **36 profili MTT senza `user_plan`** da screening. 4100 Cerveteri `is_removed=true` eseguito a mano.
- [x] **30/09 — Stefano Baldo**: `tools/2026-09-30_stefano_baldo_lecco_cervia.sql` — **già eseguito dall'utente**.
- [x] **24/09 — 2 atleti senza tempi**: Livio Santalucia (8 plan) e Martine Maillard (`150105`); fix deploy Vercel Root Directory `app` + nome/cognome in anagrafica (commits `e6d2803`, `b23f63b`, `6b52061`).
- [x] **21/09 — gara Iseo mancante** per Andrea Paolo Lemma (SQL diretto).
- [x] **18/09 — risultati FITRI in-app** (`getClassificheAtleta`, `fitri.ts`, `FitriResultBadge`; commit `003a110`).

### Next step
- Sostituire il secret Edge `TELEGRAM_BOT_TOKEN` con il token del **bot MTT definitivo** e ripetere 1 invio di prova sul chat gruppo `-5117971075`.
- Spostare l'invio del workflow GitHub Actions dal **domenica 20:00 CEST** al **lunedì** (orario da concordare).
- Implementare **immagini + testo** nel workout settimanale (oggi solo testo).
- Decidere i 4 script SQL operativi cancellati dal commit `9cf7ddf` (esistono su `main`) prima di mergiare il branch in `main`.
- Screening dei **36 atleti MTT senza `user_plan`** (stesso sintomo: Dashboard vuota).
- **Refresh periodico del catalogo**: dopo ogni export DB fresco `python3 tools/generate_races_full_json.py` (senza più `--force-removed 4100`) e commit.
- Ripartire dal **Backlog idee** in `PROJECT_AI_NOTES.md` (card condivisibile, leaderboard MTT con puntiFitri, storico/PB, confronto splits, meteo gara). Prioritizzare.
