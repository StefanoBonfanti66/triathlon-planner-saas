import json
import re

USER_TEXT = """
C.I. GIOVANI INDIVIDUALE E MIXED RELAY 2+2
18-04-2026Magione (Perugia) | Umbria
18-apr	
Duathlon Super Sprint		Giovanile
18-apr	
Duathlon Super Sprint		Giovanile
18-apr	
Duathlon Youth		Giovanile
18-apr	
Duathlon Kids		Giovanile
19-apr	
Duathlon Staffette		Giovanile
18-apr	
Duathlon Kids		Giovanile
19-apr	
Duathlon Sprint		Giovanile
19-apr	
Duathlon Sprint		Silver
"""

def cross_verify():
    try:
        with open('app/src/races_full.json', 'r', encoding='utf-8') as f:
            races = json.load(f)
    except:
        print("Errore: Database non trovato.")
        return

    db_magione = [r['title'].upper() for r in races if "MAGIONE" in r['event'].upper()]
    
    print("VERIFICA INCROCIATA MAGIONE")
    print(f"Nel DB ci sono {len(db_magione)} gare per Magione.")
    
    # Pulizia righe utente
    missing = []
    lines = [l.strip() for l in USER_TEXT.split('\n') if 'apr' in l.lower() and len(l) > 10]
    
    for l in lines:
        found = False
        # Rimuove la data abbreviata per il confronto
        l_clean = re.sub(r'\d{1,2}-(?:apr)', '', l, flags=re.IGNORECASE).strip().upper()
        for db_t in db_magione:
            if l_clean in db_t:
                found = True
                break
        if not found:
            missing.append(l)

    if not missing:
        print("Tutte le gare di Magione trovate.")
    else:
        print(f"MANCANO {len(missing)} GARE:")
        for m in missing:
            print(f"   - {m}")

if __name__ == "__main__":
    cross_verify()
