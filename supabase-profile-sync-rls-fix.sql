-- Repair profile self-sync when an existing auth.users account has no
-- public.profiles row. Safe to re-run; preserves profile SELECT/UPDATE policies.
--
-- This deliberately grants no INSERT path to anon and never allows a client
-- to insert its own profile with the admin role. Trusted auth triggers and
-- service-role operations continue to provision administrative profiles.

BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supabase's current schema cache reports this driver profile column as absent.
-- Keep experience months in the canonical name used by the app and search RPCs.
ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS months_experience integer NOT NULL DEFAULT 0;

-- Preserve values from the misspelled legacy column created by an older upgrade,
-- while leaving any already-correct months_experience values untouched.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'driver_profiles'
      AND column_name = 'experience_months'
  ) THEN
    EXECUTE 'UPDATE public.driver_profiles
      SET months_experience = experience_months
      WHERE months_experience = 0 AND experience_months IS NOT NULL';
  END IF;
END $$;

-- RLS policies are permissive by default and are OR-ed together. Remove any
-- legacy INSERT/ALL policy that could permit another user's row or anon inserts.
-- Separate SELECT-only and UPDATE-only policies are left unchanged; an ALL
-- policy is removed because it also grants an unsafe INSERT path.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND cmd IN ('INSERT', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "profiles insert own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = (SELECT auth.uid())
    AND role IN ('driver'::public.user_role, 'employer'::public.user_role)
  );

-- Refresh PostgREST's cached column metadata so the next profile upsert can
-- resolve months_experience immediately after this repair.
NOTIFY pgrst, 'reload schema';

COMMIT;
