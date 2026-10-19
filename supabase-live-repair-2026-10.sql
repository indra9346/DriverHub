-- =====================================================================
-- DriverHub live repair (2026-10). Apply LAST, after every other DriverHub
-- SQL file, in Supabase Dashboard -> SQL Editor. Safe to run more than once.
--
-- The Supabase project is shared with other apps, so this file only touches
-- DriverHub tables and functions. It does not drop any table or row.
--
-- Fixes:
--  1. Table privileges: the live API returns 42501 "permission denied" for
--     jobs/companies/etc., so visitors and signed-in users see no data.
--  2. Visitors could not read the company directory (its policy calls
--     is_driverhub_admin(), which anon could not execute).
--  3. get_driverhub_public_stats() always failed ("column vacancies does not exist").
--  4. Admin verification left companies 'pending', so verified employers could
--     not search, unlock or message drivers and never appeared publicly.
--  5. Employers could self-approve a job waiting for review, extend a job's
--     expiry for free, or self-reject a live job to refund its credit.
--  6. Drivers could apply after the deadline or while blocked, insert an
--     application already marked 'hired' (inflating public hire counts), and
--     edit interview mode/location.
--  7. Legacy permissive policies (e.g. subscription_self_all from
--     supabase-fix.sql) would let an employer write their own credits once
--     grants are restored; credit/billing tables now accept writes only from
--     trusted database functions.
--  8. Employers are notified when their company is verified, when an admin
--     approves, rejects or closes their job, and when a driver withdraws.
--  9. The district / PIN / location chosen at signup is stored even when email
--     confirmation is on; saved searches keep district, PIN and radius.
-- 10. Older live tables get every column the app uses (messaging and interview
--     scheduling failed because direct_messages / applications lacked columns),
--     the radius candidate search, the payment-order table, and live updates.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. Columns. Some live tables were created by older DriverHub scripts
-- (CREATE TABLE IF NOT EXISTS then skipped the newer definition), e.g.
-- direct_messages without sender_name/sender_role and applications without
-- interview_mode. Add every column the app uses; safe defaults only
-- (no credits, no verification). Existing columns are left untouched.
-- ---------------------------------------------------------------------
DO $cols$ BEGIN IF to_regclass('public.profiles') IS NOT NULL THEN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'driver';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text DEFAULT '';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pincode text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude double precision;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude double precision;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status public.user_status DEFAULT 'active';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
END IF; END $cols$;
DO $cols$ BEGIN IF to_regclass('public.driver_profiles') IS NOT NULL THEN
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS driver_category text;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS years_experience integer DEFAULT 0;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS months_experience integer NOT NULL DEFAULT 0;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS license_number text;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS license_type text;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS license_expiry date;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}';
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}';
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS vehicle_types text[] DEFAULT '{}';
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS "current_role" text;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS previous_role text;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS education text;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS preferred_location text;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS expected_salary integer;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS availability text;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS night_shift_willing boolean;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS outstation_willing boolean;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS cv_attached boolean DEFAULT false;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS police_verified boolean DEFAULT false;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS unlock_count integer DEFAULT 0;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS bio text;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS resume_url text;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS latitude double precision;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS longitude double precision;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS district text;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS pincode text;
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
END IF; END $cols$;
DO $cols$ BEGIN IF to_regclass('public.driver_experiences') IS NOT NULL THEN
  ALTER TABLE public.driver_experiences ADD COLUMN IF NOT EXISTS vehicle_type text;
  ALTER TABLE public.driver_experiences ADD COLUMN IF NOT EXISTS duration_years numeric(4,1) DEFAULT 0;
  ALTER TABLE public.driver_experiences ADD COLUMN IF NOT EXISTS start_date date;
  ALTER TABLE public.driver_experiences ADD COLUMN IF NOT EXISTS end_date date;
  ALTER TABLE public.driver_experiences ADD COLUMN IF NOT EXISTS description text;
  ALTER TABLE public.driver_experiences ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
END IF; END $cols$;
DO $cols$ BEGIN IF to_regclass('public.driver_documents') IS NOT NULL THEN
  ALTER TABLE public.driver_documents ADD COLUMN IF NOT EXISTS name text DEFAULT '';
  ALTER TABLE public.driver_documents ADD COLUMN IF NOT EXISTS type public.document_type DEFAULT 'other';
  ALTER TABLE public.driver_documents ADD COLUMN IF NOT EXISTS file_url text;
  ALTER TABLE public.driver_documents ADD COLUMN IF NOT EXISTS file_size text;
  ALTER TABLE public.driver_documents ADD COLUMN IF NOT EXISTS verification_status public.verification_status DEFAULT 'pending';
  ALTER TABLE public.driver_documents ADD COLUMN IF NOT EXISTS upload_date timestamptz DEFAULT now();
END IF; END $cols$;
DO $cols$ BEGIN IF to_regclass('public.companies') IS NOT NULL THEN
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS company_name text DEFAULT '';
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS contact_person text;
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email text;
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone text;
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS industry text;
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS location text;
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS city text;
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS district text;
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS state text;
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS pincode text;
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS address text;
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS website text;
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url text;
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS description text;
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS gstin text;
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS status public.user_status DEFAULT 'pending';
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
END IF; END $cols$;
DO $cols$ BEGIN IF to_regclass('public.employer_subscriptions') IS NOT NULL THEN
  ALTER TABLE public.employer_subscriptions ADD COLUMN IF NOT EXISTS plan_name text DEFAULT 'No active hiring plan';
  ALTER TABLE public.employer_subscriptions ADD COLUMN IF NOT EXISTS job_credits integer NOT NULL DEFAULT 0;
  ALTER TABLE public.employer_subscriptions ADD COLUMN IF NOT EXISTS db_unlock_credits integer NOT NULL DEFAULT 0;
  ALTER TABLE public.employer_subscriptions ADD COLUMN IF NOT EXISTS total_job_credits integer NOT NULL DEFAULT 0;
  ALTER TABLE public.employer_subscriptions ADD COLUMN IF NOT EXISTS total_db_unlock_credits integer NOT NULL DEFAULT 0;
  ALTER TABLE public.employer_subscriptions ADD COLUMN IF NOT EXISTS active_job_slots integer NOT NULL DEFAULT 0;
  ALTER TABLE public.employer_subscriptions ADD COLUMN IF NOT EXISTS gstin text;
  ALTER TABLE public.employer_subscriptions ADD COLUMN IF NOT EXISTS gstin_verified boolean DEFAULT false;
  ALTER TABLE public.employer_subscriptions ADD COLUMN IF NOT EXISTS billing_company_name text;
  ALTER TABLE public.employer_subscriptions ADD COLUMN IF NOT EXISTS billing_address text;
  ALTER TABLE public.employer_subscriptions ADD COLUMN IF NOT EXISTS status text DEFAULT 'expired';
  ALTER TABLE public.employer_subscriptions ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT now();
  ALTER TABLE public.employer_subscriptions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE public.employer_subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
