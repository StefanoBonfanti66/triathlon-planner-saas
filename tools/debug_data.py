import os
from supabase import create_client, Client

def debug_data():
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
    supabase = create_client(url, key)

    print("--- DEBUG DATA ---")
    
    print("\n1. Tabelle RACES (primi 3 record):")
    r_res = supabase.from_("races").select("id, title").limit(3).execute()
    for r in r_res.data:
        print("   ID: " + str(r['id']) + " | Titolo: " + str(r['title']))

    print("\n2. Tabella USER_PLANS (primi 3 record):")
    p_res = supabase.from_("user_plans").select("race_id, user_id").limit(3).execute()
    for p in p_res.data:
        print("   Race ID: " + str(p['race_id']) + " | User ID: " + str(p['user_id']))

    print("\n3. Verifica incrocio (Join manuale):")
    if p_res.data:
        test_id = p_res.data[0]['race_id']
        print("   Cerco nel DB la gara con ID: " + str(test_id))
        check = supabase.from_("races").select("title").eq("id", test_id).execute()
        if check.data:
            print("   Trovata: " + str(check.data[0]['title']))
        else:
            print("   GARA NON TROVATA! Gli ID non corrispondono.")

if __name__ == "__main__":
    debug_data()
