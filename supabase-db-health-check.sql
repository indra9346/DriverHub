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
         'fix: run ' || fix_file AS detail
  FROM (VALUES
    ('profiles','role','supabase-live-repair-2026-10.sql'), ('profiles','full_name','supabase-live-repair-2026-10.sql'), ('profiles','email','supabase-live-repair-2026-10.sql'),
    ('profiles','phone','supabase-live-repair-2026-10.sql'), ('profiles','avatar_url','supabase-live-repair-2026-10.sql'), ('profiles','location','supabase-live-repair-2026-10.sql'),
    ('profiles','city','supabase-live-repair-2026-10.sql'), ('profiles','state','supabase-live-repair-2026-10.sql'), ('profiles','district','supabase-live-repair-2026-10.sql'),
    ('profiles','pincode','supabase-live-repair-2026-10.sql'), ('profiles','latitude','supabase-live-repair-2026-10.sql'), ('profiles','longitude','supabase-live-repair-2026-10.sql'),
    ('profiles','status','supabase-live-repair-2026-10.sql'), ('profiles','created_at','supabase-live-repair-2026-10.sql'), ('profiles','updated_at','supabase-live-repair-2026-10.sql'),
    ('driver_profiles','driver_category','supabase-live-repair-2026-10.sql'), ('driver_profiles','years_experience','supabase-live-repair-2026-10.sql'), ('driver_profiles','months_experience','supabase-live-repair-2026-10.sql'),
    ('driver_profiles','license_number','supabase-live-repair-2026-10.sql'), ('driver_profiles','license_type','supabase-live-repair-2026-10.sql'), ('driver_profiles','license_expiry','supabase-live-repair-2026-10.sql'),
    ('driver_profiles','skills','supabase-live-repair-2026-10.sql'), ('driver_profiles','languages','supabase-live-repair-2026-10.sql'), ('driver_profiles','vehicle_types','supabase-live-repair-2026-10.sql'),
    ('driver_profiles','current_role','supabase-live-repair-2026-10.sql'), ('driver_profiles','previous_role','supabase-live-repair-2026-10.sql'), ('driver_profiles','education','supabase-live-repair-2026-10.sql'),
    ('driver_profiles','preferred_location','supabase-live-repair-2026-10.sql'), ('driver_profiles','expected_salary','supabase-live-repair-2026-10.sql'), ('driver_profiles','availability','supabase-live-repair-2026-10.sql'),
    ('driver_profiles','night_shift_willing','supabase-live-repair-2026-10.sql'), ('driver_profiles','outstation_willing','supabase-live-repair-2026-10.sql'), ('driver_profiles','cv_attached','supabase-live-repair-2026-10.sql'),
    ('driver_profiles','police_verified','supabase-live-repair-2026-10.sql'), ('driver_profiles','unlock_count','supabase-live-repair-2026-10.sql'), ('driver_profiles','bio','supabase-live-repair-2026-10.sql'),
    ('driver_profiles','resume_url','supabase-live-repair-2026-10.sql'), ('driver_profiles','latitude','supabase-live-repair-2026-10.sql'), ('driver_profiles','longitude','supabase-live-repair-2026-10.sql'),
    ('driver_profiles','district','supabase-live-repair-2026-10.sql'), ('driver_profiles','pincode','supabase-live-repair-2026-10.sql'), ('driver_profiles','created_at','supabase-live-repair-2026-10.sql'),
    ('driver_profiles','updated_at','supabase-live-repair-2026-10.sql'), ('driver_experiences','vehicle_type','supabase-live-repair-2026-10.sql'), ('driver_experiences','duration_years','supabase-live-repair-2026-10.sql'),
    ('driver_experiences','start_date','supabase-live-repair-2026-10.sql'), ('driver_experiences','end_date','supabase-live-repair-2026-10.sql'), ('driver_experiences','description','supabase-live-repair-2026-10.sql'),
    ('driver_experiences','created_at','supabase-live-repair-2026-10.sql'), ('driver_documents','name','supabase-live-repair-2026-10.sql'), ('driver_documents','type','supabase-live-repair-2026-10.sql'),
    ('driver_documents','file_url','supabase-live-repair-2026-10.sql'), ('driver_documents','file_size','supabase-live-repair-2026-10.sql'), ('driver_documents','verification_status','supabase-live-repair-2026-10.sql'),
    ('driver_documents','upload_date','supabase-live-repair-2026-10.sql'), ('companies','company_name','supabase-live-repair-2026-10.sql'), ('companies','contact_person','supabase-live-repair-2026-10.sql'),
    ('companies','email','supabase-live-repair-2026-10.sql'), ('companies','phone','supabase-live-repair-2026-10.sql'), ('companies','industry','supabase-live-repair-2026-10.sql'),
    ('companies','location','supabase-live-repair-2026-10.sql'), ('companies','city','supabase-live-repair-2026-10.sql'), ('companies','district','supabase-live-repair-2026-10.sql'),
    ('companies','state','supabase-live-repair-2026-10.sql'), ('companies','pincode','supabase-live-repair-2026-10.sql'), ('companies','address','supabase-live-repair-2026-10.sql'),
    ('companies','website','supabase-live-repair-2026-10.sql'), ('companies','logo_url','supabase-live-repair-2026-10.sql'), ('companies','description','supabase-live-repair-2026-10.sql'),
    ('companies','gstin','supabase-live-repair-2026-10.sql'), ('companies','verified','supabase-live-repair-2026-10.sql'), ('companies','status','supabase-live-repair-2026-10.sql'),
    ('companies','created_at','supabase-live-repair-2026-10.sql'), ('companies','updated_at','supabase-live-repair-2026-10.sql'), ('employer_subscriptions','plan_name','supabase-live-repair-2026-10.sql'),
    ('employer_subscriptions','job_credits','supabase-live-repair-2026-10.sql'), ('employer_subscriptions','db_unlock_credits','supabase-live-repair-2026-10.sql'), ('employer_subscriptions','total_job_credits','supabase-live-repair-2026-10.sql'),
    ('employer_subscriptions','total_db_unlock_credits','supabase-live-repair-2026-10.sql'), ('employer_subscriptions','active_job_slots','supabase-live-repair-2026-10.sql'), ('employer_subscriptions','gstin','supabase-live-repair-2026-10.sql'),
    ('employer_subscriptions','gstin_verified','supabase-live-repair-2026-10.sql'), ('employer_subscriptions','billing_company_name','supabase-live-repair-2026-10.sql'), ('employer_subscriptions','billing_address','supabase-live-repair-2026-10.sql'),
    ('employer_subscriptions','status','supabase-live-repair-2026-10.sql'), ('employer_subscriptions','expires_at','supabase-live-repair-2026-10.sql'), ('employer_subscriptions','created_at','supabase-live-repair-2026-10.sql'),
    ('employer_subscriptions','updated_at','supabase-live-repair-2026-10.sql'), ('billing_transactions','plan_details','supabase-live-repair-2026-10.sql'), ('billing_transactions','applies_until','supabase-live-repair-2026-10.sql'),
    ('billing_transactions','amount','supabase-live-repair-2026-10.sql'), ('billing_transactions','status','supabase-live-repair-2026-10.sql'), ('billing_transactions','invoice_id','supabase-live-repair-2026-10.sql'),
    ('billing_transactions','job_credits_added','supabase-live-repair-2026-10.sql'), ('billing_transactions','db_credits_added','supabase-live-repair-2026-10.sql'), ('billing_transactions','created_at','supabase-live-repair-2026-10.sql'),
    ('saved_searches','title','supabase-live-repair-2026-10.sql'), ('saved_searches','category','supabase-live-repair-2026-10.sql'), ('saved_searches','city','supabase-live-repair-2026-10.sql'),
    ('saved_searches','district','supabase-live-repair-2026-10.sql'), ('saved_searches','state','supabase-live-repair-2026-10.sql'), ('saved_searches','pincode','supabase-live-repair-2026-10.sql'),
    ('saved_searches','radius_km','supabase-live-repair-2026-10.sql'), ('saved_searches','keyword','supabase-live-repair-2026-10.sql'), ('saved_searches','vehicle_type','supabase-live-repair-2026-10.sql'),
    ('saved_searches','active_in_days','supabase-live-repair-2026-10.sql'), ('saved_searches','min_exp','supabase-live-repair-2026-10.sql'), ('saved_searches','must_have_skills','supabase-live-repair-2026-10.sql'),
    ('saved_searches','match_count','supabase-live-repair-2026-10.sql'), ('saved_searches','created_at','supabase-live-repair-2026-10.sql'), ('candidate_unlocks','downloaded_excel','supabase-live-repair-2026-10.sql'),
    ('candidate_unlocks','unlocked_at','supabase-live-repair-2026-10.sql'), ('jobs','company_name','supabase-live-repair-2026-10.sql'), ('jobs','company_logo','supabase-live-repair-2026-10.sql'),
    ('jobs','posted_by','supabase-live-repair-2026-10.sql'), ('jobs','category','supabase-live-repair-2026-10.sql'), ('jobs','location','supabase-live-repair-2026-10.sql'),
    ('jobs','city','supabase-live-repair-2026-10.sql'), ('jobs','district','supabase-live-repair-2026-10.sql'), ('jobs','state','supabase-live-repair-2026-10.sql'),
    ('jobs','pincode','supabase-live-repair-2026-10.sql'), ('jobs','work_location_type','supabase-live-repair-2026-10.sql'), ('jobs','experience_required','supabase-live-repair-2026-10.sql'),
    ('jobs','experience_min_years','supabase-live-repair-2026-10.sql'), ('jobs','salary_min','supabase-live-repair-2026-10.sql'), ('jobs','salary_max','supabase-live-repair-2026-10.sql'),
    ('jobs','salary_type','supabase-live-repair-2026-10.sql'), ('jobs','pay_type','supabase-live-repair-2026-10.sql'), ('jobs','perks','supabase-live-repair-2026-10.sql'),
    ('jobs','night_shift','supabase-live-repair-2026-10.sql'), ('jobs','vehicle_type','supabase-live-repair-2026-10.sql'), ('jobs','route_type','supabase-live-repair-2026-10.sql'),
    ('jobs','joining_fee_required','supabase-live-repair-2026-10.sql'), ('jobs','screening_questions','supabase-live-repair-2026-10.sql'), ('jobs','working_hours','supabase-live-repair-2026-10.sql'),
    ('jobs','employment_type','supabase-live-repair-2026-10.sql'), ('jobs','required_skills','supabase-live-repair-2026-10.sql'), ('jobs','required_docs','supabase-live-repair-2026-10.sql'),
    ('jobs','vacancies','supabase-live-repair-2026-10.sql'), ('jobs','status','supabase-live-repair-2026-10.sql'), ('jobs','credit_consumed','supabase-live-repair-2026-10.sql'),
    ('jobs','slot_consumed','supabase-live-repair-2026-10.sql'), ('jobs','entitlement_consumed_at','supabase-live-repair-2026-10.sql'), ('jobs','posted_date','supabase-live-repair-2026-10.sql'),
    ('jobs','application_deadline','supabase-live-repair-2026-10.sql'), ('jobs','expires_at','supabase-live-repair-2026-10.sql'), ('jobs','closed_at','supabase-live-repair-2026-10.sql'),
    ('jobs','created_at','supabase-live-repair-2026-10.sql'), ('jobs','updated_at','supabase-live-repair-2026-10.sql'), ('applications','resume_url','supabase-live-repair-2026-10.sql'),
    ('applications','cover_message','supabase-live-repair-2026-10.sql'), ('applications','status','supabase-live-repair-2026-10.sql'), ('applications','employer_notes','supabase-live-repair-2026-10.sql'),
    ('applications','interview_date','supabase-live-repair-2026-10.sql'), ('applications','interview_mode','supabase-live-repair-2026-10.sql'), ('applications','interview_location','supabase-live-repair-2026-10.sql'),
    ('applications','applied_date','supabase-live-repair-2026-10.sql'), ('applications','updated_date','supabase-live-repair-2026-10.sql'), ('favorite_jobs','created_at','supabase-live-repair-2026-10.sql'),
    ('direct_messages','sender_name','supabase-live-repair-2026-10.sql'), ('direct_messages','sender_role','supabase-live-repair-2026-10.sql'), ('direct_messages','receiver_name','supabase-live-repair-2026-10.sql'),
    ('direct_messages','job_id','supabase-live-repair-2026-10.sql'), ('direct_messages','job_title','supabase-live-repair-2026-10.sql'), ('direct_messages','read','supabase-live-repair-2026-10.sql'),
    ('direct_messages','created_at','supabase-live-repair-2026-10.sql'), ('notifications','type','supabase-live-repair-2026-10.sql'), ('notifications','link','supabase-live-repair-2026-10.sql'),
    ('notifications','read','supabase-live-repair-2026-10.sql'), ('notifications','created_at','supabase-live-repair-2026-10.sql'), ('admin_actions','reason','supabase-live-repair-2026-10.sql'),
    ('admin_actions','created_at','supabase-live-repair-2026-10.sql')
  ) v(tbl, col, fix_file)
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
         'fix: run ' || fix_file AS detail
  FROM (VALUES
    ('is_driverhub_admin','supabase-security-hardening.sql'), ('driverhub_user_applied_to_job','supabase-fix-rls-recursion.sql'),
    ('search_driverhub_candidates','supabase-radius-search.sql'), ('get_driverhub_public_stats','supabase-live-repair-2026-10.sql'),
    ('review_driverhub_document','supabase-live-repair-2026-10.sql'), ('update_driverhub_billing_profile','supabase-marketplace-flows.sql'),
    ('complete_driverhub_payment','supabase-live-repair-2026-10.sql'), ('driverhub_employer_has_active_plan','supabase-employer-driver-doc-access.sql'),
    ('enforce_driverhub_job_entitlement','supabase-live-repair-2026-10.sql'), ('refund_rejected_driverhub_job_credit','supabase-live-repair-2026-10.sql'),
    ('notify_driverhub_job_moderation','supabase-live-repair-2026-10.sql'), ('guard_driverhub_application_insert','supabase-live-repair-2026-10.sql'),
    ('enforce_driverhub_application_update','supabase-live-repair-2026-10.sql'), ('protect_driverhub_company_verification','supabase-live-repair-2026-10.sql'),
    ('notify_driverhub_company_verification','supabase-live-repair-2026-10.sql'), ('guard_driverhub_trusted_write','supabase-live-repair-2026-10.sql'),
    ('apply_driverhub_signup_location','supabase-live-repair-2026-10.sql'), ('handle_new_driverhub_user','supabase-schema.sql'),
    ('revoke_driverhub_free_employer_entitlements','supabase-marketplace-flows.sql')
  ) v(fn, fix_file)
  UNION ALL
  SELECT 41, 'candidate search has radius signature (16 args)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                           WHERE n.nspname = 'public' AND p.proname = 'search_driverhub_candidates' AND p.pronargs = 16)
              THEN 'PASS' ELSE 'FAIL' END, 'fix: run supabase-live-repair-2026-10.sql'
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
         'fix: run the README SQL files in order, ending with supabase-live-repair-2026-10.sql' AS detail
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
         CASE WHEN NOT EXISTS (SELECT 1 FROM storage.buckets b WHERE b.id = 'driver-documents')
                THEN 'bucket missing: document uploads fail (fix: run supabase-employer-driver-doc-access.sql)'
              WHEN EXISTS (SELECT 1 FROM storage.buckets b WHERE b.id = 'driver-documents' AND b.public)
                THEN 'bucket is PUBLIC: licences/Aadhaar readable by anyone with the link (fix: run supabase-live-repair-2026-10.sql)'
              ELSE '' END AS detail
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
  FROM public.jobs j WHERE j.status::text = 'active' AND (to_jsonb(j) ->> 'expires_at') IS NULL
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
         count(*) FILTER (WHERE status::text = 'active')::text || ' active admin account(s); create one: see "Create an admin account" in README'
  FROM public.profiles WHERE role::text = 'admin'
  UNION ALL
  -- to_jsonb(...) ->> keeps this check working on databases without the radius-search columns.
  SELECT 98, 'drivers have map coordinates', CASE WHEN count(*) FILTER (WHERE (to_jsonb(p) ->> 'latitude') IS NULL AND (to_jsonb(d) ->> 'latitude') IS NULL) = 0 THEN 'PASS' ELSE 'WARN' END,
         count(*) FILTER (WHERE (to_jsonb(p) ->> 'latitude') IS NULL AND (to_jsonb(d) ->> 'latitude') IS NULL)::text || ' of ' || count(*)::text
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
SELECT status, check_name,
       CASE WHEN status = 'PASS' AND ord NOT IN (12, 90, 91, 92, 93, 94, 95, 96, 97, 98) THEN '' ELSE detail END AS detail
FROM (
  SELECT * FROM table_checks UNION ALL SELECT * FROM grant_checks UNION ALL SELECT * FROM column_checks
  UNION ALL SELECT * FROM function_checks UNION ALL SELECT * FROM trigger_checks UNION ALL SELECT * FROM policy_checks
  UNION ALL SELECT * FROM storage_checks UNION ALL SELECT * FROM realtime_checks UNION ALL SELECT * FROM data_checks
  UNION ALL SELECT * FROM info
) all_checks
ORDER BY CASE status WHEN 'FAIL' THEN 0 WHEN 'WARN' THEN 1 WHEN 'PASS' THEN 2 ELSE 3 END, ord, check_name;