END IF; END $cols$;
DO $cols$ BEGIN IF to_regclass('public.billing_transactions') IS NOT NULL THEN
  ALTER TABLE public.billing_transactions ADD COLUMN IF NOT EXISTS plan_details text DEFAULT '';
  ALTER TABLE public.billing_transactions ADD COLUMN IF NOT EXISTS applies_until timestamptz;
  ALTER TABLE public.billing_transactions ADD COLUMN IF NOT EXISTS amount numeric(10,2) DEFAULT 0;
  ALTER TABLE public.billing_transactions ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pending';
  ALTER TABLE public.billing_transactions ADD COLUMN IF NOT EXISTS invoice_id text;
  ALTER TABLE public.billing_transactions ADD COLUMN IF NOT EXISTS job_credits_added integer DEFAULT 0;
  ALTER TABLE public.billing_transactions ADD COLUMN IF NOT EXISTS db_credits_added integer DEFAULT 0;
  ALTER TABLE public.billing_transactions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
END IF; END $cols$;
DO $cols$ BEGIN IF to_regclass('public.saved_searches') IS NOT NULL THEN
  ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS title text DEFAULT '';
  ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS category text;
  ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS city text;
  ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS district text;
  ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS state text;
  ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS pincode text;
  ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS radius_km double precision;
  ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS keyword text;
  ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS vehicle_type text;
  ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS active_in_days integer;
  ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS min_exp integer DEFAULT 0;
  ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS must_have_skills text[] DEFAULT '{}';
  ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS match_count integer DEFAULT 0;
  ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
END IF; END $cols$;
DO $cols$ BEGIN IF to_regclass('public.candidate_unlocks') IS NOT NULL THEN
  ALTER TABLE public.candidate_unlocks ADD COLUMN IF NOT EXISTS downloaded_excel boolean DEFAULT false;
  ALTER TABLE public.candidate_unlocks ADD COLUMN IF NOT EXISTS unlocked_at timestamptz DEFAULT now();
END IF; END $cols$;
DO $cols$ BEGIN IF to_regclass('public.jobs') IS NOT NULL THEN
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS company_name text DEFAULT '';
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS company_logo text;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS posted_by text;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS category text DEFAULT 'HMV';
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS location text DEFAULT '';
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS city text DEFAULT '';
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS district text;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS state text DEFAULT '';
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS pincode text;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS work_location_type text;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS experience_required text;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS experience_min_years integer DEFAULT 0;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_min integer DEFAULT 0;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_max integer DEFAULT 0;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_type text DEFAULT 'monthly';
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS pay_type text;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS perks text[] DEFAULT '{}';
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS night_shift boolean DEFAULT false;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS vehicle_type text;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS route_type text;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS joining_fee_required boolean DEFAULT false;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS screening_questions text[] DEFAULT '{}';
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS working_hours text;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS employment_type text DEFAULT 'Full-time';
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS required_skills text[] DEFAULT '{}';
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS required_docs text[] DEFAULT '{}';
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS vacancies integer DEFAULT 1;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS status public.job_status DEFAULT 'pending';
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS credit_consumed boolean NOT NULL DEFAULT false;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS slot_consumed boolean NOT NULL DEFAULT false;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS entitlement_consumed_at timestamptz;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS posted_date timestamptz DEFAULT now();
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS application_deadline timestamptz;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS expires_at timestamptz;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS closed_at timestamptz;
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
END IF; END $cols$;
DO $cols$ BEGIN IF to_regclass('public.applications') IS NOT NULL THEN
  ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS resume_url text;
  ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS cover_message text;
  ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS status public.application_status DEFAULT 'applied';
  ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS employer_notes text;
  ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS interview_date timestamptz;
  ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS interview_mode text;
  ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS interview_location text;
  ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS applied_date timestamptz DEFAULT now();
  ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS updated_date timestamptz DEFAULT now();
END IF; END $cols$;
DO $cols$ BEGIN IF to_regclass('public.favorite_jobs') IS NOT NULL THEN
  ALTER TABLE public.favorite_jobs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
END IF; END $cols$;
DO $cols$ BEGIN IF to_regclass('public.direct_messages') IS NOT NULL THEN
  ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS sender_name text;
  ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS sender_role public.user_role;
  ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS receiver_name text;
  ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL;
  ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS job_title text;
  ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS read boolean DEFAULT false;
  ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
END IF; END $cols$;
DO $cols$ BEGIN IF to_regclass('public.notifications') IS NOT NULL THEN
  ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type text DEFAULT 'system';
  ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link text;
  ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read boolean DEFAULT false;
  ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
END IF; END $cols$;
DO $cols$ BEGIN IF to_regclass('public.admin_actions') IS NOT NULL THEN
  ALTER TABLE public.admin_actions ADD COLUMN IF NOT EXISTS reason text;
  ALTER TABLE public.admin_actions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
END IF; END $cols$;
-- "Active any time" saved searches are stored as NULL.
ALTER TABLE public.saved_searches ALTER COLUMN active_in_days DROP NOT NULL;

-- ---------------------------------------------------------------------
-- 0b. Candidate search with radius (same as supabase-radius-search.sql;
-- live had an older signature). Also re-syncs driver location fields.
-- ---------------------------------------------------------------------
-- public.profiles is the canonical source for a driver's current location.
-- Repair old denormalized driver rows that still contain an earlier district/PIN.
-- updated_at doubles as the driver's "last active" time in employer searches,
-- so this maintenance update must not touch it (pause the auto-timestamp trigger).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.driver_profiles'::regclass AND tgname = 'set_updated_at') THEN
    ALTER TABLE public.driver_profiles DISABLE TRIGGER set_updated_at;
  END IF;
END $$;
UPDATE public.driver_profiles AS d
SET district = COALESCE(NULLIF(BTRIM(p.district), ''), d.district),
    pincode = COALESCE(NULLIF(BTRIM(p.pincode), ''), d.pincode),
    preferred_location = COALESCE(NULLIF(BTRIM(p.location), ''), d.preferred_location),
    latitude = COALESCE(p.latitude, d.latitude),
    longitude = COALESCE(p.longitude, d.longitude)
