
import os
from supabase import create_client, Client

def upload_to_supabase(races_data: list):
    """Connette a Supabase e aggiorna la tabella delle gare."""
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("Errore: le variabili d'ambiente di Supabase non sono configurate. L'upload è stato saltato.")
        return

    print("Connessione a Supabase in corso...")
    supabase: Client = create_client(url, key)

    # 1. Svuota la tabella per garantire dati freschi
    print("Pulizia della tabella 'races'...")
    delete_response = supabase.from_("races").delete().gt("id", "0").execute() # gt('id', '0') è un trucco per cancellare tutto
    if delete_response.error:
        print(f"Errore durante la pulizia della tabella: {delete_response.error}")
        return

    # 2. Inserisce i nuovi dati
    print(f"Inserimento di {len(races_data)} nuove gare...")
    insert_response = supabase.from_("races").insert(races_data).execute()

    if insert_response.error:
        print(f"Errore durante l'inserimento dei dati: {insert_response.error}")
    else:
        print("Upload su Supabase completato con successo!")

# ... (il codice esistente di mtt_final_v16.py) ...

# ALLA FINE DELLO SCRIPT, DOPO AVER GENERATO IL FILE JSON 'races_full.json'
# Aggiungi questa chiamata:
#
# if __name__ == "__main__":
#     # ... (tua logica esistente)
#     final_races_list = ... # questa deve essere la lista di dizionari delle gare
#     upload_to_supabase(final_races_list)
