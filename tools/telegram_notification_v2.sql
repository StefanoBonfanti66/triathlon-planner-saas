-- SQL Script for Telegram Notifications (Version with FORMAT)

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_telegram_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := format('https://api.telegram.org/bot%s/sendMessage', 'IL_TUO_API_TOKEN'),
    body := jsonb_build_object(
      'chat_id', 'IL_TUO_CHAT_ID',
      'text', format('🚀 *Nuovo Atleta Registrato!*%s👤 Nome: %s%s📅 Data: %s', 
                     char(10), 
                     COALESCE(NEW.full_name, 'Sconosciuto'), 
                     char(10), 
                     TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI')),
      'parse_mode', 'Markdown'
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_telegram ON public.profiles;
CREATE TRIGGER on_profile_created_telegram
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram_new_user();
