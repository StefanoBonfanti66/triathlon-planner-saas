# Project: triathlon-planner-saas

## Obiettivo
- Piattaforma SaaS multi-tenancy per gestione calendario gare FITRI 2026 (triathlon).
- Team e atleti singoli: onboarding via join_code, piani gara, social ranking, notifiche Telegram.

## Stato attuale
- Versione 6.3.3, React 19 + TypeScript + Supabase + Vite + TailwindCSS.
- Deploy su Vercel con daily backup JSON su GitHub.
- Registrazione funzionante con trigger `handle_new_user` su `auth.users`.
- Ruolo `is_viewer` implementato e in produzione: 6 riferimenti nel bundle JS.
- Stato commerciale: `active` — rilascio gratuito permanente per Milano Triathlon Team (MTT). In previsione campagna pubblicitaria verso altre società di triathlon per acquisire nuovi utenti.

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

## Storia progetto

### 24 giugno 2026
- Proposta commerciale CUS Propatria Milano inviata (free 2026 season) mai formalmente accettata. Il cliente non ha mai deciso di partire.
- Il progetto è **riattivato come commerciale** con rilascio gratuito permanente per Milano Triathlon Team (MTT).
- Infrastruttura: Deploy Vercel e Supabase attivi (free tier).
- Documentazione: status aggiornato in `docs/overview.md`, `docs/project/overview.md` e `AGENTS.md`.

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

## Sessione 30 settembre — catalogo gare congelato (Paullo/UNATRI e altre 69)

### Causa radice
`app/src/races_full.json` è il **catalogo master** delle gare: le 4 pagine lo importano (`DashboardPage`, `TeamCalendarPage`, `RaceDetailPage`, `AdminPage`). Supabase `races` è usato **solo come override** di `is_removed` / `status` sulle gare già presenti nel JSON, quindi un override non può far comparire una gara assente dal catalogo.
Il JSON era fermo al **05/05/2026** (commit `6512ec2`), generato a mano. Risultato: **69 gare del calendario FITRI 2026 invisibili**, inclusa Paullo (evento 4139, 11-10-2026) segnalata dall'utente.
Confronto CMS `cms.myfitri.it/api/eventi` (217 eventi 2026: Q1 30, Q2 95, Q3 62, Q4 30) vs JSON (192 id_evento) → **30 eventi mancanti**, tutti con `createdAt >= 2026-05-07`; 25 di 30 con `publishedAt = 2026-09-29` (FITRI ha fatto un aggiornamento di massa del calendario il 29/09).
Il DB Supabase era invece **completo e aggiornato**: 0 eventi del CMS mancanti nel DB.

### Fix applicato
- **Creato `tools/generate_races_full_json.py`**: rigenera `app/src/races_full.json` dall'export più recente in `backups_history/`. Sorgente unica, ispezionabile, ripetibile.
  - Tiene solo le gare con progressivo (`^\d+-\d+$`): l'export contiene anche 187 righe a livello di evento con id senza progressivo (es. `3897`), mai incluse nel catalogo — escluderle evita voci fantasma in lista.
  - Applica `--force-removed <ID_EVENTO>` per marcare `is_removed=true` su eventi da nascondere.
  - Valida date `dd-mm-yyyy`, `type` ∈ {Triathlon, Duathlon, Aquathlon, Winter, Cross}, id univoci. `--dry-run` incluso.
- **Rigenerato `app/src/races_full.json`**: 374 → **464 record**, +90 gare, 0 rimosse, 39 corrette verso i valori DB (title 30, date 12, distance 9, event 6, category 6, type 4, is_removed 2). I valori DB erano più completi (es. `3995-2` distance `""` → `"Sprint"`).
- **4100 Cerveteri** (`4100-1`, 24-05-2026) marcato `is_removed=true` su richiesta esplicita dell'utente, sia nel JSON sia da applicare sul DB.
- **Fix paginazione in `mtt_api_scraper.py`**: `fetch_all_events()` con `pagination[limit]=100` + `pagination[start]` crescenti e `MAX_PAGES`. Prima chiedeva `limit=500` senza offset — Strapi ricappa a 100, quindi un trimestre con >100 eventi avrebbe perso quelli in coda. Verificato live: stessi totali (30/95/62/30), 451 righe in `gare_2026.txt`.
- Verifiche: `tsc --noEmit` OK; tutti gli id di `user_plans` risolti nel catalogo; date 01-02-2026 → 31-10-2026.

