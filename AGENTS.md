# Agent rules

- Read PROJECT_AI_NOTES.md before doing major work.
- Prefer small diffs.
- Ask before touching secrets, .env, deployment, infra, auth, billing.
- Follow existing code style.
- Update PROJECT_AI_NOTES.md at meaningful checkpoints.

## Current Focus — 2026-11-05

### Completato
- **Integrazione MyWhoosh — deploy e DB verificati (2026-11-05)**: Edge Function `mtt-mywhoosh-sync` **deployata** su Supabase `bwzzvdwiimvdwkiytknc` (v26, 2026-11-03T20:17Z, allineata a `e6063a2`); secrets `MYWHOOSH_USERNAME`/`MYWHOOSH_PASSWORD` **presenti**; migration `tools/2026-10-31_mtt_mywhoosh_sync.sql` **applicata** (colonna `team_workouts.mywhoosh_workout_id` + indice presenti).
- **Push MTT→MyWhoosh reale**: record week 44 `c1619f13` → `status='sent'`, `sent_at=2026-11-01T21:50:14Z`, `mywhoosh_workout_id='1793737031433'` (HTTP 200, accepted:1).
- **Converter corretto**: durata minuti→secondi (`535e7c9`), warmup/main/cooldown come step `E_Normal` separati (0.5/0.85/0.4, `a2dc402`), parsing durata sul primo gruppo di cifre (`e6063a2`).
- **Probe Python esteso al flusso "due rampe"** (committato `e301f91`): validazione `E_WarmUp`/`E_CoolDown` con `StartPower`/`EndPower`, `attempt_id` separato dal workout id, upload senza POST multipli, estrazione corpo errore HTTP; 3 suite locali PASS (`--test-two-ramps`, `--test-upload`, `--test-backup`).
- **Fixture e `.gitignore`** (committati `e301f91`): template ufficiale MyWhoosh salvato in `tools/mywhoosh-template-rampe.json` (export "MyWhoosh - new workout": 2 step 0.25→0.75 e 0.75→0.25, 360 s ciascuno), default del probe allineati; `.gitignore` esteso (deno.lock, supabase/.temp/, __pycache__, tools/attempts/, preview di prova).
- **Merge `feat/mtt-mywhoosh-sync` → `main` e push (2026-11-05)**: `origin/main` merged in `main` (`0478c36`), poi feature merged (`ba4664b`) **senza conflitti**, incluse le 2 commit locali mai pubblicate (`11977f9`, `f1a694d`); `12fab02` pushato → `main` in sync con `origin/main` (0/0). Verifiche post-merge: `py_compile` OK, 3 suite probe PASS, `npm run build` (tsc+vite) OK; `supabase/functions/mtt-mywhoosh-sync/index.test.ts` non eseguito in locale (Deno non installato). Il branch `feat/mtt-mywhoosh-sync` resta avanti 2 commit rispetto a `origin/feat/mtt-mywhoosh-sync` (non pushato, contenuto già in `main`).
- **Allenamenti MTT in produzione**: periodizzazione a regole + rendering LLM (Groq, fallback statico), brick run post-bici, test FTP ogni 6 settimane (`133f6b1` in `main`), Edge Function `mtt-weekly-workouts` deployata su `bwzzvdwiimvdwkiytknc`.
- **Invio domenicale**: doppia cron UTC 18:00/19:00 + guardia `Europe/Rome` (fix DST, `bca1313`/`4923ced`); bot `@saas_planner_bot` nel gruppo MTT `-5117971075`.
- **Newsletter settimanale** via Resend, mittente `MTT Allenamenti <allenamenti@zetabytenexus.it>`; editor in Admin con Salva/Invia/Prova a me; tabelle `team_contacts` e `team_workouts.newsletter_sent_at`.
- **Fix `\n` letterali** da LLM nell'app: `normalizeNewlines`/`normalizeWorkoutContent` in `app/src/lib/mttWorkouts.ts` (`fdfa1c1`).
- **DMARC live** su `zetabytenexus.it` (`p=none`, `rua=mailto:sbonfanti@hotmail.com`, `pct=100`).
- **Documentazione allineata e committata** (`11977f9`): docs/overview.md, docs/project/user-guide.md, docs/project/admin-guide.md, app/GUIDA_UTENTE.md, app/GUIDA_ADMIN.md.
- **Dashboard ZBN** riallineata: `zbn-ops-dashboard` fast-forward a `994d5d8`.

### Da completare
- **Automazione push MyWhoosh**: nessun workflow chiama l'azione `push` di `mtt-mywhoosh-sync`; oggi il push è manuale (probe/curl). Valutare il wiring in `mtt-weekly-workouts.yml`.
- **Rampe reali nel converter automatico**: l'Edge Function converte warmup/main/cooldown in `E_Normal` con potenze hardcoded (0.55/0.85/0.7, non verificate sulla prescrizione MTT); il flusso a due rampe numeriche esiste solo nel probe locale.
- **Immagini + testo** nei workout (oggi solo testo); proprietario definitivo del bot.

### Prossimo step
- Verifica end-to-end su una settimana nuova (45): durate e step corretti e `mywhoosh_workout_id` valorizzato.
- Monitorare invio domenicale (week 44 già `sent`).
- Valutare il wiring del push MyWhoosh nel workflow domenicale.
