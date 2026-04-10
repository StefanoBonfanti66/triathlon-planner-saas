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