FROM public.profiles AS p
WHERE p.id = d.user_id
  AND p.role::text = 'driver'
  AND (
    (NULLIF(BTRIM(p.district), '') IS NOT NULL AND d.district IS DISTINCT FROM NULLIF(BTRIM(p.district), '')) OR
    (NULLIF(BTRIM(p.pincode), '') IS NOT NULL AND d.pincode IS DISTINCT FROM NULLIF(BTRIM(p.pincode), '')) OR
    (NULLIF(BTRIM(p.location), '') IS NOT NULL AND d.preferred_location IS DISTINCT FROM NULLIF(BTRIM(p.location), '')) OR
    (p.latitude IS NOT NULL AND d.latitude IS DISTINCT FROM p.latitude) OR
    (p.longitude IS NOT NULL AND d.longitude IS DISTINCT FROM p.longitude)
  );
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.driver_profiles'::regclass AND tgname = 'set_updated_at') THEN
    ALTER TABLE public.driver_profiles ENABLE TRIGGER set_updated_at;
  END IF;
END $$;

-- 3. Replace search_driverhub_candidates RPC with Spatial Distance & Radius Filter
DO $drop$ DECLARE r record; BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname = 'search_driverhub_candidates' LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig;
  END LOOP;
END $drop$;

CREATE OR REPLACE FUNCTION public.search_driverhub_candidates(
  p_keyword text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_pincode text DEFAULT NULL,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_radius_km double precision DEFAULT NULL,
  p_min_years integer DEFAULT 0,
  p_skill text DEFAULT NULL,
  p_vehicle_type text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_active_in_days integer DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  phone text,
  email text,
  city text,
  district text,
  state text,
  pincode text,
  latitude double precision,
  longitude double precision,
  distance_km double precision,
  driver_category text,
  years_experience integer,
  months_experience integer,
  license_number text,
  license_type text,
  license_expiry date,
  skills text[],
  languages text[],
  vehicle_types text[],
  "current_role" text,
  education text,
  preferred_location text,
  expected_salary integer,
  availability text,
  cv_attached boolean,
  police_verified boolean,
  last_active timestamptz,
  bio text,
  resume_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check 1: Active authenticated employer profile
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles actor
    WHERE actor.id = auth.uid() AND actor.role::text = 'employer' AND actor.status::text = 'active'
  ) THEN
    RAISE EXCEPTION 'Only active employer accounts can search the candidate database';
  END IF;

  -- Security check 2: Active paid hiring subscription
  IF NOT EXISTS (
    SELECT 1 FROM public.employer_subscriptions subscription
    WHERE subscription.employer_id = auth.uid()
      AND subscription.status::text = 'active'
      AND subscription.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'An active employer hiring plan is required to search candidate profiles';
  END IF;

  -- Security check 3: Verified employer company
  IF NOT EXISTS (
    SELECT 1 FROM public.companies company
    WHERE company.user_id = auth.uid() AND company.verified = true AND company.status::text = 'active'
  ) THEN
    RAISE EXCEPTION 'Your company must be verified before searching driver contacts';
  END IF;

  RETURN QUERY
  WITH candidate_candidates AS (
    SELECT
      p.id AS c_user_id,
      p.full_name AS c_full_name,
      CASE WHEN EXISTS (
        SELECT 1 FROM public.candidate_unlocks unlocked
        WHERE unlocked.employer_id = auth.uid() AND unlocked.driver_id = p.id
      ) THEN p.phone ELSE NULL END AS c_phone,
      CASE WHEN EXISTS (
        SELECT 1 FROM public.candidate_unlocks unlocked
        WHERE unlocked.employer_id = auth.uid() AND unlocked.driver_id = p.id
      ) THEN p.email ELSE NULL END AS c_email,
      COALESCE(p.city, '') AS c_city,
      COALESCE(NULLIF(BTRIM(p.district), ''), NULLIF(BTRIM(d.district), ''), '') AS c_district,
      COALESCE(p.state, '') AS c_state,
      COALESCE(NULLIF(BTRIM(p.pincode), ''), NULLIF(BTRIM(d.pincode), ''), '') AS c_pincode,
      COALESCE(p.latitude, d.latitude) AS c_lat,
      COALESCE(p.longitude, d.longitude) AS c_lng,
      CASE 
        WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND COALESCE(p.latitude, d.latitude) IS NOT NULL AND COALESCE(p.longitude, d.longitude) IS NOT NULL THEN
          ROUND(
            (6371 * 2 * ASIN(
              SQRT(
                POWER(SIN(RADIANS(COALESCE(p.latitude, d.latitude) - p_lat) / 2), 2) +
                COS(RADIANS(p_lat)) * COS(RADIANS(COALESCE(p.latitude, d.latitude))) *
                POWER(SIN(RADIANS(COALESCE(p.longitude, d.longitude) - p_lng) / 2), 2)
              )
            ))::numeric, 1
          )::double precision
        ELSE NULL
      END AS c_distance_km,
      d.driver_category AS c_driver_category,
      COALESCE(d.years_experience, 0) AS c_years_experience,
      COALESCE(d.months_experience, 0) AS c_months_experience,
      CASE WHEN EXISTS (
        SELECT 1 FROM public.candidate_unlocks unlocked
        WHERE unlocked.employer_id = auth.uid() AND unlocked.driver_id = p.id
      ) THEN d.license_number ELSE NULL END AS c_license_number,
      d.license_type AS c_license_type,
      CASE WHEN EXISTS (
        SELECT 1 FROM public.candidate_unlocks unlocked
        WHERE unlocked.employer_id = auth.uid() AND unlocked.driver_id = p.id
      ) THEN d.license_expiry ELSE NULL END AS c_license_expiry,
      COALESCE(d.skills, ARRAY[]::text[]) AS c_skills,
      COALESCE(d.languages, ARRAY[]::text[]) AS c_languages,
      COALESCE(d.vehicle_types, ARRAY[]::text[]) AS c_vehicle_types,
      d."current_role" AS c_current_role,
      d.education AS c_education,
      COALESCE(NULLIF(BTRIM(p.location), ''), d.preferred_location) AS c_preferred_location,
      d.expected_salary AS c_expected_salary,
      d.availability AS c_availability,
      COALESCE(d.cv_attached, false) AS c_cv_attached,
      COALESCE(d.police_verified, false) AS c_police_verified,
      d.updated_at AS c_updated_at,
      d.bio AS c_bio,
      CASE WHEN EXISTS (
        SELECT 1 FROM public.candidate_unlocks unlocked
        WHERE unlocked.employer_id = auth.uid() AND unlocked.driver_id = p.id
      ) THEN d.resume_url ELSE NULL END AS c_resume_url
    FROM public.profiles p
    JOIN public.driver_profiles d ON d.user_id = p.id
    WHERE p.role::text = 'driver'
      AND p.status::text = 'active'
      AND (p_user_id IS NULL OR p.id = p_user_id)
      AND (p_keyword IS NULL OR concat_ws(' ', p.full_name, d.driver_category, d."current_role",
        d.license_type, d.preferred_location, array_to_string(d.skills, ' '),
        array_to_string(d.vehicle_types, ' ')) ILIKE '%' || p_keyword || '%')
      AND (
        p_category IS NULL OR d.driver_category ILIKE p_category
        OR (p_category = 'HMV' AND (d.driver_category ILIKE '%truck%' OR d.driver_category ILIKE '%trailer%' OR d.driver_category ILIKE '%HMV%'))
        OR (p_category = 'LMV' AND (d.driver_category ILIKE '%cab%' OR d.driver_category ILIKE '%personal%' OR d.driver_category ILIKE '%tempo%' OR d.driver_category ILIKE '%LMV%'))
      )
      AND (p_city IS NULL OR COALESCE(p.city, '') ILIKE '%' || p_city || '%')
      AND (p_district IS NULL OR COALESCE(NULLIF(BTRIM(p.district), ''), NULLIF(BTRIM(d.district), ''), '') ILIKE '%' || p_district || '%')
      AND (p_state IS NULL OR COALESCE(p.state, '') ILIKE '%' || p_state || '%')
      AND (p_pincode IS NULL OR COALESCE(NULLIF(BTRIM(p.pincode), ''), NULLIF(BTRIM(d.pincode), ''), '') = p_pincode)
      AND COALESCE(d.years_experience, 0) >= GREATEST(COALESCE(p_min_years, 0), 0)
      AND (p_skill IS NULL OR array_to_string(d.skills, ' ') ILIKE '%' || p_skill || '%')
      AND (
        p_vehicle_type IS NULL OR array_to_string(d.vehicle_types, ' ') ILIKE '%' || p_vehicle_type || '%'
        OR COALESCE(d.license_type, '') ILIKE '%' || p_vehicle_type || '%'
        OR COALESCE(d.driver_category, '') ILIKE '%' || p_vehicle_type || '%'
      )
      AND (p_active_in_days IS NULL OR d.updated_at >= now() - make_interval(days => GREATEST(p_active_in_days, 1)))
  )
  SELECT
    c_user_id,
    c_full_name,
    c_phone,
    c_email,
    c_city,
    c_district,
    c_state,
    c_pincode,
    c_lat,
    c_lng,
    c_distance_km,
    c_driver_category,
    c_years_experience,
    c_months_experience,
    c_license_number,
    c_license_type,
    c_license_expiry,
    c_skills,
    c_languages,
    c_vehicle_types,
    c_current_role,
    c_education,
    c_preferred_location,
    c_expected_salary,
    c_availability,
    c_cv_attached,
    c_police_verified,
    c_updated_at,
    c_bio,
    c_resume_url
  FROM candidate_candidates
  WHERE (p_radius_km IS NULL OR p_radius_km <= 0 OR (c_distance_km IS NOT NULL AND c_distance_km <= p_radius_km))
  ORDER BY
    CASE WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND c_distance_km IS NOT NULL THEN c_distance_km ELSE 999999 END ASC,
    c_updated_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 250)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.search_driverhub_candidates(text,text,text,text,text,text,double precision,double precision,double precision,integer,text,text,uuid,integer,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_driverhub_candidates(text,text,text,text,text,text,double precision,double precision,double precision,integer,text,text,uuid,integer,integer,integer) TO authenticated;

-- ---------------------------------------------------------------------
-- 7. Remove legacy write policies on entitlement tables and notifications.
-- ---------------------------------------------------------------------
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (tablename IN ('employer_subscriptions', 'billing_transactions', 'job_entitlement_events')
          AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL'))
        OR (tablename = 'notifications' AND cmd IN ('INSERT', 'ALL'))
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;
-- Self-service ALL policies from supabase-fix.sql; narrower owner policies remain.
DROP POLICY IF EXISTS profile_self_all ON public.profiles;
DROP POLICY IF EXISTS company_self_all ON public.companies;
DROP POLICY IF EXISTS driver_self_all ON public.driver_profiles;
-- Legacy supabase-schema.sql policies that leak data if that file was re-run:
-- every signed-in user could read all driver profiles, and unverified
-- companies were publicly listed.
DROP POLICY IF EXISTS "profiles employers read drivers" ON public.profiles;
DROP POLICY IF EXISTS "companies public read" ON public.companies;

-- Owner/admin read access (and notification read/mark-read/delete) must not
-- depend on the ALL policies removed above.
DROP POLICY IF EXISTS subscription_owner_read ON public.employer_subscriptions;
CREATE POLICY subscription_owner_read ON public.employer_subscriptions FOR SELECT TO authenticated
  USING (employer_id = auth.uid() OR public.is_driverhub_admin());
DROP POLICY IF EXISTS billing_owner_read ON public.billing_transactions;
CREATE POLICY billing_owner_read ON public.billing_transactions FOR SELECT TO authenticated
  USING (employer_id = auth.uid() OR public.is_driverhub_admin());
DROP POLICY IF EXISTS entitlement_owner_admin_read ON public.job_entitlement_events;
CREATE POLICY entitlement_owner_admin_read ON public.job_entitlement_events FOR SELECT TO authenticated
  USING (employer_id = auth.uid() OR public.is_driverhub_admin());
DROP POLICY IF EXISTS driverhub_notification_read ON public.notifications;
CREATE POLICY driverhub_notification_read ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_driverhub_admin());
DROP POLICY IF EXISTS driverhub_notification_update ON public.notifications;
CREATE POLICY driverhub_notification_update ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_driverhub_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_driverhub_admin());
DROP POLICY IF EXISTS driverhub_notification_delete ON public.notifications;
CREATE POLICY driverhub_notification_delete ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_driverhub_admin());

