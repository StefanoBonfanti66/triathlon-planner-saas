# Race Planner SaaS - Disaster Recovery Guide
**Lead Architect**: Stefano Bonfanti
**Version**: 6.1 (Enterprise)

Procedure di emergenza per il ripristino dei dati.

---

## 🛡️ Livelli di Protezione
1. **GitHub Automated Backup**: Backup JSON ogni notte (02:00) salvato in `backups_history/`.
2. **Soft Delete**: Tutti i record eliminati vengono marcati con `deleted_at`, ma rimangono nel DB.
3. **Team Admin Export**: Ogni presidente può scaricare un backup JSON locale della propria squadra dalla Dashboard Admin.

---

## 🛠️ Procedure di Ripristino

### 1. Ripristino Rapido (Soft Restore)
Se un atleta o un piano è stato cancellato per errore:
```sql
-- Ripristina Atleta
UPDATE profiles SET deleted_at = NULL WHERE id = 'UUID-ATLETA';

-- Ripristina Piani
UPDATE user_plans SET deleted_at = NULL WHERE user_id = 'UUID-ATLETA';
```

### 2. Rollback a una data specifica
Usa lo script Python per caricare un backup dalla cartella di GitHub:
```powershell
python tools/supabase_restore.py backups_history/YYYY-MM-DD
```

### 3. Ripristino Manuale da Team Export
Se un Team Leader ha scaricato il backup e vuoi ripristinare solo quel team:
1. Apri il file JSON scaricato dall'Admin.
2. Usa le chiavi contenute per fare degli insert manuali o tramite script `upload_data.py` modificato.

---

## 🚨 Contatti di Emergenza
In caso di fallimento critico delle GitHub Actions, controllare i log su GitHub sotto il tab **Actions > SUPABASE DAILY BACKUP**. Assicurarsi che i Secrets `SUPABASE_SERVICE_ROLE_KEY` siano aggiornati.

**Integrità dei dati garantita al 100%.** 🛡️🏆
