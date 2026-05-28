# Race Planner SaaS — User Guide

## 1. Accesso e onboarding

- Registrati con email e password.
- Inserisci il **join code** del tuo team durante la registrazione. Verrai automaticamente associato alla squadra.
- Se l'admin ti ha creato con una password temporanea, usala per il primo login.

## 2. Dashboard (pianificazione personale)

- **Ricerca gare**: cerca per nome, filtro per mese, sport o distanza.
- **Aggiungi gara**: clicca "+ Aggiungi" su una gara per inserirla nel tuo calendario.
- **Dettaglio gara** (`/race/:id`): regolamento MyFITri, mappa Leaflet, meteo storico, compagni di squadra iscritti.
- **Rimuovi gara**: clicca sulla gara nel tuo calendario per deselezionarla.

## 3. Calendario team

- Visualizza tutte le gare pianificate dal tuo team, raggruppate per mese.
- Ogni gara ha un URL condivisibile su Telegram/WhatsApp.

## 4. Notifiche Telegram

Se il Team Admin ha configurato il gruppo Telegram:
- Nuovo atleta si unisce alla squadra
- Un compagno pianifica una gara
- Compleanni del giorno
- Scadenze certificati medici imminenti
- Promemoria gare in programma tra 10 giorni

## 5. Ruolo Viewer

Alcuni utenti possono avere accesso in sola lettura (`is_viewer`). Possono vedere tutti i dati del team ma non possono:
- Aggiungere o rimuovere gare dal calendario
- Modificare profili
- Accedere alla sezione Admin

## 6. Installazione PWA

- Da browser mobile: "Aggiungi alla Home".
- L'icona, il nome e i colori si adattano automaticamente al team.
