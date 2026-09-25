-- DriverHub production marketplace flows.
-- Apply this once in Supabase SQL Editor after supabase-schema.sql,
-- supabase-apnahire-upgrade.sql, and supabase-security-hardening.sql.

-- Persist all fields needed to restore a saved search on another device.
ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS keyword text;
ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS vehicle_type text;
ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS active_in_days integer NOT NULL DEFAULT 15;

-- Registration is free for drivers. Employers must receive entitlements from a
-- trusted payment/admin flow; retire the legacy auto-granted starter accounts.
ALTER TABLE public.employer_subscriptions ALTER COLUMN plan_name SET DEFAULT 'No active hiring plan';
ALTER TABLE public.employer_subscriptions ALTER COLUMN job_credits SET DEFAULT 0;
ALTER TABLE public.employer_subscriptions ALTER COLUMN db_unlock_credits SET DEFAULT 0;
ALTER TABLE public.employer_subscriptions ALTER COLUMN total_job_credits SET DEFAULT 0;
ALTER TABLE public.employer_subscriptions ALTER COLUMN total_db_unlock_credits SET DEFAULT 0;
ALTER TABLE public.employer_subscriptions ALTER COLUMN active_job_slots SET DEFAULT 0;
ALTER TABLE public.employer_subscriptions ALTER COLUMN status SET DEFAULT 'expired';
ALTER TABLE public.employer_subscriptions ALTER COLUMN expires_at SET DEFAULT now();

UPDATE public.companies company
SET verified = false, status = 'pending'
FROM public.employer_subscriptions subscription
WHERE subscription.employer_id = company.user_id
  AND subscription.plan_name ILIKE 'Starter Fleet Hiring Plan%';

UPDATE public.employer_subscriptions
SET plan_name = 'No active hiring plan', job_credits = 0, db_unlock_credits = 0,
    total_job_credits = 0, total_db_unlock_credits = 0, active_job_slots = 0,
    status = 'expired', expires_at = now(), updated_at = now()
WHERE plan_name ILIKE 'Starter Fleet Hiring Plan%';

-- The existing auth trigger still creates driver/employer profile rows. This
-- final trigger removes its historical free employer credits and unverified
-- company status after the legacy handler runs for future registrations.
CREATE OR REPLACE FUNCTION public.revoke_driverhub_free_employer_entitlements()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id AND role::text = 'employer') THEN
    UPDATE public.employer_subscriptions
      SET plan_name = 'No active hiring plan', job_credits = 0, db_unlock_credits = 0,
          total_job_credits = 0, total_db_unlock_credits = 0, active_job_slots = 0,
          status = 'expired', expires_at = now(), updated_at = now()
      WHERE employer_id = NEW.id;
    UPDATE public.companies SET verified = false, status = 'pending'
      WHERE user_id = NEW.id;
  ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id AND role::text = 'driver') THEN
    UPDATE public.driver_profiles
      SET driver_category = COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'driver_category', ''), driver_category),
          years_experience = COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'experience_years', '')::integer, years_experience),
          license_type = COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'license_type', ''), license_type),
          updated_at = now()
      WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS zz_revoke_driverhub_free_employer_entitlements ON auth.users;
CREATE TRIGGER zz_revoke_driverhub_free_employer_entitlements
  AFTER INSERT ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.revoke_driverhub_free_employer_entitlements();

