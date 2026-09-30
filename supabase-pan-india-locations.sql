-- ============================================================================
-- DriverHub — Pan-India Location Hierarchy & Marketplace Stats SQL Migration
-- Project: hhqadycmsxsedlvdfcnn (public schema)
-- Safe & Idempotent: Can be run multiple times in Supabase SQL Editor
-- ============================================================================

-- 1. Add optional district & pincode columns to profiles, companies, jobs, saved_searches
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT;

ALTER TABLE IF EXISTS public.jobs
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT;

ALTER TABLE IF EXISTS public.saved_searches
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT;

-- 2. Backfill 6-digit PIN codes from formatted location strings where available
UPDATE public.profiles
SET pincode = substring(location FROM '\m([1-9][0-9]{5})\M')
WHERE pincode IS NULL AND location ~ '\m[1-9][0-9]{5}\M';

UPDATE public.companies
SET pincode = substring(location FROM '\m([1-9][0-9]{5})\M')
WHERE pincode IS NULL AND location ~ '\m[1-9][0-9]{5}\M';

UPDATE public.jobs
SET pincode = substring(location FROM '\m([1-9][0-9]{5})\M')
WHERE pincode IS NULL AND location ~ '\m[1-9][0-9]{5}\M';

-- 3. Create indexes for fast State -> District -> City -> PIN filtering
CREATE INDEX IF NOT EXISTS idx_profiles_state_district_city_pin
  ON public.profiles (state, district, city, pincode);

CREATE INDEX IF NOT EXISTS idx_companies_state_district_city_pin
  ON public.companies (state, district, city, pincode);

CREATE INDEX IF NOT EXISTS idx_jobs_state_district_city_pin
  ON public.jobs (status, state, district, city, pincode);

-- 4. Ensure public marketplace stats RPC exists for real-time category vacancy counts
CREATE OR REPLACE FUNCTION public.get_driverhub_public_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_drivers bigint := 0;
  v_employers bigint := 0;
  v_hires bigint := 0;
  v_active_vacancies bigint := 0;
  v_by_category jsonb := '{}'::jsonb;
BEGIN
  SELECT count(*) INTO v_drivers FROM public.driver_profiles;
  SELECT count(*) INTO v_employers FROM public.companies WHERE verified = true AND status = 'active';
  SELECT count(*) INTO v_hires FROM public.applications WHERE status = 'hired';

  SELECT
    COALESCE(SUM(GREATEST(COALESCE(vacancies, 1), 1)), 0),
    COALESCE(
      jsonb_object_agg(cat_key, cat_vacancies),
      '{}'::jsonb
    )
  INTO v_active_vacancies, v_by_category
  FROM (
    SELECT
      lower(trim(category)) AS cat_key,
      SUM(GREATEST(COALESCE(vacancies, 1), 1)) AS cat_vacancies
    FROM public.jobs
    WHERE status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
      AND (application_deadline IS NULL OR application_deadline >= current_date)
      AND category IS NOT NULL
    GROUP BY lower(trim(category))
  ) sub;

  RETURN jsonb_build_object(
    'verifiedDrivers', v_drivers,
    'verifiedEmployers', v_employers,
    'activeVacancies', v_active_vacancies,
    'hires', v_hires,
    'vacanciesByCategory', v_by_category
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_driverhub_public_stats() TO anon, authenticated;
