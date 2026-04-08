import os
from supabase import create_client, Client

def trigger_birthdays():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("Errore: Variabili d'ambiente SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti.")
        return

    supabase: Client = create_client(url, key)

    print("Innesco notifiche compleanni su Telegram...")
    try:
        # Chiamata alla funzione RPC creata su Supabase
        response = supabase.rpc('notify_birthdays', {}).execute()
        print(f"Risultato: {response.data}")
    except Exception as e:
        print(f"Errore durante l'esecuzione della RPC: {e}")

if __name__ == "__main__":
    trigger_birthdays()