-- Writes to credits, invoices, entitlement events and notifications must come
-- from SECURITY DEFINER functions/triggers (which run as the function owner),
-- the payment service (service_role) or the SQL editor, never straight from
-- the browser roles.
CREATE OR REPLACE FUNCTION public.guard_driverhub_trusted_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'This DriverHub record can only be changed by the server';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['employer_subscriptions', 'billing_transactions', 'job_entitlement_events', 'notifications'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS guard_driverhub_trusted_write ON public.%I', t);
  END LOOP;
END $$;
CREATE TRIGGER guard_driverhub_trusted_write BEFORE INSERT OR UPDATE OR DELETE ON public.employer_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.guard_driverhub_trusted_write();
CREATE TRIGGER guard_driverhub_trusted_write BEFORE INSERT OR UPDATE OR DELETE ON public.billing_transactions
  FOR EACH ROW EXECUTE FUNCTION public.guard_driverhub_trusted_write();
CREATE TRIGGER guard_driverhub_trusted_write BEFORE INSERT OR UPDATE OR DELETE ON public.job_entitlement_events
  FOR EACH ROW EXECUTE FUNCTION public.guard_driverhub_trusted_write();
-- Users may still mark their own notifications read / delete them (RLS + guard trigger).
CREATE TRIGGER guard_driverhub_trusted_write BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_driverhub_trusted_write();

-- ---------------------------------------------------------------------
-- 4. Admin verification activates the company; employers are notified.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_driverhub_company_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_admin boolean := public.is_driverhub_admin();
  trusted boolean := auth.uid() IS NULL;  -- SQL editor / service role
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT is_admin AND NOT trusted THEN
      NEW.verified := false;
      NEW.status := 'pending';
    END IF;
    RETURN NEW;
  END IF;

  IF NOT is_admin AND NOT trusted THEN
    IF NEW.verified IS DISTINCT FROM OLD.verified OR NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Only DriverHub administration can verify or suspend a company';
    END IF;
    RETURN NEW;
  END IF;

  -- Keep verification and listing status consistent for admin actions that
  -- change only one of them (the admin UI updates only "verified").
  IF NEW.verified AND NOT COALESCE(OLD.verified, false) AND NEW.status::text = 'pending' THEN
    NEW.status := 'active';
  ELSIF NOT NEW.verified AND COALESCE(OLD.verified, false) AND NEW.status::text = 'active' THEN
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_driverhub_company_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.verified IS DISTINCT FROM OLD.verified THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (NEW.user_id,
      CASE WHEN NEW.verified THEN 'Company verified' ELSE 'Company verification removed' END,
      CASE WHEN NEW.verified
        THEN COALESCE(NEW.company_name, 'Your company') || ' is verified. Your jobs can go live and you can search the driver database.'
        ELSE COALESCE(NEW.company_name, 'Your company') || ' is no longer verified. New jobs will wait for review.' END,
      'system', '/employer/company');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS notify_driverhub_company_verification ON public.companies;
CREATE TRIGGER notify_driverhub_company_verification AFTER UPDATE OF verified ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.notify_driverhub_company_verification();

-- Repair companies an admin already verified while they stayed 'pending'.
UPDATE public.companies SET status = 'active', updated_at = now()
WHERE verified = true AND status::text = 'pending';

-- ---------------------------------------------------------------------
-- 5. Job publishing, moderation and expiry rules.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_driverhub_job_entitlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sub public.employer_subscriptions%ROWTYPE;
  slot_count integer;
  company_ok boolean;
BEGIN
  IF public.is_driverhub_admin() THEN
    -- An approval starts the paid 30-day listing window from the approval time.
    IF TG_OP = 'UPDATE' AND OLD.status::text = 'pending' AND NEW.status::text = 'active' THEN
      NEW.expires_at := now() + interval '30 days';
      NEW.closed_at := NULL;
    ELSIF TG_OP = 'UPDATE' AND OLD.status::text = 'active' AND NEW.status::text <> 'active' THEN
      NEW.closed_at := now();
    END IF;
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;  -- SQL editor / service role

  IF auth.uid() <> NEW.employer_id OR
     NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'employer' AND status::text = 'active') THEN
    RAISE EXCEPTION 'Only the active employer who owns this listing may publish it';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.employer_id <> OLD.employer_id OR NEW.id <> OLD.id OR
       NEW.credit_consumed IS DISTINCT FROM OLD.credit_consumed OR
       NEW.slot_consumed IS DISTINCT FROM OLD.slot_consumed OR
       NEW.expires_at IS DISTINCT FROM OLD.expires_at OR
       NEW.entitlement_consumed_at IS DISTINCT FROM OLD.entitlement_consumed_at THEN
      RAISE EXCEPTION 'Job owner, expiry and entitlement fields cannot be changed by the client';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
      (OLD.status::text = 'draft' AND NEW.status::text IN ('pending', 'active', 'closed')) OR
      (OLD.status::text = 'pending' AND NEW.status::text = 'closed') OR
      (OLD.status::text = 'active' AND NEW.status::text = 'closed') OR
      (OLD.status::text = 'closed' AND NEW.status::text IN ('pending', 'active'))
    ) THEN
      IF OLD.status::text = 'pending' AND NEW.status::text = 'active' THEN
        RAISE EXCEPTION 'This job is waiting for DriverHub review and goes live after approval';
      END IF;
      RAISE EXCEPTION 'Employers cannot move a job from % to %', OLD.status, NEW.status;
    END IF;
    IF OLD.status::text = 'active' AND NEW.status::text = 'closed' THEN NEW.closed_at := now(); END IF;
    IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.status::text NOT IN ('active', 'pending') THEN
      RETURN NEW;
    END IF;
  ELSE
    IF NEW.status::text = 'draft' THEN
      NEW.credit_consumed := false;
      NEW.slot_consumed := false;
      NEW.expires_at := NULL;
      NEW.entitlement_consumed_at := NULL;
      RETURN NEW;
    END IF;
    IF NEW.status::text NOT IN ('active', 'pending') THEN
      RAISE EXCEPTION 'A job must be saved as a draft or submitted with an entitlement';
    END IF;
  END IF;

  -- Publishing (insert, draft -> live, or re-opening a closed job) spends one entitlement.
  SELECT companies.verified AND companies.status::text = 'active' INTO company_ok
    FROM public.companies WHERE companies.user_id = NEW.employer_id;
  NEW.status := CASE WHEN COALESCE(company_ok, false) THEN 'active' ELSE 'pending' END;

  SELECT * INTO sub FROM public.employer_subscriptions
   WHERE employer_id = NEW.employer_id AND status::text = 'active' AND expires_at > now()
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'An active employer hiring plan is required to publish a driver job'; END IF;

  IF sub.job_credits > 0 THEN
    UPDATE public.employer_subscriptions SET job_credits = job_credits - 1, updated_at = now()
     WHERE employer_id = NEW.employer_id;
    NEW.credit_consumed := true;
    NEW.slot_consumed := false;
  ELSE
    SELECT count(*) INTO slot_count FROM public.jobs
     WHERE employer_id = NEW.employer_id AND status IN ('active', 'pending') AND id <> NEW.id
       AND (expires_at IS NULL OR expires_at > now());
    IF sub.active_job_slots <= slot_count THEN RAISE EXCEPTION 'No job credits or open hiring slots remain'; END IF;
    NEW.credit_consumed := false;
    NEW.slot_consumed := true;
  END IF;
  NEW.expires_at := now() + interval '30 days';
  NEW.closed_at := NULL;
  NEW.entitlement_consumed_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_driverhub_job_entitlement ON public.jobs;
