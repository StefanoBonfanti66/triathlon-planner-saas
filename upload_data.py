import os
import json
import requests
from supabase import create_client, Client

def send_telegram_notification(message):
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        print("⚠️ Avviso: Telegram non configurato (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID mancanti).")
        return
    
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "Markdown"
    }
    try:
        requests.post(url, json=payload, timeout=10)
    except Exception as e:
        print(f"❌ Errore invio Telegram: {e}")

def main():
    """
    Legge i dati delle gare dal file JSON e li carica su Supabase.
    """
    json_file_path = 'app/src/races_full.json'

    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            new_races_data = json.load(f)
    except Exception as e:
        print(f"Errore caricamento JSON: {e}")
        return

    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("Errore: Supabase non configurata.")
        return

    supabase: Client = create_client(url, key)

    # 1. Recupera gare esistenti per il confronto
    print("Confronto gare con il database...")
    try:
        existing_res = supabase.from_("races").select("id, title, date, location").execute()
        existing_races = existing_res.data if hasattr(existing_res, 'data') else []
    except Exception as e:
        print(f"Errore recupero gare esistenti: {e}")
        existing_races = []

    existing_ids = {r['id'] for r in existing_races}
    new_ids = {r['id'] for r in new_races_data}

    # Trova nuove gare
    added = [r for r in new_races_data if r['id'] not in existing_ids]
    # Trova gare rimosse
    removed = [r for r in existing_races if r['id'] not in new_ids]

    # 2. Notifiche Telegram per i cambiamenti FITRI
    if added:
        for r in added[:5]: # Massimo 5 notifiche per non spammare in caso di update massivo
            msg = f"🆕 *Nuova Gara FITRI Rilevata!*\n\n🏆 {r['title']}\n📅 {r['date']}\n📍 {r['location']}\n\n_Aggiunta al calendario 2026_ 🏊‍♂️🚴‍♂️🏃‍♂️"
            send_telegram_notification(msg)
        if len(added) > 5:
            send_telegram_notification(f"🚀 ...e altre {len(added)-5} nuove gare aggiunte!")

    if removed:
        for r in removed[:3]:
            msg = f"⚠️ *Gara FITRI Rimossa!*\n\n❌ {r['title']}\n📅 {r['date']}\n📍 {r['location']}\n\n_Il calendario FITRI è stato aggiornato._"
            send_telegram_notification(msg)

    # 3. Procedi con l'aggiornamento
    print("Pulizia e inserimento nuovi dati...")
    try:
        supabase.from_("races").delete().neq("id", "none").execute()
        supabase.from_("races").insert(new_races_data).execute()
        print(f"✅ Sync completato. {len(new_races_data)} gare totali.")
    except Exception as e:
        print(f"Errore durante l'aggiornamento: {e}")

if __name__ == "__main__":
    main()

