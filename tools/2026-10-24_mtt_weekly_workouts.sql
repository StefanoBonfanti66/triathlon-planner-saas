-- MTT Weekly Workouts via Telegram
-- Data: 2026-10-24
-- Team: mtt

-- Tabella principale
CREATE TABLE IF NOT EXISTS public.team_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL DEFAULT 'mtt',
  year INT NOT NULL,
  week_number INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','scheduled','sent','error')),
  generated_by TEXT DEFAULT 'ai',
  generated_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  telegram_message_ids JSONB DEFAULT '[]'::jsonb,
  content JSONB NOT NULL,      -- { run: [...], bike: [...], swim: [...], notes: "...", tips_by_discipline: {...} }
  images JSONB DEFAULT '[]'::jsonb, -- [{ url, discipline, caption }]
  ai_prompt_used TEXT,
  sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT team_workouts_unique_week UNIQUE(team_id, year, week_number)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_team_workouts_team_year_week ON public.team_workouts(team_id, year, week_number);
CREATE INDEX IF NOT EXISTS idx_team_workouts_status ON public.team_workouts(status);
CREATE INDEX IF NOT EXISTS idx_team_workouts_sent_at ON public.team_workouts(sent_at);

-- Trigger per aggiornamento updated_at
CREATE OR REPLACE FUNCTION public.update_team_workouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_team_workouts_updated_at ON public.team_workouts;
CREATE TRIGGER trg_team_workouts_updated_at
  BEFORE UPDATE ON public.team_workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_team_workouts_updated_at();

-- RLS
ALTER TABLE public.team_workouts ENABLE ROW LEVEL SECURITY;

-- Atleti MTT possono leggere solo allenamenti inviati
DROP POLICY IF EXISTS "mtt_athletes_read_sent_workouts" ON public.team_workouts;
CREATE POLICY "mtt_athletes_read_sent_workouts" ON public.team_workouts
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT p.team_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.deleted_at IS NULL
    )
    AND status = 'sent'
  );

-- Admin MTT / Super Admin gestiscono tutto
DROP POLICY IF EXISTS "mtt_admin_manage_workouts" ON public.team_workouts;
CREATE POLICY "mtt_admin_manage_workouts" ON public.team_workouts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.team_id = 'mtt'
        AND p.deleted_at IS NULL
        AND (
          p.is_team_admin = true OR
          p.is_super_admin = true OR
          p.email IN ('sbonfanti@hotmail.com', 'bonfantistefano4@gmail.com')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.team_id = 'mtt'
        AND p.deleted_at IS NULL
        AND (
          p.is_team_admin = true OR
          p.is_super_admin = true OR
          p.email IN ('sbonfanti@hotmail.com', 'bonfantistefano4@gmail.com')
        )
    )
  );