CREATE TRIGGER enforce_driverhub_job_entitlement
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_driverhub_job_entitlement();

-- Only an administrator's rejection refunds a job credit.
CREATE OR REPLACE FUNCTION public.refund_rejected_driverhub_job_credit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status::text = 'rejected' AND OLD.status::text IS DISTINCT FROM 'rejected' AND OLD.credit_consumed
     AND (public.is_driverhub_admin() OR auth.uid() IS NULL) THEN
    UPDATE public.employer_subscriptions
       SET job_credits = job_credits + 1, updated_at = now()
     WHERE employer_id = OLD.employer_id;
    NEW.credit_consumed := false;
  END IF;
  RETURN NEW;
END;
$$;

-- 8. Tell the employer when an administrator moderates their job.
CREATE OR REPLACE FUNCTION public.notify_driverhub_job_moderation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND public.is_driverhub_admin() AND auth.uid() <> NEW.employer_id THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (NEW.employer_id,
      CASE NEW.status::text
        WHEN 'active' THEN 'Job approved'
        WHEN 'rejected' THEN 'Job not approved'
        WHEN 'closed' THEN 'Job closed by DriverHub'
        ELSE 'Job status updated' END,
      '"' || COALESCE(NEW.title, 'Your job') || '" is now ' || NEW.status::text ||
        CASE WHEN NEW.status::text = 'rejected' AND OLD.credit_consumed THEN '. Your job credit was returned.' ELSE '.' END,
      'system', '/employer/jobs');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS notify_driverhub_job_moderation ON public.jobs;
