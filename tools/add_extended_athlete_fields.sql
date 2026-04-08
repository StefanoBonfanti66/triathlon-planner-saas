-- Aggiornamento tabella profiles con campi estesi per l'anagrafica atleti
-- Data: 2026-04-07
-- Architetto: Stefano Bonfanti

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS nationality text DEFAULT 'Italiana',
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS province text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'Italia',
ADD COLUMN IF NOT EXISTS zip_code text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS external_team_name text,
ADD COLUMN IF NOT EXISTS external_team_code text;

COMMENT ON COLUMN public.profiles.first_name IS 'Nome dell''atleta';
COMMENT ON COLUMN public.profiles.last_name IS 'Cognome dell''atleta';
COMMENT ON COLUMN public.profiles.external_team_name IS 'Nome della squadra di provenienza (se esterna)';
COMMENT ON COLUMN public.profiles.external_team_code IS 'Codice federale della squadra di provenienza';
