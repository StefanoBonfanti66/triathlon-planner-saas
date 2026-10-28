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

## Sessione 2 ottobre — sotto-gare Cervia 3905 + UNATRI 4139 (correzioni registrazioni MTT)

Utente: «stefano baldo ... invece va messo su tri event campionati italiani di triathlon sprint coppa crono», poi «paolo pellegrini invece va spostato dalla gara unatri kids a unatri», poi «errore togli tutti gli atleti dalla tri event mixed relay nessuno di noi ha partecipato», poi «quegli atleti hanno partecipato alla coppa crono», infine «si commit e deploy».

### Radice: catalogo `races_full.json` fuori sync col DB
Gli id `races` del DB per l'evento 3905 (Cervia 26-27/09) sono stabili negli export 28/29/30-09: `3905`/`3905-1` Age Group, `3905-2` Elite, `3905-3` Coppa Crono **Femminile**, `3905-4` Coppa Crono **Maschile**, `3905-5` Mixed Relay, `3905-6` TRI EVENT Coppa Crono Mixed. Il frontend (che legge **solo** `app/src/races_full.json`) aveva invece `3905-3`=Coppa Crono (senza genere), `3905-4`=Mixed Relay, `3905-5`=TRI EVENT Coppa Crono Mixed → **l'UI mostrava nomi sbagliati e le iscrizioni fatte leggendo i titoli stale erano semanticamente errate** (es. il gruppo Coppa Crono finito su `3905-3` = Femminile).

### Fix catalogo (già committato e in produzione)
`python3 tools/generate_races_full_json.py` (fonte `backups_history/2026-09-30/`, senza `--force-removed 4100`): **464 → 465** gare, 1 aggiunta (`3905-6`), 3 modificate, 187 righe senza progressivo skippate. Diff: `3905-3`→"…Coppa Crono **Femminile**", `3905-4`→"…Coppa Crono **Maschile**", vecchia `3905-5` rinumerata `3905-6` "TRI EVENT Coppa Crono Mixed", nuova `3905-5` "…Sprint Mixed Relay". Commit `1f4f350` → push `5f23792` (rebased su `a721dd0` daily backup; push con `env -u GITHUB_TOKEN`), deploy Vercel `dpl_EJvRiCM6PGpBtfewwk9aZvFD5vAy` READY, HTTP 200. `tsc --noEmit` exit 0.

### Iscrizioni MTT a Cervia (export 2026-09-30)
Albini `3905-1`+`3905-3`, Quaglia (111549) `3905-1`+`3905-3`, Pellegrino (65172) `3905-3`, Bonfanti (106925) `3905-1`+`3905-3`, Dughera (1443) `3905-1`+`3905-3`, Baldo (85122) `3905-1`+`3905-4`, Elena Sacchetto (83922) `3905-1` only. **Zero piani su `3905-5`/`3905-6`** → nessun atleta è davvero in Mixed Relay.
API FITRI pubblica (`https://www.myfitri.it/MyfitriWeb/getClassificheAtleta/2026/<tessera>-FITRI`): 27/09 = `idGara W11450` "TRI EVENT Campionati Italiani di Triathlon Sprint **Coppa Crono Maschile**" per 85122/43981/111549/65172/106925/1443; 83922 nessun risultato 27/09. **Baldo è quindi già corretto sul DB** (`3905-4`).

