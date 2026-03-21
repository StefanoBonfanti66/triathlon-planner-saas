# Changelog - Race Planner SaaS

Tutti i cambiamenti significativi a questo progetto saranno documentati in questo file.

## [6.3.3] - 2026-03-21
### Aggiunto
- **Dual License Management**: Sdoppiamento del campo tessera in FITRI e FCI nella Dashboard Admin con gestione separata nel modulo di inserimento/modifica.
- **Surname-First Sorting**: Implementato l'ordinamento alfabetico basato sul cognome (ultima parola del nome completo) in tutta l'applicazione.
- **Standardized Display**: Formattazione universale degli atleti come "COGNOME Nome" (es. BONFANTI Stefano) per un look professionale stile federale.
- **Enhanced Excel Export**: L'esportazione anagrafica ora include colonne distinte per le tessere FITRI e FCI.

### Corretto
- **TypeScript Build Fix**: Risolti errori di tipizzazione in `Layout.tsx` che bloccavano il deployment su Vercel (riassegnazione costanti e mismatch campi profilo).

## [6.3.2] - 2026-03-19
### Aggiunto
- **Admin Password Management**: Possibilità per l'amministratore di impostare una password temporanea durante la creazione di un nuovo atleta, bypassando l'invito email se SMTP non è configurato.
- **Profile Uniqueness Constraint**: Aggiunto vincolo `UNIQUE` sulla colonna `email` della tabella `profiles` per prevenire duplicati e garantire la stabilità dell'onboarding.

### Corretto
- **Fix Build Vercel**: Risolti errori di tipo TypeScript in `AdminPage.tsx` e `RaceDetailPage.tsx` che impedivano il corretto deploy su Vercel.
- **Fix Admin UX**: Risolto bug che causava la perdita del focus nei campi di input del modulo "Nuovo Atleta".
- **Fix Security Policy**: Aggiunta policy RLS per permettere agli Admin di creare (INSERT) nuovi profili atleti.

## [6.3.1] - 2026-03-16
### Corretto
- **Cleanup Profili Duplicati**: Risolta l'incoerenza degli utenti "test" con email multiple nel database, ripristinando l'accesso admin all'utente corretto.
- **RLS Stability Fix**: Ripristinata la visibilità pubblica (SELECT) per profili, team e piani gara per evitare downtime dei dati in modalità anonima.
- **Ottimizzazione Policy**: Risolti potenziali conflitti di ricorsione nelle query di aggiornamento profili.

## [6.3.0] - 2026-03-16
### Aggiunto
- **Security Hardening**: Implementazione Row Level Security (RLS) su tutte le tabelle critiche.
- **Protezione Segreti**: Spostamento delle API Key (Telegram) in uno schema `internal` non esposto alle API REST.
- **Dashboard Statistiche**: Nuova tab "Stats" nell'Admin Panel con grafici e metriche su atleti, categorie FITRI e attività mensile.
- **Advanced Export**: Esportazione Excel completa dell'anagrafica atleti con dati di tesseramento e scadenze mediche.
- **Geocoding Dinamico**: Integrazione con OpenStreetMap Nominatim per recuperare coordinate in tempo reale se non presenti nel database.
- **Arricchimento Dati MyFITri**: Visualizzazione estesa di programmi di gara, note organizzatore e chiusura iscrizioni.
- **Secure Join Code**: Verifica dei codici squadra tramite RPC Postgres per prevenire l'esposizione della tabella `teams`.

## [6.2.0] - 2026-03-06
### Aggiunto
- **Telegram Multi-Team**: Implementato sistema di notifiche granulari per squadra. Ogni team può ora avere il proprio ID Gruppo Telegram dedicato.
- **Gestione Admin Telegram**: Aggiunto campo "ID Gruppo Telegram" nella Dashboard Admin per la configurazione semplificata da parte dei presidenti.
- **Trigger SQL Avanzati**: Aggiornate le funzioni di database per supportare l'invio contemporaneo al Super Admin (globale) e al gruppo specifico del team.

## [6.1.1] - 2026-03-06
### Aggiunto
- **Materiale Onboarding**: Creata proposta formale personalizzata per CUS Propatria Milano in formato MD e PDF.
- **Fix Documentazione**: Corretti i riferimenti di contatto dello sviluppatore nei template di comunicazione.

## [6.1.0] - 2026-03-06
### Aggiunto
- **PWA Dinamica**: L'icona dell'app e il manifest cambiano automaticamente in base al team dell'atleta loggato.
- **Supporto multi-branding**: Aggiornamento automatico di favicon, apple-touch-icon e theme-color via JavaScript.
- **Documentazione Massiva**: Aggiornati README, GEMINI.md, Guida Utente e Disaster Recovery alla versione Enterprise.

## [6.0.0] - 2026-03-06
### Aggiunto
- **Dynamic Routing**: Implementate sottopagine dedicate per ogni singola gara (`/race/:id`).
- **Integrazione MyFITri API**: Recupero in tempo reale di orari, regolamenti e percorsi dal CMS ufficiale FITRI.
- **Mappe Interattive**: Integrazione Leaflet nelle pagine di dettaglio gara per localizzazione geografica.
- **Deep Linking**: Funzionalità di condivisione link diretti alle gare su Telegram/WhatsApp.

## [5.8.0] - 2026-03-06
### Aggiunto
- **FITRI Calendar Watcher**: Sistema di monitoraggio che avvisa su Telegram se vengono aggiunte o rimosse gare dal calendario ufficiale.
- **TypeScript Fixes**: Risolti errori di compilazione su Vercel relativi alle icone Lucide.

## [5.7.0] - 2026-03-06
### Aggiunto
- **Telegram Pro**: Notifiche real-time via database triggers per nuovi atleti, nuove iscrizioni e cancellazioni (con testi personalizzati ed emoji).

## [5.6.0] - 2026-03-06
### Aggiunto
- **SaaS Privacy**: Multi-tenancy nel pannello Admin (i Team Leader vedono solo i propri atleti).
- **Admin Promotion**: Possibilità per il Super Admin di nominare Team Leader direttamente dalla UI.
- **Join Code UX**: Pulsante "Copia" rapido per i codici invito delle squadre.

## [5.0.0] - 2026-03-05
### Aggiunto
- **Social Stats Hub**: Nuova sezione Admin per il ranking mensile degli atleti.
- **Generatore Social Card**: Creazione automatica di immagini PNG (1080x1350) per Instagram "Athlete of the Month".

## [4.5.0] - 2026-03-04
### Aggiunto
- **Backup Bot Blindato**: GitHub Action ottimizzata per gestire conflitti di push automatici.
- **Disaster Recovery**: Primo rilascio della guida alle emergenze e sistema Soft Delete.

---
*Creato e mantenuto da Stefano Bonfanti.*