-- Let employers edit invoice identity fields without giving clients write
-- access to plan names, payment status, credits, or active job slots.
CREATE OR REPLACE FUNCTION public.update_driverhub_billing_profile(
  p_gstin text, p_billing_company_name text, p_billing_address text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'employer'
  ) THEN
    RAISE EXCEPTION 'Only the signed-in employer may update billing details';
  END IF;
  IF length(trim(COALESCE(p_gstin, ''))) > 20 OR length(trim(COALESCE(p_billing_company_name, ''))) NOT BETWEEN 1 AND 200
     OR length(trim(COALESCE(p_billing_address, ''))) > 1000 THEN
    RAISE EXCEPTION 'Billing profile details are invalid';
  END IF;

  INSERT INTO public.employer_subscriptions (
    id, employer_id, plan_name, job_credits, db_unlock_credits, total_job_credits,
    total_db_unlock_credits, active_job_slots, status, expires_at, gstin,
    billing_company_name, billing_address, gstin_verified
  ) VALUES (
    auth.uid(), auth.uid(), 'No active hiring plan', 0, 0, 0, 0, 0, 'expired', now(),
    upper(trim(p_gstin)), trim(p_billing_company_name), trim(p_billing_address), false
  )
  ON CONFLICT (employer_id) DO UPDATE SET
    gstin = EXCLUDED.gstin,
    billing_company_name = EXCLUDED.billing_company_name,
    billing_address = EXCLUDED.billing_address,
    gstin_verified = CASE WHEN employer_subscriptions.gstin IS DISTINCT FROM EXCLUDED.gstin
      THEN false ELSE employer_subscriptions.gstin_verified END;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.update_driverhub_billing_profile(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_driverhub_billing_profile(text,text,text) TO authenticated;

-- Allow employers with a paid, active plan to search safe driver summaries.
-- Contact and license identifiers are returned only after a credit-backed unlock.
DROP FUNCTION IF EXISTS public.search_driverhub_candidates(text,text,text,text,integer,text,text,uuid,integer,integer,integer);
CREATE OR REPLACE FUNCTION public.search_driverhub_candidates(
  p_keyword text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL,
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
  state text,
  driver_category text,
  years_experience integer,
  months_experience integer,
  license_number text,
  license_type text,
  license_expiry date,
  skills text[],
  languages text[],
  vehicle_types text[],
  current_role text,
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
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles actor
    WHERE actor.id = auth.uid() AND actor.role::text = 'employer' AND actor.status::text = 'active'
  ) THEN
    RAISE EXCEPTION 'Only active employer accounts can search the driver database';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.employer_subscriptions subscription
    WHERE subscription.employer_id = auth.uid()
      AND subscription.status::text = 'active'
      AND subscription.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'An active employer hiring plan is required to search candidates';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.companies company
    WHERE company.user_id = auth.uid() AND company.verified = true AND company.status::text = 'active'
  ) THEN
    RAISE EXCEPTION 'Your company must be verified before searching driver contacts';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM public.candidate_unlocks unlocked
      WHERE unlocked.employer_id = auth.uid() AND unlocked.driver_id = p.id
    ) THEN p.phone ELSE NULL END,
    CASE WHEN EXISTS (
      SELECT 1 FROM public.candidate_unlocks unlocked
      WHERE unlocked.employer_id = auth.uid() AND unlocked.driver_id = p.id
    ) THEN p.email ELSE NULL END,
    p.city,
    p.state,
    d.driver_category,
    COALESCE(d.years_experience, 0),
    COALESCE(d.months_experience, 0),
    CASE WHEN EXISTS (
      SELECT 1 FROM public.candidate_unlocks unlocked
      WHERE unlocked.employer_id = auth.uid() AND unlocked.driver_id = p.id
    ) THEN d.license_number ELSE NULL END,
    d.license_type,
    CASE WHEN EXISTS (
      SELECT 1 FROM public.candidate_unlocks unlocked
      WHERE unlocked.employer_id = auth.uid() AND unlocked.driver_id = p.id
    ) THEN d.license_expiry ELSE NULL END,
    COALESCE(d.skills, ARRAY[]::text[]),
    COALESCE(d.languages, ARRAY[]::text[]),
    COALESCE(d.vehicle_types, ARRAY[]::text[]),
    d."current_role",
    d.education,
    d.preferred_location,
    d.expected_salary,
    d.availability,
    COALESCE(d.cv_attached, false),
    COALESCE(d.police_verified, false),
    d.updated_at,
    d.bio,
    CASE WHEN EXISTS (
      SELECT 1 FROM public.candidate_unlocks unlocked
      WHERE unlocked.employer_id = auth.uid() AND unlocked.driver_id = p.id
    ) THEN d.resume_url ELSE NULL END
  FROM public.profiles p
  JOIN public.driver_profiles d ON d.user_id = p.id
  WHERE p.role::text = 'driver'
    AND p.status::text = 'active'
    AND (p_user_id IS NULL OR p.id = p_user_id)
    AND (p_keyword IS NULL OR concat_ws(' ', p.full_name, d.driver_category, d.current_role,
      d.license_type, d.preferred_location, array_to_string(d.skills, ' '),
      array_to_string(d.vehicle_types, ' ')) ILIKE '%' || p_keyword || '%')
    AND (
      p_category IS NULL OR d.driver_category ILIKE p_category
      OR (p_category = 'HMV' AND (d.driver_category ILIKE '%truck%' OR d.driver_category ILIKE '%trailer%' OR d.driver_category ILIKE '%HMV%'))
      OR (p_category = 'LMV' AND (d.driver_category ILIKE '%cab%' OR d.driver_category ILIKE '%personal%' OR d.driver_category ILIKE '%tempo%' OR d.driver_category ILIKE '%LMV%'))
    )
    AND (p_city IS NULL OR concat_ws(' ', p.city, d.preferred_location) ILIKE '%' || p_city || '%')
    AND (p_state IS NULL OR concat_ws(' ', p.state, d.preferred_location) ILIKE '%' || p_state || '%')
    AND COALESCE(d.years_experience, 0) >= GREATEST(COALESCE(p_min_years, 0), 0)
    AND (p_skill IS NULL OR array_to_string(d.skills, ' ') ILIKE '%' || p_skill || '%')
    AND (
      p_vehicle_type IS NULL OR array_to_string(d.vehicle_types, ' ') ILIKE '%' || p_vehicle_type || '%'
      OR COALESCE(d.license_type, '') ILIKE '%' || p_vehicle_type || '%'
      OR COALESCE(d.driver_category, '') ILIKE '%' || p_vehicle_type || '%'
    )
    AND (p_active_in_days IS NULL OR d.updated_at >= now() - make_interval(days => GREATEST(p_active_in_days, 1)))
  ORDER BY d.updated_at DESC NULLS LAST, p.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 250)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;
