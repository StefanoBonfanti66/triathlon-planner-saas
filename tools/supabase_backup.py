import os
import json
from datetime import datetime
from supabase import create_client, Client

def get_supabase():
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise Exception("Variabili d'ambiente Supabase mancanti (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).")
    return create_client(url, key)

def full_backup():
    """Effettua il backup di tutte le tabelle critiche in formato JSON."""
    supabase = get_supabase()
    tables = ["profiles", "teams", "user_plans", "races"]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = f"backups/{timestamp}"
    
    print(f"🚀 Avvio backup completo in {backup_dir}...")
    os.makedirs(backup_dir, exist_ok=True)
    
    summary = {
        "timestamp": timestamp,
        "tables": {}
    }

    for table in tables:
        print(f"📦 Estrazione tabella '{table}'...")
        try:
            # Estraiamo solo i record non cancellati per profili e piani
            query = supabase.from_(table).select("*")
            if table in ["profiles", "user_plans"]:
                query = query.is_("deleted_at", "null")
            
            res = query.execute()
            data = res.data
            
            file_path = f"{backup_dir}/{table}.json"
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            summary["tables"][table] = len(data)
            print(f"✅ Salvati {len(data)} record per '{table}'.")
            
        except Exception as e:
            print(f"❌ Errore durante il backup di '{table}': {e}")
            summary["tables"][table] = f"ERROR: {str(e)}"

    # Salva un file di riepilogo
    with open(f"{backup_dir}/summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    # Crea/Aggiorna il link 'latest'
    latest_dir = "backups/latest"
    os.makedirs(latest_dir, exist_ok=True)
    for table in tables:
        source = f"{backup_dir}/{table}.json"
        target = f"{latest_dir}/{table}.json"
        if os.path.exists(source):
            with open(source, "r", encoding="utf-8") as s, open(target, "w", encoding="utf-8") as t:
                t.write(s.read())

    print(f"✨ Backup completato con successo in {backup_dir}")
    return backup_dir

if __name__ == "__main__":
    full_backup()
