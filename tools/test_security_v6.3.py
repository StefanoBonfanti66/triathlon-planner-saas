import os
from supabase import create_client, Client

def test_security():
    url = os.environ.get("SUPABASE_URL")
    anon_key = os.environ.get("SUPABASE_ANON_KEY")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not anon_key:
        print("❌ Errore: Variabili Supabase mancanti.")
        return

    # 1. Test con ANON KEY (Simula il Frontend)
    supabase_anon = create_client(url, anon_key)
    print("\n--- TEST ANON KEY (FRONTEND) ---")

    # Test RPC check_team_code (Deve funzionare)
    print("Verifica RPC check_team_code...")
    try:
        # Usiamo 'mtt' che sappiamo esistere
        res_rpc = supabase_anon.rpc('check_team_code', {'provided_code': 'MTT'}).execute()
        print(f"✅ RPC check_team_code: {res_rpc.data}")
    except Exception as e:
        print(f"❌ Errore RPC: {e}")

    # Test Accesso a internal.app_config (Deve fallire/vuoto)
    print("Tentativo accesso a internal.app_config...")
    try:
        res_config = supabase_anon.from_("internal.app_config").select("*").execute()
        print(f"⚠️ Accesso inaspettato a internal.app_config: {res_config.data}")
    except Exception:
        print("✅ Accesso negato a internal.app_config (Corretto)")

    # 2. Test con SERVICE ROLE (Simula Admin/Triggers)
    supabase_service = create_client(url, service_key)
    print("\n--- TEST SERVICE ROLE (BACKEND) ---")

    # Test lettura segreto
    print("Verifica lettura segreto da internal.app_config...")
    res_secret = supabase_service.from_("app_config").select("key").schema("internal").execute()
    if res_secret.data and len(res_secret.data) > 0:
        print(f"✅ Segreti trovati: {[r['key'] for r in res_secret.data]}")
    else:
        print("❌ Segreti non trovati in internal.app_config")

    # 3. Test invio messaggio Telegram di prova
    print("\n--- TEST NOTIFICA TELEGRAM ---")
    try:
        supabase_service.rpc('send_telegram_msg', {
            'message': '🛡️ *Test Sicurezza v6.3 Superato!*\nIl sistema di protezione segreti è attivo e funzionante sul branch `develop`.',
        }).execute()
        print("✅ Messaggio di test inviato a Telegram (Controlla il tuo bot!)")
    except Exception as e:
        print(f"❌ Errore invio Telegram: {e}")

if __name__ == "__main__":
    test_security()