REVOKE ALL ON FUNCTION public.search_driverhub_candidates(text,text,text,text,integer,text,text,uuid,integer,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_driverhub_candidates(text,text,text,text,integer,text,text,uuid,integer,integer,integer) TO authenticated;

-- After an employer unlocks a candidate, permit that employer to read that
-- driver's full database profile and document metadata under the existing RLS.
DROP POLICY IF EXISTS driver_profile_unlocked_read ON public.driver_profiles;
CREATE POLICY driver_profile_unlocked_read ON public.driver_profiles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.candidate_unlocks unlocked
    WHERE unlocked.driver_id = driver_profiles.user_id AND unlocked.employer_id = auth.uid()
  ));

-- The schema's legacy public experience SELECT policy survives older upgrades
-- under this plural table name. Restrict work-history rows to the driver,
-- administration, hiring applicants, or employers who unlocked the profile.
DROP POLICY IF EXISTS "exp read" ON public.driver_experiences;
DROP POLICY IF EXISTS driverhub_experience_visible ON public.driver_experiences;
CREATE POLICY driverhub_experience_visible ON public.driver_experiences FOR SELECT TO authenticated
  USING (
    driver_id = auth.uid() OR public.is_driverhub_admin()
    OR EXISTS (SELECT 1 FROM public.candidate_unlocks unlocked
      WHERE unlocked.driver_id = driver_experiences.driver_id AND unlocked.employer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.applications application
      JOIN public.jobs job ON job.id = application.job_id
      WHERE application.driver_id = driver_experiences.driver_id AND job.employer_id = auth.uid())
  );

DROP POLICY IF EXISTS documents_unlocked_or_applicant_read ON public.driver_documents;
CREATE POLICY documents_unlocked_or_applicant_read ON public.driver_documents FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.candidate_unlocks unlocked
      WHERE unlocked.driver_id = driver_documents.driver_id AND unlocked.employer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.applications application
      JOIN public.jobs job ON job.id = application.job_id
      WHERE application.driver_id = driver_documents.driver_id AND job.employer_id = auth.uid())
  );

-- Driver identity and license files are private. The first path component is
-- the owning driver's auth UUID; an applicant's employer or a credited unlock
-- grants short-lived, signed URL access only through the authorized client.
UPDATE storage.buckets SET public = false WHERE id IN ('driver-documents', 'resumes');
DROP POLICY IF EXISTS "Public storage view" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated storage upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated storage update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated storage delete" ON storage.objects;
DROP POLICY IF EXISTS driverhub_public_assets_read ON storage.objects;
DROP POLICY IF EXISTS driverhub_documents_read ON storage.objects;
DROP POLICY IF EXISTS driverhub_documents_insert ON storage.objects;
DROP POLICY IF EXISTS driverhub_documents_update ON storage.objects;
DROP POLICY IF EXISTS driverhub_documents_delete ON storage.objects;
DROP POLICY IF EXISTS driverhub_resumes_read ON storage.objects;
DROP POLICY IF EXISTS driverhub_resumes_insert ON storage.objects;
DROP POLICY IF EXISTS driverhub_resumes_update ON storage.objects;
DROP POLICY IF EXISTS driverhub_resumes_delete ON storage.objects;
DROP POLICY IF EXISTS driverhub_assets_insert ON storage.objects;
DROP POLICY IF EXISTS driverhub_assets_update ON storage.objects;
DROP POLICY IF EXISTS driverhub_assets_delete ON storage.objects;

