# Agent rules

- Read PROJECT_AI_NOTES.md before doing major work.
- Prefer small diffs.
- Ask before touching secrets, .env, deployment, infra, auth, billing.
- Follow existing code style.
- Update PROJECT_AI_NOTES.md at meaningful checkpoints.

## Current Focus — 2026-06-10 (sessione 3)

### Session completed (10 giugno — sessione 3)
- [x] **Bonifica struttura docs** — allineata a standard ZBN (`leads/`, `proposals/`, `project/`, `admin/`, `invoices/`)
- [x] **Stima economica** — creata `docs/admin/stima-sviluppo.md` con valutazione "AI-Augmented"
- [x] **Validazione tecnica** — test di base con Playwright (configurato per chromium locale)

### Sessioni precedenti (14-28 maggio)
- [x] **Audit repository** — analizzato contesto, docs, automazioni, tool, rischi di duplicazione
- [x] **Root doc cleanup** — `GUIDA_ADMIN.md`, `GUIDA_UTENTE.md`, `CHANGELOG.md` sostituiti con stub che puntano a `docs/`
- [x] **Documentation impact** — aggiornati 4 file docs (`overview`, `user-guide`, `admin-guide`, `changelog`) per coprire `notify_upcoming_races()` e filtro compleanni
- [x] **Promemoria gare Telegram** — deployato `notify_upcoming_races()` su Supabase + attivato cron giornaliero
- [x] **Birthday notifications** — filtro per soli atleti attivi deployato su Supabase
- [x] Bug creazione atleta — verificato funzionante in produzione ✅
- [x] Security fix: NOT NULL on `profiles.team_id` + trigger `handle_new_user` + RLS
- [x] **Nuovo ruolo `is_viewer`** — viewer vede tutto, non modifica nulla
- [x] **Bug fix login** — `recovery_token` NULL fix (26 righe)

### Next step
- Validazione approfondita flussi atleti (onboarding/persistenza)
- Compilare `SECURITY.md` con le policy reali del progetto (repo pubblico dal 22/5)
