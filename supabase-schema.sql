-- =====================================================================
-- DRIVER HUB — COMPLETE SUPABASE DATABASE MIGRATION & SCHEMA
-- Run this in your Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & DOMAINS
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('driver', 'employer', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'pending', 'blocked', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE job_status AS ENUM ('draft', 'pending', 'active', 'closed', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('applied', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected', 'withdrawn');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('resume', 'driving_license', 'aadhar', 'pan', 'experience_cert', 'police_verification', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE doc_verification_status AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- =====================================================================
-- 3. TABLES DEFINITION (ALL 11 TABLES)
-- =====================================================================

-- Table 1: PROFILES (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'driver',
  full_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  location TEXT,
  city TEXT DEFAULT 'Bengaluru',
  state TEXT DEFAULT 'Karnataka',
  status user_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 2: DRIVER_PROFILES
CREATE TABLE IF NOT EXISTS public.driver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_category TEXT DEFAULT 'HMV',
  years_experience INTEGER DEFAULT 0,
  license_number TEXT,
  license_type TEXT DEFAULT 'Commercial Transport',
  license_expiry DATE,
  skills TEXT[] DEFAULT '{}',
  preferred_location TEXT,
  expected_salary INTEGER DEFAULT 25000,
  availability TEXT DEFAULT 'Immediate',
  bio TEXT,
  resume_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 3: DRIVER_EXPERIENCE
CREATE TABLE IF NOT EXISTS public.driver_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  duration_years INTEGER DEFAULT 1,
  start_date TEXT,
  end_date TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table 4: DRIVER_DOCUMENTS
CREATE TABLE IF NOT EXISTS public.driver_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type document_type DEFAULT 'driving_license',
  file_url TEXT NOT NULL,
  file_size TEXT,
  verification_status doc_verification_status DEFAULT 'verified',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table 5: COMPANIES
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  industry TEXT DEFAULT 'Logistics & Interstate Freight',
  location TEXT,
  city TEXT DEFAULT 'Bengaluru',
  state TEXT DEFAULT 'Karnataka',
  address TEXT,
  website TEXT,
  logo_url TEXT,
  description TEXT,
  verified BOOLEAN DEFAULT false,
  status user_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 6: JOBS
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'HMV',
  location TEXT NOT NULL,
  city TEXT DEFAULT 'Bengaluru',
  state TEXT DEFAULT 'Karnataka',
  experience_required TEXT DEFAULT '2-5 Years',
  experience_min_years INTEGER DEFAULT 2,
  salary_min INTEGER DEFAULT 20000,
  salary_max INTEGER DEFAULT 30000,
  salary_type TEXT DEFAULT 'monthly',
  working_hours TEXT DEFAULT 'Full-time, Day shift',
  employment_type TEXT DEFAULT 'Full-time',
  description TEXT NOT NULL,
  required_skills TEXT[] DEFAULT '{}',
  required_docs TEXT[] DEFAULT '{}',
  vacancies INTEGER DEFAULT 1,
  status job_status DEFAULT 'pending',
  posted_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 7: APPLICATIONS
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_message TEXT,
  resume_url TEXT,
  status application_status DEFAULT 'applied',
  applied_date DATE DEFAULT CURRENT_DATE,
  updated_date DATE DEFAULT CURRENT_DATE,
  employer_notes TEXT,
  interview_date TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (job_id, driver_id) -- Prevent duplicate application
);

-- Table 8: SHORTLISTS
CREATE TABLE IF NOT EXISTS public.shortlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table 9: FAVORITES (Saved Jobs)
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (driver_id, job_id)
);

-- Table 10: NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table 11: ADMIN_ACTIONS (Audit Log)
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL, -- 'job', 'employer', 'driver'
  target_id UUID NOT NULL,
  action TEXT NOT NULL,      -- 'approve', 'reject', 'block', 'unblock'
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table 12: PASSWORD_RESETS (Verification Code Storage)
CREATE TABLE IF NOT EXISTS public.password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '15 minutes'),
  created_at TIMESTAMPTZ DEFAULT now()
);


