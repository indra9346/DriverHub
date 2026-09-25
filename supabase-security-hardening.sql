-- DriverHub marketplace hardening. Apply AFTER supabase-schema.sql and
-- supabase-apnahire-upgrade.sql. Additive: no tables or production rows are dropped.

ALTER TABLE public.employer_subscriptions ALTER COLUMN job_credits SET DEFAULT 0;
ALTER TABLE public.employer_subscriptions ALTER COLUMN db_unlock_credits SET DEFAULT 0;
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'viewed';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'contacted';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'hired';
ALTER TABLE public.employer_subscriptions ADD COLUMN IF NOT EXISTS active_job_slots integer NOT NULL DEFAULT 0;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS credit_consumed boolean NOT NULL DEFAULT false;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS slot_consumed boolean NOT NULL DEFAULT false;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS entitlement_consumed_at timestamptz;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS application_deadline date;

CREATE TABLE IF NOT EXISTS public.job_entitlement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  entitlement_type text NOT NULL CHECK (entitlement_type IN ('credit', 'slot')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.job_entitlement_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_driverhub_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'active'); $$;
REVOKE ALL ON FUNCTION public.is_driverhub_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_driverhub_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.driverhub_user_applied_to_job(p_job_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $driverhub$
  SELECT EXISTS (
    SELECT 1 FROM public.applications AS application
    WHERE application.job_id = p_job_id AND application.driver_id = auth.uid()
  );
$driverhub$;
REVOKE ALL ON FUNCTION public.driverhub_user_applied_to_job(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.driverhub_user_applied_to_job(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_driverhub_job_entitlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sub public.employer_subscriptions%ROWTYPE;
  slot_count integer;
  is_admin_action boolean := public.is_driverhub_admin();
  company_ok boolean;
BEGIN
  IF is_admin_action THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL OR auth.uid() <> NEW.employer_id OR
     NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'employer' AND status = 'active') THEN
    RAISE EXCEPTION 'Only the active employer who owns this listing may publish it';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.employer_id <> OLD.employer_id OR NEW.id <> OLD.id OR
       NEW.credit_consumed IS DISTINCT FROM OLD.credit_consumed OR
       NEW.slot_consumed IS DISTINCT FROM OLD.slot_consumed THEN
      RAISE EXCEPTION 'Job owner and entitlement fields cannot be changed by the client';
    END IF;
    IF OLD.status = 'active' AND NEW.status <> 'active' THEN NEW.closed_at := now(); END IF;
    IF NEW.status NOT IN ('active', 'pending') OR OLD.status = NEW.status THEN RETURN NEW; END IF;
  ELSE
    IF NEW.status NOT IN ('active', 'pending') THEN RAISE EXCEPTION 'A job must have an entitlement before it is submitted'; END IF;
  END IF;

  SELECT c.verified INTO company_ok FROM public.companies c WHERE c.user_id = NEW.employer_id;
  IF NOT COALESCE(company_ok, false) THEN NEW.status := 'pending'; END IF;

  IF TG_OP = 'UPDATE' AND (OLD.credit_consumed OR OLD.slot_consumed) AND OLD.status <> 'closed' THEN
    NEW.credit_consumed := OLD.credit_consumed;
    NEW.slot_consumed := OLD.slot_consumed;
    RETURN NEW;
  END IF;

  SELECT * INTO sub FROM public.employer_subscriptions
   WHERE employer_id = NEW.employer_id AND status = 'active' AND expires_at > now()
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

CREATE OR REPLACE FUNCTION public.record_driverhub_job_entitlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.entitlement_consumed_at IS NOT NULL AND
     (TG_OP = 'INSERT' OR NEW.entitlement_consumed_at IS DISTINCT FROM OLD.entitlement_consumed_at) THEN
    INSERT INTO public.job_entitlement_events (employer_id, job_id, entitlement_type)
    VALUES (NEW.employer_id, NEW.id, CASE WHEN NEW.credit_consumed THEN 'credit' ELSE 'slot' END);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS record_driverhub_job_entitlement ON public.jobs;
CREATE TRIGGER record_driverhub_job_entitlement
  AFTER INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.record_driverhub_job_entitlement();

CREATE OR REPLACE FUNCTION public.protect_driverhub_company_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT public.is_driverhub_admin() THEN
    NEW.verified := false;
    NEW.status := 'pending';
    RETURN NEW;
  END IF;
  IF auth.uid() = OLD.user_id AND NOT public.is_driverhub_admin() AND
     (NEW.verified IS DISTINCT FROM OLD.verified OR NEW.status IS DISTINCT FROM OLD.status) THEN
    RAISE EXCEPTION 'Only DriverHub administration can verify or suspend a company';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_driverhub_company_verification ON public.companies;
CREATE TRIGGER protect_driverhub_company_verification
  BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.protect_driverhub_company_verification();

CREATE OR REPLACE FUNCTION public.consume_driverhub_database_credit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE sub public.employer_subscriptions%ROWTYPE;
BEGIN
  IF public.is_driverhub_admin() THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR auth.uid() <> NEW.employer_id THEN RAISE EXCEPTION 'Only the employer may unlock driver contact details'; END IF;
  IF EXISTS (SELECT 1 FROM public.candidate_unlocks u WHERE u.employer_id = NEW.employer_id AND u.driver_id = NEW.driver_id) THEN
    RETURN NEW;
  END IF;
  SELECT * INTO sub FROM public.employer_subscriptions
   WHERE employer_id = NEW.employer_id AND status = 'active' AND expires_at > now() AND db_unlock_credits > 0
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'An active plan with database credits is required'; END IF;
  UPDATE public.employer_subscriptions SET db_unlock_credits = db_unlock_credits - 1, updated_at = now()
   WHERE employer_id = NEW.employer_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS consume_driverhub_database_credit ON public.candidate_unlocks;
CREATE TRIGGER consume_driverhub_database_credit
  BEFORE INSERT ON public.candidate_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.consume_driverhub_database_credit();

-- Remove legacy permissive policies (including the old "Enable all operations" set)
-- from sensitive marketplace tables, then install least-privilege policies.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY (ARRAY[
      'profiles','driver_profiles','driver_experience','driver_documents','companies','jobs',
      'applications','shortlists','favorites','notifications','admin_actions',
      'employer_subscriptions','billing_transactions','candidate_unlocks','saved_searches',
      'direct_messages','job_entitlement_events','password_resets'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

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
ALTER TABLE public.employer_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY profile_read_owner_admin ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_driverhub_admin() OR EXISTS (
    SELECT 1 FROM public.applications a JOIN public.jobs j ON j.id = a.job_id
    WHERE a.driver_id = profiles.id AND j.employer_id = auth.uid()
  ));
CREATE POLICY profile_update_owner_admin ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_driverhub_admin()) WITH CHECK (id = auth.uid() OR public.is_driverhub_admin());

CREATE POLICY company_public_verified ON public.companies FOR SELECT TO anon, authenticated
  USING (verified = true OR user_id = auth.uid() OR public.is_driverhub_admin());
CREATE POLICY company_owner_admin_update ON public.companies FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_driverhub_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_driverhub_admin());
CREATE POLICY company_owner_insert ON public.companies FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'employer'));

