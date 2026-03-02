# Race Planner SaaS - Command Center
**Architetto**: Stefano Bonfanti
**Stato**: Versione 4.0 - SaaS Pro Ready

## Ultime Funzionalità Implementate (V4.0)
- **Super Admin Dashboard**: Pagina dedicata `/admin` per la gestione visuale di Team e Atleti.
- **Onboarding Automatico**: Gli atleti si associano al team corretto inserendo un `join_code` in fase di registrazione.
- **Dual-Color Branding**: Supporto per colore primario e secondario con generazione automatica di gradienti CSS.
- **Storage Integrato**: Caricamento diretto dei loghi dei team su Supabase Storage dal pannello admin.
- **Race Details**: Nuova pagina `/race/:id` con integrazione (Alpha) API MyFITri e meteo storico.

## Sicurezza e Automazione
- **SQL Trigger**: Il profilo atleta viene creato automaticamente dal database (`handle_new_user`) leggendo il codice team dai metadati di Auth.
- **RLS Dinamiche**: Stefano (Super-Admin) ha permessi di DELETE e UPDATE globali, mentre gli atleti sono isolati nei loro team.
- **Resilienza**: Fallback automatico se il team_id è nullo o se la funzione RPC è mancante.

## Roadmap Futura
- Consolidamento API MyFITri per percorsi e regolamenti PDF.
- Sistema di Carpooling/Coordinamento viaggi interno alla pagina gara.
- Export della singola gara in formato iCal/Google Calendar.
