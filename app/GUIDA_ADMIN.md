# Manuale Amministratore - Race Planner SaaS
**Versione**: 6.3.3 - Edizione Universale
**Autore**: Stefano Bonfanti

## 1. Introduzione al Sistema SaaS
Il Race Planner è una piattaforma multi-team progettata per centralizzare la pianificazione delle gare e la gestione dell'anagrafica atleti. Ogni squadra opera in un ambiente isolato e sicuro.

## 2. Gestione Atleti (Anagrafica)
L'area principale dell'amministratore è la tabella "Atleti". Qui è possibile:

### A. Aggiunta di un nuovo Atleta
1. Cliccare su **"Nuovo Atleta"**.
2. Inserire i dati obbligatori: Nome, Email e Team di appartenenza.
3. **Password Temporanea**: È possibile impostare una password manuale per permettere all'atleta di accedere subito senza attendere l'email.
4. **Licenze**: Inserire separatamente il numero tessera FITRI e/o FCI.

### B. Importazione Massiva
Se si possiede un elenco Excel dei propri soci:
1. Usare il tasto **"Importa"**.
2. Caricare il file (formati supportati: .xlsx, .csv).
3. Il sistema mapperà automaticamente i nomi degli atleti.

### C. Certificati Medici
Il sistema evidenzia in **ROSSO** le date di scadenza superate. È responsabilità dell'Admin aggiornare queste date man mano che riceve i nuovi certificati.

## 3. Gestione Team (Super Admin)
Questa sezione è riservata alla configurazione globale:
- **Codice Squadra (Join Code)**: Il codice segreto che i nuovi atleti devono inserire in fase di registrazione.
- **Branding**: Caricamento del logo (PNG/SVG) e scelta dei colori sociali (Primario e Secondario). Questi cambieranno l'aspetto dell'intera app per gli atleti di quel team.
- **Notifiche Telegram**: Inserire l'ID del gruppo Telegram della squadra per attivare i messaggi automatici su nuove iscrizioni o cambi di calendario.

## 4. Allenamenti settimanali MTT (Telegram)

L'Admin team genera la settimana di allenamenti in **Admin → Allenamenti MTT**:

1. Clicca **Genera settimana**: crea la bozza (2 nuoto + 2 bici + 2 corsa) con periodizzazione (fase stagionale + mesociclo 4 settimane, 4ª di scarico).
2. L'allenamento viene generato da AI (Groq, free tier) con fallback statico se il servizio non è disponibile.
3. Nella sezione admin puoi leggere le bozze, modificare soggetto/intro/extra della newsletter e cliccare **Salva**.
4. Clicca **Approva** per rendere l'allenamento inviabile: solo gli allenamenti con status `approved` vengono inviati.
5. Clicca **Invia** per mandare l'allenamento su Telegram e la newsletter via Resend (domenica 20:00 IT, invio automatico via cron).
6. Usa **Prova a me** per inviare la newsletter al tuo indirizzo email prima dell'invio di gruppo.

Gli allenamenti inviati restano consultabili in app su `/allenamenti-mtt`. La tabella `team_workouts.newsletter_sent_at` impedisce invii duplicati della stessa settimana.

## 5. Newsletter settimanale (Resend)

La newsletter viene inviata ogni domenica via Resend (`MTT Allenamenti <allenamenti@zetabytenexus.it>`, dominio `zetabytenexus.it` verificato).

- Dominio Resend verificato: `zetabytenexus.it`
- Soggetto: `Allenamenti MTT · Settimana NN/AAAA — <Fase>`
- Contenuto: spiegazione preparazione, RPE (1-10), fase attuale, sintesi sedute, adattamenti, bottone Telegram, bottone test FTP
- L'invio è best-effort: se fallisce, l'allenamento resta comunque inviato su Telegram
- Alle prime inviate l'email può finire in spam: avvisa gli atleti di controllare la posta indesiderata
- Link esterni (t.me, vercel.app) non matchano il dominio mittente: comportamento normale di Resend
- Consiglio futuro: sottodominio dedicato (es. `news.zetabytenexus.it`) per segmentare la reputazione

## 6. Export e Rendicontazione

## 4. Export e Rendicontazione
Il sistema offre due tipi di esportazione:
1. **Export Atleti (Excel)**: Genera un file completo con tutti i dati anagrafici, incluse licenze e scadenze mediche. Utile per i database interni.
2. **Export Gare (CSV)**: Genera l'elenco delle iscrizioni previste, formattato per facilitare il caricamento sui portali federali per le iscrizioni di squadra.

## 5. Recupero Credenziali
Se un atleta dimentica la password:
1. Può usare la funzione "Password dimenticata" nel login.
2. L'Admin può verificare nei "Log Attività" se l'email è stata inviata correttamente.
3. In casi estremi, l'Admin può eliminare il profilo dell'atleta e ricrearlo con una password manuale (Bypass Mode).

---
*Note di Sicurezza: Non condividere mai il proprio account Admin. Ogni azione viene tracciata nei Log di Sistema con data e ora.*
