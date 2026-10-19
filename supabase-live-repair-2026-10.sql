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
-- =====================================================================

BEGIN;

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
GRANT EXECUTE ON FUNCTION public.driverhub_user_applied_to_job(uuid) TO authenticated;
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
REVOKE ALL ON public.driverhub_payment_orders FROM anon, authenticated;
GRANT ALL ON public.driverhub_payment_orders TO service_role;

-- Saved candidate searches keep every filter (district/PIN from the pan-India
-- migration, the search radius, and "active any time" as NULL).
ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS pincode text;
ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS radius_km double precision;
ALTER TABLE public.saved_searches ALTER COLUMN active_in_days DROP NOT NULL;

-- The app subscribes to company changes (public directory, admin), but
-- companies was never added to the realtime publication.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'companies'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