CREATE POLICY driverhub_public_assets_read ON storage.objects FOR SELECT
  USING (bucket_id = 'company-logos');
CREATE POLICY driverhub_documents_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'driver-documents' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_driverhub_admin()
      OR EXISTS (SELECT 1 FROM public.candidate_unlocks unlocked
        WHERE unlocked.driver_id::text = (storage.foldername(name))[1] AND unlocked.employer_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.applications application
        JOIN public.jobs job ON job.id = application.job_id
        WHERE application.driver_id::text = (storage.foldername(name))[1] AND job.employer_id = auth.uid())
    )
  );
CREATE POLICY driverhub_documents_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY driverhub_documents_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY driverhub_documents_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'driver-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_driverhub_admin()));
CREATE POLICY driverhub_resumes_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_driverhub_admin()
    OR EXISTS (SELECT 1 FROM public.candidate_unlocks unlocked
      WHERE unlocked.driver_id::text = (storage.foldername(name))[1] AND unlocked.employer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.applications application
      JOIN public.jobs job ON job.id = application.job_id
      WHERE application.driver_id::text = (storage.foldername(name))[1] AND job.employer_id = auth.uid())
  ));
CREATE POLICY driverhub_resumes_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY driverhub_resumes_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY driverhub_resumes_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resumes' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_driverhub_admin()));
CREATE POLICY driverhub_assets_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (SELECT 1 FROM public.companies company WHERE company.user_id = auth.uid()));
CREATE POLICY driverhub_assets_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (SELECT 1 FROM public.companies company WHERE company.user_id = auth.uid()))
  WITH CHECK (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (SELECT 1 FROM public.companies company WHERE company.user_id = auth.uid()));
CREATE POLICY driverhub_assets_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-logos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_driverhub_admin()));

-- Employers can only keep an unlock tied to the original driver, and can only
-- set the export marker. The INSERT credit trigger remains authoritative.
CREATE OR REPLACE FUNCTION public.guard_driverhub_candidate_unlock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.employer_id IS DISTINCT FROM OLD.employer_id
       OR NEW.driver_id IS DISTINCT FROM OLD.driver_id
       OR (OLD.downloaded_excel AND NOT NEW.downloaded_excel) THEN
      RAISE EXCEPTION 'Unlock identity is immutable; only the export marker may be updated';
    END IF;
    IF NOT public.is_driverhub_admin() AND auth.uid() <> OLD.employer_id THEN
      RAISE EXCEPTION 'Only the unlocking employer may update this record';
    END IF;
    RETURN NEW;
  END IF;

  IF NOT public.is_driverhub_admin() THEN
    IF auth.uid() IS NULL OR auth.uid() <> NEW.employer_id OR NEW.driver_id = NEW.employer_id THEN
      RAISE EXCEPTION 'Only the employer may unlock another user profile';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.driver_id AND role::text = 'driver' AND status::text = 'active') THEN
      RAISE EXCEPTION 'Only active driver profiles can be unlocked';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE user_id = NEW.employer_id AND verified = true AND status::text = 'active') THEN
      RAISE EXCEPTION 'Company verification is required to unlock driver contacts';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_driverhub_candidate_unlock ON public.candidate_unlocks;
CREATE TRIGGER guard_driverhub_candidate_unlock BEFORE INSERT OR UPDATE ON public.candidate_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.guard_driverhub_candidate_unlock();

-- Drivers may upload documents, but only an administrator can approve them.
CREATE OR REPLACE FUNCTION public.guard_driverhub_document_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.is_driverhub_admin() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL OR auth.uid() <> NEW.driver_id THEN
      RAISE EXCEPTION 'Drivers may only upload their own documents';
    END IF;
    NEW.verification_status := 'pending';
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.driver_id IS DISTINCT FROM OLD.driver_id
     OR NEW.file_url IS DISTINCT FROM OLD.file_url
     OR NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    RAISE EXCEPTION 'Only an administrator may change document verification or identity';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_driverhub_document_verification ON public.driver_documents;
