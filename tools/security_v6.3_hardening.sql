-- MTT Season Planner 2026 - Security Hardening v6.3
-- Author: Stefano Bonfanti
-- Focus: Row Level Security (RLS) Multi-Tenant & Secrets Protection

--------------------------------------------------------------------------------
-- 1. SECURE CONFIGURATION STORAGE
--------------------------------------------------------------------------------

-- Create a schema for sensitive internal configurations (not exposed to PostgREST)
CREATE SCHEMA IF NOT EXISTS internal;

CREATE TABLE IF NOT EXISTS internal.app_config (
    key text PRIMARY KEY,
    value text NOT NULL,
    description text,
    updated_at timestamptz DEFAULT now()
);

-- Revoke all access from public (prevent API access even if RLS is bypassed)
REVOKE ALL ON SCHEMA internal FROM public;
REVOKE ALL ON internal.app_config FROM public;

--------------------------------------------------------------------------------
-- 2. ENABLE RLS & SCHEMA UPDATES
--------------------------------------------------------------------------------

-- Add GDPR compliance columns if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS privacy_consent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS joined_at timestamptz DEFAULT now();

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- 3. TEAMS POLICIES & SECURE JOIN CODE
--------------------------------------------------------------------------------

-- Secure function to check join_code during registration without exposing table
CREATE OR REPLACE FUNCTION public.check_team_code(provided_code text)
RETURNS TABLE (team_id text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT id FROM public.teams 
    WHERE join_code = UPPER(TRIM(provided_code))
    LIMIT 1;
END;
$$;

DROP POLICY IF EXISTS "Teams: view own team" ON public.teams;
CREATE POLICY "Teams: view own team" ON public.teams
FOR SELECT USING (
    id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
);

--------------------------------------------------------------------------------
-- 4. PROFILES POLICIES
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Profiles: view team members" ON public.profiles;
CREATE POLICY "Profiles: view team members" ON public.profiles
FOR SELECT USING (
    auth.uid() = id OR 
    team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Profiles: update self or team members" ON public.profiles;
CREATE POLICY "Profiles: update self or team members" ON public.profiles
FOR UPDATE USING (
    auth.uid() = id OR 
    (SELECT is_team_admin FROM public.profiles WHERE id = auth.uid()) 
    AND team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Profiles: Admins can create new team members" ON public.profiles;
CREATE POLICY "Profiles: Admins can create new team members" ON public.profiles
FOR INSERT
WITH CHECK (
    -- Team admins can insert into their own team
    (
        (SELECT is_team_admin FROM public.profiles WHERE id = auth.uid()) AND
        team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
    )
    OR
    -- Super Admin (bonfantistefano4@gmail.com) can insert anywhere
    (
        auth.email() = 'bonfantistefano4@gmail.com'
    )
);

--------------------------------------------------------------------------------
-- 5. USER PLANS POLICIES
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "User Plans: view team plans" ON public.user_plans;
CREATE POLICY "User Plans: view team plans" ON public.user_plans
FOR SELECT USING (
    user_id = auth.uid() OR 
    team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "User Plans: manage own plans" ON public.user_plans;
CREATE POLICY "User Plans: manage own plans" ON public.user_plans
FOR ALL USING (user_id = auth.uid());

--------------------------------------------------------------------------------
-- 6. RACES POLICIES (Public Read)
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Races: public read" ON public.races;
CREATE POLICY "Races: public read" ON public.races
FOR SELECT USING (true);

--------------------------------------------------------------------------------
-- 7. AUDIT LOGS POLICIES
--------------------------------------------------------------------------------

-- Insert: Users can only log their own actions (admin_id is the user identifier here)
DROP POLICY IF EXISTS "Audit Logs: insert own" ON public.audit_logs;
CREATE POLICY "Audit Logs: insert own" ON public.audit_logs
FOR INSERT WITH CHECK (admin_id = auth.uid());

-- Read: Only Team Admins can see logs for their team
DROP POLICY IF EXISTS "Audit Logs: team admin view" ON public.audit_logs;
CREATE POLICY "Audit Logs: team admin view" ON public.audit_logs
FOR SELECT USING (
    (SELECT is_team_admin FROM public.profiles WHERE id = auth.uid())
    AND team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
);

--------------------------------------------------------------------------------
-- 8. SECURE TELEGRAM FUNCTION (SECURITY DEFINER)
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.send_telegram_msg(message text, target_chat_id text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as DB owner to access 'internal' schema
AS $$
DECLARE
  bot_token text;
  global_chat_id text;
  final_chat_id text;
BEGIN
  -- Get secrets from internal storage
  SELECT value INTO bot_token FROM internal.app_config WHERE key = 'telegram_bot_token';
  SELECT value INTO global_chat_id FROM internal.app_config WHERE key = 'telegram_admin_chat_id';

  -- Prioritize target_chat_id, fallback to global
  final_chat_id := COALESCE(target_chat_id, global_chat_id);

  IF bot_token IS NULL OR final_chat_id IS NULL THEN
    RAISE WARNING 'Telegram config missing in internal.app_config';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
    body := jsonb_build_object(
      'chat_id', final_chat_id,
      'text', message,
      'parse_mode', 'Markdown'
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
END;
$$;

-- IMPORTANT: Restrict who can call this function manually via API
REVOKE ALL ON FUNCTION public.send_telegram_msg FROM public;
GRANT EXECUTE ON FUNCTION public.send_telegram_msg TO service_role;