### Blocco risolto: nessuna credenziale Supabase valida (SQL eseguito a mano)
Supabase MCP → `Unauthorized`; `SUPABASE_ACCESS_TOKEN` / `SUPABASE_MCP_TOKEN` in env scaduti (Management API 401 "JWT could not be decoded"); `/tmp/svc_key.txt` non esiste più. **Impossibile scrivere sul DB dall'agente**: l'utente ha eseguito a mano
```sql
UPDATE races SET is_removed = true, status = 'hidden' WHERE id = '4100-1';
```
Verificato nell'export `backups_history/2026-09-29/races.json`: `4100-1` `is_removed=true`. Il JSON era già allineato (generato con `--force-removed 4100`), quindi **non serve rigenerare**.
(`DashboardPage.tsx:599` filtra la lista sul `is_removed` **del JSON**, quindi la gara è già nascosta in Dashboard; il DB serve per il badge "⚠️ GARA RIMOSSA" e per `TeamCalendarPage`, che mostra le gare di `user_plans` con `status` dal DB.)

### Deploy
Commit `1bc1956` su `main` → push `3e52fbc..1bc1956` (prima serve `env -u GITHUB_TOKEN git pull --rebase --autostash origin main`, perché il cron `📦 Daily Backup` committa quotidianamente). Deploy Vercel `dpl_B4L3ZH5cTnTYZohJ7a9FWgB78fM8` READY su `triathlon-planner-saas.vercel.app`. Nota operativa: le chiamate Vercel MCP funzionano **omettendo `teamId`** (`vercel_list_teams` restituisce `[]`).

### Da fare
- Valutare un refresh periodico del catalogo (GitHub Action già esiste per i backup) per non ripetere il congelamento.
- Rimuovere il debug logging temporaneo in `TeamCalendarPage.tsx` (aperto dal 21/09).

## Sessione 30 settembre — Stefano Baldo: registrazioni Lecco + Cervia

Utente: «un altro atleta stefano baldo non si era registrato alla gara di lecco e cervia», poi «lecco e cervia 3905 ma abbiamo fatto la 3905-1 sprint e la 3905-3 coppa crono», infine «baldo ha fatto la coppa crono maschile forse ha sbagliato a selezionare» → **correzione: `3905-4` (Maschile), non `3905-3` (Femminile)**.

### Verifiche fatte (export `backups_history/2026-09-29/`)
- Profilo: `d5aa242b-1299-431b-918a-df40bd5dd611`, tessera `85122/A252252`, team `mtt`. **NON** aveva 0 piani: ne aveva 2 (`3933-1`, `3939-3`), entrambe priority C.
- Schema `user_plans`: `id` (UUID), `user_id` = **`profiles.id`** (= `session.user.id`), `race_id`, `priority` (A/B/C, marker personale: `A` evidenzia la card in giallo), `cost` (quasi sempre 0), `note`, `created_at`, `team_id`, `deleted_at`.
- Gare: `4012-1` 05-07-2026 25° Triathlon Sprint Lecco City (Sprint) · `3905-1` 26-09 Sprint Age Group · **`3905-4` 27-09 Coppa Crono Maschile** (corretto da `3905-3` Femminile su indicazione dell'utente). L'evento **3931** (IRONMAN Italy Emilia Romagna, 19-20/09) escluso: 0 piani, non è quello.

### Consegnato
`tools/2026-09-30_stefano_baldo_lecco_cervia.sql` — 1 `UPDATE profiles` (`first_name`/`last_name` da NULL a `Stefano`/`Baldo`, su richiesta) + `INSERT` idempotente (`NOT EXISTS`) delle 3 gare con `priority='C'`, `cost=0`, `team_id='mtt'`, più 2 `SELECT` di verifica. **Da eseguire a mano** (stesso blocco credenziali Supabase). Non ancora eseguito.

### Segnalato all'utente
**36 profili MTT attivi non hanno alcun `user_plan`** (su 71 piani / 16 user_id distinti / 55 profili): la Dashboard "Le mie gare" resta vuota per loro. Probabili altri casi dello stesso tipo di Baldo — da verificare con `tools/check_plans.py`.

