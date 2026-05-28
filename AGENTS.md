# Agent rules

- Read PROJECT_AI_NOTES.md before doing major work.
- Prefer small diffs.
- Ask before touching secrets, .env, deployment, infra, auth, billing.
- Follow existing code style.
- Update PROJECT_AI_NOTES.md at meaningful checkpoints.

## Current Focus — 2026-05-28

### Session completed (14-28 maggio)
- [x] **Sessione di recupero contesto** — git pull, analisi stato repo, inventario documentazione
- [x] **Verifica deploy Vercel** — il codice viewer (`is_viewer`/`isViewer`) è già in produzione (6 riferimenti nel bundle JS). Jesse funzionante a `https://triathlon-planner-saas.vercel.app`
- [x] **Test Jesse confermato** — utente viewer `support-reply@stripe.com` vede tutto, non modifica nulla

### Sessioni precedenti (13 maggio)
- [x] Security fix: NOT NULL constraint on `profiles.team_id` + trigger `handle_new_user` rewrite + RLS policy (`tools/fix_team_id_not_null.sql`)
- [x] SQL deployato su Supabase con successo
- [x] Utente `roacoy200@gmail.com` gestito (profili orfani puliti)
- [x] Tutti i 9 warning CodeQL rimossi (import e variabili inutilizzati)
- [x] Dependabot config creato (`.github/dependabot.yml`)
- [x] Template repository creato: `StefanoBonfanti66/triathlon-starter`
- [x] Global AGENTS.md aggiornato: sezione Security best practices + comando `/new-project`
- [x] Git config globale corretto a `sbonfanti@hotmail.com`
- [x] **Nuovo ruolo `is_viewer`** — colonna `profiles.is_viewer` aggiunta, policy RLS riscritte per bloccare write a viewer, frontend adattato
- [x] Utente demo **Jesse** (`support-reply@stripe.com`, team `demo-view`) settato come viewer — vede tutto, non modifica nulla
- [x] **Bug fix login** — `recovery_token` NULL in `auth.users` bloccava il login (errore GoTrue: "Database error querying schema"). Fixate 26 righe con valori NULL su 7 colonne token

### Observability note
- I deploy Vercel risultano `BLOCKED` dal 22 maggio (ultimo READY: 21 maggio). Le uniche differenze nei commit sono backup JSON — il codice app non è cambiato. Da investigare se blocca futuri deploy.

### Next step
- Sbloccare Vercel auto-deploy (BLOCKED dal 22/5) oppure creare altri utenti demo/viewer per altri team