CREATE TRIGGER notify_driverhub_job_moderation AFTER UPDATE OF status ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.notify_driverhub_job_moderation();

-- ---------------------------------------------------------------------
-- 6. Applications: server-controlled initial state and driver eligibility.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_driverhub_application_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE job_row public.jobs%ROWTYPE;
BEGIN
  IF public.is_driverhub_admin() OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF auth.uid() <> NEW.driver_id OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'driver' AND status::text = 'active'
  ) THEN
    RAISE EXCEPTION 'Only an active driver account can apply to jobs';
  END IF;
  SELECT * INTO job_row FROM public.jobs WHERE id = NEW.job_id;
  IF NOT FOUND OR job_row.status::text <> 'active' OR (job_row.expires_at IS NOT NULL AND job_row.expires_at <= now()) THEN
    RAISE EXCEPTION 'This job is no longer accepting applications';
  END IF;
  IF job_row.application_deadline IS NOT NULL AND job_row.application_deadline::date < current_date THEN
    RAISE EXCEPTION 'The application deadline for this job has passed';
  END IF;
  NEW.status := 'applied';
  NEW.employer_notes := NULL;
  NEW.interview_date := NULL;
  NEW.interview_mode := NULL;
  NEW.interview_location := NULL;
  NEW.applied_date := now();
  NEW.updated_date := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_driverhub_application_insert ON public.applications;
CREATE TRIGGER guard_driverhub_application_insert BEFORE INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.guard_driverhub_application_insert();

CREATE OR REPLACE FUNCTION public.enforce_driverhub_application_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.id <> OLD.id OR NEW.job_id <> OLD.job_id OR NEW.driver_id <> OLD.driver_id THEN
    RAISE EXCEPTION 'Application owner and job cannot be changed';
  END IF;
  IF auth.uid() = OLD.driver_id AND NOT public.is_driverhub_admin() THEN
    IF NEW.status <> OLD.status AND (NEW.status <> 'withdrawn' OR OLD.status IN ('hired', 'rejected', 'withdrawn')) THEN
      RAISE EXCEPTION 'Drivers may only withdraw their own active application';
    END IF;
    IF NEW.employer_notes IS DISTINCT FROM OLD.employer_notes OR NEW.interview_date IS DISTINCT FROM OLD.interview_date
       OR NEW.interview_mode IS DISTINCT FROM OLD.interview_mode OR NEW.interview_location IS DISTINCT FROM OLD.interview_location THEN
      RAISE EXCEPTION 'Drivers cannot edit employer review fields';
    END IF;
  END IF;
  IF NOT public.is_driverhub_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'employer'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = OLD.job_id AND j.employer_id = auth.uid()) THEN
      RAISE EXCEPTION 'Employers may only update applications for their own jobs';
    END IF;
    IF NEW.cover_message IS DISTINCT FROM OLD.cover_message OR NEW.resume_url IS DISTINCT FROM OLD.resume_url OR NEW.applied_date IS DISTINCT FROM OLD.applied_date THEN
      RAISE EXCEPTION 'Employers cannot modify driver-submitted application content';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
      (OLD.status = 'applied' AND NEW.status IN ('viewed', 'under_review', 'shortlisted', 'rejected')) OR
      (OLD.status = 'viewed' AND NEW.status IN ('under_review', 'shortlisted', 'contacted', 'interview', 'rejected')) OR
      (OLD.status = 'under_review' AND NEW.status IN ('shortlisted', 'contacted', 'interview', 'rejected')) OR
      (OLD.status = 'shortlisted' AND NEW.status IN ('contacted', 'interview', 'selected', 'hired', 'rejected')) OR
      (OLD.status = 'contacted' AND NEW.status IN ('interview', 'selected', 'hired', 'rejected')) OR
      (OLD.status = 'interview' AND NEW.status IN ('selected', 'hired', 'rejected')) OR
      (OLD.status = 'selected' AND NEW.status IN ('hired', 'rejected'))
    ) THEN RAISE EXCEPTION 'Invalid application status transition'; END IF;
  END IF;
  NEW.updated_date := now();
  RETURN NEW;
END;
$$;

-- Application, message and unlock notifications. A driver withdrawing now
-- notifies the employer (not the driver who just did it).
CREATE OR REPLACE FUNCTION public.notify_driverhub_marketplace_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_employer uuid;
  target_title text;
  receiver_role text;
