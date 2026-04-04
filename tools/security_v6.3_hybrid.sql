-- MTT Season Planner 2026 - Security Hardening v6.3 (HYBRID MODE)
-- Author: Stefano Bonfanti
-- Focus: RLS Multi-Tenant sicuro per la produzione

--------------------------------------------------------------------------------
-- 1. RIATTIVAZIONE RLS
--------------------------------------------------------------------------------

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- 2. TEAMS POLICIES (Hybrid)
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Teams: view own team" ON public.teams;
DROP POLICY IF EXISTS "Teams: hybrid access" ON public.teams;

-- Permettiamo la lettura a tutti (anon e auth) per ora, per non rompere il sito pubblico
CREATE POLICY "Teams: hybrid access" ON public.teams
FOR SELECT USING (true);

--------------------------------------------------------------------------------
-- 3. PROFILES POLICIES (Hybrid - Il cuore del test)
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Profiles: view team members" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update self or team members" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: hybrid access" ON public.profiles;

-- Policy di Lettura: 
-- 1. Se sei ANON (Produzione), vedi tutto (temporaneo)
-- 2. Se sei AUTH, vedi solo il tuo team
CREATE POLICY "Profiles: hybrid access" ON public.profiles
FOR SELECT USING (
    auth.role() = 'anon' OR 
    team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid()) OR
    id = auth.uid()
);

-- Policy di Scrittura: Solo tu o il tuo Team Admin
CREATE POLICY "Profiles: secure update" ON public.profiles
FOR UPDATE USING (
    auth.uid() = id OR 
    (SELECT is_team_admin FROM public.profiles WHERE id = auth.uid() AND team_id = public.profiles.team_id)
);

--------------------------------------------------------------------------------
-- 4. USER PLANS POLICIES (Hybrid)
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "User Plans: view team plans" ON public.user_plans;
DROP POLICY IF EXISTS "User Plans: manage own plans" ON public.user_plans;
DROP POLICY IF EXISTS "User Plans: hybrid access" ON public.user_plans;

CREATE POLICY "User Plans: hybrid access" ON public.user_plans
FOR SELECT USING (
    auth.role() = 'anon' OR 
    team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid()) OR
    user_id = auth.uid()
);

CREATE POLICY "User Plans: secure manage" ON public.user_plans
FOR ALL USING (user_id = auth.uid());

--------------------------------------------------------------------------------
-- 5. RACES POLICIES (Sempre Pubbliche)
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Races: public read" ON public.races;
CREATE POLICY "Races: public read" ON public.races FOR SELECT USING (true);

--------------------------------------------------------------------------------
-- 6. AUDIT LOGS POLICIES
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Audit Logs: insert own" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit Logs: team admin view" ON public.audit_logs;

CREATE POLICY "Audit Logs: insert own" ON public.audit_logs
FOR INSERT WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Audit Logs: team admin view" ON public.audit_logs
FOR SELECT USING (
    (SELECT is_team_admin FROM public.profiles WHERE id = auth.uid() AND team_id = public.audit_logs.team_id)
);
