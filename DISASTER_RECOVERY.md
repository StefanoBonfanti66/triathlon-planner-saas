# Race Planner SaaS - Disaster Recovery Guide
**Lead Architect**: Stefano Bonfanti
**Version**: 1.0 (Enterprise)

Questo documento descrive le procedure di emergenza per il ripristino dei dati in caso di errore umano, corruzione del database o disastro totale.

---

## Scenario 1: Errore Umano (Soft Restore)
*Caso: Un atleta ha cancellato per errore una gara o un admin ha cancellato un atleta.*

Grazie al sistema **Soft Delete**, i dati non sono spariti. Per ripristinarli:
1. Apri il **SQL Editor** di Supabase.
2. Esegui il comando di ripristino (sostituisci l'ID o il nome):

```sql
-- Per ripristinare un atleta
UPDATE profiles SET deleted_at = NULL WHERE full_name = 'Nome Atleta';

-- Per ripristinare tutti i piani di un atleta
UPDATE user_plans SET deleted_at = NULL WHERE user_id = 'UUID-ATLETA';
```

---

## Scenario 2: Corruzione Dati / Rollback (Backup JSON)
*Caso: Un aggiornamento massivo è andato storto o vuoi tornare alla situazione di ieri.*

Usa lo script di restore fornito:
1. Assicurati di avere le variabili d'ambiente `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
2. Esegui il restore puntando alla cartella dell'ultimo backup scaricato:

```powershell
python tools/supabase_restore.py backups/latest
```

---

## Scenario 3: Disastro Totale (GitHub Archive)
*Caso: Supabase non è accessibile o il database è stato compromesso.*

Il sistema effettua backup notturni automatici su GitHub.
1. Vai nel tuo repository privato su GitHub.
2. Entra nella cartella `backups_history`.
3. Scarica i file JSON della data desiderata.
4. Usa lo scenario 2 per ricaricarli su una nuova istanza di Supabase se necessario.

---

## Livelli di Protezione Attivi
1. **GitHub Actions**: Backup JSON automatico ogni notte (ore 02:00).
2. **Soft Delete**: Colonna `deleted_at` su tutte le tabelle critiche.
3. **Team Export**: Ogni Team Leader può scaricare il proprio backup JSON dall'area Admin.

**I dati sono il cuore del SaaS. Proteggili sempre.** 🛡️🏆
