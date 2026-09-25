-- =================================================================================
-- DRIVERHUB — APNAHIRE SUBSCRIPTION, DATABASE UNLOCKS, BILLING & MESSAGING MIGRATION
-- Run this script in your Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- =================================================================================

-- 1. EMPLOYER_SUBSCRIPTIONS (Tracks Job Posting Credits, Driver Database Unlock Credits & GSTIN)
CREATE TABLE IF NOT EXISTS public.employer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'Starter Fleet Hiring Plan (2 Job Credits + 50 Driver Unlocks)',
  job_credits INTEGER NOT NULL DEFAULT 4,
  db_unlock_credits INTEGER NOT NULL DEFAULT 50,
  total_job_credits INTEGER NOT NULL DEFAULT 5,
  total_db_unlock_credits INTEGER NOT NULL DEFAULT 50,
  gstin TEXT DEFAULT '29AAKCB0612Q1ZC',
  gstin_verified BOOLEAN DEFAULT true,
  billing_company_name TEXT,
  billing_address TEXT,
  status TEXT DEFAULT 'active', -- 'active' | 'expired' | 'low_credits'
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '90 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. BILLING_TRANSACTIONS (Tracks Plan Purchases, Credit Recharges & GST Invoices)
CREATE TABLE IF NOT EXISTS public.billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_details TEXT NOT NULL,
  applies_until TEXT,
  amount INTEGER NOT NULL DEFAULT 1651,
  status TEXT NOT NULL DEFAULT 'Success', -- 'Success' | 'Pending' | 'Failed' | 'Cancelled'
  invoice_id TEXT,
  job_credits_added INTEGER DEFAULT 0,
  db_credits_added INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CANDIDATE_UNLOCKS (Tracks Which Drivers an Employer Unlocked or Downloaded in Excel)
CREATE TABLE IF NOT EXISTS public.candidate_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  downloaded_excel BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (employer_id, driver_id)
);

-- 4. SAVED_SEARCHES (Tracks Employer Saved Driver Database Searches)
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

-- 5. DIRECT_MESSAGES (Employer <-> Driver Hiring & Trial Communication)
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ENRICH EXISTING JOBS & DRIVER_PROFILES COLUMNS (Safe IF NOT EXISTS)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS pay_type TEXT DEFAULT 'Fixed + Incentive';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS perks TEXT[] DEFAULT '{}';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS night_shift BOOLEAN DEFAULT false;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS work_location_type TEXT DEFAULT 'Work From Depot / Office';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS joining_fee_required BOOLEAN DEFAULT false;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS screening_questions TEXT[] DEFAULT '{}';

ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS experience_months INTEGER DEFAULT 0;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT ARRAY['Kannada', 'Hindi', 'English'];
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS vehicle_types TEXT[] DEFAULT '{}';
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS "current_role" TEXT;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS current_job_role TEXT;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS previous_role TEXT;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS education TEXT DEFAULT '10th/12th Pass + RTO Badge';
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS police_verified BOOLEAN DEFAULT true;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS cv_attached BOOLEAN DEFAULT true;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS unlock_count INTEGER DEFAULT 15;

-- 7. INDEXES FOR FAST FILTERING
CREATE INDEX IF NOT EXISTS idx_employer_subs_employer ON public.employer_subscriptions(employer_id);
CREATE INDEX IF NOT EXISTS idx_billing_txns_employer ON public.billing_transactions(employer_id);
CREATE INDEX IF NOT EXISTS idx_candidate_unlocks_employer ON public.candidate_unlocks(employer_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_employer ON public.saved_searches(employer_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_participants ON public.direct_messages(sender_id, receiver_id);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.employer_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employers manage own subscriptions" ON public.employer_subscriptions;
DROP POLICY IF EXISTS "Employers view own subscriptions" ON public.employer_subscriptions;
CREATE POLICY "Employers view own subscriptions"
  ON public.employer_subscriptions FOR SELECT
  USING (auth.uid() = employer_id);

DROP POLICY IF EXISTS "Employers view own billing transactions" ON public.billing_transactions;
CREATE POLICY "Employers view own billing transactions"
  ON public.billing_transactions FOR SELECT
  USING (auth.uid() = employer_id);

DROP POLICY IF EXISTS "Employers manage own candidate unlocks" ON public.candidate_unlocks;
CREATE POLICY "Employers manage own candidate unlocks"
  ON public.candidate_unlocks FOR ALL
  USING (auth.uid() = employer_id)
  WITH CHECK (auth.uid() = employer_id);

DROP POLICY IF EXISTS "Employers manage own saved searches" ON public.saved_searches;
CREATE POLICY "Employers manage own saved searches"
  ON public.saved_searches FOR ALL
  USING (auth.uid() = employer_id)
  WITH CHECK (auth.uid() = employer_id);

DROP POLICY IF EXISTS "Users view and send own direct messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users view own direct messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users send own direct messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users update received direct messages" ON public.direct_messages;
CREATE POLICY "Users view own direct messages"
  ON public.direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users send own direct messages"
  ON public.direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users update received direct messages"
  ON public.direct_messages FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);
