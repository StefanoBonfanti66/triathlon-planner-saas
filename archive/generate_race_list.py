import json

def generate_race_list_file():
    try:
        with open('app/src/races_full.json', 'r', encoding='utf-8') as f:
            races = json.load(f)
    except FileNotFoundError:
        print("Errore: Il file 'app/src/races_full.json' non trovato.")
        return
    except json.JSONDecodeError:
        print("Errore: Il file 'app/src/races_full.json' non è un JSON valido.")
        return

    with open('race_list_for_verification.txt', 'w', encoding='utf-8') as outfile:
        for race in races:
            outfile.write(f'{race["date"]} - {race["title"]}\n')
    print("File 'race_list_for_verification.txt' generato con successo.")

if __name__ == "__main__":
    generate_race_list_file()
