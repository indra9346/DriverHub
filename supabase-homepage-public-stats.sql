-- Public homepage counters based only on real, moderated marketplace records.
-- Returns aggregate counts only; no user or employer personal data is exposed.
CREATE OR REPLACE FUNCTION public.get_driverhub_public_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'verifiedDrivers', (
      SELECT count(DISTINCT profile.id)
      FROM public.profiles AS profile
      JOIN public.driver_profiles AS driver ON driver.user_id = profile.id
      WHERE profile.role = 'driver'
        AND profile.status = 'active'
        AND EXISTS (
          SELECT 1
          FROM public.driver_documents AS document
          WHERE document.driver_id = profile.id
            AND document.type = 'driving_license'
            AND document.verification_status = 'verified'
        )
    ),
    'verifiedEmployers', (
      SELECT count(DISTINCT profile.id)
      FROM public.profiles AS profile
      JOIN public.companies AS company ON company.user_id = profile.id
      WHERE profile.role = 'employer'
        AND profile.status = 'active'
        AND company.status = 'active'
        AND company.verified IS TRUE
    ),
    'activeVacancies', (
      SELECT coalesce(sum(greatest(coalesce(job.vacancies, 0), 0)), 0)
      FROM public.jobs AS job
      WHERE job.status = 'active'
        AND (job.expires_at IS NULL OR job.expires_at > now())
        AND (job.application_deadline IS NULL OR job.application_deadline > now())
    ),
    'hires', (
      SELECT count(*)
      FROM public.applications AS application
      WHERE application.status = 'hired'
    ),
    'vacanciesByCategory', (
      SELECT coalesce(jsonb_object_agg(category_counts.category_key, category_counts.openings), '{}'::jsonb)
      FROM (
        SELECT lower(trim(job.category)) AS category_key,
          sum(greatest(coalesce(job.vacancies, 0), 0)) AS openings
        FROM public.jobs AS job
        WHERE job.status = 'active'
          AND (job.expires_at IS NULL OR job.expires_at > now())
          AND (job.application_deadline IS NULL OR job.application_deadline > now())
        GROUP BY lower(trim(job.category))
      ) AS category_counts
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_driverhub_public_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_driverhub_public_stats() TO anon, authenticated;
