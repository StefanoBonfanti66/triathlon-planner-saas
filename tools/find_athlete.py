import os
from supabase import create_client, Client

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def find_athlete_v2():
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("Errore: Variabili d'ambiente mancanti.")
        return

    supabase = create_client(url, key)

    print("Ricerca atleta iscritto alla gara ID 182 (BIM Triathlon)...")
    try:
        # Step 1: Trova lo user_id nella tabella piani
        res_plan = supabase.from_("user_plans").select("user_id").eq("race_id", "182").execute()
        
        if not res_plan.data:
            print("Nessun atleta trovato per la gara ID 182.")
            return

        for plan in res_plan.data:
            uid = plan['user_id']
            # Step 2: Trova il nome nella tabella profili
            res_prof = supabase.from_("profiles").select("full_name").eq("id", uid).single().execute()
            nome = res_prof.data.get('full_name', 'Senza Nome') if res_prof.data else 'Sconosciuto'
            print(f"\n🎯 ATLETA INDIVIDUATO: '{nome}' (ID: {uid})")
            print(f"Questa persona è iscritta al BIM Triathlon che attualmente ha ID 182.")

    except Exception as e:
        print(f"Errore query: {e}")

if __name__ == "__main__":
    find_athlete_v2()
