-- MTT Season Planner 2026 - Telegram Birthday Notifications
-- Author: Stefano Bonfanti
-- Scans daily for athlete birthdays and notifies Teams and Super Admin.

CREATE OR REPLACE FUNCTION public.notify_birthdays()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  birthday_record RECORD;
  msg text;
  total_notified integer := 0;
  super_admin_chat_id text := '8167454134'; -- SaaS Planner Bot (Stefano)
  nl text := chr(10);
  age integer;
BEGIN
  FOR birthday_record IN 
    SELECT p.full_name, p.birth_date, t.name as team_name, t.telegram_chat_id, t.admin_telegram_chat_id
    FROM public.profiles p
    LEFT JOIN public.teams t ON p.team_id = t.id
    WHERE p.deleted_at IS NULL
      AND p.birth_date IS NOT NULL
      AND to_char(p.birth_date, 'MM-DD') = to_char(CURRENT_DATE, 'MM-DD')
  LOOP
    -- Calcolo età (opzionale, ma carino)
    age := EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM birthday_record.birth_date);
    
    msg := '🎂 *AUGURI DI BUON COMPLEANNO!*' || nl ||
           '🎈 Oggi festeggiamo: *' || birthday_record.full_name || '*' || nl ||
           '👥 Team: ' || COALESCE(birthday_record.team_name, 'No Team') || nl ||
           '✨ Compe oggi ben *' || age || '* anni! 🎉' || nl || nl ||
           'Tanti auguri da tutto il team! 🏊‍♂️🚴‍♂️🏃‍♂️';

    -- 1. Invia al gruppo Telegram del Team (se configurato)
    IF birthday_record.telegram_chat_id IS NOT NULL AND birthday_record.telegram_chat_id <> '' THEN
      PERFORM public.send_telegram_msg(msg, birthday_record.telegram_chat_id);
    END IF;

    -- 2. Invia anche al chat_id degli ADMIN del team (se configurato) per conoscenza
    IF birthday_record.admin_telegram_chat_id IS NOT NULL AND birthday_record.admin_telegram_chat_id <> '' AND birthday_record.admin_telegram_chat_id <> birthday_record.telegram_chat_id THEN
      PERFORM public.send_telegram_msg(msg, birthday_record.admin_telegram_chat_id);
    END IF;

    -- 3. Invia sempre al Super Admin (Stefano)
    PERFORM public.send_telegram_msg(msg, super_admin_chat_id);
    
    total_notified := total_notified + 1;
  END LOOP;

  RETURN 'Compleanni notificati: ' || total_notified;
END;
$$;

-- Per attivare l'automazione giornaliera su Supabase (pg_cron):
-- SELECT cron.schedule('notify-birthdays-daily', '0 9 * * *', 'SELECT public.notify_birthdays()');
