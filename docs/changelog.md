# Race Planner SaaS — Changelog

Tutti i cambiamenti significativi sono documentati in questo file.

## [6.3.3] — 2026-05-28

### Aggiunto
- **Email opzionale per creazione atleti**: se presente → Edge Function invite-athlete (auth + invito); se assente → insert diretto in profiles (sola anagrafica senza login)
- **Validazione client-side**: messaggi alert chiari in italiano prima di chiamare la Edge Function
- **Versione app visibile**: la versione corrente (v{package.version}) compare accanto a "SaaS Command Center" nell'admin

### Modificato
- Label campo email: "Email (Opzionale, per invito)" invece di "Email (Per Onboarding)"
- Messaggi conferma differenziati per i tre casi: password temporanea, invito email, sola anagrafica
- Error handling Edge Function: ora mostra il messaggio d'errore reale invece di "non-2xx status code"

### Corretto
- Bug creazione atleta: il campo email non era required nel form, causava errore generico dalla Edge Function
- Edge Function invite-athlete v6: ora fa lookup del join_code dalla tabella teams per passare team_code nei metadata di inviteUserByEmail
- Backup bot email cambiata da backup-bot@mtt.it a sbonfanti@hotmail.com

## [6.3.2] — 2026-05-13

### Aggiunto
- **Ruolo is_viewer**: colonna profiles.is_viewer, policy RLS riscritte per bloccare write ai viewer, frontend adattato
- **Utente demo Jesse**: support-reply@stripe.com, team demo-view, accesso viewer funzionante
- Security hardening: NOT NULL constraint su profiles.team_id, trigger handle_new_user riscritto, RLS policy per bloccare insert anonimo diretto
- Dependabot config: aggiornamenti npm settimanali

### Corretto
- Login bloccato: recovery_token NULL in auth.users causava errore GoTrue ("Database error querying schema"). Fixate 26 righe su 7 colonne token
- 9 warning CodeQL rimossi (import e variabili inutilizzati)
- Utente roacoy200@gmail.com: profili orfani puliti

## [6.3.1] — 2026-03-21

### Aggiunto
- Dual License Management: sdoppiamento tessera FITRI e FCI
- Surname-First Sorting: ordinamento alfabetico per cognome
- Enhanced Excel Export: colonne distinte FITRI/FCI

### Corretto
- TypeScript Build Fix: errori di tipizzazione in Layout.tsx

## [6.3.0] — 2026-03-19

### Aggiunto
- Admin Password Management: password temporanea per nuovi atleti
- Profile Uniqueness Constraint: UNIQUE su profiles.email
- Security Hardening: RLS su tutte le tabelle critiche
- Dashboard Statistiche: tab Stats con grafici e metriche
- Advanced Export: Excel completo anagrafica atleti
- Geocoding Dinamico: OpenStreetMap Nominatim

## [6.2.0] — 2026-03-16

### Aggiunto
- Security Hardening: RLS su tutte le tabelle, protezione API Key Telegram in schema internal
- Dashboard Statistiche: metriche atleti, categorie FITRI, attivita' mensile
- Secure Join Code: verifica tramite RPC Postgres

### Corretto
- Pulizia profili duplicati, RLS visibility fix

## [6.1.0] — 2026-03-06

### Aggiunto
- Telegram Multi-Team: notifiche per squadra con ID gruppo dedicato
- PWA Dinamica: icona e manifest cambiano in base al team
- Materiale Onboarding: proposta CUS Propatria Milano (MD + PDF)

## [6.0.0] — 2026-03-06

### Aggiunto
- Dynamic Routing: pagine dedicate per ogni gara (/race/:id)
- Integrazione MyFITri API: regolamenti, orari, percorsi in tempo reale
- Mappe Interattive: Leaflet
- FITRI Calendar Watcher: notifiche Telegram su cambiamenti calendario

## Precedenti

- [5.8.0] Telegram Pro con notifiche real-time via DB triggers
- [5.7.0] SaaS multi-tenancy, Admin Promotion, Join Code UX
- [5.0.0] Social Stats Hub, generatore card PNG Instagram
- [4.5.0] Backup bot, Disaster Recovery, Soft Delete

---

*Creato e mantenuto da Stefano Bonfanti.*
