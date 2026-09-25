-- DriverHub login/RLS recursion hotfix.
-- Breaks the jobs <-> applications policy cycle while preserving applicant access.
-- Safe to run more than once.

CREATE OR REPLACE FUNCTION public.driverhub_user_applied_to_job(
  p_job_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $driverhub$
  SELECT EXISTS (
    SELECT 1
    FROM public.applications AS application
    WHERE application.job_id = p_job_id
      AND application.driver_id = auth.uid()
  );
$driverhub$;

REVOKE ALL ON FUNCTION public.driverhub_user_applied_to_job(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.driverhub_user_applied_to_job(uuid) TO authenticated;

DROP POLICY IF EXISTS jobs_public_active_owner_admin ON public.jobs;
DROP POLICY IF EXISTS driverhub_jobs_public_active_read ON public.jobs;
DROP POLICY IF EXISTS driverhub_jobs_authenticated_read ON public.jobs;

-- Anonymous visitors only see active, unexpired jobs. No admin or application
-- table checks are needed for public listings.
CREATE POLICY driverhub_jobs_public_active_read
  ON public.jobs FOR SELECT TO anon
  USING (status = 'active' AND (expires_at IS NULL OR expires_at > now()));

-- Authenticated users can see public jobs, their own employer listings,
-- admin-visible listings, and jobs they already applied to. The helper bypasses
-- applications RLS internally so this policy cannot recurse into itself.
CREATE POLICY driverhub_jobs_authenticated_read
  ON public.jobs FOR SELECT TO authenticated
  USING (
    (status = 'active' AND (expires_at IS NULL OR expires_at > now()))
    OR employer_id = auth.uid()
    OR public.is_driverhub_admin()
    OR public.driverhub_user_applied_to_job(jobs.id)
  );
