# MTT Season Planner SaaS - Guida Gestione Team

Questo documento spiega come gestire i team nel sistema SaaS senza modificare il codice.

## Come aggiungere un nuovo Team
- Caricare il logo del team in Supabase Storage nel bucket pubblico `team-logos`.
- Recuperare l'URL pubblico del logo.
- Inserire una nuova riga nella tabella `public.teams` definendo nome, colore primario (HEX), URL del logo e sito web.
- Copiare l'ID (UUID) generato automaticamente per il nuovo team.

## Come assegnare un Atleta a un Team
- Individuare l'utente nella tabella `public.profiles`.
- Incollare l'ID lungo del team nella colonna `team_id`.
- L'app si aggiornerà istantaneamente con il nuovo branding al prossimo login dell'utente.

## Note Tecniche
- La colonna team_id deve essere sempre in formato UUID (codice lungo alfanumerico).
- Il colore primario deve essere in formato esadecimale (es: #FF0000).
- Le immagini caricate su Storage devono essere in un bucket impostato come "Public".
