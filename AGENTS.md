# Agent rules

- Read PROJECT_AI_NOTES.md before doing major work.
- Prefer small diffs.
- Ask before touching secrets, .env, deployment, infra, auth, billing.
- Follow existing code style.
- Update PROJECT_AI_NOTES.md at meaningful checkpoints.

## Current Focus — 2026-10-28

### Completato
- **Allenamenti MTT in produzione**: periodizzazione a regole (macro-fase stagionale + mesociclo 4 settimane con scarico) + rendering LLM (Groq, fallback statico), brick run post-bici, test FTP ogni 6 settimane. Feature mergiata in `main` (`133f6b1`), Edge Function `mtt-weekly-workouts` deployata su Supabase `bwzzvdwiimvdwkiytknc` (secret: `TELEGRAM_BOT_TOKEN`, `MTT_SERVICE_ROLE_KEY`, `LLM_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `TELEGRAM_INVITE_URL`).
- **Invio domenica 20:00 italiane**: doppia cron UTC 18:00/19:00 + guardia `Europe/Rome` (fix DST, `bca1313`/`4923ced`). Bot attivo `@saas_planner_bot` nel gruppo MTT `-5117971075`.
- **Newsletter settimanale** via Resend, mittente `MTT Allenamenti <allenamenti@zetabytenexus.it>` (dominio `zetabytenexus.it` verificato); editor in Admin con Salva/Invia/Prova a me; tabelle `team_contacts` e colonna `team_workouts.newsletter_sent_at`.
- **Fix `\n` letterali** da LLM nell'app: `normalizeNewlines`/`normalizeWorkoutContent` in `app/src/lib/mttWorkouts.ts` (`fdfa1c1`).

### Da completare
- Approvare la **week 44** (oggi `draft`) prima di domenica 01/11 se va inviata; nessun invio automatico senza `status='approved'`.
- **Immagini + testo** nei workout (oggi solo testo); proprietario definitivo del bot.
- Screening **36 atleti MTT senza `user_plan`**; verifica DMARC e warning Resend (link esterni, prime email in spam).
- Aggiornare `docs/overview.md` e guide (`app/GUIDA_UTENTE.md`, `app/GUIDA_ADMIN.md`) con newsletter e periodizzazione.

### Prossimo step
- Allineare la documentazione al codice attuale, poi valutare l'aggiunta di immagini ai workout.
