-- =====================================================================
-- DRIVERHUB — COMPLETE PRODUCTION SUPABASE DATABASE SCHEMA
-- Includes: Extensions, Custom Types, 15 Tables, Security Functions,
-- Triggers, RLS Policies, Indexes, Storage Buckets, and Grants.
-- Run in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
DO $$ BEGIN CREATE TYPE public.user_role AS ENUM ('driver', 'employer', 'admin'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.user_status AS ENUM ('active', 'pending', 'blocked', 'suspended'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.job_status AS ENUM ('draft', 'pending', 'active', 'closed', 'rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.application_status AS ENUM ('applied', 'viewed', 'under_review', 'shortlisted', 'contacted', 'interview', 'selected', 'hired', 'rejected', 'withdrawn'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.document_type AS ENUM ('resume', 'driving_license', 'aadhar', 'pan', 'experience_cert', 'police_verification', 'other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =====================================================================
-- 3. CORE TABLES DEFINITION
-- =====================================================================

-- TABLE 1: PROFILES (Base user table linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'driver',
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  location TEXT,
  city TEXT DEFAULT 'Bengaluru',
  state TEXT DEFAULT 'Karnataka',
  status public.user_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 2: DRIVER PROFILES (Driver details)
CREATE TABLE IF NOT EXISTS public.driver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_category TEXT DEFAULT 'HMV',
  years_experience INTEGER DEFAULT 0,
  months_experience INTEGER DEFAULT 0,
  license_number TEXT,
  license_type TEXT,
  license_expiry DATE,
  skills TEXT[] DEFAULT ARRAY['Safe Driving', 'Route Navigation'],
  languages TEXT[] DEFAULT ARRAY['Kannada', 'Hindi', 'English'],
  vehicle_types TEXT[] DEFAULT '{}',
  "current_role" TEXT,
  previous_role TEXT,
  education TEXT DEFAULT '10th Pass',
  preferred_location TEXT,
  expected_salary INTEGER DEFAULT 25000,
  availability TEXT DEFAULT 'Immediate',
  night_shift_willing BOOLEAN DEFAULT true,
  outstation_willing BOOLEAN DEFAULT true,
  cv_attached BOOLEAN DEFAULT false,
  police_verified BOOLEAN DEFAULT false,
  unlock_count INTEGER DEFAULT 0,
  bio TEXT,
  resume_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 3: DRIVER EXPERIENCES (Past work history)
CREATE TABLE IF NOT EXISTS public.driver_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  vehicle_type TEXT,
  duration_years NUMERIC(4,1) DEFAULT 1.0,
  start_date DATE,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 4: DRIVER DOCUMENTS (DL, Aadhaar, PAN, Resume)
CREATE TABLE IF NOT EXISTS public.driver_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.document_type DEFAULT 'driving_license',
  file_url TEXT NOT NULL,
  file_size TEXT,
  verification_status public.verification_status DEFAULT 'pending',
  upload_date TIMESTAMPTZ DEFAULT now()
);

-- TABLE 5: COMPANIES (Employer business entity)
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  industry TEXT DEFAULT 'Logistics & Transport',
  location TEXT DEFAULT 'Bengaluru, Karnataka',
  city TEXT DEFAULT 'Bengaluru',
  state TEXT DEFAULT 'Karnataka',
  address TEXT,
  website TEXT,
  logo_url TEXT,
  description TEXT,
  gstin TEXT,
  verified BOOLEAN DEFAULT false,
  status public.user_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 6: EMPLOYER SUBSCRIPTIONS (Credits & Quotas)
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

-- TABLE 7: BILLING TRANSACTIONS (Invoices and credit purchases)
CREATE TABLE IF NOT EXISTS public.billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_details TEXT NOT NULL,
  applies_until TIMESTAMPTZ,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'Success',
  invoice_id TEXT,
  job_credits_added INTEGER DEFAULT 0,
  db_credits_added INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 8: SAVED SEARCHES (Candidate search filters)
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'HMV',
  city TEXT DEFAULT 'Bengaluru',
  min_exp INTEGER DEFAULT 2,
  must_have_skills TEXT[] DEFAULT '{}',
  match_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 9: CANDIDATE UNLOCKS (Tracking unlocked candidate profiles)
CREATE TABLE IF NOT EXISTS public.candidate_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  downloaded_excel BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_employer_driver_unlock UNIQUE (employer_id, driver_id)
);

-- TABLE 10: JOBS (Job postings by employers)
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_logo TEXT,
  posted_by TEXT,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'HMV',
  location TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Bengaluru',
  state TEXT NOT NULL DEFAULT 'Karnataka',
  work_location_type TEXT DEFAULT 'Work From Depot / Office',
  experience_required TEXT DEFAULT '2+ Years',
  experience_min_years INTEGER DEFAULT 2,
  salary_min INTEGER NOT NULL DEFAULT 22000,
  salary_max INTEGER NOT NULL DEFAULT 35000,
  salary_type TEXT DEFAULT 'monthly',
  pay_type TEXT DEFAULT 'Fixed + Incentive',
  perks TEXT[] DEFAULT ARRAY['PF & ESI', 'Overtime Pay', 'Yearly Bonus'],
  night_shift BOOLEAN DEFAULT false,
  vehicle_type TEXT DEFAULT 'Heavy Commercial Vehicle (HCV)',
  route_type TEXT DEFAULT 'Local City & Highway',
  joining_fee_required BOOLEAN DEFAULT false,
  screening_questions TEXT[] DEFAULT '{}',
  working_hours TEXT DEFAULT '9 AM - 6 PM (6 Days/Week)',
  employment_type TEXT DEFAULT 'Full-time',
  description TEXT NOT NULL,
  required_skills TEXT[] DEFAULT ARRAY['Valid Commercial Driving License', 'GPS Navigation'],
  required_docs TEXT[] DEFAULT ARRAY['Driving License', 'Aadhaar Card'],
  vacancies INTEGER DEFAULT 3,
  status public.job_status DEFAULT 'active',
  credit_consumed BOOLEAN DEFAULT true,
  slot_consumed BOOLEAN DEFAULT true,
  posted_date TIMESTAMPTZ DEFAULT now(),
  application_deadline TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '45 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 11: APPLICATIONS (Driver applications to employer jobs)
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resume_url TEXT,
  cover_message TEXT,
  status public.application_status DEFAULT 'applied',
  employer_notes TEXT,
  interview_date TIMESTAMPTZ,
  interview_mode TEXT,
  interview_location TEXT,
  applied_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_job_driver_application UNIQUE (job_id, driver_id)
);

-- TABLE 12: FAVORITE JOBS (Bookmarked jobs by drivers)
CREATE TABLE IF NOT EXISTS public.favorite_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_driver_job_favorite UNIQUE (driver_id, job_id)
);

