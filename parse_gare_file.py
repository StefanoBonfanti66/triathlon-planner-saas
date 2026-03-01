import json
import re
import os

def parse_gare_file(file_path):
    new_races = []
    if not os.path.exists(file_path): return []
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    for line in lines:
        parts = line.strip().split(' | ') 
        if len(parts) < 4: continue # Almeno Titolo, Data, Luogo, Regione
            
        try:
            event_title = parts[0].strip()
            date = parts[1].strip()
            
            # Formato standard 6 colonne: Evento | Data | Località | Regione | Specialità | Link
            if len(parts) >= 6:
                city = parts[2].strip()
                region = parts[3].strip()
                sub_event_part_raw = parts[4].strip()
                link = parts[5].strip()
            else:
                # Fallback per righe con meno colonne
                city = parts[2].strip() if len(parts) > 2 else "Località n.d."
                region = parts[3].strip() if len(parts) > 3 else "Italia"
                sub_event_part_raw = parts[-1].strip()
                link = ""

            # PULIZIA CHIRURGICA CITTA'
            # Rimuove date (DD-MM-YYYY) e prefissi
            city = re.sub(r'\d{2}-\d{2}-2026', '', city)
            city = city.replace('dal', '').replace('al', '').strip()
            
            # AUTO-CORREZIONE ERRORI SCRAPING
            if city == "Sò (Brescia)": city = "Salò (Brescia)"
            if "Cabria" in city: city = "Reggio Calabria (Reggio Calabria)"
            if "Pazzolo" in city and "Brescia" in city: city = "Palazzolo sull'Oglio (Brescia)"
            
            if not city or len(city) < 2: city = "Località n.d."

            # Logica sport
            search_text_upper = (sub_event_part_raw + " " + event_title).upper()
            if "DUATHLON" in search_text_upper: race_type = "Duathlon"
            elif "WINTER" in search_text_upper: race_type = "Winter"
            elif "AQUATHLON" in search_text_upper: race_type = "Aquathlon"
            elif "CROSS" in search_text_upper: race_type = "Cross"
            else: race_type = "Triathlon"

            category = ""
            if "paratriathlon" in search_text_upper.lower(): category = "Paratriathlon"
            elif "kids" in search_text_upper.lower(): category = "Kids"
            elif "youth" in search_text_upper.lower(): category = "Youth"
            elif "giovanile" in search_text_upper.lower(): category = "Giovanile"

            distance = next((d for d in ["Super Sprint", "Sprint", "Classico", "Olimpico", "Medio", "Lungo", "Staffetta", "Cross"] if d.lower() in sub_event_part_raw.lower()), "")

            # Estrazione Rank
            rank = ""
            match_rank = re.search(r'\b(Gold|Silver|Bronze)\b', sub_event_part_raw, re.IGNORECASE)
            if match_rank:
                rank = match_rank.group(1).capitalize()
                sub_event_part_raw = re.sub(r'\b(Gold|Silver|Bronze)\b', '', sub_event_part_raw, flags=re.IGNORECASE).strip()
            
            # Pulizia Titolo (rimozione pipe e spazi extra)
            sub_event_part_raw = sub_event_part_raw.replace('|', '').strip()
            sub_event_part_raw = re.sub(r'\s+', ' ', sub_event_part_raw)

            new_races.append({
                "date": date, "title": sub_event_part_raw, "event": event_title,
                "location": city, "region": region, "type": race_type,
                "distance": distance, "rank": rank, "category": category, "link": link
            })
        except: continue
    return new_races

def save_clean(final_list, output_json):
    # Ordinamento per data
    final_list = sorted(final_list, key=lambda x: x['date'].split('-')[::-1])
    # Assegnazione nuovi ID univoci
    for i, r in enumerate(final_list): r['id'] = str(i + 1)

    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(final_list, f, ensure_ascii=False, indent=2)
    return len(final_list)

if __name__ == "__main__":
    import sys
    input_file = sys.argv[1] if len(sys.argv) > 1 else 'gare_2026.txt'
    # TABULA RASA: Non carichiamo più i vecchi dati, leggiamo solo il file nuovo
    races = parse_gare_file(input_file)
    total = save_clean(races, 'app/src/races_full.json')
    print(f"✅ Database RIGENERATO DA ZERO ({input_file}): {total} gare.")