CREATE TRIGGER guard_driverhub_document_verification BEFORE INSERT OR UPDATE ON public.driver_documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_driverhub_document_verification();

CREATE OR REPLACE FUNCTION public.review_driverhub_document(p_document_id uuid, p_status text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  reviewed_driver uuid;
  reviewed_type text;
BEGIN
  IF NOT public.is_driverhub_admin() THEN RAISE EXCEPTION 'Administrator access is required'; END IF;
  IF p_status NOT IN ('verified', 'rejected') THEN RAISE EXCEPTION 'Invalid document review status'; END IF;
  SELECT driver_id, type::text INTO reviewed_driver, reviewed_type
    FROM public.driver_documents WHERE id = p_document_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Driver document was not found'; END IF;

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

CREATE OR REPLACE FUNCTION public.guard_driverhub_verified_driver_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_driverhub_admin() THEN
    NEW.police_verified := OLD.police_verified;
    NEW.unlock_count := OLD.unlock_count;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_driverhub_verified_driver_fields ON public.driver_profiles;
CREATE TRIGGER guard_driverhub_verified_driver_fields BEFORE UPDATE ON public.driver_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_driverhub_verified_driver_fields();

-- Trusted event triggers create notifications; a user can only read, mark read,
-- or delete their own notification rows.
DROP POLICY IF EXISTS "notifications_owner" ON public.notifications;
DROP POLICY IF EXISTS "notif own" ON public.notifications;
DROP POLICY IF EXISTS "notif update own" ON public.notifications;
DROP POLICY IF EXISTS "notif delete own" ON public.notifications;
DROP POLICY IF EXISTS "notif insert" ON public.notifications;
DROP POLICY IF EXISTS driverhub_notification_read ON public.notifications;
DROP POLICY IF EXISTS driverhub_notification_update ON public.notifications;
DROP POLICY IF EXISTS driverhub_notification_delete ON public.notifications;
CREATE POLICY driverhub_notification_read ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_driverhub_admin());
CREATE POLICY driverhub_notification_update ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_driverhub_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_driverhub_admin());
CREATE POLICY driverhub_notification_delete ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_driverhub_admin());

CREATE OR REPLACE FUNCTION public.guard_driverhub_notification_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_driverhub_admin() AND (
    NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.title IS DISTINCT FROM OLD.title OR NEW.message IS DISTINCT FROM OLD.message
    OR NEW.type IS DISTINCT FROM OLD.type OR NEW.link IS DISTINCT FROM OLD.link
    OR NEW.created_at IS DISTINCT FROM OLD.created_at OR (OLD.read AND NOT NEW.read)
  ) THEN
    RAISE EXCEPTION 'Users may only mark their own notifications as read';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_driverhub_notification_update ON public.notifications;
CREATE TRIGGER guard_driverhub_notification_update BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_driverhub_notification_update();

