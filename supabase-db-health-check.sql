-- =====================================================================
-- DriverHub database health check — READ ONLY (changes nothing).
-- Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Returns one row per check: FAIL rows need action, WARN rows are worth a
-- look, INFO rows are counts for context. Run it before and after
-- supabase-live-repair-2026-10.sql; after the repair there should be no FAIL.
-- Only DriverHub objects are inspected; other apps in this project are ignored.
-- =====================================================================
WITH
core_tables(t) AS (VALUES
  ('profiles'), ('driver_profiles'), ('driver_experiences'), ('driver_documents'), ('companies'),
  ('employer_subscriptions'), ('billing_transactions'), ('saved_searches'), ('candidate_unlocks'),
  ('jobs'), ('applications'), ('favorite_jobs'), ('direct_messages'), ('notifications'),
  ('admin_actions'), ('job_entitlement_events'), ('driverhub_payment_orders')
),
legacy_tables(t) AS (VALUES ('driver_experience'), ('favorites'), ('shortlists'), ('password_resets')),
table_checks AS (
  SELECT 10 AS ord, 'table exists: ' || t AS check_name,
         CASE WHEN to_regclass('public.' || t) IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status,
         CASE WHEN to_regclass('public.' || t) IS NOT NULL THEN '' ELSE 'missing — run the DriverHub SQL files in README order' END AS detail
  FROM core_tables
  UNION ALL
  SELECT 11, 'row level security on: ' || c.relname,
         CASE WHEN c.relrowsecurity THEN 'PASS' ELSE 'FAIL' END,
         CASE WHEN c.relrowsecurity THEN '' ELSE 'RLS is OFF: every signed-in user could read/write all rows' END
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN (SELECT t FROM core_tables UNION ALL SELECT t FROM legacy_tables)
  UNION ALL
  SELECT 12, 'has RLS policies: ' || t,
         CASE WHEN (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t) > 0
                OR t = 'driverhub_payment_orders' THEN 'PASS' ELSE 'FAIL' END,
         (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t)::text || ' policies'
  FROM core_tables WHERE to_regclass('public.' || t) IS NOT NULL
),
grant_checks AS (
  SELECT 20 AS ord, 'signed-in users can use: ' || t AS check_name,
         CASE WHEN has_table_privilege('authenticated', to_regclass('public.' || t), 'SELECT')
               AND has_table_privilege('authenticated', to_regclass('public.' || t), 'INSERT')
               AND has_table_privilege('authenticated', to_regclass('public.' || t), 'UPDATE')
              THEN 'PASS' ELSE 'FAIL' END AS status,
         'authenticated SELECT/INSERT/UPDATE (RLS still limits rows); missing = "permission denied" (42501) in the app' AS detail
  FROM core_tables WHERE to_regclass('public.' || t) IS NOT NULL AND t <> 'driverhub_payment_orders'
  UNION ALL
  SELECT 21, 'visitors can read: ' || t,
         CASE WHEN has_table_privilege('anon', to_regclass('public.' || t), 'SELECT') THEN 'PASS' ELSE 'FAIL' END,
         'anon SELECT needed for the public job list and company directory'
  FROM (VALUES ('jobs'), ('companies')) v(t) WHERE to_regclass('public.' || t) IS NOT NULL
  UNION ALL
  SELECT 22, 'payment orders hidden from browsers',
         CASE WHEN to_regclass('public.driverhub_payment_orders') IS NULL THEN 'FAIL'
              WHEN NOT has_table_privilege('anon', to_regclass('public.driverhub_payment_orders'), 'SELECT')
               AND NOT has_table_privilege('authenticated', to_regclass('public.driverhub_payment_orders'), 'SELECT')
              THEN 'PASS' ELSE 'FAIL' END,
         'only the payment server (service_role) may read or write driverhub_payment_orders'
),
column_checks AS (
  SELECT 30 AS ord, 'column present: ' || tbl || '.' || col AS check_name,
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns c
                           WHERE c.table_schema = 'public' AND c.table_name = tbl AND c.column_name = col)
              THEN 'PASS' ELSE 'FAIL' END AS status,
         'used by the app' AS detail
  FROM (VALUES
    ('profiles','district'), ('profiles','pincode'), ('profiles','latitude'), ('profiles','longitude'),
    ('driver_profiles','months_experience'), ('driver_profiles','latitude'), ('driver_profiles','longitude'),
    ('driver_profiles','district'), ('driver_profiles','pincode'), ('driver_profiles','languages'), ('driver_profiles','vehicle_types'),
    ('companies','district'), ('companies','pincode'),
    ('jobs','expires_at'), ('jobs','closed_at'), ('jobs','credit_consumed'), ('jobs','slot_consumed'),
    ('jobs','entitlement_consumed_at'), ('jobs','application_deadline'), ('jobs','district'), ('jobs','pincode'),
    ('employer_subscriptions','active_job_slots'), ('driver_documents','upload_date'),
    ('saved_searches','district'), ('saved_searches','pincode'), ('saved_searches','radius_km'),
    ('saved_searches','state'), ('saved_searches','keyword'), ('saved_searches','vehicle_type'), ('saved_searches','active_in_days'),
    ('direct_messages','sender_name'), ('direct_messages','receiver_name'), ('direct_messages','sender_role'), ('direct_messages','job_title')
  ) v(tbl, col)
  UNION ALL
  SELECT 31, 'saved_searches.active_in_days allows "any time" (NULL)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public'
                           AND c.table_name = 'saved_searches' AND c.column_name = 'active_in_days' AND c.is_nullable = 'YES')
              THEN 'PASS' ELSE 'FAIL' END, ''
),
function_checks AS (
  SELECT 40 AS ord, 'function present: ' || fn AS check_name,
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                           WHERE n.nspname = 'public' AND p.proname = fn) THEN 'PASS' ELSE 'FAIL' END AS status,
         '' AS detail
  FROM (VALUES
    ('is_driverhub_admin'), ('driverhub_user_applied_to_job'), ('search_driverhub_candidates'),
    ('get_driverhub_public_stats'), ('review_driverhub_document'), ('update_driverhub_billing_profile'),
    ('complete_driverhub_payment'), ('driverhub_employer_has_active_plan'), ('enforce_driverhub_job_entitlement'),
    ('refund_rejected_driverhub_job_credit'), ('notify_driverhub_job_moderation'), ('guard_driverhub_application_insert'),
    ('enforce_driverhub_application_update'), ('protect_driverhub_company_verification'),
    ('notify_driverhub_company_verification'), ('guard_driverhub_trusted_write'), ('apply_driverhub_signup_location'),
    ('handle_new_driverhub_user'), ('revoke_driverhub_free_employer_entitlements')
  ) v(fn)
  UNION ALL
  SELECT 41, 'candidate search has radius signature (16 args)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                           WHERE n.nspname = 'public' AND p.proname = 'search_driverhub_candidates' AND p.pronargs = 16)
              THEN 'PASS' ELSE 'FAIL' END, 'from supabase-radius-search.sql'
  UNION ALL
  SELECT 42, 'visitors can call public stats',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                           WHERE n.nspname = 'public' AND p.proname = 'get_driverhub_public_stats'
                             AND has_function_privilege('anon', p.oid, 'EXECUTE')) THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL
  SELECT 43, 'visitors can evaluate is_driverhub_admin (company directory policy)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                           WHERE n.nspname = 'public' AND p.proname = 'is_driverhub_admin'
                             AND has_function_privilege('anon', p.oid, 'EXECUTE')) THEN 'PASS' ELSE 'FAIL' END,
         'without it anon reads of companies fail with "permission denied for function"'
  UNION ALL
  SELECT 44, 'visitors cannot search the driver database',
         CASE WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                               WHERE n.nspname = 'public' AND p.proname = 'search_driverhub_candidates'
                                 AND has_function_privilege('anon', p.oid, 'EXECUTE')) THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL
  SELECT 45, 'browsers cannot grant paid plans',
         CASE WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                               WHERE n.nspname = 'public' AND p.proname = 'complete_driverhub_payment'
                                 AND (has_function_privilege('anon', p.oid, 'EXECUTE') OR has_function_privilege('authenticated', p.oid, 'EXECUTE')))
              THEN 'PASS' ELSE 'FAIL' END, 'complete_driverhub_payment must be service_role only'
  UNION ALL
  SELECT 46, 'public stats function is the repaired version',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                           WHERE n.nspname = 'public' AND p.proname = 'get_driverhub_public_stats' AND p.prosrc LIKE '%live_jobs%')
              THEN 'PASS' ELSE 'FAIL' END,
         'older versions fail with "column vacancies does not exist", so homepage counters show 0'
),
trigger_checks AS (
  SELECT 50 AS ord, 'trigger present: ' || tbl || '.' || trg AS check_name,
         CASE WHEN EXISTS (SELECT 1 FROM pg_trigger tr JOIN pg_class c ON c.oid = tr.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
                           WHERE n.nspname = sch AND c.relname = tbl AND tr.tgname = trg AND NOT tr.tgisinternal AND tr.tgenabled <> 'D')
              THEN 'PASS' ELSE 'FAIL' END AS status,
         '' AS detail
  FROM (VALUES
    ('auth','users','on_auth_user_created_driverhub'), ('auth','users','zz_revoke_driverhub_free_employer_entitlements'),
    ('auth','users','zzz_apply_driverhub_signup_location'),
    ('public','jobs','enforce_driverhub_job_entitlement'), ('public','jobs','record_driverhub_job_entitlement'),
    ('public','jobs','refund_rejected_driverhub_job_credit'), ('public','jobs','notify_driverhub_job_moderation'),
    ('public','applications','guard_driverhub_application_insert'), ('public','applications','enforce_driverhub_application_update'),
    ('public','applications','notify_driverhub_application_insert'), ('public','applications','notify_driverhub_application_status'),
    ('public','companies','protect_driverhub_company_verification'), ('public','companies','notify_driverhub_company_verification'),
    ('public','candidate_unlocks','consume_driverhub_database_credit'), ('public','candidate_unlocks','guard_driverhub_candidate_unlock'),
    ('public','candidate_unlocks','notify_driverhub_candidate_unlock'),
    ('public','driver_documents','guard_driverhub_document_verification'),
    ('public','driver_profiles','guard_driverhub_verified_driver_fields'),
    ('public','direct_messages','guard_driverhub_message_participants'), ('public','direct_messages','guard_driverhub_message_update'),
    ('public','direct_messages','notify_driverhub_direct_message'),
    ('public','notifications','guard_driverhub_notification_update'), ('public','notifications','guard_driverhub_trusted_write'),
    ('public','employer_subscriptions','guard_driverhub_trusted_write'), ('public','billing_transactions','guard_driverhub_trusted_write'),
    ('public','job_entitlement_events','guard_driverhub_trusted_write'),
    ('public','profiles','protect_profile_role_trg')
  ) v(sch, tbl, trg)
),
policy_checks AS (
  SELECT 60 AS ord, 'no self-service write policy on ' || t AS check_name,
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t
                           AND p.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')) THEN 'FAIL' ELSE 'PASS' END AS status,
         coalesce((SELECT string_agg(p.policyname, ', ') FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t
                   AND p.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')), '') AS detail
  FROM (VALUES ('employer_subscriptions'), ('billing_transactions'), ('job_entitlement_events')) v(t)
  UNION ALL
  SELECT 61, 'no open notification INSERT policy',
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = 'notifications'
                           AND p.cmd IN ('INSERT', 'ALL')) THEN 'FAIL' ELSE 'PASS' END,
         coalesce((SELECT string_agg(p.policyname, ', ') FROM pg_policies p WHERE p.schemaname = 'public'
                   AND p.tablename = 'notifications' AND p.cmd IN ('INSERT', 'ALL')), '')
  UNION ALL
  SELECT 62, 'legacy policy removed: ' || pol,
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.policyname = pol) THEN 'FAIL' ELSE 'PASS' END, ''
  FROM (VALUES ('profile_self_all'), ('company_self_all'), ('driver_self_all'), ('subscription_self_all'),
               ('profiles employers read drivers'), ('companies public read'), ('subs write own'), ('billing write own')) v(pol)
),
storage_checks AS (
  SELECT 70 AS ord, 'storage bucket driver-documents is private' AS check_name,
         CASE WHEN EXISTS (SELECT 1 FROM storage.buckets b WHERE b.id = 'driver-documents' AND NOT b.public) THEN 'PASS'
              WHEN EXISTS (SELECT 1 FROM storage.buckets b WHERE b.id = 'driver-documents') THEN 'FAIL'
              ELSE 'FAIL' END AS status,
         coalesce((SELECT CASE WHEN b.public THEN 'bucket is PUBLIC: licences/Aadhaar readable by anyone with the link' END
                   FROM storage.buckets b WHERE b.id = 'driver-documents'), 'bucket missing: document uploads fail') AS detail
  UNION ALL
  SELECT 71, 'storage policy present: ' || pol,
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'storage' AND p.tablename = 'objects' AND p.policyname = pol)
              THEN 'PASS' ELSE 'FAIL' END, ''
  FROM (VALUES ('driverhub_documents_read'), ('driverhub_documents_insert'), ('driverhub_documents_delete')) v(pol)
  UNION ALL
  SELECT 72, 'no public read policy on driver documents',
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'storage' AND p.tablename = 'objects'
                           AND p.policyname IN ('Public storage view')) THEN 'FAIL' ELSE 'PASS' END, ''
),
realtime_checks AS (
  SELECT 80 AS ord, 'live updates enabled: ' || t AS check_name,
         CASE WHEN EXISTS (SELECT 1 FROM pg_publication_tables pt WHERE pt.pubname = 'supabase_realtime'
                           AND pt.schemaname = 'public' AND pt.tablename = t) THEN 'PASS' ELSE 'WARN' END AS status,
         'table not in supabase_realtime: open screens will not refresh on changes' AS detail
  FROM (VALUES ('jobs'), ('applications'), ('profiles'), ('driver_profiles'), ('driver_documents'), ('driver_experiences'),
               ('favorite_jobs'), ('saved_searches'), ('candidate_unlocks'), ('direct_messages'), ('notifications'),
               ('employer_subscriptions'), ('billing_transactions'), ('companies')) v(t)
),
data_checks AS (
  SELECT 90 AS ord, 'verified companies listed (not stuck pending)' AS check_name,
         CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
         count(*)::text || ' verified companies still have status pending' AS detail
  FROM public.companies WHERE verified AND status::text = 'pending'
  UNION ALL
  SELECT 91, 'every employer has a company row', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'WARN' END,
         count(*)::text || ' employer accounts without a company profile'
  FROM public.profiles p WHERE p.role::text = 'employer' AND NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.user_id = p.id)
  UNION ALL
  SELECT 92, 'every driver has a driver profile row', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'WARN' END,
         count(*)::text || ' driver accounts without driver_profiles (they cannot be searched)'
  FROM public.profiles p WHERE p.role::text = 'driver' AND NOT EXISTS (SELECT 1 FROM public.driver_profiles d WHERE d.user_id = p.id)
  UNION ALL
  SELECT 93, 'no negative credits', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
         count(*)::text || ' subscriptions with negative job or database credits'
  FROM public.employer_subscriptions WHERE job_credits < 0 OR db_unlock_credits < 0
  UNION ALL
  SELECT 94, 'live jobs have an expiry date', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'WARN' END,
         count(*)::text || ' active jobs without expires_at (they never expire)'
  FROM public.jobs WHERE status::text = 'active' AND expires_at IS NULL
  UNION ALL
  SELECT 95, 'applications only on real driver accounts', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'WARN' END,
         count(*)::text || ' applications made by non-driver accounts'
  FROM public.applications a JOIN public.profiles p ON p.id = a.driver_id WHERE p.role::text <> 'driver'
  UNION ALL
  SELECT 96, 'driver documents stored in the private bucket path', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'WARN' END,
         count(*)::text || ' documents with blob:/data:/public URLs (uploaded by an old version; ask the driver to re-upload)'
  FROM public.driver_documents WHERE file_url LIKE 'blob:%' OR file_url LIKE 'data:%' OR file_url LIKE '%/object/public/%'
  UNION ALL
  SELECT 97, 'admins are active', CASE WHEN count(*) FILTER (WHERE status::text = 'active') > 0 THEN 'PASS' ELSE 'FAIL' END,
         count(*) FILTER (WHERE status::text = 'active')::text || ' active admin account(s); inactive admins have no admin rights'
  FROM public.profiles WHERE role::text = 'admin'
  UNION ALL
  SELECT 98, 'drivers have map coordinates', CASE WHEN count(*) FILTER (WHERE p.latitude IS NULL AND d.latitude IS NULL) = 0 THEN 'PASS' ELSE 'WARN' END,
         count(*) FILTER (WHERE p.latitude IS NULL AND d.latitude IS NULL)::text || ' of ' || count(*)::text
           || ' drivers have no coordinates (hidden from "within X km" searches until they re-save their profile)'
  FROM public.profiles p JOIN public.driver_profiles d ON d.user_id = p.id WHERE p.role::text = 'driver'
),
info AS (
  SELECT 99 AS ord, 'count: ' || label AS check_name, 'INFO' AS status, n::text AS detail
  FROM (
    SELECT 'drivers' AS label, (SELECT count(*) FROM public.profiles WHERE role::text = 'driver') AS n
    UNION ALL SELECT 'employers', (SELECT count(*) FROM public.profiles WHERE role::text = 'employer')
    UNION ALL SELECT 'verified companies', (SELECT count(*) FROM public.companies WHERE verified)
    UNION ALL SELECT 'jobs (active / pending / all)', NULL
    UNION ALL SELECT 'applications', (SELECT count(*) FROM public.applications)
    UNION ALL SELECT 'active hiring plans', (SELECT count(*) FROM public.employer_subscriptions WHERE status = 'active' AND expires_at > now())
  ) x
  WHERE n IS NOT NULL
  UNION ALL
  SELECT 99, 'count: jobs (active / pending / all)', 'INFO',
         (SELECT count(*) FILTER (WHERE status::text = 'active') || ' / ' || count(*) FILTER (WHERE status::text = 'pending') || ' / ' || count(*) FROM public.jobs)
)
SELECT status, check_name, detail
FROM (
  SELECT * FROM table_checks UNION ALL SELECT * FROM grant_checks UNION ALL SELECT * FROM column_checks
  UNION ALL SELECT * FROM function_checks UNION ALL SELECT * FROM trigger_checks UNION ALL SELECT * FROM policy_checks
  UNION ALL SELECT * FROM storage_checks UNION ALL SELECT * FROM realtime_checks UNION ALL SELECT * FROM data_checks
  UNION ALL SELECT * FROM info
) all_checks
ORDER BY CASE status WHEN 'FAIL' THEN 0 WHEN 'WARN' THEN 1 WHEN 'PASS' THEN 2 ELSE 3 END, ord, check_name;
