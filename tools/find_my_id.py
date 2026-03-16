import os
import requests
from supabase import create_client, Client

def get_chat_id():
    url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    # Inizializziamo il client specificando lo schema 'internal' dall'inizio
    # O meglio, passiamo lo schema direttamente nel client options o usiamo .postgrest.schema()
    supabase = create_client(url, service_key)
    
    # Leggi il token dalla nostra "cassaforte" sicura (SINTASSI CORRETTA)
    try:
        res = supabase.postgrest.schema("internal").from_("app_config").select("value").eq("key", "telegram_bot_token").single().execute()
        token = res.data['value']
        
        print(f"Interrogando Telegram per il bot token: {token[:10]}...")
        
        response = requests.get(f"https://api.telegram.org/bot{token}/getUpdates").json()
        
        if response.get("result"):
            last_update = response["result"][-1]
            chat_id = last_update["message"]["chat"]["id"]
            user_name = last_update["message"]["from"].get("first_name", "Utente")
            print(f"\n✅ TROVATO!")
            print(f"👤 Utente: {user_name}")
            print(f"🆔 Chat ID: {chat_id}")
            print(f"\nUsa questo ID per aggiornare internal.app_config.")
        else:
            print("\n❌ Nessun messaggio trovato. Per favore, scrivi al bot e riprova!")
    except Exception as e:
        print(f"❌ Errore durante il recupero: {e}")

if __name__ == "__main__":
    get_chat_id()