### 3 script SQL consegnati (da eseguire a mano, credenziali Supabase ancora non valide)
1. `tools/2026-10-02_paolo_pellegrino_unatri.sql` — sposta **Paolo Pellegrino** (`c756da6a-0712-4734-b00b-48c47cd61608`, 65172/A200665) da `4139-1` (UNATRI kids, creato dall'utente dopo il 30/09 quindi invisibile agli export) a `4139-2` (UNATRI, Paullo 11-10): soft-delete/update condizionati + INSERT idempotente di fallback. Evento 4139 DB e catalogo già in sync.
2. `tools/2026-10-02_cervia_3905_coppa_crono_maschile.sql` — per Albini `eef45d9c-…`, Quaglia `33f591a8-…`, Pellegrino `c756da6a-…`, Bonfanti `4f3e45bc-…`, Dughera `d6ca5f08-…`: dedup (soft-delete `rn>1` su `3905-3`/`3905-4`) + `UPDATE race_id='3905-3'→'3905-4'`. Baldo `d5aa242b-…` resta su `3905-4`, solo in verifica. Due errori runtime già corretti in fase preparazione: `text = uuid` (`::uuid` sulle VALUES) e `p.user_id` inesistente (ora `t.user_id`). **Non ancora eseguito.**
3. `tools/2026-10-02_rimuovi_mixed_relay_3905-5.sql` — soft-delete di soli `race_id='3905-5'` + SELECT verifica con colonna `DA CANCELLARE`. **No-op atteso.**

### Nome atleti
`first_name`/`last_name` sono NULL per molti profili MTT: il nome reale è in colonna **`full_name`** (presente negli export perché `supabase_backup.py` fa `select("*")`).

## Sessione 25 ottobre — Allenamenti MTT via Telegram: implementazione + test reale

Branch: `feature/mtt-weekly-telegram-workouts` (commits `b21e5d2`, `b17858f` + follow-up auth/chat_id). Nessun merge su `main`.

### Funzionalità
- Tab **Admin → "Allenamenti MTT"**: genera la settimana, elenca le bozze, approva, invia su Telegram.
- Pagina storico in-app `/allenamenti-mtt` (tab per disciplina, immagini se presenti).
- Edge Function `mtt-weekly-workouts` con azioni `generate` e `send`, `POST` only.
- Workflow GitHub Actions `.github/workflows/mtt-weekly-workouts.yml` (schedule + `workflow_dispatch`), con `npm ci` e `working-directory: app` per risolvere `@supabase/supabase-js`.

### Sicurezza (root cause dei problemi incontrati)
- **Helper Telegram lato client rimosso** (`app/src/lib/telegram.ts`): leggeva `VITE_TELEGRAM_BOT_TOKEN` → qualsiasi import avrebbe messo il token del bot nel bundle pubblico. Era anche la causa dei 2 errori TS `TS2339` (`.json()` non awaitato).
- `requireMttAdmin`: `Authorization: Bearer` obbligatorio; accetta `service_role` oppure JWT di profilo con `team_id='mtt'` e `is_team_admin`/`is_super_admin` (email MTT in allowlist). Confronto chiavi a tempo costante (`safeEqual`).
- CORS: allowlist `triathlon-planner-saas.vercel.app` + preview `*.vercel.app` + `localhost:<port>`; eliminato `*`.
- `team_workouts.team_id` ora ha FK `team_workouts_team_id_fkey → teams.id` (la query PostgREST con `teams!inner(...)` falliva senza FK; il send ora interroga `teams` separatamente).
- Secret Edge: `TELEGRAM_BOT_TOKEN` + `MTT_SERVICE_ROLE_KEY`. Il secret `SUPABASE_SERVICE_ROLE_KEY` auto-iniettato da Supabase è nel nuovo formato `sb_secret_...` e `auth.getClaims()` non valida il JWT `service_role` legacy → serve `MTT_SERVICE_ROLE_KEY` dedicato.

### Test reale (autorizzato dall'utente)
- Deploy Edge Function su `bwzzvdwiimvdwkiytknc` (prima 404 `NOT_FOUND`).
- Schema: tabella `team_workouts` già presente in produzione; aggiunta solo la FK `team_id` (DDL via Management API `database/query` col PAT).
- Bot di test temporaneo `@LisaCoachBot`: non è membro del gruppo MTT `-5117971075` → primo invio fallito con `chat not found` (0 messaggi inviati, record riportato a `approved`).
- Aggiunto parametro opzionale `chat_id` alla action `send` (validato come intero, riservato agli admin MTT) per il test su chat privata.
- **Invio riuscito**: workout settimana 43/2026, `status='sent'`, **11 messaggi** di solo testo, `telegram_message_ids` 56–66, `sent_at` registrato.
- Rollback definito: `deleteMessage` dei 56–66, record a `approved`, `supabase functions delete` + `supabase secrets delete`.

### Da completare
- Bot Telegram definitivo MTT → sostituire il token del temporaneo nel secret Edge e ripetere il test sul chat gruppo `-5117971075`.
- Immagini + testo (oggi solo testo); invio il **lunedì** (attuale workflow: domenica 18:00 UTC = 20:00 CEST).
- Decidere proprietario del bot e destinatari (gruppo MTT vs sottogruppo).
- Il commit `9cf7ddf` ha cancellato 4 script SQL operativi che esistono su `main`: `tools/2026-09-30_stefano_baldo_lecco_cervia.sql`, `tools/2026-10-02_cervia_3905_coppa_crono_maschile.sql`, `tools/2026-10-02_paolo_pellegrino_unatri.sql`, `tools/2026-10-02_rimuovi_mixed_relay_3905-5.sql` → decidere prima del merge su `main`.
- Il workflow Actions esiste solo sul branch feature: GitHub lo attiva solo dopo il merge nel branch di default.
- Credenziali di test in `~/.config/opencode/secrets/mtt/` (PAT, service_role, bot token) — fuori dal repo, da non committare.


## Sessione 28 ottobre — Test Actions riuscito + periodizzazione allenamenti MTT

### Test end-to-end via GitHub Actions (chiuso)
- Merge feature `feature/mtt-weekly-telegram-workouts` in `main` (`133f6b1`), push `2c0e7e0` (convergenza col daily backup).
- `gh workflow run mtt-weekly-workouts.yml` → run `40675605080` **verde**: record week 43 `14258ad8` → `sent`, `telegram_message_ids` 69–79 (**11 messaggi**), `sent_at=2026-10-28T10:53:23Z`, ricevuti in chat privata utente (`8167454134`, override temporaneo).
- Ripristinato: `teams.telegram_chat_id` MTT → `-5117971075`; record week 44 `c1619f13` → `draft`.
- Decisioni utente: invio resta **domenica 20:00 CEST** (niente lunedì); bot **LisaCoach** resta finché non va in produzione.
- Dopo simulazione live di una settimana di picco (ISO 31/2026, inviata in chat privata e poi cancellata): l'utente ha confermato di **voler mantenere la preparazione calibrata su sprint/olimpico** (non ricalibrazione lunghe distanze 2:30-3:30h, proposta e scartata).

### Decisioni progettuali (discussione "come variano gli allenamenti")
- Combinazione approvata: **(1) periodizzazione a regole + (2) rendering LLM**, con fallback statico.
- **Nessuna gara-ancora** per ora (workout generico per tutti, gli atleti non gareggiano tutti uguali) → macro-fase stagionale IT: nov-feb `base`, mar-apr `build`, mag-ago `peak`, set-ott `transition`; mesociclo a rotazione **4 settimane con 4ª di scarico** (volume -35%), picco carico in settimana 3.
- Zone **RPE** (nessun dato FTP da seedare).
- LLM: **free tier, ~1 richiesta/settimana** → provider scelto **Groq** (free permanente, no carta, OpenAI-compatible, `openai/gpt-oss-120b`); interfaccia generica `LLM_API_KEY`/`LLM_BASE_URL`/`LLM_MODEL` per cambiare provider senza codice.

### Implementato (branch `feature/mtt-periodized-ai-workouts`, NON ancora committato)
- Nuovo `supabase/functions/mtt-weekly-workouts/periodization.ts`: `getMacroPhase`, `isoWeekNumber`, `dateFromIsoWeek`, `getMesoWeek`, `buildWeekSkeleton` (2 sessioni per disciplina, variazione per fase×settimana-mesociclo, scarico sett. 4).
- `index.ts` action `generate` riscritta: scheletro → `renderWithLLM` (se `LLM_API_KEY` presente, fetch OpenAI-compatible, parse JSON robusto, `validateContent`) → fallback `renderStaticContent`. Metadati onesti: `generated_by='ai'|'rules'`, `ai_prompt_used` con fase/meso/llm, `sources` con regole+provider.
- Helper nuovi in `index.ts`: `toContentBlock`, `skeletonTitle` (titolo con fase e sett. x/4), `parseJsonLoose`, `validateContent`, `renderWithLLM` (timeout 45s).
- Guard robustezza (dopo test live): `generate` rifiuta la rigenerazione se lo stato esistente ≠ `draft` (prima sovrascriveva anche record `sent`); l'upsert azzera `approved_by`/`approved_at`/`sent_at`/`telegram_message_ids` (prima restava `approved_at` stale su un draft rigenerato).
- Test: `periodization_test.ts` **7/7 verdi** (`deno test`), `deno check index.ts` pulito. Deno 2.9.8 installato in `~/.deno` (non era presente).

### Deploy + test live (28 ottobre, chiuso)
- Deploy Supabase CLI da zbn-srv01: `SUPABASE_ACCESS_TOKEN="$SUPABASE_MCP_TOKEN" npx supabase functions deploy mtt-weekly-workouts --project-ref bwzzvdwiimvdwkiytknc` (il token `~/.supabase/access-token` non vede il progetto; quello MCP sì). Deploy fatto **due volte**: iniziale + dopo il guard.
- Secret Edge: `LLM_API_KEY` = chiave Groq fornita dall'utente (in `~/.config/opencode/secrets/mtt/llm.env`, 600, **mai committare**). `TELEGRAM_BOT_TOKEN` e `MTT_SERVICE_ROLE_KEY` preesistenti verificate presenti.
- Test reale generate week 44 (Transizione, meso 4/4 scarico): `generated_by='ai'`, titolo `Allenamenti MTT - Settimana 44/2026 · Transizione (sett. 4/4 · scarico)`, 6 sedute con durate scalate ×0.65, intro coerente, `adaptation_tips`/`notes`/`tips_by_discipline` validi. Regenerate pulisce `approved_*`. Generate su week 43 (`sent`) → rifiutato con errore esplicito. Record week 44 lasciato in `draft` per la revisione dell'admin nel tab Admin.

### Audit pre-domenica (28 ottobre)
Audit end-to-end della catena di invio domenicale, eseguito su richiesta dell'utente («siamo sicuri che domenica funziona?»):
- **Catena verde**: workflow su main → query `team_workouts` `approved` settimana corrente → invoke Edge Function `send` → Telegram. Probe auth reale: la `SUPABASE_SERVICE_ROLE_KEY` delle GitHub secrets passa `requireMttAdmin` (400 "non trovato" su id fittizio, non 401). Formula settimana del workflow = ISO week per le domeniche (verificato numericamente per 01/11/2026: entrambe 44). Edge Function deployata = versione con guard (la send usa il deploy Supabase, non il codice git). Secrets GitHub (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) e Edge (`TELEGRAM_BOT_TOKEN`, `MTT_SERVICE_ROLE_KEY`, `LLM_API_KEY`) tutti presenti. `teams.telegram_chat_id=-5117971075` (gruppo) confermato.
- **Bug trovato — fuso orario DST**: il cron `0 18 * * 0` (18:00 UTC) con l'ora legale finita il 25/10 corrisponde a **19:00 CET**, non alle 20:00 volute. GitHub cron è UTC-only e non segue il DST.
- **Fix applicato** (`.github/workflows/mtt-weekly-workouts.yml`, sul branch, NON ancora su main): **due cron** `0 18 * * 0` + `0 19 * * 0` (coprono CEST e CET) più una guardia nella script che — solo per eventi `schedule` — calcola l'ora a `Europe/Rome` ed esce senza fare nulla se sono prima delle 20:00. La seconda run è comunque no-op di sicurezza (il record è già `sent`). `workflow_dispatch` resta libero da vincoli orari per i test. Simulato: estate invia alle 18:00Z, inverno alle 19:00Z, run fuori stagione esce.
- **Implicazione**: la schedule si configura dalla `main` → per avere l'invio alle 20:00 italiane già domenica 01/11 (CET) serve il merge in `main` **prima di domenica**; altrimenti la vecchia cron manda alle 19:00.
- **Nota flusso**: l'invio domenicale non richiede la merge del codice funzione (deploy Supabase già fatto); richiede però che il record sia in `status='approved'` — week 44 è attualmente `draft` (nessun invio se non approvato, voluto).
- **Merge + push**: branch committato (`bca1313`) e mergiato in `main` (`4923ced`), pushato. Working tree pulito (untracked: `deno.lock`, `supabase/.temp/` — da non committare).
- **Cambio bot Telegram**: secret Edge `TELEGRAM_BOT_TOKEN` sostituito — da LisaCoachBot (temporaneo) a **`@saas_planner_bot`** (id 8333781013), membro del gruppo `-5117971075` ("MTT Notifiche gare"). Test di consegna reale riuscito (message_id 742 nel gruppo). Token salvato in `~/.config/opencode/secrets/mtt/telegram.env` (600, non committare). Il vecchio token di LisaCoachBot è decaduto dal flusso. L'utente rinomina il gruppo da sé.

### Da fare (prossimi passi)
- Commit sul branch + review; merge in `main` (workflow schedule si configura dalla main; la funzione è già deployata su Supabase).
- Prima di domenica 01/11: mergiare il fix DST del workflow; decidere se approvare la week 44 come demo o lasciare vuota.
- Da discutere con l'utente: FTP/obiettivi personalizzati, immagini+testo, bot definitivo.

### Newsletter settimanale MTT (28 ottobre — implementazione completa)
Richiesta utente: newsletter della domenica con spiegazione preparazione allenamenti + bottone Telegram + bottone test FTP.
- **DB**: `team_workouts.newsletter_sent_at` (migration `tools/2026-10-28_team_workouts_newsletter.sql`); nuova tabella `team_contacts` con 30 email atleti da CSV soci (`MilanoTriathlonTeam - Atleti.csv`, migration `tools/2026-10-28_team_contacts.sql`).
- **Edge Function**: nuovo `newsletter.ts` — HTML email-safe 600px (header gradiente MTT, intro, card extra, sintesi 6 sedute, notes, bottoni Telegram/FTP, footer), `getTeamRecipients` (profiles+auth.users ∪ team_contacts, dedup), `sendViaResend` (POST api.resend.com, timeout 20s). `index.ts`: generate produce `content.newsletter` (subject/intro via LLM, extra vuoto), validate+static fallback estesi; azione `send-newsletter` (guard approved|sent + newsletter_sent_at); best-effort newsletter dentro `send` dopo Telegram.
- **Client**: `mttWorkouts.ts` — tipo `NewsletterContent`, `updateNewsletter` (merge REST su content), `sendNewsletter`. AdminPage — bottoni ✉ Newsletter con editor subject/intro/extra, Salva, Invia, Prova a me. GuidePage — sezione 6 «Test FTP» id=test-ftp (protocollo 20' Allen&Coggan, calcolo ×0,95, zone 1-7).
- **Deploy**: Edge Function deployata su bwzz con `newsletter.ts`; secret Edge `RESEND_API_KEY` + `TELEGRAM_INVITE_URL` impostati. Migration eseguite via Management API (`/v1/projects/{ref}/database/query` con token MCP) — `db push` non funziona (migrations dir locale assente).
- **Test reale**: generate week 44 → newsletter subject `Allenamenti MTT · Settimana 44 — Transizione` (intro 584 char, LLM), approvata, test newsletter verso `sbonfanti@hotmail.com` → **sent:1**. Limite Resend free: invio solo all'indirizzo dell'account (hotmail). Per inviare ai 30 atleti serve dominio verificato su resend.com.
- **Da fare**: verificare dominio Resend (es. zetabytenexus.it) o accettare che l'admin invii manualmente; commit+push; approvare week 44 prima di domenica.

### Aggiornamento newsletter (28 ottobre — post deploy)
- Dominio Resend verificato: **zetabytenexus.it**. Mittente impostato: `MTT Allenamenti <allenamenti@zetabytenexus.it>` (secret Edge `RESEND_FROM`).
- Il testo della newsletter presenta ora il servizio come **lancio di novità** (non come proseguimento): subject statico `Allenamenti MTT · Settimana NN/AAAA — <Fase>`, LLM prompt istruito a presentare il servizio come nuovo servizio settimanale AI + coach. Test reale inviato con successo a `sbonfanti@hotmail.com` (sent:1).

### Linee guida contenuto newsletter (prime invii — 29 ottobre)
- **Non dare per scontato nulla**: spiegare concetti base almeno per le prime 3-4 newsletter. Esempio RPE incluso in intro statica e nel prompt LLM: "RPE (Rate of Perceived Exertion, sforzo percepito su scala 1-10: 1-2 = recupero, 3-4 = fondo aerobico/parli mentre ti alleni, 5-6 = soglia, 7-8 = duro, 9-10 = massimo)".
- Tono: caldo da coach, entusiasta ma professionale, presentare il servizio come novità.
- L'intro della newsletter deve: presentare il servizio come nuovo, spiegare l'RPE, descrivere la fase attuale, dire che gli allenamenti sono un punto di partenza da adattare alle proprie sensazioni.
- Consegna test confermata: l'email arriva (verificato su `sbonfanti@hotmail.com`, era finita in **spam/posta indesiderata** — avvisare gli atleti di controllare lo spam alle prime inviate).
- Chiave: tutto è documentato qui, non serve ripetere le istruzioni per le prossime newsletter.

### Brick corsa post-bici + test FTP ogni 6 settimane (30 ottobre)
- **periodization.ts**: tipo `SkeletonSession` aggiunto campo `brickRun?: { duration: string; main: string[] }`; `easySession` accetta `brickRun` opzionale; brickRun aggiunto a: (a) fase BUILD, sessione 'Bici - Fondo attivo' (settimana >=2, non-recovery): bici 70-80min + corsa 15min facile post-bici; (b) fase PEAK, sessione 'Bici - Fondo con ritmo' (settimana <=2, non-recovery): bici 70min + corsa 20min ritmo gara.
- **index.ts**: `toContentBlock` propaga `brickRun`; rendering Telegram aggiunge messaggio "*🏃 CORSA (dopo bici)*" dopo ogni block bici con brickRun; `adaptation_tips.ftp` include nota "Rifai il test ogni 6 settimane"; `newsletter.intro` static include invito test FTP come prima azione + nota ripeti ogni 6 settimane + spiegazione RPE 1-10; prompt LLM newsletter.intro aggiornato allo stesso contenuto.
- **newsletter.ts**: tipo `NewsletterWorkoutContent.bike[]` elementi con `brickRun?`; `disciplineSection` accetta `brickRuns` e mostra sottosezione "Corsa dopo bici (brick)"; nuove funzioni `normalizeNewlines` e `textToHtml` per evitare caratteri `\n\n` letterali nell'HTML (usate per intro, extra, notes); link test FTP cambiato su `https://www.rivaluta.it/ciclismo/ftp-ciclismo.asp`.
- **mttWorkouts.ts**: `WorkoutBlock.brickRun?: { duration: string; main: string[] }`.
- **Deploy**: Edge Function ridéployata su bwzzvdwiimvdwkiytknc (commit `026501d`, `5a9b766`, `7beddfa`).
- **Git**: tutto pushato su `main`.

### Warning Resend da risolvere
- Resend segnala: (1) link nelle email non matchano il dominio mittente (t.me, vercel.app vs zetabytenexus.it) — normale per newsletter con risorse esterne, non bloccante; (2) DMARC mancante su zetabytenexus.it — record TXT `_dmarc` creato su DNS Netsons con `v=DMARC1; p=none; rua=mailto:sbonfanti@hotmail.com; pct=100`. Da verificare propagazione.
- Consiglio futuro: usare sottodominio dedicato (es. `news.zetabytenexus.it`) per segmentare reputazione invio.
