-- MTT Season Planner 2026 - Telegram Multi-Team v6.2
-- Author: Stefano Bonfanti
-- This version sends notifications to specific team groups if telegram_chat_id is set in the teams table.

-- 1. Updated message function with target_chat_id
CREATE OR REPLACE FUNCTION public.send_telegram_msg(message text, target_chat_id text DEFAULT 'IL_TUO_CHAT_ID_GLOBALE')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se non abbiamo un chat_id valido, non facciamo nulla
  IF target_chat_id IS NULL OR target_chat_id = '' THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://api.telegram.org/bot' || 'IL_TUO_API_TOKEN' || '/sendMessage',
    body := jsonb_build_object(
      'chat_id', target_chat_id,
      'text', message,
      'parse_mode', 'Markdown'
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
END;
$$;

-- 2. Updated Trigger: Nuova Iscrizione (Multi-team)
CREATE OR REPLACE FUNCTION public.notify_new_race_plan()
RETURNS TRIGGER AS $$
DECLARE
  athlete_name text;
  team_name text;
  team_telegram_id text;
  race_name text;
  race_status text;
  msg text;
BEGIN
  SELECT p.full_name, t.name, t.telegram_chat_id INTO athlete_name, team_name, team_telegram_id
  FROM public.profiles p 
  LEFT JOIN public.teams t ON p.team_id = t.id 
  WHERE p.id = NEW.user_id;
  
  -- Recupera titolo e stato della gara
  SELECT title, status INTO race_name, race_status 
  FROM public.races 
  WHERE id = NEW.race_id;
  
  msg := format('🏊‍♂️🚴‍♂️🏃‍♂️ *Nuova Iscrizione!*%s👤 %s (%s) si è appena iscritto a:%s🏆 %s', 
         chr(10), athlete_name, COALESCE(team_name, 'No Team'), chr(10), COALESCE(race_name, 'Gara sconosciuta'));

  -- Se la gara è "hidden", aggiungi un'allerta specifica
  IF race_status = 'hidden' THEN
    msg := msg || chr(10) || chr(10) || '⚠️ *ATTENZIONE*: Questa gara non è più presente nel calendario ufficiale FITRI (potrebbe essere stata annullata o spostata).';
  END IF;

  msg := msg || chr(10) || chr(10) || 'Chi si aggiunge al gruppo? 🔥';

  -- Invia alla squadra (se configurato)
  IF team_telegram_id IS NOT NULL AND team_telegram_id <> '' THEN
    PERFORM public.send_telegram_msg(msg, team_telegram_id);
  END IF;

  -- Invia sempre al Super Admin (Stefano) come backup globale
  -- Nota: Sostituire con l'ID reale in fase di deploy
  PERFORM public.send_telegram_msg(msg, '8167454134');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Updated Trigger: Cambio Programma (Multi-team)
CREATE OR REPLACE FUNCTION public.notify_remove_race_plan()
RETURNS TRIGGER AS $$
DECLARE
  athlete_name text;
  team_name text;
  team_telegram_id text;
  race_name text;
  msg text;
BEGIN
  SELECT p.full_name, t.name, t.telegram_chat_id INTO athlete_name, team_name, team_telegram_id
  FROM public.profiles p 
  LEFT JOIN public.teams t ON p.team_id = t.id 
  WHERE p.id = OLD.user_id;
  
  SELECT title INTO race_name FROM public.races WHERE id = OLD.race_id;
  
  msg := format('😔 *Cambio Programma!*%s👤 %s (%s) ha rimosso dal suo calendario:%s❌ %s%sChi prenderà il suo posto? 💪', 
         char(10), athlete_name, COALESCE(team_name, 'No Team'), char(10), race_name, char(10));

  -- Invia alla squadra (se configurato)
  IF team_telegram_id IS NOT NULL AND team_telegram_id <> '' THEN
    PERFORM public.send_telegram_msg(msg, team_telegram_id);
  END IF;

  -- Invia sempre al Super Admin (Stefano) come backup globale
  PERFORM public.send_telegram_msg(msg, 'IL_TUO_CHAT_ID_GLOBALE');

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
