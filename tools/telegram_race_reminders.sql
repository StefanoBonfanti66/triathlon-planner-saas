-- Race Planner SaaS - Telegram Race Reminders
-- Author: Stefano Bonfanti
-- Notifies teams about upcoming races their athletes are registered for, 10 days before.

CREATE OR REPLACE FUNCTION public.notify_upcoming_races()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  race_record RECORD;
  athlete_record RECORD;
  msg text;
  total_notified integer := 0;
  super_admin_chat_id text := '8167454134';
  nl text := chr(10);
  athlete_list text;
BEGIN
  FOR race_record IN
    SELECT r.id, r.title, r.date, r.location, r.type, r.distance, r.link,
           t.id AS team_id, t.name AS team_name, t.telegram_chat_id
    FROM public.races r
    JOIN public.user_plans up ON r.id = up.race_id
    JOIN public.profiles p ON up.user_id = p.id
    JOIN public.teams t ON COALESCE(up.team_id, p.team_id) = t.id
    WHERE to_date(r.date, 'DD-MM-YYYY') = CURRENT_DATE + 10
      AND (r.status IS NULL OR r.status = 'active')
      AND (r.is_removed IS DISTINCT FROM true)
      AND up.deleted_at IS NULL
      AND p.deleted_at IS NULL
    GROUP BY r.id, r.title, r.date, r.location, r.type, r.distance, r.link,
             t.id, t.name, t.telegram_chat_id
    ORDER BY t.name, r.title
  LOOP
    athlete_list := '';
    FOR athlete_record IN
      SELECT p.full_name
      FROM public.user_plans up
      JOIN public.profiles p ON up.user_id = p.id
      WHERE up.race_id = race_record.id
        AND COALESCE(up.team_id, p.team_id) = race_record.team_id
        AND up.deleted_at IS NULL
        AND p.deleted_at IS NULL
      ORDER BY p.full_name
    LOOP
      IF athlete_list <> '' THEN
        athlete_list := athlete_list || ', ';
      END IF;
      athlete_list := athlete_list || athlete_record.full_name;
    END LOOP;

    msg := '⏰ *PROMEMORIA GARA - Tra 10 Giorni!*' || nl ||
           '📅 ' || race_record.date || nl ||
           '🏆 ' || race_record.title || nl ||
           '📍 ' || COALESCE(race_record.location, 'N/D') || nl ||
           '🏊‍♂️ ' || COALESCE(race_record.type, 'N/D');

    IF race_record.distance IS NOT NULL AND race_record.distance <> '' THEN
      msg := msg || ' | ' || race_record.distance;
    END IF;

    msg := msg || nl || '👥 Iscritti del team: ' || athlete_list;

    IF race_record.link IS NOT NULL AND race_record.link <> '' THEN
      msg := msg || nl || '🔗 ' || race_record.link;
    END IF;

    IF race_record.telegram_chat_id IS NOT NULL AND race_record.telegram_chat_id <> '' THEN
      PERFORM public.send_telegram_msg(msg, race_record.telegram_chat_id);
    END IF;

    PERFORM public.send_telegram_msg(msg, super_admin_chat_id);

    total_notified := total_notified + 1;
  END LOOP;

  RETURN 'Gare notificate: ' || total_notified;
END;
$$;

-- Attivazione giornaliera su Supabase (pg_cron) - esegue alle 09:00 ogni giorno:
-- SELECT cron.schedule('notify-races-daily', '0 9 * * *', 'SELECT public.notify_upcoming_races()');