-- TABLE 13: DIRECT MESSAGES (Chat between employers and drivers)
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_role public.user_role NOT NULL,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_name TEXT NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  job_title TEXT,
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 14: NOTIFICATIONS (System alerts and status updates)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 15: ADMIN ACTIONS (Audit log for admin approvals & moderation)
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================================
-- 4. PERFORMANCE INDEXES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_driver_profiles_category ON public.driver_profiles(driver_category);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_experience ON public.driver_profiles(years_experience);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_city ON public.jobs(city);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_applications_job ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_driver ON public.applications(driver_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver ON public.direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

-- =====================================================================
-- 5. HELPER FUNCTIONS & TRIGGERS
-- =====================================================================

-- Helper: Check if user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND role = 'admin')
$$;

-- Helper: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Helper: Prevent non-admin users from escalating their role/status
CREATE OR REPLACE FUNCTION public.protect_profile_role() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    NEW.role := OLD.role;
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

-- Helper: Handle new auth user registration
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

  -- 1. Insert into public.profiles
  INSERT INTO public.profiles (
    id, role, full_name, email, phone, city, state, status, created_at, updated_at
  ) VALUES (
    NEW.id, assigned_role, user_full_name, LOWER(TRIM(NEW.email)), user_phone, user_city, user_state, 'active'::public.user_status, now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    city = COALESCE(EXCLUDED.city, public.profiles.city),
    state = COALESCE(EXCLUDED.state, public.profiles.state),
    updated_at = now();

  -- 2. Insert Driver Profile if driver
  IF assigned_role = 'driver' THEN
    INSERT INTO public.driver_profiles (
      id, user_id, driver_category, years_experience, skills, availability, created_at, updated_at
    ) VALUES (
      NEW.id, NEW.id, NULLIF(NEW.raw_user_meta_data ->> 'driver_category', ''), 
      COALESCE((NEW.raw_user_meta_data ->> 'experience_years')::integer, 0),
      ARRAY['Safe Driving', 'Route Navigation'], 'Immediate', now(), now()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- 3. Insert Company Profile & 50 Free Database Unlocks if employer
  IF assigned_role = 'employer' THEN
    INSERT INTO public.companies (
      id, user_id, company_name, contact_person, email, phone, industry, city, state, location, verified, status, created_at, updated_at
    ) VALUES (
      NEW.id, NEW.id, company_nm, user_full_name, LOWER(TRIM(NEW.email)), user_phone, user_industry, user_city, user_state, user_city || ', ' || user_state, true, 'active'::public.user_status, now(), now()
    )
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.employer_subscriptions (
      id, employer_id, plan_name, job_credits, db_unlock_credits, total_job_credits, total_db_unlock_credits, active_job_slots, status, expires_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), NEW.id, 'Starter Fleet Hiring Plan (4 Job Credits + 50 Driver Unlocks)',
      4, 50, 5, 50, 2, 'active', now() + interval '90 days', now(), now()
    )
    ON CONFLICT (employer_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_driverhub_user exception: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','driver_profiles','companies','employer_subscriptions','jobs'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;

-- Triggers for Auth & Role Protection
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_driverhub ON auth.users;
CREATE TRIGGER on_auth_user_created_driverhub
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_driverhub_user();

DROP TRIGGER IF EXISTS protect_profile_role_trg ON public.profiles;
CREATE TRIGGER protect_profile_role_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- =====================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "profiles read own or admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles employers read drivers" ON public.profiles;
DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
CREATE POLICY "profiles read own or admin" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles employers read drivers" ON public.profiles FOR SELECT TO authenticated USING (role = 'driver');
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

-- Driver Profiles Policies
DROP POLICY IF EXISTS "dp read" ON public.driver_profiles;
DROP POLICY IF EXISTS "dp write own" ON public.driver_profiles;
CREATE POLICY "dp read" ON public.driver_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "dp write own" ON public.driver_profiles FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Driver Experiences Policies
DROP POLICY IF EXISTS "exp read" ON public.driver_experiences;
DROP POLICY IF EXISTS "exp write own" ON public.driver_experiences;
CREATE POLICY "exp read" ON public.driver_experiences FOR SELECT TO authenticated USING (true);
CREATE POLICY "exp write own" ON public.driver_experiences FOR ALL TO authenticated USING (driver_id = auth.uid()) WITH CHECK (driver_id = auth.uid());

-- Driver Documents Policies
DROP POLICY IF EXISTS "docs own or admin" ON public.driver_documents;
DROP POLICY IF EXISTS "docs insert own" ON public.driver_documents;
DROP POLICY IF EXISTS "docs delete own" ON public.driver_documents;
DROP POLICY IF EXISTS "docs admin update" ON public.driver_documents;
CREATE POLICY "docs own or admin" ON public.driver_documents FOR SELECT TO authenticated USING (driver_id = auth.uid() OR public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.candidate_unlocks u WHERE u.driver_id = driver_documents.driver_id AND u.employer_id = auth.uid()));
CREATE POLICY "docs insert own" ON public.driver_documents FOR INSERT TO authenticated WITH CHECK (driver_id = auth.uid());
CREATE POLICY "docs delete own" ON public.driver_documents FOR DELETE TO authenticated USING (driver_id = auth.uid());
CREATE POLICY "docs admin update" ON public.driver_documents FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Companies Policies
DROP POLICY IF EXISTS "companies public read" ON public.companies;
DROP POLICY IF EXISTS "companies write own" ON public.companies;
CREATE POLICY "companies public read" ON public.companies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "companies write own" ON public.companies FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Subscriptions & Billing Policies
DROP POLICY IF EXISTS "subs read own" ON public.employer_subscriptions;
DROP POLICY IF EXISTS "subs write own" ON public.employer_subscriptions;
CREATE POLICY "subs read own" ON public.employer_subscriptions FOR SELECT TO authenticated USING (employer_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "subs write own" ON public.employer_subscriptions FOR ALL TO authenticated USING (employer_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (employer_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "billing read own" ON public.billing_transactions;
DROP POLICY IF EXISTS "billing write own" ON public.billing_transactions;
CREATE POLICY "billing read own" ON public.billing_transactions FOR SELECT TO authenticated USING (employer_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "billing write own" ON public.billing_transactions FOR ALL TO authenticated USING (employer_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (employer_id = auth.uid() OR public.is_admin(auth.uid()));

-- Saved Searches Policies
DROP POLICY IF EXISTS "searches own" ON public.saved_searches;
CREATE POLICY "searches own" ON public.saved_searches FOR ALL TO authenticated USING (employer_id = auth.uid()) WITH CHECK (employer_id = auth.uid());

-- Candidate Unlocks Policies
DROP POLICY IF EXISTS "unlocks read" ON public.candidate_unlocks;
DROP POLICY IF EXISTS "unlocks insert own" ON public.candidate_unlocks;
DROP POLICY IF EXISTS "unlocks update own" ON public.candidate_unlocks;
CREATE POLICY "unlocks read" ON public.candidate_unlocks FOR SELECT TO authenticated USING (employer_id = auth.uid() OR driver_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "unlocks insert own" ON public.candidate_unlocks FOR INSERT TO authenticated WITH CHECK (employer_id = auth.uid());
CREATE POLICY "unlocks update own" ON public.candidate_unlocks FOR UPDATE TO authenticated USING (employer_id = auth.uid()) WITH CHECK (employer_id = auth.uid());

-- Jobs Policies
DROP POLICY IF EXISTS "jobs public read active" ON public.jobs;
DROP POLICY IF EXISTS "jobs owner read" ON public.jobs;
DROP POLICY IF EXISTS "jobs owner write" ON public.jobs;
CREATE POLICY "jobs public read active" ON public.jobs FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "jobs owner read" ON public.jobs FOR SELECT TO authenticated USING (employer_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "jobs owner write" ON public.jobs FOR ALL TO authenticated USING (employer_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (employer_id = auth.uid() OR public.is_admin(auth.uid()));

-- Applications Policies
DROP POLICY IF EXISTS "apps read" ON public.applications;
DROP POLICY IF EXISTS "apps driver insert" ON public.applications;
DROP POLICY IF EXISTS "apps update" ON public.applications;
CREATE POLICY "apps read" ON public.applications FOR SELECT TO authenticated USING (driver_id = auth.uid() OR public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.employer_id = auth.uid()));
CREATE POLICY "apps driver insert" ON public.applications FOR INSERT TO authenticated WITH CHECK (driver_id = auth.uid());
CREATE POLICY "apps update" ON public.applications FOR UPDATE TO authenticated USING (driver_id = auth.uid() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.employer_id = auth.uid())) WITH CHECK (driver_id = auth.uid() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.employer_id = auth.uid()));

-- Favorite Jobs Policies
DROP POLICY IF EXISTS "favs own" ON public.favorite_jobs;
CREATE POLICY "favs own" ON public.favorite_jobs FOR ALL TO authenticated USING (driver_id = auth.uid()) WITH CHECK (driver_id = auth.uid());

-- Direct Messages Policies
DROP POLICY IF EXISTS "dm read" ON public.direct_messages;
DROP POLICY IF EXISTS "dm send" ON public.direct_messages;
DROP POLICY IF EXISTS "dm mark read" ON public.direct_messages;
CREATE POLICY "dm read" ON public.direct_messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "dm send" ON public.direct_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "dm mark read" ON public.direct_messages FOR UPDATE TO authenticated USING (receiver_id = auth.uid()) WITH CHECK (receiver_id = auth.uid());

-- Notifications Policies
DROP POLICY IF EXISTS "notif own" ON public.notifications;
DROP POLICY IF EXISTS "notif update own" ON public.notifications;
DROP POLICY IF EXISTS "notif delete own" ON public.notifications;
DROP POLICY IF EXISTS "notif insert" ON public.notifications;
CREATE POLICY "notif own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif update own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif delete own" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Admin Actions Policies
DROP POLICY IF EXISTS "admin log read" ON public.admin_actions;
DROP POLICY IF EXISTS "admin log insert" ON public.admin_actions;
CREATE POLICY "admin log read" ON public.admin_actions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admin log insert" ON public.admin_actions FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) AND admin_id = auth.uid());

-- =====================================================================
-- 7. STORAGE BUCKETS SETUP (For Documents, Resumes, Logos)
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('driver-documents', 'driver-documents', true),
  ('company-logos', 'company-logos', true),
  ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Public storage view" ON storage.objects FOR SELECT USING (bucket_id IN ('driver-documents', 'company-logos', 'resumes'));
  CREATE POLICY "Authenticated storage upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('driver-documents', 'company-logos', 'resumes'));
  CREATE POLICY "Authenticated storage update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('driver-documents', 'company-logos', 'resumes'));
  CREATE POLICY "Authenticated storage delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('driver-documents', 'company-logos', 'resumes'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================================
-- 8. GRANT GLOBAL SCHEMA PERMISSIONS
-- =====================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON public.jobs TO anon;
GRANT SELECT ON public.companies TO anon;
GRANT SELECT ON public.profiles TO anon;
