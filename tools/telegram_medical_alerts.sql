-- MTT Season Planner 2026 - Telegram Medical Alerts
-- Author: Stefano Bonfanti
-- Scans daily for expiring certificates and notifies Admins.

-- 1. Function to check and notify
CREATE OR REPLACE FUNCTION public.check_medical_certificates_expiry()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_record RECORD;
  msg text;
  total_alerts integer := 0;
  admin_chat_id text := '154091630'; -- Chat ID Globale Stefano
  nl text := chr(10);
BEGIN
  FOR expired_record IN 
    SELECT p.full_name, p.medical_certificate_expiry, t.name as team_name, t.telegram_chat_id
    FROM public.profiles p
    LEFT JOIN public.teams t ON p.team_id = t.id
    WHERE p.deleted_at IS NULL
      AND p.medical_certificate_expiry IS NOT NULL
      AND (
        p.medical_certificate_expiry = CURRENT_DATE + INTERVAL '30 days' OR
        p.medical_certificate_expiry = CURRENT_DATE + INTERVAL '7 days' OR
        p.medical_certificate_expiry = CURRENT_DATE
      )
  LOOP
    msg := '⚠️ *AVVISO SCADENZA CERTIFICATO*' || nl ||
           '👤 Atleta: *' || expired_record.full_name || '*' || nl ||
           '👥 Team: ' || COALESCE(expired_record.team_name, 'No Team') || nl ||
           '📅 Scadenza: *' || to_char(expired_record.medical_certificate_expiry, 'DD/MM/YYYY') || '*' || nl || nl ||
           'Ricordati di avvisare l''atleta! 🏃‍♂️';

    -- Invia al Team Admin se chat_id presente
    IF expired_record.telegram_chat_id IS NOT NULL AND expired_record.telegram_chat_id <> '' THEN
      PERFORM public.send_telegram_msg(msg, expired_record.telegram_chat_id);
    END IF;

    -- Invia sempre al Super Admin (Stefano)
    PERFORM public.send_telegram_msg(msg, admin_chat_id);
    
    total_alerts := total_alerts + 1;
  END LOOP;

  RETURN 'Avvisi inviati: ' || total_alerts;
END;
$$;

-- 2. Automation via pg_cron (runs daily at 08:00)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('check-medical-certificates-daily', '0 8 * * *', 'SELECT public.check_medical_certificates_expiry()');
