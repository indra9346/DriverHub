-- Employer document access is available only to an authenticated employer
-- with a current active plan and a real application or paid candidate unlock.
-- Apply after supabase-security-hardening.sql and supabase-marketplace-flows.sql.

CREATE OR REPLACE FUNCTION public.driverhub_employer_has_active_plan(p_employer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = p_employer_id AND EXISTS (
    SELECT 1
    FROM public.employer_subscriptions s
    JOIN public.profiles p ON p.id = s.employer_id
    WHERE s.employer_id = p_employer_id
      AND s.status::text = 'active'
      AND s.expires_at > now()
      AND p.role::text = 'employer'
      AND p.status::text = 'active'
  );
$$;
REVOKE ALL ON FUNCTION public.driverhub_employer_has_active_plan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.driverhub_employer_has_active_plan(uuid) TO authenticated;

-- The application uploads to this bucket. Creating it here is idempotent and
-- keeps it private; a bucket with no storage.objects policies cannot serve the
-- app's authenticated uploads or signed document views.
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents', 'driver-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Remove legacy permissive SELECT policies before installing the intended
-- owner/admin management policy and subscription-gated employer read policy.
DROP POLICY IF EXISTS "docs own or admin" ON public.driver_documents;
DROP POLICY IF EXISTS documents_owner_read_write ON public.driver_documents;
DROP POLICY IF EXISTS documents_unlocked_or_applicant_read ON public.driver_documents;
DROP POLICY IF EXISTS driverhub_documents_owner_admin_manage ON public.driver_documents;
DROP POLICY IF EXISTS driverhub_documents_active_employer_read ON public.driver_documents;

CREATE POLICY driverhub_documents_owner_admin_manage ON public.driver_documents
  FOR ALL TO authenticated
  USING (driver_id = auth.uid() OR public.is_driverhub_admin())
  WITH CHECK (driver_id = auth.uid() OR public.is_driverhub_admin());

CREATE POLICY driverhub_documents_active_employer_read ON public.driver_documents
  FOR SELECT TO authenticated
  USING (
    public.driverhub_employer_has_active_plan(auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.applications a
        JOIN public.jobs j ON j.id = a.job_id
        WHERE a.driver_id = driver_documents.driver_id
          AND j.employer_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.candidate_unlocks u
        WHERE u.driver_id = driver_documents.driver_id
          AND u.employer_id = auth.uid()
      )
    )
  );

-- Bucket remains private. Storage paths must begin with the driver's auth UUID.
UPDATE storage.buckets SET public = false WHERE id = 'driver-documents';
DROP POLICY IF EXISTS driverhub_documents_read ON storage.objects;
DROP POLICY IF EXISTS driverhub_documents_insert ON storage.objects;
DROP POLICY IF EXISTS driverhub_documents_update ON storage.objects;
DROP POLICY IF EXISTS driverhub_documents_delete ON storage.objects;
CREATE POLICY driverhub_documents_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_driverhub_admin()
      OR (
        public.driverhub_employer_has_active_plan(auth.uid())
        AND (
          EXISTS (
            SELECT 1 FROM public.applications a
            JOIN public.jobs j ON j.id = a.job_id
            WHERE a.driver_id::text = (storage.foldername(name))[1]
              AND j.employer_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.candidate_unlocks u
            WHERE u.driver_id::text = (storage.foldername(name))[1]
              AND u.employer_id = auth.uid()
          )
        )
      )
    )
  );
CREATE POLICY driverhub_documents_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'driver-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY driverhub_documents_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'driver-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY driverhub_documents_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_driverhub_admin())
  );
