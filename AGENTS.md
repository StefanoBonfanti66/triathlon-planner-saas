# Agent rules

- Read PROJECT_AI_NOTES.md before doing major work.
- Prefer small diffs.
- Ask before touching secrets, .env, deployment, infra, auth, billing.
- Follow existing code style.
- Update PROJECT_AI_NOTES.md at meaningful checkpoints.

## Current Focus — 2026-05-28

### Session completed (28 maggio)
- [x] **Bug creazione atleta** — verificato funzionante in produzione dall'utente ✅
- [x] **Promemoria gare Telegram** — nuova funzione `notify_upcoming_races()` che notifica 10 giorni prima ogni gara con iscritti del team. Script `tools/telegram_race_reminders.sql` deployato su Supabase.
- [x] **Birthday notifications** — filtro per soli atleti attivi (`is_licensed OR is_licensed_fci OR is_member`) deployato su Supabase.

### Sessioni precedenti (14-28 maggio)
- [x] **Sessione di recupero contesto** — git pull, analisi stato repo, inventario documentazione
- [x] **Verifica deploy Vercel** — il codice viewer (`is_viewer`/`isViewer`) è già in produzione (6 riferimenti nel bundle JS). Jesse funzionante a `https://triathlon-planner-saas.vercel.app`
- [x] **Test Jesse confermato** — utente viewer `support-reply@stripe.com` vede tutto, non modifica nulla
- [x] **Bug creazione atleta** — email field reso opzionale: se presente → Edge Function (auth + invito); se assente → insert diretto in profiles (sola anagrafica). Label aggiornata a "Email (Opzionale, per invito)". Messaggi alert più chiari.
- [x] Security fix: NOT NULL constraint on `profiles.team_id` + trigger `handle_new_user` rewrite + RLS policy
- [x] **Nuovo ruolo `is_viewer`** — viewer vede tutto, non modifica nulla
- [x] **Bug fix login** — `recovery_token` NULL fix (26 righe)

### Next step
- Sbloccare Vercel auto-deploy (se serve ancora)
- Attivare il cron giornaliero per i promemoria gare (esegui su Supabase SQL Editor):
  ```sql
  SELECT cron.schedule('notify-races-daily', '0 9 * * *', 'SELECT public.notify_upcoming_races()');
  ```
- Altre idee?
