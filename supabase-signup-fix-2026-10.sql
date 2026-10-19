-- =====================================================================
-- DriverHub sign-up fix (2026-10-19)
-- Run once in the Supabase SQL Editor, after supabase-live-repair-2026-10.sql.
-- Safe to run again. Only touches DriverHub objects (this project is shared
-- with other apps).
--
-- Found on the live site: an employer who registered was saved with the role
-- "driver" (the site then opened the driver dashboard) and kept a free
-- "Starter" plan with 4 job credits, 50 unlocks and a sample GSTIN marked as
-- verified. The sign-up trigger only set the role when it created the profile
-- row; when a row already existed it kept that row's role (the column default
-- is 'driver'), and the clean-up trigger skipped non-employers.
--
--  1. The role chosen at sign-up (driver or employer, never admin) is stored
--     even if a profile row already exists, and a last-running trigger corrects
--     it if anything else changed it.
--  2. New employers start with no credits, an unverified company and no
--     GSTIN. Credits only come from a verified payment (or
--     supabase-activate-plan.sql).
--  3. Accounts of the other apps in this project (sign-ups without a DriverHub
--     role) no longer get a DriverHub driver profile.
--  4. Accounts already affected are repaired.
--  5. A test sign-up (employer, driver, other app) runs and is rolled back.
--     The result table shows its outcome, what was repaired, and every
--     trigger that runs when an account is created.
-- =====================================================================

DROP TABLE IF EXISTS pg_temp.driverhub_signup_report;
CREATE TEMP TABLE driverhub_signup_report (ord integer, status text, check_name text, detail text);

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Defaults: no free plan and no sample GSTIN for rows created later.
-- ---------------------------------------------------------------------
ALTER TABLE public.employer_subscriptions ALTER COLUMN plan_name SET DEFAULT 'No active hiring plan';
ALTER TABLE public.employer_subscriptions ALTER COLUMN job_credits SET DEFAULT 0;
ALTER TABLE public.employer_subscriptions ALTER COLUMN db_unlock_credits SET DEFAULT 0;
ALTER TABLE public.employer_subscriptions ALTER COLUMN total_job_credits SET DEFAULT 0;
ALTER TABLE public.employer_subscriptions ALTER COLUMN total_db_unlock_credits SET DEFAULT 0;
ALTER TABLE public.employer_subscriptions ALTER COLUMN active_job_slots SET DEFAULT 0;
ALTER TABLE public.employer_subscriptions ALTER COLUMN status SET DEFAULT 'expired';
ALTER TABLE public.employer_subscriptions ALTER COLUMN expires_at SET DEFAULT now();
ALTER TABLE public.employer_subscriptions ALTER COLUMN gstin DROP DEFAULT;
ALTER TABLE public.employer_subscriptions ALTER COLUMN gstin_verified SET DEFAULT false;
ALTER TABLE public.companies ALTER COLUMN verified SET DEFAULT false;

-- ---------------------------------------------------------------------
-- 2. Sign-up trigger: profile, driver profile or company + empty plan.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_driverhub_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
-- driverhub-signup-v2: the chosen role wins; employers start without a plan.
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  requested_role text := lower(trim(COALESCE(meta ->> 'role', '')));
  assigned_role public.user_role;
  user_full_name text := COALESCE(NULLIF(trim(meta ->> 'full_name'), ''), split_part(NEW.email, '@', 1));
  user_phone text := NULLIF(trim(meta ->> 'phone'), '');
  user_city text := COALESCE(NULLIF(trim(meta ->> 'city'), ''), '');
  user_state text := COALESCE(NULLIF(trim(meta ->> 'state'), ''), '');
  experience text := NULLIF(trim(meta ->> 'experience_years'), '');
