import json

def fix_ids():
    file_path = 'app/src/races_full.json'
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Errore lettura: {e}")
        return

    counts = {}
    for r in data:
        # Prendi l'ID base (rimuovendo eventuali suffissi già presenti)
        base_id = str(r['id']).split('-')[0]
        
        # Incrementa il contatore per questo ID base
        current_count = counts.get(base_id, 0) + 1
        counts[base_id] = current_count
        
        # Genera il nuovo ID univoco
        r['id'] = f"{base_id}-{current_count}"

    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"✅ Successo: {len(data)} gare aggiornate con ID univoci reali.")
    except Exception as e:
        print(f"Errore scrittura: {e}")

if __name__ == "__main__":
    fix_ids()
