# Race Planner SaaS - Command Center
**Architetto**: Stefano Bonfanti
**Stato**: Versione 4.0 - SaaS Pro Ready (Hierarchical Admin)

## Ultime Funzionalità Implementate (V4.0)
- **Super Admin Dashboard**: Pagina `/admin` globale per Stefano (God Mode).
- **Team Admin Role**: Ruolo `is_team_admin` per permettere ai presidenti di gestire solo la propria squadra.
- **Onboarding Automatico**: Associazione istantanea al team tramite `join_code` in fase di registrazione.
- **Dual-Color Branding**: Supporto per colore primario e secondario con gradienti dinamici.
- **Storage Integrato**: Caricamento loghi direttamente dal pannello Admin.
- **Race Details**: Pagina `/race/:id` con dati MyFITri e meteo.

## Gerarchia Accessi
1. **Super-Admin (Stefano)**: Accesso totale a tutti i team, tutti gli atleti e impostazioni di sistema.
2. **Team-Admin (Presidenti)**: Vedono solo i propri atleti, possono modificare i dati del proprio team e monitorare le iscrizioni interne.
3. **Atleta**: Accesso alle funzioni di pianificazione, calendario team e social cards.

## Roadmap Futura
- Integrazione completa API MyFITri (PDF regolamenti).
- Modulo Carpooling per trasferte di squadra.
- Dashboard statistiche per i Team-Admin (es. atleti più attivi).
