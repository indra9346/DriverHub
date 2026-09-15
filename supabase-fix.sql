-- =====================================================================
-- DRIVER HUB — SUPABASE FIX FOR RLS & DIRECT REGISTRATION
-- Run this in your Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- This enables instant real-time sync for all registrations, jobs, & applications
-- =====================================================================

-- 1. Remove foreign key constraint to auth.users so direct profile creation never fails
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Ensure columns exist on profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Bengaluru';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Karnataka';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;

-- 3. Enable ALL operations (SELECT, INSERT, UPDATE, DELETE) for Public / Anon on all tables

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable all operations for profiles" ON public.profiles;
CREATE POLICY "Enable all operations for profiles" ON public.profiles FOR ALL TO public USING (true) WITH CHECK (true);

-- DRIVER_PROFILES
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drivers can manage own profile" ON public.driver_profiles;
DROP POLICY IF EXISTS "Anyone can view driver profiles" ON public.driver_profiles;
DROP POLICY IF EXISTS "Enable all operations for driver_profiles" ON public.driver_profiles;
CREATE POLICY "Enable all operations for driver_profiles" ON public.driver_profiles FOR ALL TO public USING (true) WITH CHECK (true);

-- DRIVER_EXPERIENCE
ALTER TABLE public.driver_experience ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for driver_experience" ON public.driver_experience;
CREATE POLICY "Enable all operations for driver_experience" ON public.driver_experience FOR ALL TO public USING (true) WITH CHECK (true);

-- DRIVER_DOCUMENTS
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for driver_documents" ON public.driver_documents;
CREATE POLICY "Enable all operations for driver_documents" ON public.driver_documents FOR ALL TO public USING (true) WITH CHECK (true);

-- COMPANIES
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view companies" ON public.companies;
DROP POLICY IF EXISTS "Employers can edit own company" ON public.companies;
DROP POLICY IF EXISTS "Enable all operations for companies" ON public.companies;
CREATE POLICY "Enable all operations for companies" ON public.companies FOR ALL TO public USING (true) WITH CHECK (true);

-- JOBS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active jobs" ON public.jobs;
DROP POLICY IF EXISTS "Employers can insert their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Employers can update their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Enable all operations for jobs" ON public.jobs;
CREATE POLICY "Enable all operations for jobs" ON public.jobs FOR ALL TO public USING (true) WITH CHECK (true);

-- APPLICATIONS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drivers can view their own applications" ON public.applications;
DROP POLICY IF EXISTS "Drivers can create applications" ON public.applications;
DROP POLICY IF EXISTS "Employers and drivers can update applications" ON public.applications;
DROP POLICY IF EXISTS "Enable all operations for applications" ON public.applications;
CREATE POLICY "Enable all operations for applications" ON public.applications FOR ALL TO public USING (true) WITH CHECK (true);

-- SHORTLISTS
ALTER TABLE public.shortlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for shortlists" ON public.shortlists;
CREATE POLICY "Enable all operations for shortlists" ON public.shortlists FOR ALL TO public USING (true) WITH CHECK (true);

-- FAVORITES
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drivers manage their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Enable all operations for favorites" ON public.favorites;
CREATE POLICY "Enable all operations for favorites" ON public.favorites FOR ALL TO public USING (true) WITH CHECK (true);

-- NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Enable all operations for notifications" ON public.notifications;
CREATE POLICY "Enable all operations for notifications" ON public.notifications FOR ALL TO public USING (true) WITH CHECK (true);

-- ADMIN_ACTIONS
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for admin_actions" ON public.admin_actions;
CREATE POLICY "Enable all operations for admin_actions" ON public.admin_actions FOR ALL TO public USING (true) WITH CHECK (true);

-- PASSWORD_RESETS
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for password_resets" ON public.password_resets;
CREATE POLICY "Enable all operations for password_resets" ON public.password_resets FOR ALL TO public USING (true) WITH CHECK (true);

-- 4. Grant table access to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
