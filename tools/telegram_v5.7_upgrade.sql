-- MTT Season Planner 2026 - Telegram Upgrade v5.7
-- Author: Stefano Bonfanti
-- Replace tokens before execution in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.send_telegram_msg(message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://api.telegram.org/bot' || 'IL_TUO_API_TOKEN' || '/sendMessage',
    body := jsonb_build_object(
      'chat_id', 'IL_TUO_CHAT_ID',
      'text', message,
      'parse_mode', 'Markdown'
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
END;
$$;

-- Trigger: Nuovo Atleta
CREATE OR REPLACE FUNCTION public.notify_new_athlete()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.send_telegram_msg(
    format('🚀 *Nuovo Atleta a Bordo!*%s👤 %s%s🏆 Team: %s', 
    char(10), NEW.full_name, char(10), COALESCE(NEW.team_id, 'Nessuno'))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_new_athlete ON public.profiles;
CREATE TRIGGER tr_new_athlete AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_new_athlete();

-- Trigger: Nuova Gara Pianificata
CREATE OR REPLACE FUNCTION public.notify_new_race_plan()
RETURNS TRIGGER AS $$
DECLARE
  athlete_name text;
  race_name text;
BEGIN
  SELECT full_name INTO athlete_name FROM public.profiles WHERE id = NEW.user_id;
  SELECT title INTO race_name FROM public.races WHERE id = NEW.race_id;
  
  PERFORM public.send_telegram_msg(
    format('🏁 *Nuova Gara Pianificata!*%s👤 %s%s📅 Gara: %s', 
    char(10), athlete_name, char(10), race_name)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_new_race_plan ON public.user_plans;
CREATE TRIGGER tr_new_race_plan AFTER INSERT ON public.user_plans
FOR EACH ROW EXECUTE FUNCTION public.notify_new_race_plan();