-- Keep conversations between a driver and an employer who has an unlocked
-- contact or a real application relationship; never trust client-supplied roles.
CREATE OR REPLACE FUNCTION public.guard_driverhub_message_participants()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sender_role public.user_role;
  receiver_role public.user_role;
  sender_name text;
  receiver_name text;
  sender_company text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> NEW.sender_id OR NEW.sender_id = NEW.receiver_id THEN
    RAISE EXCEPTION 'Messages must be sent by the signed-in account to another user';
  END IF;
  IF length(trim(NEW.text)) = 0 OR length(NEW.text) > 3000 THEN
    RAISE EXCEPTION 'Messages must contain 1 to 3000 characters';
  END IF;

  SELECT role, full_name INTO sender_role, sender_name FROM public.profiles
    WHERE id = NEW.sender_id AND status::text = 'active';
  SELECT role, full_name INTO receiver_role, receiver_name FROM public.profiles
    WHERE id = NEW.receiver_id AND status::text = 'active';
  IF sender_role IS NULL OR receiver_role IS NULL OR NOT (
    (sender_role::text = 'employer' AND receiver_role::text = 'driver') OR
    (sender_role::text = 'driver' AND receiver_role::text = 'employer')
  ) THEN
    RAISE EXCEPTION 'Messages are only supported between active drivers and employers';
  END IF;

  IF sender_role::text = 'employer' THEN
    SELECT company_name INTO sender_company FROM public.companies
      WHERE user_id = NEW.sender_id AND verified = true AND status::text = 'active';
    IF sender_company IS NULL OR NOT (
      EXISTS (SELECT 1 FROM public.candidate_unlocks unlocked
        WHERE unlocked.employer_id = NEW.sender_id AND unlocked.driver_id = NEW.receiver_id)
      OR EXISTS (SELECT 1 FROM public.applications application
        JOIN public.jobs job ON job.id = application.job_id
        WHERE application.driver_id = NEW.receiver_id AND job.employer_id = NEW.sender_id)
    ) THEN
      RAISE EXCEPTION 'Unlock the driver or review their application before messaging';
    END IF;
    sender_name := sender_company;
  ELSIF NOT (
    EXISTS (SELECT 1 FROM public.applications application
      JOIN public.jobs job ON job.id = application.job_id
      WHERE application.driver_id = NEW.sender_id AND job.employer_id = NEW.receiver_id)
    OR EXISTS (SELECT 1 FROM public.direct_messages previous
      WHERE previous.sender_id = NEW.receiver_id AND previous.receiver_id = NEW.sender_id)
  ) THEN
    RAISE EXCEPTION 'Apply to an employer job or reply to an existing hiring conversation';
  END IF;

  IF NEW.job_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.jobs job WHERE job.id = NEW.job_id
      AND job.employer_id = CASE WHEN sender_role::text = 'employer' THEN NEW.sender_id ELSE NEW.receiver_id END
  ) THEN
    RAISE EXCEPTION 'The message job does not belong to this employer';
  END IF;
  SELECT COALESCE(company.company_name, receiver_name) INTO receiver_name
    FROM public.profiles receiver
    LEFT JOIN public.companies company ON company.user_id = receiver.id
    WHERE receiver.id = NEW.receiver_id;
  IF sender_role::text = 'driver' THEN
    SELECT COALESCE(company.company_name, sender_name) INTO sender_name
      FROM public.profiles sender LEFT JOIN public.companies company ON company.user_id = sender.id
      WHERE sender.id = NEW.sender_id;
  END IF;
  NEW.sender_role := sender_role;
  NEW.sender_name := COALESCE(sender_name, 'DriverHub user');
  NEW.receiver_name := COALESCE(receiver_name, 'DriverHub user');
  NEW.text := trim(NEW.text);
  NEW.read := false;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_driverhub_message_participants ON public.direct_messages;
CREATE TRIGGER guard_driverhub_message_participants BEFORE INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_driverhub_message_participants();

CREATE OR REPLACE FUNCTION public.guard_driverhub_message_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.sender_name IS DISTINCT FROM OLD.sender_name OR NEW.sender_role IS DISTINCT FROM OLD.sender_role
     OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id OR NEW.receiver_name IS DISTINCT FROM OLD.receiver_name
     OR NEW.job_id IS DISTINCT FROM OLD.job_id OR NEW.job_title IS DISTINCT FROM OLD.job_title
     OR NEW.text IS DISTINCT FROM OLD.text OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR (OLD.read AND NOT NEW.read) THEN
    RAISE EXCEPTION 'Messages are immutable; recipients may only mark them read';
  END IF;
  IF NOT public.is_driverhub_admin() AND auth.uid() <> OLD.receiver_id THEN
    RAISE EXCEPTION 'Only the message recipient may mark it read';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_driverhub_message_update ON public.direct_messages;
CREATE TRIGGER guard_driverhub_message_update BEFORE UPDATE ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_driverhub_message_update();

-- Server-generated notifications keep application, message, and unlock events
-- persistent without allowing a client to create notifications for another user.
CREATE OR REPLACE FUNCTION public.notify_driverhub_marketplace_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_employer uuid;
  target_title text;
  receiver_role text;
  recipient uuid;
  message_body text;
  notification_title text;
BEGIN
  IF TG_TABLE_NAME = 'applications' THEN
    SELECT jobs.employer_id, jobs.title INTO target_employer, target_title
      FROM public.jobs WHERE jobs.id = NEW.job_id;
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.notifications(user_id, title, message, type, link)
      VALUES (target_employer, 'New driver application', 'A driver applied for ' || COALESCE(target_title, 'your job') || '.', 'new_application', '/employer/applications');
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.notifications(user_id, title, message, type, link)
      VALUES (NEW.driver_id, 'Application status updated', 'Your application for ' || COALESCE(target_title, 'a driver job') || ' is now ' || NEW.status::text || '.', 'application_status', '/driver/applications');
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

