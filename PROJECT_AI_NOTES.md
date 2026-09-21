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

## Chiusura progetto

### 24 giugno 2026
- **Decisione:** Progetto chiuso per mancata attivazione cliente.
- **Causale:** Proposta commerciale CUS Propatria Milano inviata (free 2026 season), mai accettata né contrattualizzata. Il cliente non ha mai formalmente deciso di partire.
- **Stato:** `closed`. Il codice rimane su GitHub (repo pubblico). La piattaforma SaaS è funzionante ma senza utenti attivi.
- **Infrastruttura:** Deploy Vercel e Supabase ancora attivi (free tier), da valutare se disattivare per evitare costi.
- **Documentazione:** Status aggiornato in `docs/project/overview.md` e `AGENTS.md`.

## Lavoro svolto
### Sessione 13 maggio
- File creati: `tools/fix_team_id_not_null.sql`
- File modificati: `tools/security_v6.3_hardening.sql` (aggiunta RLS policy per bloccare insert anonimo diretto)
- Test eseguiti: `npm run build` — compilazione TypeScript + Vite build OK

### Sessione 28 maggio
- Verificato deploy Vercel: codice `is_viewer` già in produzione (bundle JS confermato)
- Test funzionale Jesse: utente `support-reply@stripe.com` (viewer) vede tutto, non modifica nulla
- Bug fix creazione atleta: email resa opzionale — se presente chiama Edge Function (auth + invito), se assente insert diretto in profiles (sola anagrafica). Label aggiornata a "Email (Opzionale, per invito)". Messaggi alert più chiari.
- Aggiornati `AGENTS.md` e `PROJECT_AI_NOTES.md` con stato corrente
- Bug creazione atleta verificato funzionante in produzione dall'utente ✅

### Sessione 28 maggio (2)
- Implementata `notify_upcoming_races()` — notifica Telegram 10 giorni prima di ogni gara per gli atleti iscritti via `user_plans`. Script in `tools/telegram_race_reminders.sql`. Deployata su Supabase.
- Birthday notifications: filtro per soli atleti attivi (`is_licensed OR is_licensed_fci OR is_member`) già deployato in sessione precedente.

### Sessione 10 giugno
- Standardizzazione documentale: migrati file sparsi in `docs/` secondo standard ZBN (`leads/`, `proposals/`, `project/`, `admin/`, `invoices/`).
- Creata stima economica di sviluppo: `docs/admin/stima-sviluppo.md` (valore stimato 20k, produzione 10k grazie a AI).
- Validazione tecnica: configurato Playwright con browser di sistema per test locale.

## File toccati
- `docs/admin/stima-sviluppo.md` (creato)
- `AGENTS.md` (aggiornato)
- `playwright.config.ts` (creato)
- `e2e/auth.spec.ts` (creato)

### Sessione 18 settembre
- **Nuova feature: Risultati FITRI in-app.** L'atleta iscritto a una gara passata può vedere il risultato reale (posizione, tempo, frazioni) integrato nel planner, senza aprire il sito myFITRI.
- Dati: gli endpoint risultato FITRI (`getClassificheAtleta/<anno>/<tessera>-FITRI`) sono pubblici senza auth (CORS aperto `access-control-allow-origin: *`).
- File creati: `app/src/fitri.ts` (client dati, parsing licenze, fetch, matching per data+località), `app/src/FitriResultBadge.tsx` (componente badge espandibile).
- File modificati: `app/src/pages/TeamCalendarPage.tsx` (risultati per ogni partecipante nelle gare passate del team), `app/src/pages/DashboardPage.tsx` (risultato personale per le "Le mie gare" passate).
- Note dati: licenze FITRI del team MTT estratte dal backup 2026-09-07 (`profiles.json`); formato API `<numeri>-FITRI`. Risposta con `classificaPartecipanti[]` contiene `idGara`, `data`, `localita`, `tempo`, `posizione`, `posizione_categoria`, `categoria`, `distanza`, `listaNomiColonneCustom/listaCampiCustom` (splits). Matching gara-planner: normalizzazione accenti + inizio stringa `localita` in `location`.
- Build TypeScript: `tsc --noEmit` OK, nessun errore.
- TODO aperto: test funzionale in locale (`npm run dev`), commit le modifiche, valutare link diretto al profilo FITRI dell'atleta (`/classificheprofilo/<tessera>`).

## Backlog idee (ripartenza lunedì)
Idee proposte il 18 settembre a valle della feature risultati FITRI. NESSUNA iniziata. Da prioritizzare lunedì.

1. **Card risultato condivisibile** — da `FitriResultBadge` genera una card PNG (posizione, tempo, splits) da condividere su WhatsApp/Instagram. Marketing gratuito del team MTT con ogni gara. Dati già disponibili lato client.
2. **Leaderboard interna MTT** — l'API FITRI restituisce già `puntiFitri`/`puntiGara`: classifica stagionale di squadra, "atleta del mese", confronto posizione di categoria tra compagni. Zero nuove chiamate API.
3. **Storico e PB personali** — la call è già per-anno: vista "tutte le stagioni" con PB per distanza (sprint/olimpico), miglior posizione di categoria, evoluzione nel tempo.
4. **Confronto splits con media di categoria** — per ogni frazione, "tuo run 29:46 vs media cat M5 32:05". Oggi si mostrano solo i propri splits; basterebbe chiedere un campione all'endpoint.
5. **Meteo giorno gara** — in `weatherData.ts` c'è già dello scaffolding: previsioni 4 giorni prima nella scheda gara + consiglio (cambio, scarpe, sali/acqua).

## Sessione 21 settembre
- **Bug fix: gara Iseo mancante per Andrea Paolo Lemma**. Causa radice: mancanza `user_plan` per race `3940-2` (TriO Iseo - Sprint) + gara assente in tabella DB `races`. Risolto con SQL diretto su Supabase:
  ```sql
  INSERT INTO races (id, status) VALUES ('3940-2', 'active') ON CONFLICT DO NOTHING;
  INSERT INTO user_plans (user_id, race_id, priority)
  VALUES ('9ca62565-947d-4551-a134-dbda2fc0527f', '3940-2', 'C') ON CONFLICT DO NOTHING;
  ```
- Debug logging temporaneo in `TeamCalendarPage.tsx` per tracciare flusso `fetchFitriResults` → `findFitriResult`. Da rimuovere prima del commit.
- Verificato: FITRI API restituisce correttamente il risultato (posizione 163, cat. M5 11º, tempo 01:30:21), matching per data + località funzionante.
