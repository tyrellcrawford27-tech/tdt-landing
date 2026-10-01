-- Additive only. Apply before deploying the v6 public form or coach API.
-- The new reason answer stays separate from existing v4/v5 answers.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS application_reason TEXT;
NOTIFY pgrst, 'reload schema';
COMMIT;
