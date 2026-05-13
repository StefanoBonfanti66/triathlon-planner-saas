# Project: triathlon-planner-saas

## Obiettivo
- Piattaforma SaaS multi-tenancy per gestione calendario gare FITRI 2026 (triathlon).
- Team e atleti singoli: onboarding via join_code, piani gara, social ranking, notifiche Telegram.

## Stato attuale
- Versione 6.3.3, React 19 + TypeScript + Supabase + Vite + TailwindCSS.
- Deploy su Vercel con daily backup JSON su GitHub.
- Registrazione funzionante con trigger `handle_new_user` su `auth.users`.

## Risultato atteso della sessione
- Chiudere la falla di sicurezza che permetteva registrazione senza `team_id` valido.
- Aggiungere NOT NULL su `profiles.team_id`, riscrivere il trigger per rigettare registrazioni senza `team_code`, aggiungere RLS policy anti-anon-insert.

## Stack e vincoli
- Frontend: React 19 + TypeScript + Vite + TailwindCSS
- Backend: Supabase (Auth, Postgres RLS, Storage)
- Database: Postgres con RLS multi-tenancy
- Infra: Vercel + GitHub Actions (backup giornalieri + sync FITRI)
- Vincoli tecnici: niente Edge Functions al momento, niente server-side validation oltre ai trigger DB
- Vincoli di piano/free tier: Supabase free tier, Vercel Hobby

## Decisioni prese
- [2026-05-12] La validazione del team_code in `Auth.tsx` è solo client-side → va rafforzata a livello database.
- [2026-05-12] Scelta di non modificare `Auth.tsx` (la validazione client-side esiste già e funge da UX), ma di blindare il DB con NOT NULL + trigger SECURITY DEFINER con RAISE EXCEPTION espliciti.
- [2026-05-12] Il trigger `handle_new_user` **non era presente nel repository** (solo su Supabase dashboard) → ora definito in `tools/fix_team_id_not_null.sql`.

## Lavoro svolto
- File creati: `tools/fix_team_id_not_null.sql`
- File modificati: `tools/security_v6.3_hardening.sql` (aggiunta RLS policy per bloccare insert anonimo diretto)
- Test eseguiti: `npm run build` — compilazione TypeScript + Vite build OK

## TODO aperti
1. Eseguire `tools/fix_team_id_not_null.sql` nel Supabase SQL Editor (produzione)
2. Trovare e correggere l'utente `roacoy200@gmail.com` (team_id = NULL) — assegnargli una squadra o eliminarlo
3. Monitorare le prossime registrazioni per verificare che il trigger blocchi correttamente i tentativi senza team_code

## Problemi aperti
- Problema: utente `roacoy200@gmail.com` registrato con `team_id = NULL`
- Ipotesi: chiamata diretta a `supabase.auth.signUp()` (browser console o REST API) saltando la validazione client-side di `Auth.tsx`
- Blocco attuale: il trigger `handle_new_user` su Supabase non era definito in chiaro, potrebbe essere stato creato male o non esistere più

## File toccati
- `app/src/pages/Auth.tsx` (solo letto — non modificato)
- `tools/fix_team_id_not_null.sql` (creato)
- `tools/security_v6.3_hardening.sql` (modificato)
- `app/src/pages/DashboardPage.tsx` (modificato — is_viewer guards)
- `app/src/pages/TeamCalendarPage.tsx` (modificato — is_viewer guards)
- Migration: `add_is_viewer_role` (profiles.is_viewer + RLS rewrite)

## Prossimo step suggerito
- Fare deploy su Vercel per rendere operativo il profilo viewer di Jesse
