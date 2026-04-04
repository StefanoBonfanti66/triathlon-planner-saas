import json
import re

def test_extraction():
    try:
        with open('app/src/races_full.json', 'r', encoding='utf-8') as f:
            races = json.load(f)
    except Exception as e:
        print(f"Errore: {e}")
        return

    success = 0
    total = len(races)
    
    print("\nAnalisi di " + str(total) + " gare per estrazione ID MyFITri...")
    
    for r in races:
        link = str(r.get('link', ''))
        # Cerca numeri alla fine del link (es: /3897)
        match = re.search(r'/(\d+)$', link)
        if match:
            success += 1
        else:
            print("⚠️ ID NON TROVATO per: " + str(r.get('title')) + " (Link: " + link + ")")

    print("\nRISULTATO: " + str(success) + "/" + str(total) + " ID estratti correttamente.")
    if success == total:
        print("✅ Ottimo! Possiamo procedere alla migrazione totale.")
    else:
        print("❌ Alcune gare non hanno un ID valido nel link. Dobbiamo investigare.")

if __name__ == "__main__":
    test_extraction()
