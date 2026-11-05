-- Aggiunge colonna mywhoosh_workout_id a team_workouts per il sync con MyWhoosh
-- Eseguire nell'SQL Editor della dashboard Supabase (progetto bwzzvdwiimvdwkiytknc)

ALTER TABLE public.team_workouts
  ADD COLUMN IF NOT EXISTS mywhoosh_workout_id TEXT;

CREATE INDEX IF NOT EXISTS idx_team_workouts_mywhoosh_workout_id
  ON public.team_workouts (mywhoosh_workout_id)
  WHERE mywhoosh_workout_id IS NOT NULL;

COMMENT ON COLUMN public.team_workouts.mywhoosh_workout_id IS 'ID del workout caricato su MyWhoosh (push sincronizzazione allenamenti rullo)';