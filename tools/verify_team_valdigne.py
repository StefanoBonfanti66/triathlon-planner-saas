import os
from supabase import create_client

def verify_team():
    url = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("❌ Errore: Variabili d'ambiente Supabase mancanti.")
        return

    supabase = create_client(url, key)
    
    # Cerchiamo il team con il codice fornito
    res = supabase.from_("teams").select("*").eq("join_code", "VALDIGNE2026").execute()
    
    if res.data and len(res.data) > 0:
        team = res.data[0]
        print(f"✅ Team Valdigne TROVATO!")
        print(f"   Nome: {team.get('name')}")
        print(f"   Codice: {team.get('join_code')}")
        print(f"   Colore Primario: {team.get('primary_color')}")
        print(f"   Colore Secondario: {team.get('secondary_color')}")
        print(f"   Logo URL: {team.get('logo_url')}")
    else:
        print("❌ Team Valdigne NON TROVATO con codice 'VALDIGNE2026'.")
        # Cerchiamo se esiste un team Valdigne con un altro codice
        res_alt = supabase.from_("teams").select("*").ilike("name", "%Valdigne%").execute()
        if res_alt.data:
            print(f"ℹ️ Ho trovato dei team simili, ecco i codici attuali:")
            for t in res_alt.data:
                print(f"   - {t.get('name')}: {t.get('join_code')}")
        else:
            print("ℹ️ Nessun team con 'Valdigne' nel nome trovato nel database.")

if __name__ == "__main__":
    verify_team()
