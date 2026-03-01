import os
import json
from supabase import create_client, Client

def main():
    """
    Legge i dati delle gare dal file JSON e li carica su Supabase.
    """
    # Percorso del file JSON generato dallo scraper
    json_file_path = 'app/src/races_full.json'

    # Carica i dati delle gare dal file JSON
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            races_data = json.load(f)
    except FileNotFoundError:
        print(f"Errore: Il file {json_file_path} non è stato trovato.")
        return
    except json.JSONDecodeError:
        print(f"Errore: Il file {json_file_path} non è un JSON valido.")
        return

    # Inizializza le variabili d'ambiente di Supabase
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("Errore: Le variabili d'ambiente di Supabase non sono configurate. L'upload è stato saltato.")
        return

    print("Connessione a Supabase in corso...")
    supabase: Client = create_client(url, key)

    # 1. Svuota la tabella 'races' per garantire dati sempre aggiornati
    print("Pulizia della tabella 'races'...")
    # Usiamo un filtro che corrisponde a tutte le righe per la cancellazione
    try:
        data, delete_error = supabase.from_("races").delete().neq("id", "una_stringa_impossibile").execute()
    except Exception as e:
        print(f"Errore imprevisto durante la cancellazione: {e}")
        return

    # La libreria può sollevare un'eccezione o ritornare un errore nell'oggetto
    if delete_error and delete_error[1]:
        # A volte l'errore è nella seconda parte della tupla
        error_info = delete_error[1]
        if hasattr(error_info, 'code') and error_info.code != 'PGRST204': # Ignora "No rows found"
            print(f"Errore durante la pulizia della tabella: {error_info}")
            return
    
    # 2. Inserisce i nuovi dati
    print(f"Inserimento di {len(races_data)} nuove gare...")
    try:
        insert_data, insert_error = supabase.from_("races").insert(races_data).execute()
    except Exception as e:
        print(f"Errore imprevisto durante l'inserimento: {e}")
        return

    if insert_error and insert_error[1]:
        print(f"Errore durante l'inserimento dei dati: {insert_error[1]}")
    else:
        print("Upload su Supabase completato con successo!")

if __name__ == "__main__":
    main()
