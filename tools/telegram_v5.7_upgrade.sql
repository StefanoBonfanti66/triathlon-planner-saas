-- MTT Season Planner 2026 - Telegram Upgrade v5.7 (RESTORING ORIGINAL TEXTS)
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
DECLARE
  team_name text;
BEGIN
  SELECT name INTO team_name FROM public.teams WHERE id = NEW.team_id;
  PERFORM public.send_telegram_msg(
    format('🚀 *Nuovo Atleta registrato!*%s👤 Nome: %s%s🏆 Squadra: %s%s📅 Data: %s', 
    char(10), NEW.full_name, char(10), COALESCE(team_name, 'Nessuna'), char(10), TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI'))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Nuova Iscrizione (🏊‍♂️🚴‍♂️🏃‍♂️)
CREATE OR REPLACE FUNCTION public.notify_new_race_plan()
RETURNS TRIGGER AS $$
DECLARE
  athlete_name text;
  team_name text;
  race_name text;
BEGIN
  SELECT p.full_name, t.name INTO athlete_name, team_name 
  FROM public.profiles p LEFT JOIN public.teams t ON p.team_id = t.id 
  WHERE p.id = NEW.user_id;
  
  SELECT title INTO race_name FROM public.races WHERE id = NEW.race_id;
  
  PERFORM public.send_telegram_msg(
    format('🏊‍♂️🚴‍♂️🏃‍♂️ *Nuova Iscrizione!*%s👤 %s (%s) si è appena iscritto a:%s🏆 %s', 
    char(10), athlete_name, COALESCE(team_name, 'No Team'), char(10), race_name)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Cambio Programma (😔)
CREATE OR REPLACE FUNCTION public.notify_remove_race_plan()
RETURNS TRIGGER AS $$
DECLARE
  athlete_name text;
  team_name text;
  race_name text;
BEGIN
  SELECT p.full_name, t.name INTO athlete_name, team_name 
  FROM public.profiles p LEFT JOIN public.teams t ON p.team_id = t.id 
  WHERE p.id = OLD.user_id;
  
  SELECT title INTO race_name FROM public.races WHERE id = OLD.race_id;
  
  -- Notifichiamo solo se è una cancellazione effettiva (non un update tecnico)
  IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)) THEN
    PERFORM public.send_telegram_msg(
      format('😔 *Cambio Programma!*%s👤 %s (%s) ha rimosso dal suo calendario:%s❌ %s%sChi prenderà il suo posto? 💪', 
      char(10), athlete_name, COALESCE(team_name, 'No Team'), char(10), race_name, char(10))
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Re-aggancio Trigger
DROP TRIGGER IF EXISTS tr_new_athlete ON public.profiles;
CREATE TRIGGER tr_new_athlete AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.notify_new_athlete();

DROP TRIGGER IF EXISTS tr_new_race_plan ON public.user_plans;
CREATE TRIGGER tr_new_race_plan AFTER INSERT ON public.user_plans FOR EACH ROW WHEN (NEW.deleted_at IS NULL) EXECUTE FUNCTION public.notify_new_race_plan();

DROP TRIGGER IF EXISTS tr_remove_race_plan ON public.user_plans;
CREATE TRIGGER tr_remove_race_plan AFTER UPDATE ON public.user_plans FOR EACH ROW WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) EXECUTE FUNCTION public.notify_remove_race_plan();
