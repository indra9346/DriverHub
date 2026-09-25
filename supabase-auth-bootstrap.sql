-- DriverHub Auth bootstrap. Apply in Supabase SQL Editor.
-- Safe, crash-proof user signup trigger that provisions profiles, driver profiles, and employer starter plans.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('driver', 'employer', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('active', 'pending', 'blocked', 'suspended');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

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
  requested_role := LOWER(COALESCE(NEW.raw_user_meta_data ->> 'role', 'driver'));
  IF requested_role = 'employer' THEN
    assigned_role := 'employer'::public.user_role;
  ELSE
    assigned_role := 'driver'::public.user_role;
  END IF;

  user_full_name := NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), '');
  IF user_full_name IS NULL THEN
    user_full_name := split_part(NEW.email, '@', 1);
  END IF;

  user_phone := NULLIF(TRIM(NEW.raw_user_meta_data ->> 'phone'), '');
  user_city := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'city'), ''), 'Bengaluru');
  user_state := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'state'), ''), 'Karnataka');
  company_nm := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'company_name'), ''), user_full_name || ' Fleet');
  user_industry := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'industry'), ''), 'Logistics & Transport');

  INSERT INTO public.profiles (
    id, role, full_name, email, phone, city, state, status, created_at, updated_at
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

  IF assigned_role = 'driver' THEN
    INSERT INTO public.driver_profiles (
      id, user_id, driver_category, years_experience, skills, availability, created_at, updated_at
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

  IF assigned_role = 'employer' THEN
    INSERT INTO public.companies (
      id, user_id, company_name, contact_person, email, phone, industry, city, state, location, verified, status, created_at, updated_at
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

    INSERT INTO public.employer_subscriptions (
      id, employer_id, plan_name, job_credits, db_unlock_credits, total_job_credits, total_db_unlock_credits, active_job_slots, status, expires_at, created_at, updated_at
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
  RAISE WARNING 'handle_new_driverhub_user warning: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_driverhub ON auth.users;

CREATE TRIGGER on_auth_user_created_driverhub
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_driverhub_user();
