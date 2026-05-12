-- MTT Season Planner 2026 - Security Fix: team_id NOT NULL enforcement
-- Author: Stefano Bonfanti
-- Fixes:
--   1. Adds NOT NULL constraint on profiles.team_id
--   2. Rewrites handle_new_user trigger to reject registrations without a valid team_code
--   3. Adds RLS policy to block direct anonymous inserts on profiles

--------------------------------------------------------------------------------
-- 1. ENFORCE team_id AS REQUIRED
--------------------------------------------------------------------------------

ALTER TABLE public.profiles ALTER COLUMN team_id SET NOT NULL;

--------------------------------------------------------------------------------
-- 2. REWRITE TRIGGER: handle_new_user (runs on auth.users INSERT)
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_code text;
  v_team_id   text;
BEGIN
  v_team_code := NEW.raw_user_meta_data->>'team_code';

  -- Reject if team_code is missing
  IF v_team_code IS NULL OR TRIM(v_team_code) = '' THEN
    RAISE EXCEPTION 'ERR_REG_TEAM_CODE_MISSING: team_code is required in user_metadata';
  END IF;

  -- Resolve team_id from the join_code
  SELECT id INTO v_team_id
  FROM public.teams
  WHERE join_code = UPPER(TRIM(v_team_code));

  -- Reject if team_code does not match any team
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'ERR_REG_TEAM_CODE_INVALID: team_code "%" does not match any team', v_team_code;
  END IF;

  -- Create profile with mandatory team_id
  INSERT INTO public.profiles (id, full_name, email, team_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    v_team_id
  );

  RETURN NEW;
END;
$$;

-- Re-attach the trigger (drop first to ensure clean state)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

--------------------------------------------------------------------------------
-- 3. RLS POLICY: block direct anonymous inserts on profiles
--    (the trigger runs as SECURITY DEFINER and bypasses RLS, so this only
--     blocks direct API calls that try to insert into profiles manually)
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Profiles: block direct anon insert" ON public.profiles;
CREATE POLICY "Profiles: block direct anon insert" ON public.profiles
FOR INSERT
WITH CHECK (
  -- Authenticated users can insert (subject to other policies)
  auth.role() <> 'anon'
);
