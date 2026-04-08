import os
import json
from supabase import create_client, Client

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def deep_check():
    json_file_path = 'app/src/races_full.json'
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            local_races = {str(r['id']): r for r in json.load(f)}
    except Exception as e:
        print(f"Errore lettura locale: {e}")
        return

    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("Errore: Variabili d'ambiente mancanti.")
        return

    supabase: Client = create_client(url, key)

    print("Recupero dati completi da Supabase...")
    try:
        response = supabase.from_("races").select("id, title, date, location").execute()
        db_races = {str(r['id']): r for r in response.data}
    except Exception as e:
        print(f"Errore query DB: {e}")
        return

    print(f"\nANALISI PROFONDA SU {len(local_races)} GARE...")
    
    mismatches = []
    
    for rid, local in local_races.items():
        if rid not in db_races:
            continue
            
        db = db_races[rid]
        diffs = []
        
        # Pulizia stringhe per evitare falsi positivi da spazi bianchi
        l_title = str(local.get('title', '')).strip()
        d_title = str(db.get('title', '')).strip()
        l_date = str(local.get('date', '')).strip()
        d_date = str(db.get('date', '')).strip()
        l_loc = str(local.get('location', '')).strip()
        d_loc = str(db.get('location', '')).strip()

        if l_title != d_title:
            diffs.append(f"TITOLO: '{l_title}' vs '{d_title}'")
        
        if l_date != d_date:
            diffs.append(f"DATA: '{l_date}' vs '{d_date}'")

        if l_loc != d_loc:
            diffs.append(f"LOCALITA: '{l_loc}' vs '{d_loc}'")
            
        if diffs:
            mismatches.append((rid, l_title, diffs))

    if not mismatches:
        print("\n✅ VERIFICA INTEGRITÀ SUPERATA: Tutti i campi (Titolo, Data, Località) corrispondono al 100%.")
    else:
        print(f"\n❌ RILEVATE {len(mismatches)} DISCREPANZE NEI CONTENUTI:")
        for rid, title, diff_list in mismatches[:10]:
            print(f"\nID {rid} ({title}):")
            for d in diff_list:
                print(f"   - {d}")
        if len(mismatches) > 10:
            print(f"\n...e altre {len(mismatches)-10} discrepanze.")

if __name__ == "__main__":
    deep_check()