-- =====================================================================
-- 4. INDEXES (Performance Optimization)
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON public.password_resets(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_category ON public.driver_profiles(driver_category);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_city ON public.jobs(city);
CREATE INDEX IF NOT EXISTS idx_applications_driver ON public.applications(driver_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_favorites_driver ON public.favorites(driver_id);


-- =====================================================================
-- 5. AUTOMATIC TRIGGERS & FUNCTIONS
-- =====================================================================

-- Auto update timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_jobs_updated_at ON public.jobs;
CREATE TRIGGER set_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- Auto create profile on auth.users registration (driver or employer only)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role user_role := 'driver';
  raw_role text;
BEGIN
  raw_role := (NEW.raw_user_meta_data->>'role');
  IF raw_role = 'employer' THEN
    assigned_role := 'employer';
  ELSE
    assigned_role := 'driver'; -- never allow self-registering as admin
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    role,
    full_name,
    phone,
    city,
    state,
    status
  ) VALUES (
    NEW.id,
    NEW.email,
    assigned_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', '+91 98765 00000'),
    COALESCE(NEW.raw_user_meta_data->>'city', 'Bengaluru'),
    COALESCE(NEW.raw_user_meta_data->>'state', 'Karnataka'),
    'active'
  );

  -- If driver, initialize driver profile
  IF assigned_role = 'driver' THEN
    INSERT INTO public.driver_profiles (user_id, driver_category, years_experience)
    VALUES (NEW.id, 'HMV', 2)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- If employer, initialize company profile
  IF assigned_role = 'employer' THEN
    INSERT INTO public.companies (user_id, company_name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(NEW.email, '@', 1) || ' Fleet'), NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =====================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can view; only owner or admin can update
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Jobs: Public can view active jobs; employers manage their own; admin manages all
CREATE POLICY "Public can view active jobs" 
  ON public.jobs FOR SELECT USING (status = 'active' OR auth.uid() = employer_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Employers can insert their own jobs" 
  ON public.jobs FOR INSERT WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Employers can update their own jobs" 
  ON public.jobs FOR UPDATE USING (auth.uid() = employer_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Applications: Drivers see their own; Employers see applications for their jobs; Admin sees all
CREATE POLICY "Drivers can view their own applications" 
  ON public.applications FOR SELECT USING (
    auth.uid() = driver_id 
    OR auth.uid() IN (SELECT employer_id FROM public.jobs WHERE id = job_id)
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Drivers can create applications" 
  ON public.applications FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Employers and drivers can update applications" 
  ON public.applications FOR UPDATE USING (
    auth.uid() = driver_id 
    OR auth.uid() IN (SELECT employer_id FROM public.jobs WHERE id = job_id)
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Driver Profiles: Public/Employers can search active drivers; driver edits own
CREATE POLICY "Drivers can manage own profile" 
  ON public.driver_profiles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view driver profiles" 
  ON public.driver_profiles FOR SELECT USING (true);

-- Companies: Public can view verified companies; employer edits own
CREATE POLICY "Public can view companies" 
  ON public.companies FOR SELECT USING (true);

CREATE POLICY "Employers can edit own company" 
  ON public.companies FOR ALL USING (auth.uid() = user_id);

-- Favorites: Drivers manage their own saved jobs
CREATE POLICY "Drivers manage their own favorites" 
  ON public.favorites FOR ALL USING (auth.uid() = driver_id);

-- Notifications: Users see only their own
CREATE POLICY "Users see own notifications" 
  ON public.notifications FOR ALL USING (auth.uid() = user_id);


-- =====================================================================
-- 7. STORAGE BUCKETS (Run in SQL or create in Storage Tab)
-- =====================================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('driver-documents', 'driver-documents', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true) ON CONFLICT DO NOTHING;
