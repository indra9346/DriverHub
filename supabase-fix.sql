-- =====================================================================
-- DRIVER HUB — IMMEDIATE SUPABASE AUTH & REGISTRATION FIX
-- Run this in your Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- =====================================================================

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Ensure custom ENUM types exist safely
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('driver', 'employer', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('active', 'pending', 'blocked', 'suspended');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Ensure profiles and dependent tables exist with proper columns
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'driver',
  full_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  location TEXT,
  city TEXT DEFAULT 'Bengaluru',
  state TEXT DEFAULT 'Karnataka',
  status public.user_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.driver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_category TEXT,
  years_experience INTEGER DEFAULT 0,
  license_number TEXT,
  license_type TEXT,
  license_expiry DATE,
  skills TEXT[] DEFAULT '{}',
  preferred_location TEXT,
  expected_salary INTEGER,
  availability TEXT DEFAULT 'Flexible',
  bio TEXT,
  resume_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  industry TEXT,
  location TEXT,
  city TEXT,
  state TEXT,
  address TEXT,
  website TEXT,
  logo_url TEXT,
  description TEXT,
  verified BOOLEAN DEFAULT false,
  status public.user_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'Starter Fleet Hiring Plan (4 Job Credits + 50 Driver Unlocks)',
  job_credits INTEGER NOT NULL DEFAULT 4,
  db_unlock_credits INTEGER NOT NULL DEFAULT 50,
  total_job_credits INTEGER NOT NULL DEFAULT 5,
  total_db_unlock_credits INTEGER NOT NULL DEFAULT 50,
  active_job_slots INTEGER NOT NULL DEFAULT 2,
  gstin TEXT DEFAULT '29AAKCB0612Q1ZC',
  gstin_verified BOOLEAN DEFAULT true,
  billing_company_name TEXT,
  billing_address TEXT,
  status TEXT DEFAULT 'active',
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '90 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ROBUST, CRASH-PROOF AUTH TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_driverhub_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  requested_role text;
  assigned_role public.user_role;
  user_full_name text;
  user_phone text;
  user_city text;
  user_state text;
  company_nm text;
  user_industry text;
BEGIN
  -- Determine role safely
  requested_role := LOWER(COALESCE(NEW.raw_user_meta_data ->> 'role', 'driver'));
  IF requested_role = 'employer' THEN
    assigned_role := 'employer'::public.user_role;
  ELSE
    assigned_role := 'driver'::public.user_role;
  END IF;

  -- Extract metadata safely with fallbacks
  user_full_name := NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), '');
  IF user_full_name IS NULL THEN
    user_full_name := split_part(NEW.email, '@', 1);
  END IF;

  user_phone := NULLIF(TRIM(NEW.raw_user_meta_data ->> 'phone'), '');
  user_city := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'city'), ''), 'Bengaluru');
  user_state := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'state'), ''), 'Karnataka');
  company_nm := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'company_name'), ''), user_full_name || ' Fleet');
  user_industry := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'industry'), ''), 'Logistics & Transport');

  -- Step A: Upsert into public.profiles (never fail on conflict)
  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    email,
    phone,
    city,
    state,
    status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    assigned_role,
    user_full_name,
    LOWER(TRIM(NEW.email)),
    user_phone,
    user_city,
    user_state,
    'active'::public.user_status,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    city = COALESCE(EXCLUDED.city, public.profiles.city),
    state = COALESCE(EXCLUDED.state, public.profiles.state),
    updated_at = now();

  -- Step B: Driver Profile setup
  IF assigned_role = 'driver' THEN
    INSERT INTO public.driver_profiles (
      id,
      user_id,
      driver_category,
      years_experience,
      skills,
      availability,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.id,
      NULLIF(NEW.raw_user_meta_data ->> 'driver_category', ''),
      COALESCE((NEW.raw_user_meta_data ->> 'experience_years')::integer, 0),
      ARRAY['Safe Driving', 'Route Navigation'],
      'Immediate',
      now(),
      now()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Step C: Employer Setup (Company + Starter Credits)
  IF assigned_role = 'employer' THEN
    INSERT INTO public.companies (
      id,
      user_id,
      company_name,
      contact_person,
      email,
      phone,
      industry,
      city,
      state,
      location,
      verified,
      status,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.id,
      company_nm,
      user_full_name,
      LOWER(TRIM(NEW.email)),
      user_phone,
      user_industry,
      user_city,
      user_state,
      user_city || ', ' || user_state,
      false,
      'pending'::public.user_status,
      now(),
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      contact_person = EXCLUDED.contact_person,
      email = EXCLUDED.email,
      phone = COALESCE(EXCLUDED.phone, public.companies.phone),
      industry = COALESCE(EXCLUDED.industry, public.companies.industry),
      updated_at = now();

    -- Create initial starter subscription with job posting credits
    INSERT INTO public.employer_subscriptions (
      id,
      employer_id,
      plan_name,
      job_credits,
      db_unlock_credits,
      total_job_credits,
      total_db_unlock_credits,
      active_job_slots,
      status,
      expires_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      NEW.id,
      'Starter Fleet Hiring Plan (4 Job Credits + 50 Driver Unlocks)',
      4,
      50,
      5,
      50,
      2,
      'active',
      now() + interval '90 days',
      now(),
      now()
    )
    ON CONFLICT (employer_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never abort user creation in auth.users
  RAISE WARNING 'handle_new_driverhub_user warning: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 5. Re-bind the trigger cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_driverhub ON auth.users;

CREATE TRIGGER on_auth_user_created_driverhub
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_driverhub_user();

-- 6. Grant proper permissions to authenticated & anon roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.jobs TO anon, authenticated;
GRANT SELECT ON public.companies TO anon, authenticated;
