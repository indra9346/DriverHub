-- ==============================================================================
-- DriverHub India-Wide Spatial & Radius Candidate Search Migration
-- ==============================================================================
-- Adds latitude, longitude, district, and pincode columns to profiles and driver_profiles.
-- Creates spatial indices and updates search_driverhub_candidates RPC with exact
-- spherical Haversine distance calculation and radius filtering.
-- ==============================================================================

-- 1. Schema Extensions for Geographic Coordinates & Structured Locations
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pincode text;

ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS pincode text;

-- 2. Performance Indices for Spatial & Location Filtering
CREATE INDEX IF NOT EXISTS idx_driver_profiles_lat_lng ON public.driver_profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_profiles_lat_lng ON public.profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_profiles_district ON public.profiles(district);
CREATE INDEX IF NOT EXISTS idx_profiles_pincode ON public.profiles(pincode);

-- 3. Replace search_driverhub_candidates RPC with Spatial Distance & Radius Filter
DROP FUNCTION IF EXISTS public.search_driverhub_candidates(text,text,text,text,integer,text,text,uuid,integer,integer,integer);
DROP FUNCTION IF EXISTS public.search_driverhub_candidates(text,text,text,text,text,text,double precision,double precision,double precision,integer,text,text,uuid,integer,integer,integer);

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
      COALESCE(d.district, p.district, '') AS c_district,
      COALESCE(p.state, '') AS c_state,
      COALESCE(d.pincode, p.pincode, '') AS c_pincode,
      COALESCE(d.latitude, p.latitude) AS c_lat,
      COALESCE(d.longitude, p.longitude) AS c_lng,
      CASE 
        WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND COALESCE(d.latitude, p.latitude) IS NOT NULL AND COALESCE(d.longitude, p.longitude) IS NOT NULL THEN
          ROUND(
            (6371 * 2 * ASIN(
              SQRT(
                POWER(SIN(RADIANS(COALESCE(d.latitude, p.latitude) - p_lat) / 2), 2) +
                COS(RADIANS(p_lat)) * COS(RADIANS(COALESCE(d.latitude, p.latitude))) *
                POWER(SIN(RADIANS(COALESCE(d.longitude, p.longitude) - p_lng) / 2), 2)
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
      d.preferred_location AS c_preferred_location,
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
      AND (p_city IS NULL OR concat_ws(' ', p.city, d.preferred_location) ILIKE '%' || p_city || '%')
      AND (p_district IS NULL OR concat_ws(' ', COALESCE(d.district, p.district, ''), d.preferred_location) ILIKE '%' || p_district || '%')
      AND (p_state IS NULL OR concat_ws(' ', p.state, d.preferred_location) ILIKE '%' || p_state || '%')
      AND (p_pincode IS NULL OR COALESCE(d.pincode, p.pincode, '') = p_pincode)
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