BEGIN
  IF TG_TABLE_NAME = 'applications' THEN
    SELECT jobs.employer_id, jobs.title INTO target_employer, target_title
      FROM public.jobs WHERE jobs.id = NEW.job_id;
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.notifications(user_id, title, message, type, link)
      VALUES (target_employer, 'New driver application', 'A driver applied for ' || COALESCE(target_title, 'your job') || '.', 'new_application', '/employer/applications');
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status::text = 'withdrawn' AND auth.uid() IS NOT DISTINCT FROM NEW.driver_id THEN
        INSERT INTO public.notifications(user_id, title, message, type, link)
        VALUES (target_employer, 'Application withdrawn', 'A driver withdrew their application for ' || COALESCE(target_title, 'your job') || '.', 'new_application', '/employer/applications');
      ELSE
        INSERT INTO public.notifications(user_id, title, message, type, link)
        VALUES (NEW.driver_id, 'Application status updated', 'Your application for ' || COALESCE(target_title, 'a driver job') || ' is now ' || replace(NEW.status::text, '_', ' ') || '.', 'application_status', '/driver/applications');
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'direct_messages' THEN
    SELECT role::text INTO receiver_role FROM public.profiles WHERE id = NEW.receiver_id;
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (NEW.receiver_id, 'New message from ' || COALESCE(NEW.sender_name, 'DriverHub user'), left(NEW.text, 120), 'system',
      CASE WHEN receiver_role = 'employer' THEN '/employer/messages' ELSE '/driver/messages' END);
  ELSIF TG_TABLE_NAME = 'candidate_unlocks' THEN
    SELECT companies.company_name INTO target_title FROM public.companies WHERE companies.user_id = NEW.employer_id;
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (NEW.driver_id, 'An employer viewed your contact', COALESCE(target_title, 'An employer') || ' unlocked your driver profile.', 'application_status', '/driver/profile');
  END IF;
  RETURN NEW;
END;
$$;

