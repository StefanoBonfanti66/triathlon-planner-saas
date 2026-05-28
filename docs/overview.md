# Race Planner SaaS — Overview

**Versione**: 6.3.3  
**Architect**: Stefano Bonfanti  
**Repository**: `StefanoBonfanti66/triathlon-planner-saas`  
**Produzione**: `https://triathlon-planner-saas.vercel.app`

## Scopo

Piattaforma SaaS multi-tenancy per la gestione del calendario gare FITRI 2026. Progettata per team di triathlon e atleti singoli, centralizza pianificazione gare, onboarding atleti, comunicazione di squadra e social ranking.

## Business value

- Unico account per l'intera stagione agonistica
- Onboarding automatico via join_code (nessuna configurazione manuale per l'admin)
- Branding automatico per squadra (logo, colori, icona PWA)
- Export Excel per iscrizioni di massa sui portali federali
- Social card automatica "Athlete of the Month" per Instagram
- Notifiche Telegram real-time (nuovi atleti, cambi programma, compleanni)

## Target utenti

| Ruolo | Descrizione |
|-------|-------------|
| Super Admin | Controllo globale su tutti i team, gestione infrastruttura |
| Team Admin | Gestione atleti del proprio team, export dati, social stats |
| Atleta | Pianificazione gare personali, calendario team, notifiche |
| Viewer | Accesso sola lettura a tutti i dati del team |

## Stack tecnologico

| Componente | Tecnologia |
|------------|-----------|
| Frontend | React 19 + TypeScript + Vite + TailwindCSS |
| Backend | Supabase (Auth, Postgres RLS, Storage) |
| Edge Function | Deno (invite-athlete v6) |
| Hosting | Vercel (Hobby) |
| Backup | GitHub Actions (daily JSON) |
| Sync | GitHub Actions (weekly FITRI scrape) |

## Vincoli

- Supabase free tier, Vercel Hobby
- Edge Function `invite-athlete` per creazione atleti con Service Role
- Validazione client-side prima di chiamare Edge Functions
