import os
from supabase import create_client, Client

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def check_plans():
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("Errore: Variabili d'ambiente mancanti.")
        return

    supabase: Client = create_client(url, key)

    print("Analisi iscrizioni attive...")
    try:
        response = supabase.from_("user_plans").select("race_id").execute()
        plans = response.data
        
        if not plans:
            print("
✅ Il database non ha ancora iscrizioni. Possiamo ricaricare tutto in sicurezza!")
        else:
            print(f"
⚠️ ATTENZIONE: Ci sono {len(plans)} iscrizioni attive.")
            unique_races = set(p['race_id'] for p in plans)
            print(f"Queste iscrizioni coinvolgono {len(unique_races)} gare diverse.")
            print("In questo caso, NON dobbiamo cancellare la tabella races, ma solo aggiornare i testi.")

    except Exception as e:
        print(f"Errore query: {e}")

if __name__ == "__main__":
    check_plans()