BEGIN
  -- Only DriverHub registrations carry a DriverHub role. Accounts of the other
  -- apps in this project, and admins added in the dashboard (see
  -- supabase-make-admin.sql), get no DriverHub rows here.
  IF requested_role NOT IN ('driver', 'employer') THEN
    RETURN NEW;
  END IF;
  assigned_role := requested_role::public.user_role;

  INSERT INTO public.profiles (id, role, full_name, email, phone, city, state, status, created_at, updated_at)
  VALUES (NEW.id, assigned_role, user_full_name, lower(trim(NEW.email)), user_phone, user_city, user_state,
          'active'::public.user_status, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    -- A row that already exists for a brand-new account was just created by
    -- another trigger with the column default 'driver': the chosen role wins.
    role = CASE WHEN public.profiles.role::text = 'admin' THEN public.profiles.role ELSE EXCLUDED.role END,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    city = COALESCE(NULLIF(EXCLUDED.city, ''), public.profiles.city),
    state = COALESCE(NULLIF(EXCLUDED.state, ''), public.profiles.state),
    updated_at = now();

  IF assigned_role = 'driver' THEN
    INSERT INTO public.driver_profiles (id, user_id, driver_category, years_experience, skills, availability, created_at, updated_at)
    VALUES (NEW.id, NEW.id, NULLIF(meta ->> 'driver_category', ''),
            CASE WHEN experience ~ '^[0-9]{1,2}$' THEN experience::integer ELSE 0 END,
            ARRAY['Safe Driving', 'Route Navigation'], 'Immediate', now(), now())
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    -- Verification is an admin decision; credits come from a verified payment.
    INSERT INTO public.companies (id, user_id, company_name, contact_person, email, phone, industry, city, state, location,
                                  verified, status, created_at, updated_at)
    VALUES (NEW.id, NEW.id,
            COALESCE(NULLIF(trim(meta ->> 'company_name'), ''), user_full_name || ' Fleet'),
            user_full_name, lower(trim(NEW.email)), user_phone,
            COALESCE(NULLIF(trim(meta ->> 'industry'), ''), 'Logistics & Transport'),
            user_city, user_state, NULLIF(concat_ws(', ', NULLIF(user_city, ''), NULLIF(user_state, '')), ''),
            false, 'pending'::public.user_status, now(), now())
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.employer_subscriptions (employer_id, plan_name, job_credits, db_unlock_credits, total_job_credits,
                                               total_db_unlock_credits, active_job_slots, status, expires_at, gstin, gstin_verified,
                                               created_at, updated_at)
    VALUES (NEW.id, 'No active hiring plan', 0, 0, 0, 0, 0, 'expired', now(), NULL, false, now(), now())
    ON CONFLICT (employer_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block account creation; the browser completes missing rows.
  RAISE WARNING 'handle_new_driverhub_user: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_driverhub ON auth.users;
CREATE TRIGGER on_auth_user_created_driverhub
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_driverhub_user();

-- ---------------------------------------------------------------------
-- 3. Last check when an account is created (triggers run in name order, so
--    "zzzz_" runs after every other one): correct the role if anything else
--    changed it, and make sure a new employer has no free plan.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_driverhub_signup_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  requested_role text := lower(trim(COALESCE(NEW.raw_user_meta_data ->> 'role', '')));
BEGIN
  IF requested_role NOT IN ('driver', 'employer') THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles SET role = requested_role::public.user_role, updated_at = now()
   WHERE id = NEW.id AND role::text NOT IN (requested_role, 'admin');

  IF requested_role = 'employer' THEN
    DELETE FROM public.driver_profiles WHERE user_id = NEW.id;
    UPDATE public.employer_subscriptions
       SET plan_name = 'No active hiring plan', job_credits = 0, db_unlock_credits = 0, total_job_credits = 0,
           total_db_unlock_credits = 0, active_job_slots = 0, status = 'expired', expires_at = now(),
           gstin = NULL, gstin_verified = false, updated_at = now()
     WHERE employer_id = NEW.id
       AND (job_credits <> 0 OR db_unlock_credits <> 0 OR active_job_slots <> 0 OR status <> 'expired'
            OR gstin IS NOT NULL OR gstin_verified IS DISTINCT FROM false);
    UPDATE public.companies SET verified = false, status = 'pending'::public.user_status, updated_at = now()
     WHERE user_id = NEW.id AND (verified OR status::text <> 'pending');
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'enforce_driverhub_signup_role: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzzz_enforce_driverhub_signup_role ON auth.users;
CREATE TRIGGER zzzz_enforce_driverhub_signup_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_driverhub_signup_role();

REVOKE ALL ON FUNCTION public.handle_new_driverhub_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_driverhub_signup_role() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Repair accounts that were already affected.
-- ---------------------------------------------------------------------
DO $repair$
DECLARE
  n_roles integer := 0;
  n_unverified integer := 0;
  n_plans integer := 0;
  n_gstin integer := 0;
  n_company_gstin integer := 0;
BEGIN
  -- Employers saved as drivers: their sign-up asked for "employer", they have a
  -- DriverHub company, and they never applied to a job as a driver.
  WITH fixed AS (
    UPDATE public.profiles p SET role = 'employer'::public.user_role, updated_at = now()
      FROM auth.users u
     WHERE u.id = p.id
       AND lower(u.raw_user_meta_data ->> 'role') = 'employer'
       AND p.role::text = 'driver'
       AND EXISTS (SELECT 1 FROM public.companies c WHERE c.user_id = p.id)
       AND NOT EXISTS (SELECT 1 FROM public.applications a WHERE a.driver_id = p.id)
    RETURNING p.id
  ), removed AS (
    DELETE FROM public.driver_profiles d USING fixed WHERE d.user_id = fixed.id RETURNING d.user_id
  )
  SELECT count(*) INTO n_roles FROM fixed;

  -- Companies verified automatically together with the free plan (no admin
  -- ever verified them) go back to admin review.
  IF to_regclass('public.admin_actions') IS NOT NULL THEN
    UPDATE public.companies c SET verified = false, status = 'pending'::public.user_status, updated_at = now()
      FROM public.employer_subscriptions s
     WHERE s.employer_id = c.user_id AND s.plan_name ILIKE 'Starter Fleet Hiring Plan%' AND c.verified
       -- Compared as text: target_id is uuid on some databases, text on others.
       AND NOT EXISTS (SELECT 1 FROM public.admin_actions a
                        WHERE a.target_type::text = 'employer' AND a.target_id::text = c.user_id::text
                          AND a.action::text = 'verify');
  ELSE
    UPDATE public.companies c SET verified = false, status = 'pending'::public.user_status, updated_at = now()
      FROM public.employer_subscriptions s
     WHERE s.employer_id = c.user_id AND s.plan_name ILIKE 'Starter Fleet Hiring Plan%' AND c.verified;
  END IF;
  GET DIAGNOSTICS n_unverified = ROW_COUNT;

  -- Free Starter plans were never paid for.
  UPDATE public.employer_subscriptions
     SET plan_name = 'No active hiring plan', job_credits = 0, db_unlock_credits = 0, total_job_credits = 0,
         total_db_unlock_credits = 0, active_job_slots = 0, status = 'expired', expires_at = now(), updated_at = now()
   WHERE plan_name ILIKE 'Starter Fleet Hiring Plan%';
  GET DIAGNOSTICS n_plans = ROW_COUNT;

  -- 29AAKCB0612Q1ZC is the sample GSTIN from the demo data.
  UPDATE public.employer_subscriptions SET gstin = NULL, gstin_verified = false, updated_at = now()
   WHERE gstin = '29AAKCB0612Q1ZC';
  GET DIAGNOSTICS n_gstin = ROW_COUNT;
  UPDATE public.companies SET gstin = NULL, updated_at = now() WHERE gstin = '29AAKCB0612Q1ZC';
  GET DIAGNOSTICS n_company_gstin = ROW_COUNT;

  INSERT INTO pg_temp.driverhub_signup_report VALUES
    (10, 'INFO', 'repaired: employer accounts that were saved as drivers', n_roles::text),
    (11, 'INFO', 'repaired: companies auto-verified at sign-up, back to admin review', n_unverified::text),
    (12, 'INFO', 'repaired: free Starter plans removed', n_plans::text),
    (13, 'INFO', 'repaired: sample GSTIN removed (plans / companies)', n_gstin::text || ' / ' || n_company_gstin::text);
END $repair$;

NOTIFY pgrst, 'reload schema';
COMMIT;

-- ---------------------------------------------------------------------
-- 5. Test sign-up, rolled back: nothing below is kept.
-- ---------------------------------------------------------------------
DO $selftest$
DECLARE
  emp uuid := gen_random_uuid();
  drv uuid := gen_random_uuid();
  other uuid := gen_random_uuid();
  emp_role text; emp_credits text; emp_gstin text; emp_company text; emp_driver_row boolean;
  drv_role text; drv_row boolean;
  other_profile boolean;
  failure text;
BEGIN
  BEGIN
    INSERT INTO auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES
      ('00000000-0000-0000-0000-000000000000', emp, 'authenticated', 'authenticated',
       'driverhub-selftest-employer-' || emp || '@example.invalid', '{"provider":"email","providers":["email"]}',
       '{"role":"employer","full_name":"Self Test","company_name":"Self Test Fleet","industry":"transport","phone":"9000000000","city":"Hindupur","district":"Sri Sathya Sai","state":"Andhra Pradesh","pincode":"515201"}',
       now(), now()),
      ('00000000-0000-0000-0000-000000000000', drv, 'authenticated', 'authenticated',
       'driverhub-selftest-driver-' || drv || '@example.invalid', '{"provider":"email","providers":["email"]}',
       '{"role":"driver","full_name":"Self Test Driver","phone":"9000000001","driver_category":"HMV","experience_years":"3","city":"Hindupur","state":"Andhra Pradesh"}',
       now(), now()),
      ('00000000-0000-0000-0000-000000000000', other, 'authenticated', 'authenticated',
       'driverhub-selftest-otherapp-' || other || '@example.invalid', '{"provider":"email","providers":["email"]}',
       '{"full_name":"Other App User"}', now(), now());

    SELECT role::text INTO emp_role FROM public.profiles WHERE id = emp;
    SELECT job_credits || ' job / ' || db_unlock_credits || ' unlock credits, plan ' || status, COALESCE(gstin, '') || CASE WHEN gstin_verified THEN ' (verified)' ELSE '' END
      INTO emp_credits, emp_gstin FROM public.employer_subscriptions WHERE employer_id = emp;
    SELECT CASE WHEN verified THEN 'verified' ELSE 'unverified' END || ', ' || status::text INTO emp_company FROM public.companies WHERE user_id = emp;
    emp_driver_row := EXISTS (SELECT 1 FROM public.driver_profiles WHERE user_id = emp);
    SELECT role::text INTO drv_role FROM public.profiles WHERE id = drv;
    drv_row := EXISTS (SELECT 1 FROM public.driver_profiles WHERE user_id = drv);
    other_profile := EXISTS (SELECT 1 FROM public.profiles WHERE id = other);

    RAISE EXCEPTION 'driverhub_selftest_rollback';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'driverhub_selftest_rollback' THEN failure := SQLERRM; END IF;
  END;

  IF failure IS NOT NULL THEN
    INSERT INTO pg_temp.driverhub_signup_report VALUES (20, 'FAIL', 'test sign-up could not run', failure);
    RETURN;
  END IF;

  INSERT INTO pg_temp.driverhub_signup_report VALUES
    (20, CASE WHEN emp_role = 'employer' AND NOT emp_driver_row THEN 'PASS' ELSE 'FAIL' END,
         'test sign-up: employer gets the employer role', 'role: ' || COALESCE(emp_role, 'no profile')
         || CASE WHEN emp_driver_row THEN ', also has a driver profile' ELSE '' END),
    (21, CASE WHEN emp_credits LIKE '0 job / 0 unlock credits, plan expired' AND emp_gstin = '' THEN 'PASS' ELSE 'FAIL' END,
         'test sign-up: employer starts with no credits and no GSTIN', COALESCE(emp_credits, 'no plan row') || CASE WHEN emp_gstin <> '' THEN ', GSTIN ' || emp_gstin ELSE '' END),
    (22, CASE WHEN emp_company = 'unverified, pending' THEN 'PASS' ELSE 'FAIL' END,
         'test sign-up: company waits for admin verification', COALESCE(emp_company, 'no company row')),
    (23, CASE WHEN drv_role = 'driver' AND drv_row THEN 'PASS' ELSE 'FAIL' END,
         'test sign-up: driver gets the driver role and a driver profile',
         'role: ' || COALESCE(drv_role, 'no profile') || CASE WHEN drv_row THEN '' ELSE ', no driver profile' END),
    (24, CASE WHEN NOT other_profile THEN 'PASS' ELSE 'WARN' END,
         'test sign-up: an account of another app gets no DriverHub profile',
         CASE WHEN other_profile THEN 'a trigger that is not from DriverHub creates DriverHub profiles: see the trigger list' ELSE '' END);
END $selftest$;

-- ---------------------------------------------------------------------
-- Result: test outcome, repairs, and every trigger on account creation and
-- on profiles ("not DriverHub" rows belong to other apps or older scripts).
-- ---------------------------------------------------------------------
SELECT status, check_name, detail FROM (
  SELECT ord, status, check_name, detail FROM pg_temp.driverhub_signup_report
  UNION ALL
  SELECT 30 + CASE WHEN c.relname = 'users' THEN 0 ELSE 1 END, 'INFO',
         'trigger on ' || n.nspname || '.' || c.relname || ': ' || t.tgname,
         CASE WHEN t.tgtype & 2 <> 0 THEN 'BEFORE ' ELSE 'AFTER ' END
         || concat_ws(' OR ', CASE WHEN t.tgtype & 4 <> 0 THEN 'INSERT' END, CASE WHEN t.tgtype & 16 <> 0 THEN 'UPDATE' END,
                      CASE WHEN t.tgtype & 8 <> 0 THEN 'DELETE' END)
         || ' -> ' || p.proname || '()'
         || CASE WHEN p.proname ILIKE '%driverhub%' OR p.proname IN ('protect_profile_role', 'update_updated_at_column')
                 THEN ' (DriverHub)'
                 WHEN p.prosrc ILIKE '%profiles%' THEN ' (NOT DriverHub, writes to profiles)'
                 ELSE ' (not DriverHub)' END
         || CASE WHEN t.tgenabled = 'D' THEN ' [disabled]' ELSE '' END
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE NOT t.tgisinternal
    AND ((n.nspname = 'auth' AND c.relname = 'users') OR (n.nspname = 'public' AND c.relname = 'profiles'))
) report
ORDER BY ord, check_name;
