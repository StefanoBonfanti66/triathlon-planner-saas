import os
import json
from supabase import create_client, Client

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def generate_report():
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

    print("Analisi in corso (Locale vs Database)...")
    try:
        db_races_res = supabase.from_("races").select("id, title, date, location").execute()
        db_races = {str(r['id']): r for r in db_races_res.data}

        plans_res = supabase.from_("user_plans").select("race_id").execute()
        plans_count = {}
        for p in plans_res.data:
            rid = str(p['race_id'])
            plans_count[rid] = plans_count.get(rid, 0) + 1

    except Exception as e:
        print(f"Errore query DB: {e}")
        return

    print("\n" + "="*60)
    print("REPORT DI MIGRAZIONE")
    print("="*60)

    safe_updates = []
    dangerous_shifts = []

    for rid, local in local_races.items():
        if rid not in db_races:
            continue
            
        db = db_races[rid]
        l_title = str(local.get('title', '')).strip()
        d_title = str(db.get('title', '')).strip()
        
        ath_count = plans_count.get(rid, 0)

        if l_title == d_title:
            if local.get('date') != db.get('date') or local.get('location') != db.get('location'):
                safe_updates.append(rid)
        else:
            dangerous_shifts.append((rid, d_title, l_title, ath_count))

    print(f"\n✅ AGGIORNAMENTI SICURI (ID corretti): {len(safe_updates)}")
    if safe_updates:
        print(f"   Esempi ID: {safe_updates[:10]}")

    print(f"\n⚠️ ID SHIFTATI (DANGER: Lo stesso ID punta a gare diverse!): {len(dangerous_shifts)}")
    if dangerous_shifts:
        print("\n   ID     | Gara su DB (App esistente)      | Gara in Locale (Nuova)          | Atleti")
        print("   " + "-"*90)
        for rid, db_t, loc_t, count in dangerous_shifts[:20]:
            warn = " <<< BLOCCANTE!" if count > 0 else ""
            print(f"   {rid:<6} | {db_t[:30]:<30} | {loc_t[:30]:<30} | {count}{warn}")

    if not dangerous_shifts and not safe_updates:
        print("\n✨ Nessuna differenza rilevata.")

if __name__ == "__main__":
    generate_report()
