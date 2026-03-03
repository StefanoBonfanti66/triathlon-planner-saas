import os
import json
import re
from supabase import create_client, Client

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def migrate_v3():
    json_file_path = 'app/src/races_full.json'
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            races_data = json.load(f)
    except Exception as e:
        print("Errore lettura locale: " + str(e))
        return

    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("Errore: Variabili d'ambiente mancanti.")
        return

    supabase = create_client(url, key)

    print("--- INIZIO MIGRAZIONE ID MYFITRI (V3 - GESTIONE DUPLICATI) ---")
    
    print("Recupero mappa ID dal database...")
    db_res = supabase.from_("races").select("id, link").execute()
    
    id_map = {}
    for db_race in db_res.data:
        old_id = str(db_race['id'])
        link = str(db_race.get('link', ''))
        match = re.search(r'/(\d+)$', link)
        if match:
            id_map[old_id] = match.group(1)

    print("Aggiornamento iscrizioni atleti...")
    updated_count = 0
    deleted_duplicates = 0
    
    # Recuperiamo tutti i piani per gestirli uno per uno
    plans_res = supabase.from_("user_plans").select("*").execute()
    
    for plan in plans_res.data:
        old_race_id = str(plan['race_id'])
        new_race_id = id_map.get(old_race_id)
        
        if not new_race_id or old_race_id == new_race_id:
            continue
            
        try:
            # Prova ad aggiornare
            supabase.from_("user_plans").update({"race_id": new_race_id}).eq("id", plan['id']).execute()
            updated_count += 1
        except Exception as e:
            if "23505" in str(e): # Codice errore duplicato
                # Se è un duplicato, eliminiamo semplicemente il vecchio piano
                supabase.from_("user_plans").delete().eq("id", plan['id']).execute()
                deleted_duplicates += 1
            else:
                print("Errore imprevisto su piano " + str(plan['id']) + ": " + str(e))

    print("OK: Traslocate " + str(updated_count) + " iscrizioni.")
    print("OK: Rimossi " + str(deleted_duplicates) + " duplicati trovati.")

    print("Pulizia e ricaricamento tabella races...")
    supabase.from_("races").delete().neq("id", "impossible_id").execute()
    
    batch_size = 50
    for i in range(0, len(races_data), batch_size):
        batch = races_data[i:i + batch_size]
        supabase.from_("races").insert(batch).execute()
        print("Caricati " + str(i + len(batch)) + "/" + str(len(races_data)) + " record...")

    print("MIGRAZIONE COMPLETATA CON SUCCESSO!")

if __name__ == "__main__":
    migrate_v3()
