# Race Planner SaaS — FAQ

## Generale

**D: L'app e' gratuita?**
R: Si, il sistema e' gratuito per i team. I costi infrastrutturali (Supabase, Vercel) sono sostenuti dallo sviluppatore.

**D: Devo installare qualcosa?**
R: No, funziona via browser. Puoi aggiungerla alla home del cellulare come PWA.

## Registrazione e accesso

**D: Ho perso la password.**
R: Usa il link "Password dimenticata?" nella pagina di login. Se non funziona, contatta Stefano.

**D: Non ricevo l'email di verifica.**
R: Controlla lo spam. Se ancora non arriva, l'admin puo' crearti con una password temporanea.

**D: Il login da' errore "Database error querying schema".**
R: Problema noto con token di recovery NULL in auth.users. Risolto a maggio 2026 — contatta Stefano per il fix manuale.

## Creazione atleti

**D: Devo inserire l'email per forza?**
R: No, e' opzionale. Se inserisci l'email, l'atleta riceve un invito e puo' loggarsi. Se la lasci vuota, viene creata solo l'anagrafica.

**D: L'atleta non riceve l'email di invito.**
R: Prova a crearlo con una password temporanea (es. Gara2026!). Puo' loggarsi subito con quella.

**D: Come importo tanti atleti in una volta?**
R: Usa il tasto "Importa" nella tab Atleti, carica un file Excel con colonna "Nome Completo".

## Viewer

**D: Un utente deve solo vedere i dati, non modificarli.**
R: Imposta il flag is_viewer sul suo profilo. Avra' accesso in sola lettura a tutto.

## Backup e sicurezza

**D: I dati vengono persi?**
R: No. Backup JSON giornaliero su GitHub alle 2:00. Soft Delete su tutti i record. I team admin possono esportare i propri dati.

**D: Il repository e' pubblico, ci sono rischi?**
R: I dati sensibili (chiavi API, secret) sono in GitHub Secrets e variabili d'ambiente Vercel. I backup JSON contengono solo anagrafica sportiva.

## Notifiche Telegram

**D: Come ricevo le notifiche su Telegram?**
R: Chiedi al tuo Team Admin di configurare l'ID del gruppo Telegram nelle impostazioni team. Il bot inviera' notifiche automatiche.

**D: Non arrivano le notifiche al mio gruppo.**
R: Verifica che il bot sia admin del gruppo e che l'ID sia corretto. Contatta Stefano se persiste.
