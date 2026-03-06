# Race Planner SaaS 2026
**Architect**: Stefano Bonfanti
**Version**: 6.1

Piattaforma SaaS professionale per la gestione del calendario gare FITRI 2026, progettata per team di Triathlon e atleti singoli.

## 🚀 Caratteristiche Principali
- **Multi-tenancy**: Un'unica piattaforma che ospita più squadre, ognuna con il proprio branding.
- **PWA Dinamica**: L'icona dell'app installata sul cellulare cambia automaticamente in base al logo del team dell'atleta.
- **Pagine Gara**: Ogni gara ha un URL dedicato con mappe, orari e regolamenti ufficiali MyFITri.
- **Dashboard Admin**: Pannello completo per gestire atleti, esportare dati per iscrizioni di massa e nominare responsabili di squadra.
- **Social Ranking**: Classifica mensile automatica con generatore di immagini PNG per Instagram (Athlete of the Month).
- **Notifiche Real-time**: Integrazione profonda con Telegram per alert su nuove iscrizioni e variazioni del calendario FITRI.

## 🛠️ Stack Tecnologico
- **React 19 + TypeScript**: Frontend moderno e ultra-veloce.
- **Supabase**: Database Postgres, Autenticazione e Storage.
- **TailwindCSS**: UI pulita, moderna e responsive.
- **GitHub Actions**: Automazione completa di backup e sincronizzazione dati.

## 📋 Guida Rapida Gestione Team
Per aggiungere una nuova squadra senza toccare il codice:
1. Accedi come **Super Admin** alla rotta `/admin`.
2. Vai nel tab **Team** e clicca su "Nuovo Team".
3. Imposta nome, logo, colori sociali e il `join_code` per l'auto-onboarding.
4. Gli atleti che useranno quel codice saranno associati automaticamente alla squadra.

## 🔒 Sicurezza e Backup
- **Daily JSON Backup**: Ogni notte il database viene esportato in formato JSON su GitHub.
- **Soft Delete**: Nessun dato viene mai eliminato definitivamente per errore (ripristino istantaneo).
- **Branch Protection**: Sviluppo sicuro sul ramo `develop` e rilascio su `main` solo dopo approvazione.

---
*Progettato da Stefano Bonfanti per il futuro del Triathlon.* 🏊‍♂️🚴‍♂️🏃‍♂️