CREATE POLICY driverhub_jobs_public_active_read ON public.jobs FOR SELECT TO anon
  USING (status = 'active' AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY jobs_public_active_owner_admin ON public.jobs FOR SELECT TO authenticated
  USING ((status = 'active' AND (expires_at IS NULL OR expires_at > now()))
    OR employer_id = auth.uid() OR public.is_driverhub_admin()
    OR public.driverhub_user_applied_to_job(jobs.id));
CREATE POLICY jobs_employer_insert ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (employer_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'employer'));
CREATE POLICY jobs_owner_admin_update ON public.jobs FOR UPDATE TO authenticated
  USING (employer_id = auth.uid() OR public.is_driverhub_admin())
  WITH CHECK (employer_id = auth.uid() OR public.is_driverhub_admin());
CREATE POLICY jobs_owner_admin_delete ON public.jobs FOR DELETE TO authenticated
  USING (employer_id = auth.uid() OR public.is_driverhub_admin());

CREATE POLICY driver_profile_private_read ON public.driver_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_driverhub_admin() OR EXISTS (
    SELECT 1 FROM public.applications a JOIN public.jobs j ON j.id = a.job_id
    WHERE a.driver_id = driver_profiles.user_id AND j.employer_id = auth.uid()
  ));
CREATE POLICY driver_profile_owner_write ON public.driver_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_driverhub_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_driverhub_admin());
CREATE POLICY experience_owner_read_write ON public.driver_experience FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.driver_profiles d WHERE d.id = driver_id AND d.user_id = auth.uid()) OR public.is_driverhub_admin())
  WITH CHECK (EXISTS (SELECT 1 FROM public.driver_profiles d WHERE d.id = driver_id AND d.user_id = auth.uid()) OR public.is_driverhub_admin());
CREATE POLICY documents_owner_read_write ON public.driver_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.driver_profiles d WHERE d.id = driver_id AND d.user_id = auth.uid()) OR public.is_driverhub_admin())
  WITH CHECK (EXISTS (SELECT 1 FROM public.driver_profiles d WHERE d.id = driver_id AND d.user_id = auth.uid()) OR public.is_driverhub_admin());

CREATE POLICY applications_read_participant_admin ON public.applications FOR SELECT TO authenticated
  USING (driver_id = auth.uid() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.employer_id = auth.uid()) OR public.is_driverhub_admin());
CREATE POLICY applications_driver_insert ON public.applications FOR INSERT TO authenticated
  WITH CHECK (driver_id = auth.uid() AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.status = 'active' AND (j.expires_at IS NULL OR j.expires_at > now())));
