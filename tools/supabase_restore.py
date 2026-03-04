import os
import json
import sys
from supabase import create_client, Client

def get_supabase():
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise Exception("Variabili d'ambiente Supabase mancanti (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).")
    return create_client(url, key)

def restore_from_json(backup_dir):
    """Ripristina i dati da una cartella di backup JSON."""
    supabase = get_supabase()
    
    # Ordine critico per rispettare le Foreign Keys
    tables = ["teams", "profiles", "user_plans"]
    
    print(f"🔄 Avvio ripristino da: {backup_dir}")
    
    for table in tables:
        file_path = os.path.join(backup_dir, f"{table}.json")
        if not os.path.exists(file_path):
            print(f"⚠️ Salto {table}: file non trovato.")
            continue
            
        print(f"📥 Ripristino tabella '{table}'...")
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        if not data:
            print(f"ℹ️ Nessun dato da inserire per {table}.")
            continue
            
        # Per sicurezza, facciamo un 'upsert' basato sulla colonna 'id'
        try:
            # Suddividiamo in chunk da 100 per evitare timeout
            chunk_size = 100
            for i in range(0, len(data), chunk_size):
                chunk = data[i:i + chunk_size]
                res = supabase.table(table).upsert(chunk).execute()
                print(f"✅ Inseriti {len(chunk)} record in {table}...")
        except Exception as e:
            print(f"❌ Errore durante il ripristino di {table}: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Utilizzo: python tools/supabase_restore.py <percorso_cartella_backup>")
        sys.exit(1)
    
    restore_from_json(sys.argv[1])
