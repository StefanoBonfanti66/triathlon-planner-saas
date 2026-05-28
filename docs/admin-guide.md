# Race Planner SaaS — Admin Guide

## Ruoli e permessi

| Ruolo | Accesso Admin | Gestione atleti | Gestione team | Export | Social |
|-------|:---:|:---:|:---:|:---:|:---:|
| Super Admin | Tutti i team | Tutti | Crea/Modifica/Elimina | Si | Si |
| Team Admin | Solo il proprio team | Solo proprio team | Nessuna | Si | Si |
| Viewer | Solo lettura | Solo lettura | Solo lettura | No | No |

## Creazione atleti

### Con email (invito)
1. Vai su **Admin > Atleti > Nuovo Atleta**
2. Compila Nome Completo e Email (obbligatoria per l'invito)
3. Opzionale: imposta una password temporanea
4. L'Edge Function crea l'account auth e invia l'email di invito

### Senza email (sola anagrafica)
1. Lascia il campo Email vuoto
2. La label indica "Email (Opzionale, per invito)"
3. L'atleta viene creato come anagrafica senza account di login
4. Utile per import massivi o atleti che non useranno la piattaforma

### Import Excel
- Colonna "Nome Completo" obbligatoria, "Email" opzionale
- Seleziona il team di destinazione (Super Admin) o viene usato il team dell'admin
- Gli atleti importati hanno solo anagrafica (nessun account auth)

## Configurazione team

1. Accedi come Super Admin alla rotta `/admin`
2. Vai nel tab **Team**
3. Clicca "Nuovo Team" o modifica un team esistente
4. Campi configurabili:
   - Nome, Join Code (per onboarding)
   - Logo, colori sociali
   - Sito web, Codice federale
   - ID Gruppo Telegram, ID Admin Telegram

## Social Stats

- Tab **Social** nella Admin page
- Seleziona mese e team (Super Admin)
- Scarica la card PNG pronta per Instagram

## Telegram setup

Per ricevere notifiche su un gruppo Telegram:
1. Crea un gruppo Telegram
2. Aggiungi il bot del sistema come admin
3. Ottieni l'ID del gruppo
4. Inseriscilo in **Admin > Impostazioni Team** > Telegram Chat ID

Il bot invia automaticamente:
- Notifiche nuovo atleta / iscrizione gara / cambio programma
- Compleanni del giorno (solo atleti con tessera o socio attivo)
- **Promemoria gare imminenti**: 10 giorni prima di ogni gara con iscritti del team
- Scadenze certificati medici imminenti

## Gestione viewer

Per creare un utente con accesso sola lettura:
1. Imposta `profiles.is_viewer = true` per l'utente
2. Le policy RLS bloccano automaticamente qualsiasi write
3. Il frontend nasconde i pulsanti di modifica

## Esportazione dati

- **Export Atleti (Excel)**: anagrafica completa con licenze, certificati, categorie
- **Export Gare (CSV)**: lista gare con atleti iscritti per team
- Usa il tasto "Esporta Atleti" o "Esporta Gare" nella tab Atleti
