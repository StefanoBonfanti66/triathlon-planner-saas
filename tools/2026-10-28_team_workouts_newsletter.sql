-- Newsletter settimanale MTT: tracking invio email
-- Il contenuto modificabile (subject/intro/extra) vive in team_workouts.content.newsletter (JSONB).

ALTER TABLE team_workouts
  ADD COLUMN IF NOT EXISTS newsletter_sent_at timestamptz;

COMMENT ON COLUMN team_workouts.newsletter_sent_at IS
  'Timestamp ultimo invio email newsletter settimanale (Resend). NULL = non inviata.';
