import os
import json
from datetime import datetime
from supabase import create_client, Client

def get_supabase():
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise Exception("Variabili d'ambiente Supabase mancanti.")
    return create_client(url, key)

def backup_user_plans():
    """Scarica tutti i piani utente e li salva in un file JSON locale."""
    supabase = get_supabase()
    print("📦 Avvio backup dei piani utente...")
    
    try:
        res = supabase.from_("user_plans").select("*").execute()
        plans = res.data
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"backups/user_plans_{timestamp}.json"
        
        os.makedirs("backups", exist_ok=True)
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(plans, f, indent=2, ensure_ascii=False)
            
        # Crea anche una copia 'latest' per facilità d'uso
        with open("backups/user_plans_latest.json", "w", encoding="utf-8") as f:
            json.dump(plans, f, indent=2, ensure_ascii=False)
            
        print(f"✅ Backup completato: {len(plans)} record salvati in {filename}")
        return filename
    except Exception as e:
        print(f"❌ Errore durante il backup: {e}")
        return None

def restore_user_plans(filename="backups/user_plans_latest.json"):
    """Ripristina i piani utente da un file JSON."""
    supabase = get_supabase()
    print(f"🔄 Ripristino piani utente da {filename}...")
    
    try:
        with open(filename, "r", encoding="utf-8") as f:
            plans = json.load(f)
            
        if not plans:
            print("ℹ️ Nessun dato da ripristinare.")
            return

        # Rimuove created_at per evitare conflitti nell'inserimento
        for p in plans:
            if 'created_at' in p: del p['created_at']
            if 'id' in p: del p['id'] # Lasciamo che il DB generi nuovi ID se necessario o usiamoli se vogliamo sovrascrivere

        # Inserimento a blocchi
        batch_size = 50
        for i in range(0, len(plans), batch_size):
            batch = plans[i:i + batch_size]
            supabase.from_("user_plans").insert(batch).execute()
            
        print(f"✅ Ripristino completato: {len(plans)} record caricati.")
    except Exception as e:
        print(f"❌ Errore durante il ripristino: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "restore":
        restore_user_plans()
    else:
        backup_user_plans()
