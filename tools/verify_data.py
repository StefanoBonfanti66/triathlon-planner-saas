import json
from collections import Counter

def verify():
    try:
        with open('app/src/races_full.json', 'r', encoding='utf-8') as f:
            races = json.load(f)
    except:
        print("Errore: Database non trovato.")
        return

    print(f"ANALISI DATABASE: {len(races)} gare totali")

    anomalies = []
    months = Counter()
    events_count = Counter()

    for r in races:
        # Conteggio mesi
        m = r['date'].split('-')[1] if '-' in r['date'] else "00"
        months[m] += 1
        
        # Conteggio gare per evento
        events_count[r['event']] += 1

        # Check anomalie
        if r['date'] == "01-01-2026":
            anomalies.append(f"DATA SOSPETTA (01-01): {r['event']} - {r['title']}")
        if "n.d." in r['location'] or not r['location']:
            anomalies.append(f"LOCALITA MANCANTE: {r['event']} - {r['title']}")
        if len(r['title']) < 3:
            anomalies.append(f"TITOLO CORTO/INVALIDO: {r['event']} - {r['id']}")

    print("\nGARE PER MESE:")
    for m in sorted(months.keys()):
        print(f"   Mese {m}: {months[m]} gare")

    print("\nANOMALIE RILEVATE:")
    if not anomalies:
        print("   Nessuna anomalia strutturale trovata.")
    else:
        for a in anomalies[:15]:
            print(f"   {a}")
        if len(anomalies) > 15:
            print(f"   ...e altre {len(anomalies)-15} anomalie.")

    print("\nEVENTI MULTI-GARA (Top 5):")
    for ev, count in events_count.most_common(5):
        print(f"   {count} gare: {ev}")

if __name__ == "__main__":
    verify()
