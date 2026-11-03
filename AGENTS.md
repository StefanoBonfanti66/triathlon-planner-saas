# Agent rules

- Read PROJECT_AI_NOTES.md before doing major work.
- Prefer small diffs.
- Ask before touching secrets, .env, deployment, infra, auth, billing.
- Follow existing code style.
- Update PROJECT_AI_NOTES.md at meaningful checkpoints.

## Current Focus — 2026-11-03

### Completato
- **Allenamenti MTT in produzione**: periodizzazione a regole (macro-fase stagionale + mesociclo 4 settimane con scarico) + rendering LLM (Groq, fallback statico), brick run post-bici, test FTP ogni 6 settimane. Feature mergiata in `main` (`133f6b1`), Edge Function `mtt-weekly-workouts` deployata su Supabase `bwzzvdwiimvdwkiytknc` (secret: `TELEGRAM_BOT_TOKEN`, `MTT_SERVICE_ROLE_KEY`, `LLM_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `TELEGRAM_INVITE_URL`).
- **Invio domenica 20:00 italiane**: doppia cron UTC 18:00/19:00 + guardia `Europe/Rome` (fix DST, `bca1313`/`4923ced`). Bot attivo `@saas_planner_bot` nel gruppo MTT `-5117971075`.
- **Newsletter settimanale** via Resend, mittente `MTT Allenamenti <allenamenti@zetabytenexus.it>` (dominio `zetabytenexus.it` verificato); editor in Admin con Salva/Invia/Prova a me; tabelle `team_contacts` e colonna `team_workouts.newsletter_sent_at`.
- **Fix `\n` letterali** da LLM nell'app: `normalizeNewlines`/`normalizeWorkoutContent` in `app/src/lib/mttWorkouts.ts` (`fdfa1c1`).
- **Week 44 approvata**: record `c1619f13` (team `mtt`, 2026, week 44) è `status='approved'` nel DB Supabase (confermato via service role, `approved_at` 2026-10-28T16:31:27Z, `sent_at`=null in attesa di invio domenicale).
- **DMARC live**: `dig TXT _dmarc.zetabytenexus.it` → ANSWER 1, TTL 300, `"v=DMARC1; p=none; rua=mailto:sbonfanti@hotmail.com; pct=100"` (record corretto da `_dmark` a `_dmarc`).
- **Documentazione allineata e committata** (`11977f9`, +63/-2): docs/overview.md, docs/project/user-guide.md (sez.5), docs/project/admin-guide.md (sez. Newsletter), app/GUIDA_UTENTE.md (sez.6), app/GUIDA_ADMIN.md (sez.4+5).
- **Screening 36 profili senza user_plan completato**: 51 profili mtt attivi, 15 con user_plan, 36 senza; team_contacts 35 record email mtt.
- **Sottodominio newsletter news.zetabytenexus.it**: DNS Netsons verificati live, Enable Sending su Resend, RESEND_FROM aggiornato su Supabase, test invio week 44 fatto dall'utente.
- **Integrazione MyWhoosh (contratto verificato)**: `SportsModeType: 0` nel wrapper del payload (non nel workout), `workoutId` generato con `crypto.randomUUID()` (non timestamp), `export` di 4 funzioni per testabilità, 7 test locali passati su `supabase/functions/mtt-mywhoosh-sync/index.test.ts`. Contratto verificato con successo reale (HTTP 201, workout visibile in MyWhoosh, nome "MyWhoosh - new workout - Tentativo 1793552448", durata 12 min). Branch `feat/mtt-mywhoosh-sync` non mergeato, nessun deploy/migration/segreti pushati.

### Da completare
- **Immagini + testo** nei workout (oggi solo testo); proprietario definitivo del bot.
- Warning Resend: link esterni (t.me, vercel.app) non matchano dominio mittente — non bloccante; sottodominio news.zetabytenexus.it attivato.
- **Merge del branch `feat/mtt-mywhoosh-sync` su `main`**: non ancora fatto, in attesa revisione diff e conferma.
- **Deploy Edge Function `mtt-mywhoosh-sync` su Supabase**: non ancora fatto.
- **Configurazione segreti `MYWHOOSH_USERNAME`/`MYWHOOSH_PASSWORD` su Supabase**: non ancora fatto.
- **Migration SQL `tools/2026-10-31_mtt_mywhoosh_sync.sql`**: già committata, non ancora applicata su Supabase.

### Prossimo step
- Revisione diff e commit dei file modificati su `feat/mtt-mywhoosh-sync` (solo dopo conferma esplicita).
- Eventuale merge su `main` e push solo dopo conferma.
- Monitorare invio domenicale week 44 (record già approved, in attesa di sent).
