-- Additive only. Apply before deploying the v5 public form or coach API.
-- Keep existing v4 answers, progress columns, defaults and constraints intact.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS film_readiness TEXT,
  ADD COLUMN IF NOT EXISTS film_access TEXT,
  ADD COLUMN IF NOT EXISTS decision_support TEXT,
  ADD COLUMN IF NOT EXISTS guardian_consent TEXT,
  ADD COLUMN IF NOT EXISTS investment_readiness TEXT;
NOTIFY pgrst, 'reload schema';
COMMIT;