-- Re-reviewing a document with the same result no longer sends a duplicate notification.
CREATE OR REPLACE FUNCTION public.review_driverhub_document(p_document_id uuid, p_status text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  reviewed_driver uuid;
  reviewed_type text;
  previous_status text;
BEGIN
  IF NOT public.is_driverhub_admin() THEN RAISE EXCEPTION 'Administrator access is required'; END IF;
  IF p_status NOT IN ('verified', 'rejected') THEN RAISE EXCEPTION 'Invalid document review status'; END IF;
  SELECT driver_id, type::text, verification_status::text INTO reviewed_driver, reviewed_type, previous_status
    FROM public.driver_documents WHERE id = p_document_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Driver document was not found'; END IF;
  IF previous_status = p_status THEN RETURN true; END IF;

  UPDATE public.driver_documents SET verification_status = p_status::public.verification_status
    WHERE id = p_document_id;
  IF reviewed_type = 'police_verification' THEN
    UPDATE public.driver_profiles SET police_verified = (p_status = 'verified')
      WHERE user_id = reviewed_driver;
  END IF;
  INSERT INTO public.notifications(user_id, title, message, type, link)
  VALUES (reviewed_driver, 'Document review complete',
    'Your ' || replace(reviewed_type, '_', ' ') || ' document was ' || p_status || '.',
    'system', '/driver/documents');
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.review_driverhub_document(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_driverhub_document(uuid,text) TO authenticated;

-- ---------------------------------------------------------------------
-- 9. Keep the structured location chosen at signup. With email confirmation
-- on, the browser has no session after signUp, so only this trigger can store
-- district / PIN / formatted location from the signup metadata. It only
-- updates DriverHub rows that the signup triggers created.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_driverhub_signup_location()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_district text := NULLIF(trim(meta ->> 'district'), '');
  v_pincode text := NULLIF(trim(meta ->> 'pincode'), '');
  v_location text := NULLIF(trim(meta ->> 'location'), '');
BEGIN
  IF v_district IS NULL AND v_pincode IS NULL AND v_location IS NULL THEN RETURN NEW; END IF;
  UPDATE public.profiles
     SET district = COALESCE(v_district, district), pincode = COALESCE(v_pincode, pincode),
         location = COALESCE(v_location, location), updated_at = now()
   WHERE id = NEW.id;
  UPDATE public.driver_profiles
     SET district = COALESCE(v_district, district), pincode = COALESCE(v_pincode, pincode),
         preferred_location = COALESCE(preferred_location, v_location), updated_at = now()
   WHERE user_id = NEW.id;
  UPDATE public.companies
     SET district = COALESCE(v_district, district), pincode = COALESCE(v_pincode, pincode),
         location = COALESCE(v_location, location), updated_at = now()
   WHERE user_id = NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block account creation.
  RAISE WARNING 'apply_driverhub_signup_location: %', SQLERRM;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS zzz_apply_driverhub_signup_location ON auth.users;
CREATE TRIGGER zzz_apply_driverhub_signup_location
  AFTER INSERT ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.apply_driverhub_signup_location();

-- ---------------------------------------------------------------------
-- 3. Public homepage counters (aggregates only).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_driverhub_public_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH live_jobs AS (
    SELECT lower(trim(job.category)) AS category_key, greatest(COALESCE(job.vacancies, 1), 1) AS openings
    FROM public.jobs AS job
    WHERE job.status::text = 'active'
      AND (job.expires_at IS NULL OR job.expires_at > now())
      AND (job.application_deadline IS NULL OR job.application_deadline::date >= current_date)
  )
  SELECT jsonb_build_object(
    'verifiedDrivers', (
      SELECT count(*) FROM public.profiles AS profile
      JOIN public.driver_profiles AS driver ON driver.user_id = profile.id
      WHERE profile.role::text = 'driver' AND profile.status::text = 'active'
    ),
    'verifiedEmployers', (
      SELECT count(*) FROM public.companies AS company
      JOIN public.profiles AS profile ON profile.id = company.user_id
      WHERE company.verified IS TRUE AND company.status::text = 'active' AND profile.status::text = 'active'
    ),
    'activeVacancies', (SELECT COALESCE(sum(openings), 0) FROM live_jobs),
    'hires', (SELECT count(*) FROM public.applications WHERE status::text = 'hired'),
    'vacanciesByCategory', (
      SELECT COALESCE(jsonb_object_agg(category_key, openings), '{}'::jsonb)
      FROM (SELECT category_key, sum(openings) AS openings FROM live_jobs
            WHERE category_key IS NOT NULL AND category_key <> '' GROUP BY category_key) AS grouped
    )
  );
$$;
REVOKE ALL ON FUNCTION public.get_driverhub_public_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_driverhub_public_stats() TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 1 + 2. Privileges. Row-level security policies still decide which rows
-- each user can see or change.
-- ---------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.jobs, public.companies TO anon;
GRANT EXECUTE ON FUNCTION public.is_driverhub_admin() TO anon, authenticated;
DO $$ BEGIN
  IF to_regprocedure('public.driverhub_user_applied_to_job(uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.driverhub_user_applied_to_job(uuid) TO authenticated;
  END IF;
END $$;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'driver_profiles', 'driver_experiences', 'driver_experience', 'driver_documents',
    'companies', 'employer_subscriptions', 'billing_transactions', 'saved_searches',
    'candidate_unlocks', 'jobs', 'applications', 'favorite_jobs', 'favorites', 'shortlists',
    'direct_messages', 'notifications', 'admin_actions', 'job_entitlement_events'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    END IF;
  END LOOP;
END $$;
-- ---------------------------------------------------------------------
-- 10. Payment orders (same definitions as supabase-payment-checkout.sql).
-- Some live databases never received that file, which leaves checkout
-- without its order table and the trusted plan-activation function.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.driverhub_payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_order_id text NOT NULL UNIQUE,
  provider_payment_id text UNIQUE,
  plan_code text NOT NULL CHECK (plan_code IN ('jobs-3', 'jobs-6', 'jobs-13', 'unlimited-quarterly')),
  plan_name text NOT NULL,
  amount_paise integer NOT NULL CHECK (amount_paise > 0),
  job_credits integer NOT NULL DEFAULT 0 CHECK (job_credits >= 0),
  database_credits integer NOT NULL DEFAULT 0 CHECK (database_credits >= 0),
  active_job_slots integer NOT NULL DEFAULT 0 CHECK (active_job_slots >= 0),
  validity_days integer NOT NULL CHECK (validity_days > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
ALTER TABLE public.driverhub_payment_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.driverhub_payment_orders FROM anon, authenticated;
GRANT ALL ON public.driverhub_payment_orders TO service_role;

CREATE OR REPLACE FUNCTION public.complete_driverhub_payment(p_order_id uuid, p_payment_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  payment_order public.driverhub_payment_orders%ROWTYPE;
  old_expiry timestamptz;
  next_expiry timestamptz;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Only the trusted payment verifier may grant hiring entitlements';
  END IF;
  SELECT * INTO payment_order FROM public.driverhub_payment_orders
    WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment order was not found'; END IF;
  IF payment_order.status = 'paid' THEN
    IF payment_order.provider_payment_id = p_payment_id THEN RETURN true; END IF;
    RAISE EXCEPTION 'Payment order is already completed';
  END IF;
  IF payment_order.status <> 'pending' OR length(trim(p_payment_id)) = 0 THEN
    RAISE EXCEPTION 'Payment order is not payable';
  END IF;

  -- Two orders for the same employer completing at once must not both read the
  -- old plan and overwrite each other's credits or expiry.
  PERFORM pg_advisory_xact_lock(hashtextextended('driverhub_plan:' || payment_order.employer_id::text, 0));
  PERFORM 1 FROM public.employer_subscriptions WHERE employer_id = payment_order.employer_id FOR UPDATE;
  SELECT expires_at INTO old_expiry FROM public.employer_subscriptions
    WHERE employer_id = payment_order.employer_id AND status = 'active' AND expires_at > now();
  next_expiry := greatest(COALESCE(old_expiry, now()), now()) + make_interval(days => payment_order.validity_days);

  INSERT INTO public.employer_subscriptions (
    employer_id, plan_name, job_credits, db_unlock_credits, total_job_credits,
    total_db_unlock_credits, active_job_slots, status, expires_at, gstin,
    billing_company_name, billing_address, gstin_verified
  ) VALUES (
    payment_order.employer_id, payment_order.plan_name, payment_order.job_credits,
    payment_order.database_credits, payment_order.job_credits, payment_order.database_credits,
    payment_order.active_job_slots, 'active', next_expiry, '', '', '', false
  ) ON CONFLICT (employer_id) DO UPDATE SET
    plan_name = EXCLUDED.plan_name,
    job_credits = CASE WHEN old_expiry IS NOT NULL THEN employer_subscriptions.job_credits + EXCLUDED.job_credits ELSE EXCLUDED.job_credits END,
    db_unlock_credits = CASE WHEN old_expiry IS NOT NULL THEN employer_subscriptions.db_unlock_credits + EXCLUDED.db_unlock_credits ELSE EXCLUDED.db_unlock_credits END,
    total_job_credits = CASE WHEN old_expiry IS NOT NULL THEN employer_subscriptions.total_job_credits + EXCLUDED.total_job_credits ELSE EXCLUDED.total_job_credits END,
    total_db_unlock_credits = CASE WHEN old_expiry IS NOT NULL THEN employer_subscriptions.total_db_unlock_credits + EXCLUDED.total_db_unlock_credits ELSE EXCLUDED.total_db_unlock_credits END,
    active_job_slots = CASE WHEN old_expiry IS NOT NULL THEN greatest(employer_subscriptions.active_job_slots, EXCLUDED.active_job_slots) ELSE EXCLUDED.active_job_slots END,
    status = 'active', expires_at = next_expiry, updated_at = now();

  UPDATE public.driverhub_payment_orders SET status = 'paid', provider_payment_id = p_payment_id, paid_at = now()
    WHERE id = p_order_id;
  UPDATE public.billing_transactions SET status = 'Success', applies_until = next_expiry,
      invoice_id = 'DH-' || upper(substr(replace(p_order_id::text, '-', ''), 1, 12)),
      job_credits_added = payment_order.job_credits, db_credits_added = payment_order.database_credits
    WHERE id = p_order_id AND employer_id = payment_order.employer_id;
  INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (payment_order.employer_id, 'Hiring plan activated', payment_order.plan_name || ' is active.', 'system', '/employer/billing');
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_driverhub_payment(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_driverhub_payment(uuid,text) TO service_role;


-- Driver licences and ID documents stay in a private bucket (uploads use
-- <driver uid>/<file>; viewing goes through short-lived signed links).
INSERT INTO storage.buckets (id, name, public) VALUES ('driver-documents', 'driver-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;
UPDATE storage.buckets SET public = false WHERE id = 'resumes';

-- Live updates for every table the app subscribes to.
DO $$
DECLARE table_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH table_name IN ARRAY ARRAY[
      'jobs', 'applications', 'profiles', 'driver_profiles', 'driver_documents', 'driver_experiences',
      'favorite_jobs', 'saved_searches', 'candidate_unlocks', 'direct_messages', 'notifications',
      'employer_subscriptions', 'billing_transactions', 'companies'
    ] LOOP
      IF to_regclass('public.' || table_name) IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = table_name
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
      END IF;
    END LOOP;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
