ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS assignment_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS grade_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS task_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS system_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sound_notifications boolean NOT NULL DEFAULT true;
