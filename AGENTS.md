# Agent rules

- Read PROJECT_AI_NOTES.md before doing major work.
- Prefer small diffs.
- Ask before touching secrets, .env, deployment, infra, auth, billing.
- Follow existing code style.
- Update PROJECT_AI_NOTES.md at meaningful checkpoints.

## Current Focus — 2026-09-30

### Session completed (30 settembre — catalogo gare congelato + registrazioni Stefano Baldo)
- [x] **Indagata la gara "di Paullo" e 69 altre gare FITRI 2026 invisibili all'app** — causa radice: `app/src/races_full.json` (unica fonte gare del frontend, il DB serve solo da override `status`/`is_removed`) era **congelato al 05/05/2026** (commit `6512ec2`). Il CMS FITRI `cms.myfitri.it/api/eventi` al 30/09 espone **217 eventi 2026** (Q1 30, Q2 95, Q3 62, Q4 30) contro 192 id_evento nel JSON: **30 eventi mancanti = 69 gare** (Paullo/UNATRI `4139` incluso), tutti già presenti nel DB Supabase. FITRI ha fatto un aggiornamento di massa del calendario il **29/09/2026** (25/30 eventi con `publishedAt` = 2026-09-29).
- [x] **Rigenerato `app/src/races_full.json`: 374 → 464 gare** (+90, 0 rimosse, 39 corrette con i valori più completi del DB: `title` 30, `date` 12, `distance` 9, `event` 6, `category` 6, `type` 4, `is_removed` 2). Creato **`tools/generate_races_full_json.py`** (rigenera il JSON dall'export più recente in `backups_history/`, 12 campi canonici, `--source/--out/--force-removed/--dry-run`) perché prima era fatto a mano.
- [x] **Fix paginazione di `mtt_api_scraper.py`** — `pagination[limit]=500` veniva ricappato a 100 da Strapi e non c'era offset: un trimestre con >100 eventi avrebbe perso le gare più recenti. Aggiunto `fetch_all_events()` con `PAGE_SIZE=100` / `MAX_PAGES=50` e loop su `pagination[start]`. Scraper eseguito davvero: 217 eventi invariati, 451 righe, 2 hit su Paullo.
- [x] **Commit `1bc1956` pushato e in produzione** — deploy Vercel `dpl_B4L3ZH5cTnTYZohJ7a9FWgB78fM8` READY su `triathlon-planner-saas.vercel.app`. Validazioni: `tsc --noEmit` exit 0, 464 id univoci, nessun id senza progressivo, `4100-1.is_removed=true`, Paullo presente.
- [x] **4100 Cerveteri** — l'utente ha eseguito a mano `UPDATE races SET is_removed=true, status='hidden' WHERE id='4100-1';` (credenziali Supabase non valide: MCP `Unauthorized`, Management API 401 «JWT could not be could be decoded», `/tmp/svc_key.txt` sparito ⇒ ogni scrittura DB passa da SQL manuale). **Blocco risolto**, non serve rigenerare il JSON.
- [x] **Stefano Baldo (tessera `85122/A252252`, team `mtt`)** — NON aveva 0 piani ma 2 (`3933-1`, `3939-3`). Preparato **`tools/2026-09-30_stefano_baldo_lecco_cervia.sql`**: `UPDATE profiles` per `first_name='Stefano'` / `last_name='Baldo'` (erano NULL) + `INSERT` idempotente in `user_plans` per **`4012-1`** (Lecco 05/07, Sprint) e **`3905-1`/`3905-4`** (Cervia 26-09 Sprint Age Group, 27-09 Coppa Crono **Maschile**), `priority='C'`, `cost=0`. Da eseguire a mano nel Supabase SQL Editor.
- [x] **Diagnostica MTT**: **36 profili attivi del team non hanno alcun `user_plan`** → la loro Dashboard "Le mie gare" è vuota. Candidati a uno screening (Fabio Soresi, Tatjana Kuzina, Alessandro Labate, Riccardo Zorzetto, …).

### Attivo
- [ ] **Rilascio gratuito MTT** — app live per Milano Triathlon Team, uso gratuito permanente per MTT; in prospettiva campagna pubblicitaria verso le società di triathlon italiane per acquisire nuovi utenti.

### Sessioni precedenti
- [x] **24/09 — bug fix dati: 2 atleti senza tempi gare**: Livio Santalucia (8 `user_plans` inseriti) e Martine Maillard (`license_number` NULL → `150105`, duplicato soft-deletato); fix applicato via REST Supabase. Fix deploy Vercel (Root Directory `app`) e feature Nome/Cognome in anagrafica (commits `e6d2803`, `b23f63b`, `6b52061`).
- [x] **21/09 — bug fix FITRI data**: gara Iseo mancante per Andrea Paolo Lemma (user_plan + races via SQL). Debug logging temporaneo in `TeamCalendarPage.tsx` **ancora presente (da rimuovere)**.
- [x] **18/09 — feature FITRI**: risultati reali in-app via `getClassificheAtleta` (posizione, categoria, tempo, frazioni); `app/src/fitri.ts` + `FitriResultBadge.tsx`; badge in `DashboardPage` e `TeamCalendarPage`; commit `003a110` → `main` (`08beabc`).
- [x] Sessioni maggio-giugno: task sprint completati (vedi PROJECT_AI_NOTES.md).

### Next step
- Committare `PROJECT_AI_NOTES.md` + `tools/2026-09-30_stefano_baldo_lecco_cervia.sql` (fix catalogo già committato e in produzione con `1bc1956`).
- Verificare su produzione che le 90 gare recuperate (Paullo/UNATRI compresa) compaiano nella ricerca/lista gare e che le 3 gare di Baldo appaiano in Dashboard "Le mie gare" e Team Calendar dopo l'esecuzione dello SQL.
- **Refresh periodico del catalogo**: dopo ogni export DB fresco lanciare `python3 tools/generate_races_full_json.py` (senza più `--force-removed 4100`) e committare — è la lezione di questa sessione, il JSON è un artefatto generato e non può restare congelato.
- Screening dei **36 atleti MTT senza `user_plan`** (stesso sintomo: Dashboard vuota).
- Rimuovere il debug logging in `TeamCalendarPage.tsx` (riga ~55, era temporaneo per diagnostica).
- Ripartire dal **Backlog idee** in `PROJECT_AI_NOTES.md` (card condivisibile, leaderboard MTT con puntiFitri, storico/PB, confronto splits, meteo gara). Prioritizzare.
