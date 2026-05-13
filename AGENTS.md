# Agent rules

- Read PROJECT_AI_NOTES.md before doing major work.
- Prefer small diffs.
- Ask before touching secrets, .env, deployment, infra, auth, billing.
- Follow existing code style.
- Update PROJECT_AI_NOTES.md at meaningful checkpoints.

## Current Focus — 2026-05-13

### Session completed
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

### Still open
- [ ] Monitorare le prossime registrazioni per verificare che il trigger blocchi correttamente i tentativi senza team_code

### Next step
- Fare deploy su Vercel per rendere operativo il profilo viewer di Jesse, oppure creare altri utenti demo/viewer per altri team
