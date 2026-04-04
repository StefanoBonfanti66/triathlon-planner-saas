import os
import json
from supabase import create_client, Client

def test_rpc():
    # Caricamento manuale chiavi da app/.env se necessario
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

    if not url:
        print("❌ Errore: SUPABASE_URL non trovata.")
        return

    supabase = create_client(url, key)

    print("--- TEST RPC get_team_calendar ---")
    
    try:
        # Chiamata con parametro 'mtt'
        res = supabase.rpc('get_team_calendar', {'p_team_id': 'mtt'}).execute()
        
        if res.data:
            print("✅ SUCCESSO! Il database restituisce dati per il team.")
            print("Mesi trovati: " + str(len(res.data)))
            # Mostra la prima gara per conferma
            if len(res.data) > 0 and len(res.data[0]['races']) > 0:
                print("Esempio gara: " + res.data[0]['races'][0]['race_title'])
        else:
            print("❌ Il database restituisce una lista VUOTA per il team.")
            print("Questo significa che la funzione SQL non trova corrispondenze.")
            
    except Exception as e:
        print("❌ Errore durante la chiamata RPC: " + str(e))

if __name__ == "__main__":
    test_rpc()
