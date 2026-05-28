# Project: triathlon-planner-saas

## Obiettivo
- Piattaforma SaaS multi-tenancy per gestione calendario gare FITRI 2026 (triathlon).
- Team e atleti singoli: onboarding via join_code, piani gara, social ranking, notifiche Telegram.

## Stato attuale
- Versione 6.3.3, React 19 + TypeScript + Supabase + Vite + TailwindCSS.
- Deploy su Vercel con daily backup JSON su GitHub.
- Registrazione funzionante con trigger `handle_new_user` su `auth.users`.
- Ruolo `is_viewer` implementato e in produzione: 6 riferimenti nel bundle JS.

## Stack e vincoli
- Frontend: React 19 + TypeScript + Vite + TailwindCSS
- Backend: Supabase (Auth, Postgres RLS, Storage)
- Database: Postgres con RLS multi-tenancy
- Infra: Vercel + GitHub Actions (backup giornalieri + sync FITRI)
- Edge Function `invite-athlete` (v6) su Supabase per creazione atleti con invio invito email via Service Role
- Validazione lato client prima di chiamare Edge Functions
- Vincoli di piano/free tier: Supabase free tier, Vercel Hobby

## Decisioni prese
- [2026-05-12] La validazione del team_code in `Auth.tsx` è solo client-side → va rafforzata a livello database.
- [2026-05-12] Scelta di non modificare `Auth.tsx` (la validazione client-side esiste già e funge da UX), ma di blindare il DB con NOT NULL + trigger SECURITY DEFINER con RAISE EXCEPTION espliciti.
- [2026-05-12] Il trigger `handle_new_user` **non era presente nel repository** (solo su Supabase dashboard) → ora definito in `tools/fix_team_id_not_null.sql`.

## Lavoro svolto
### Sessione 13 maggio
- File creati: `tools/fix_team_id_not_null.sql`
- File modificati: `tools/security_v6.3_hardening.sql` (aggiunta RLS policy per bloccare insert anonimo diretto)
- Test eseguiti: `npm run build` — compilazione TypeScript + Vite build OK

### Sessione 28 maggio
- Verificato deploy Vercel: codice `is_viewer` già in produzione (bundle JS confermato)
- Test funzionale Jesse: utente `support-reply@stripe.com` (viewer) vede tutto, non modifica nulla
- Bug fix creazione atleta: aggiunto `required` al campo email nel form (`AdminPage.tsx:57`) + validazione client-side prima di chiamare Edge Function
- Aggiornati `AGENTS.md` e `PROJECT_AI_NOTES.md` con stato corrente

## TODO aperti
1. [Risolto] Eseguire `tools/fix_team_id_not_null.sql` nel Supabase SQL Editor → fatto
2. [Risolto] Utente `roacoy200@gmail.com` gestito → profili orfani puliti
3. Monitorare le prossime registrazioni per verificare che il trigger blocchi correttamente i tentativi senza team_code
4. [Risolto] Bug creazione atleta: frontend inviava email vuota alla Edge Function → risolto con `required` + validazione client-side

## Problemi aperti
- [Risolto] Utente `roacoy200@gmail.com` con `team_id = NULL` — risolto nella sessione 13 maggio
- Vercel auto-deploy: tutti i deploy dal 22 maggio risultano `BLOCKED` (ultimo READY: 21 maggio). Le uniche differenze nei commit sono backup JSON — il codice app non è cambiato. Da investigare se blocca futuri deploy.

## File toccati
- `app/src/pages/Auth.tsx` (solo letto — non modificato)
- `tools/fix_team_id_not_null.sql` (creato)
- `tools/security_v6.3_hardening.sql` (modificato)
- `app/src/pages/DashboardPage.tsx` (modificato — is_viewer guards)
- `app/src/pages/TeamCalendarPage.tsx` (modificato — is_viewer guards)
- Migration: `add_is_viewer_role` (profiles.is_viewer + RLS rewrite)
- `app/src/pages/AdminPage.tsx` (modificato — required email + client-side validation)

## Prossimo step suggerito
- Sbloccare Vercel auto-deploy (BLOCKED dal 22/5) oppure creare altri utenti demo/viewer per altri team