DROP TRIGGER IF EXISTS notify_driverhub_application_insert ON public.applications;
CREATE TRIGGER notify_driverhub_application_insert AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_driverhub_marketplace_event();
DROP TRIGGER IF EXISTS notify_driverhub_application_status ON public.applications;
CREATE TRIGGER notify_driverhub_application_status AFTER UPDATE OF status ON public.applications
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_driverhub_marketplace_event();
DROP TRIGGER IF EXISTS notify_driverhub_direct_message ON public.direct_messages;
CREATE TRIGGER notify_driverhub_direct_message AFTER INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_driverhub_marketplace_event();
DROP TRIGGER IF EXISTS notify_driverhub_candidate_unlock ON public.candidate_unlocks;
CREATE TRIGGER notify_driverhub_candidate_unlock AFTER INSERT ON public.candidate_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.notify_driverhub_marketplace_event();

-- Drafts may be saved without purchasing a credit. Publishing or submitting for
-- review still consumes an entitlement in one database transaction.
CREATE OR REPLACE FUNCTION public.enforce_driverhub_job_entitlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sub public.employer_subscriptions%ROWTYPE;
  slot_count integer;
  is_admin_action boolean := public.is_driverhub_admin();
  company_ok boolean;
BEGIN
  IF is_admin_action THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR auth.uid() <> NEW.employer_id OR
     NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'employer' AND status::text = 'active') THEN
    RAISE EXCEPTION 'Only the active employer who owns this listing may publish it';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.employer_id <> OLD.employer_id OR NEW.id <> OLD.id OR
       NEW.credit_consumed IS DISTINCT FROM OLD.credit_consumed OR
       NEW.slot_consumed IS DISTINCT FROM OLD.slot_consumed THEN
      RAISE EXCEPTION 'Job owner and entitlement fields cannot be changed by the client';
    END IF;
    IF OLD.status = 'active' AND NEW.status <> 'active' THEN NEW.closed_at := now(); END IF;
    IF NEW.status = 'draft' OR NEW.status NOT IN ('active', 'pending') OR OLD.status = NEW.status THEN RETURN NEW; END IF;
    IF (OLD.credit_consumed OR OLD.slot_consumed) AND OLD.status <> 'closed' THEN RETURN NEW; END IF;
  ELSE
    IF NEW.status = 'draft' THEN
      NEW.credit_consumed := false;
      NEW.slot_consumed := false;
      NEW.expires_at := NULL;
      RETURN NEW;
    END IF;
    IF NEW.status NOT IN ('active', 'pending') THEN RAISE EXCEPTION 'A job must be saved as a draft or submitted with an entitlement'; END IF;
  END IF;

  SELECT companies.verified INTO company_ok FROM public.companies WHERE companies.user_id = NEW.employer_id;
  IF NOT COALESCE(company_ok, false) THEN NEW.status := 'pending'; END IF;

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

-- Restore one job credit when an administrator rejects a paid listing.
CREATE OR REPLACE FUNCTION public.refund_rejected_driverhub_job_credit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status::text = 'rejected' AND OLD.status::text IS DISTINCT FROM 'rejected' AND OLD.credit_consumed THEN
    UPDATE public.employer_subscriptions
       SET job_credits = job_credits + 1, updated_at = now()
     WHERE employer_id = OLD.employer_id;
    NEW.credit_consumed := false;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS refund_rejected_driverhub_job_credit ON public.jobs;
CREATE TRIGGER refund_rejected_driverhub_job_credit BEFORE UPDATE OF status ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.refund_rejected_driverhub_job_credit();

-- Supabase Realtime only emits table changes for tables in its publication.
DO $$
DECLARE table_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH table_name IN ARRAY ARRAY[
      'jobs', 'applications', 'profiles', 'driver_profiles', 'driver_documents',
      'driver_experiences', 'favorite_jobs', 'saved_searches', 'candidate_unlocks',
      'direct_messages', 'notifications'
    ] LOOP
      IF to_regclass('public.' || table_name) IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = table_name
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
      END IF;
    END LOOP;
  END IF;
END;
$$;
