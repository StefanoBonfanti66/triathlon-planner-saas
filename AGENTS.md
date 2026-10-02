# Agent rules

- Read PROJECT_AI_NOTES.md before doing major work.
- Prefer small diffs.
- Ask before touching secrets, .env, deployment, infra, auth, billing.
- Follow existing code style.
- Update PROJECT_AI_NOTES.md at meaningful checkpoints.

## Current Focus — 2026-10-02

### Session completed (2 ottobre — sotto-gare Cervia 3905 e UNATRI 4139 corrette)
- [x] **Catalogo "Mixed Relay" era un titolo stale**: `app/src/races_full.json` non era allineato ai titoli reali del DB per l'evento 3905. Rigenerato con `tools/generate_races_full_json.py` dall'export `backups_history/2026-09-30/`: **464 → 465 gare** (+1 `3905-6`, 3 corrette). Ora: `3905-1` Age Group 26/09 · `3905-2` Elite 26/09 · `3905-3` Coppa Crono **Femminile** 27/09 · `3905-4` Coppa Crono **Maschile** 27/09 · `3905-5` Sprint Mixed Relay 27/09 · `3905-6` TRI EVENT Coppa Crono Mixed 27/09.
- [x] **Baldo e il gruppo MTT erano già corretti sul DB** (`3905-4` = Coppa Crono Maschile): era la UI a mostrare il nome sbagliato. **Nessun atleta MTT è iscritto al Mixed Relay** (`3905-5` = 0 righe in export). API FITRI (27/09 = `idGara W11450` "Coppa Crono Maschile") conferma per Baldo, Albini, Quaglia, Pellegrino, Bonfanti, Dughera.
- [x] **3 script SQL consegnati, da eseguire a mano** nel Supabase SQL Editor (credenziali ancora non valide: MCP `Unauthorized`, Management API 401):
  1. `tools/2026-10-02_paolo_pellegrino_unatri.sql` — sposta Paolo Pellegrino (`c756da6a-…`, tessera `65172/A200665`) da `4139-1` (UNATRI kids) a `4139-2` (UNATRI).
  2. `tools/2026-10-02_cervia_3905_coppa_crono_maschile.sql` — porta `3905-3`→`3905-4` per Albini, Quaglia, Pellegrino, Bonfanti, Dughera (avevano preso la gara Femminile leggendo i titoli stale) + dedup duplicati.
  3. `tools/2026-10-02_rimuovi_mixed_relay_3905-5.sql` — soft-delete su `3905-5`, **no-op atteso** (zero righe).
- [x] **Commit `1f4f350` → push `5f23792`, deploy Vercel `dpl_EJvRiCM6PGpBtfewwk9aZvFD5vAy` READY** su `triathlon-planner-saas.vercel.app` (HTTP 200). `tsc --noEmit` exit 0.

### Attivo
- [ ] **Rilascio gratuito MTT** — app live per Milano Triathlon Team, uso gratuito permanente per MTT; in prospettiva campagna pubblicitaria verso le società di triathlon italiane per acquisire nuovi utenti.

### Sessioni precedenti
- [x] **30/09 — catalogo gare congelato**: `races_full.json` fermo al 05/05/2026 (commit `6512ec2`) → rigenerato 374→464 con `tools/generate_races_full_json.py`, fix paginazione `mtt_api_scraper.py` (`fetch_all_events`, PAGE_SIZE 100), commit `1bc1956` in prod. **36 profili MTT senza `user_plan`** da screening. 4100 Cerveteri `is_removed=true` eseguito a mano.
- [x] **30/09 — Stefano Baldo**: `tools/2026-09-30_stefano_baldo_lecco_cervia.sql` (Lecco `4012-1` + Cervia `3905-1`/`3905-4` Coppa Crono Maschile) — **già eseguito dall'utente**.
- [x] **24/09 — 2 atleti senza tempi**: Livio Santalucia (8 plan) e Martine Maillard (`150105`); fix deploy Vercel Root Directory `app` + nome/cognome in anagrafica (commits `e6d2803`, `b23f63b`, `6b52061`).
- [x] **21/09 — gara Iseo mancante** per Andrea Paolo Lemma (SQL diretto). Debug logging temporaneo in `TeamCalendarPage.tsx` **ancora presente (da rimuovere)**.
- [x] **18/09 — risultati FITRI in-app** (`getClassificheAtleta`, `fitri.ts`, `FitriResultBadge`; commit `003a110`).
- [x] Sessioni maggio-giugno: task sprint completati (vedi PROJECT_AI_NOTES.md).

### Next step
- **Eseguire a mano i 3 SQL** (ordine 1→2→3) nel Supabase SQL Editor e verificare in app che Baldo, Pellegrino e il gruppo Coppa Crono compaiano sotto le sotto-gare corrette.
- Screening dei **36 atleti MTT senza `user_plan`** (stesso sintomo: Dashboard vuota).
- Rimuovere il debug logging in `TeamCalendarPage.tsx` (riga ~55, era temporaneo per diagnostica).
- **Refresh periodico del catalogo**: dopo ogni export DB fresco `python3 tools/generate_races_full_json.py` (senza più `--force-removed 4100`) e commit.
- Ripartire dal **Backlog idee** in `PROJECT_AI_NOTES.md` (card condivisibile, leaderboard MTT con puntiFitri, storico/PB, confronto splits, meteo gara). Prioritizzare.
