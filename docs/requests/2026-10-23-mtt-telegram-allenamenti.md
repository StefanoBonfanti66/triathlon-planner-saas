# Richiesta: Invio allenamenti MTT via Telegram (ogni lunedì)

- **Data richiesta:** 23/10/2026 07:16
- **Mittente:** Stefano Bonfanti <sbonfanti@hotmail.com>
- **Canale:** info@zetabytenexus.it
- **Repo:** triathlon-planner-saas
- **Tipo:** Evolutiva / Funzionalità nuova
- **Stato:** MVP IMPLEMENTATO E TESTATO (test reale 25/10/2026) — da estendere a immagini + lunedì + bot MTT definitivo
- **Priorità:** Alta

## Requisiti
- Invio allenamenti alla squadra ogni lunedì tramite Telegram
- Allenamenti non personalizzati
- Fascia d'età: 30-60 anni
- Discipline: corsa, bici, nuoto
- Almeno 2 allenamenti a settimana per ogni disciplina
- Tono: indicazioni da "triathlon coach professionista"
- Adattamento: suggerimenti per modificarli nel tempo in base a FTP, VO2max e velocità nelle 3 discipline
- Formato: immagini + testo con indicazioni

## Stato implementazione (25/10/2026)

- **Edge Function `mtt-weekly-workouts`** deployata in produzione (Supabase project `bwzzvdwiimvdwkiytknc`), azioni `generate` e `send`.
- **Tabella `team_workouts`** presente in produzione (18 colonne), con FK `team_id → teams.id` e `approved_by → profiles.id`, RLS + trigger `updated_at`.
- **Admin → tab "Allenamenti MTT"**: genera la settimana, elenca le bozze, approva, invia su Telegram; storico in-app su `/allenamenti-mtt`.
- **Autenticazione Edge Function**: `Authorization: Bearer` obbligatorio; accettato `service_role` oppure JWT di un admin MTT (`team_id='mtt'` + `is_team_admin`/`is_super_admin`). CORS limitato a `triathlon-planner-saas.vercel.app`, preview Vercel e localhost.
- **Test reale eseguito**: 1 workout (settimana 43/2026), 11 messaggi di solo testo inviati con successo; `status='sent'`, `sent_at` e `telegram_message_ids` (56–66) registrati.
- **Rollback test**: eliminazione dei messaggi Telegram di prova e reset del record a `approved`.

## Domande da chiarire
- [ ] Chi gestisce il bot Telegram (MTT o ZBN)? — In test usato un bot temporaneo; il token del bot MTT definitivo andrà sostituito nel secret Edge `TELEGRAM_BOT_TOKEN`.
- [ ] Destinatari: tutta la squadra MTT o sottogruppo? — Destinazione configurata in `teams.telegram_chat_id` (`-5117971075` per MTT).
- [x] Archivio allenamenti già esistente o da creare da zero? — Tabella `team_workouts` creata con storico in-app.
- [ ] Orario invio (lunedì mattina/pomeriggio)? — Attualmente workflow GitHub Actions la domenica 18:00 UTC (20:00 CEST); da spostare al lunedì.
- [x] Vuole anche storico/archivio accessibile in app oltre al canale Telegram? — Sì: pagina `/allenamenti-mtt` con tab per disciplina.