CREATE POLICY applications_participant_update ON public.applications FOR UPDATE TO authenticated
  USING (driver_id = auth.uid() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.employer_id = auth.uid()) OR public.is_driverhub_admin())
  WITH CHECK (driver_id = auth.uid() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.employer_id = auth.uid()) OR public.is_driverhub_admin());

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
    IF NEW.employer_notes IS DISTINCT FROM OLD.employer_notes OR NEW.interview_date IS DISTINCT FROM OLD.interview_date THEN
      RAISE EXCEPTION 'Drivers cannot edit employer review fields';
    END IF;
  END IF;
  IF NOT public.is_driverhub_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'employer'
  ) AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = OLD.job_id AND j.employer_id = auth.uid()) THEN
      RAISE EXCEPTION 'Employers may only update applications for their own jobs';
    END IF;
    IF NEW.cover_message IS DISTINCT FROM OLD.cover_message OR NEW.resume_url IS DISTINCT FROM OLD.resume_url OR NEW.applied_date IS DISTINCT FROM OLD.applied_date THEN
      RAISE EXCEPTION 'Employers cannot modify driver-submitted application content';
    END IF;
    IF NOT (
      (OLD.status = 'applied' AND NEW.status IN ('viewed', 'under_review', 'shortlisted', 'rejected')) OR
      (OLD.status = 'viewed' AND NEW.status IN ('under_review', 'shortlisted', 'contacted', 'interview', 'rejected')) OR
      (OLD.status = 'under_review' AND NEW.status IN ('shortlisted', 'contacted', 'interview', 'rejected')) OR
      (OLD.status = 'shortlisted' AND NEW.status IN ('contacted', 'interview', 'selected', 'hired', 'rejected')) OR
      (OLD.status = 'contacted' AND NEW.status IN ('interview', 'selected', 'hired', 'rejected')) OR
      (OLD.status = 'interview' AND NEW.status IN ('selected', 'hired', 'rejected')) OR
      (OLD.status = 'selected' AND NEW.status IN ('hired', 'rejected'))
    ) THEN RAISE EXCEPTION 'Invalid application status transition'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_driverhub_application_update ON public.applications;
CREATE TRIGGER enforce_driverhub_application_update BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.enforce_driverhub_application_update();

CREATE POLICY favorites_owner ON public.favorites FOR ALL TO authenticated
  USING (driver_id = auth.uid() OR public.is_driverhub_admin()) WITH CHECK (driver_id = auth.uid() OR public.is_driverhub_admin());
CREATE POLICY notifications_owner ON public.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_driverhub_admin()) WITH CHECK (user_id = auth.uid() OR public.is_driverhub_admin());
CREATE POLICY shortlists_participant ON public.shortlists FOR ALL TO authenticated
  USING (employer_id = auth.uid() OR driver_id = auth.uid() OR public.is_driverhub_admin())
  WITH CHECK (employer_id = auth.uid() OR public.is_driverhub_admin());
CREATE POLICY admin_actions_admin_read ON public.admin_actions FOR SELECT TO authenticated
  USING (public.is_driverhub_admin());
CREATE POLICY admin_actions_admin_insert ON public.admin_actions FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid() AND public.is_driverhub_admin());

CREATE POLICY subscription_owner_read ON public.employer_subscriptions FOR SELECT TO authenticated
  USING (employer_id = auth.uid() OR public.is_driverhub_admin());
CREATE POLICY billing_owner_read ON public.billing_transactions FOR SELECT TO authenticated
  USING (employer_id = auth.uid() OR public.is_driverhub_admin());
CREATE POLICY unlock_owner_read ON public.candidate_unlocks FOR SELECT TO authenticated
  USING (employer_id = auth.uid() OR driver_id = auth.uid() OR public.is_driverhub_admin());
CREATE POLICY unlock_owner_insert ON public.candidate_unlocks FOR INSERT TO authenticated
  WITH CHECK (employer_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'employer'));
CREATE POLICY unlock_owner_update ON public.candidate_unlocks FOR UPDATE TO authenticated
  USING (employer_id = auth.uid() OR public.is_driverhub_admin())
  WITH CHECK (employer_id = auth.uid() OR public.is_driverhub_admin());
CREATE POLICY saved_search_owner ON public.saved_searches FOR ALL TO authenticated
  USING (employer_id = auth.uid() OR public.is_driverhub_admin())
  WITH CHECK (employer_id = auth.uid() OR public.is_driverhub_admin());
CREATE POLICY messages_participant_read ON public.direct_messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR public.is_driverhub_admin());
CREATE POLICY messages_sender_insert ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY messages_receiver_update ON public.direct_messages FOR UPDATE TO authenticated
  USING (receiver_id = auth.uid()) WITH CHECK (receiver_id = auth.uid());
CREATE POLICY entitlement_owner_admin_read ON public.job_entitlement_events FOR SELECT TO authenticated
  USING (employer_id = auth.uid() OR public.is_driverhub_admin());

-- Duplicate application and saved-job protection already exists in schema.
CREATE UNIQUE INDEX IF NOT EXISTS applications_job_driver_unique ON public.applications(job_id, driver_id);
CREATE UNIQUE INDEX IF NOT EXISTS favorites_driver_job_unique ON public.favorites(driver_id, job_id);

