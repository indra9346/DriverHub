-- DriverHub database business-flow tests. Run as postgres on a scratch DB.
-- Each check records PASS/FAIL in tst.results; expected behaviour = correct behaviour.
\set ON_ERROR_STOP 0
\set QUIET 1
\pset pager off
\set ADM '''a0000000-0000-4000-8000-000000000001'''
\set E1  '''e1000000-0000-4000-8000-000000000001'''
\set E2  '''e2000000-0000-4000-8000-000000000002'''
\set D1  '''d1000000-0000-4000-8000-000000000001'''
\set D2  '''d2000000-0000-4000-8000-000000000002'''
\set D3  '''d3000000-0000-4000-8000-000000000003'''
\set J1  '''10000000-0000-4000-8000-000000000001'''
\set J2  '''20000000-0000-4000-8000-000000000002'''
\set J3  '''30000000-0000-4000-8000-000000000003'''
\set J4  '''40000000-0000-4000-8000-000000000004'''
\set J5  '''50000000-0000-4000-8000-000000000005'''

DROP SCHEMA IF EXISTS tst CASCADE;
CREATE SCHEMA tst;
CREATE TABLE tst.results (id serial PRIMARY KEY, name text, ok boolean, detail text);
GRANT USAGE ON SCHEMA tst TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON tst.results TO anon, authenticated, service_role;
GRANT USAGE ON SEQUENCE tst.results_id_seq TO anon, authenticated, service_role;

CREATE FUNCTION tst.check(p_name text, p_cond boolean, p_detail text DEFAULT '') RETURNS void
LANGUAGE sql AS $$ INSERT INTO tst.results(name, ok, detail) VALUES (p_name, COALESCE(p_cond, false), p_detail) $$;

-- Statement must fail (optionally with a matching message). A statement that
-- unexpectedly succeeds is rolled back so it cannot affect later checks.
CREATE FUNCTION tst.expect_error(p_name text, p_sql text, p_pattern text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
    RAISE EXCEPTION 'TST_UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'TST_UNEXPECTED_SUCCESS' THEN
      INSERT INTO tst.results(name, ok, detail) VALUES (p_name, false, 'succeeded but should have been refused');
    ELSE
      INSERT INTO tst.results(name, ok, detail)
      VALUES (p_name, p_pattern IS NULL OR SQLERRM ILIKE '%' || p_pattern || '%', SQLERRM);
    END IF;
  END;
END $$;

CREATE FUNCTION tst.expect_ok(p_name text, p_sql text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  INSERT INTO tst.results(name, ok, detail) VALUES (p_name, true, '');
EXCEPTION WHEN OTHERS THEN
  INSERT INTO tst.results(name, ok, detail) VALUES (p_name, false, SQLERRM);
END $$;

-- Statement must run and touch exactly p_rows rows (RLS-filtered writes report 0).
CREATE FUNCTION tst.expect_rows(p_name text, p_sql text, p_rows integer) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  EXECUTE p_sql;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO tst.results(name, ok, detail) VALUES (p_name, n = p_rows, 'rows=' || n);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO tst.results(name, ok, detail) VALUES (p_name, p_rows = 0, 'error: ' || SQLERRM);
END $$;

CREATE FUNCTION tst.login(p_uid uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, false)
$$;
CREATE FUNCTION tst.logout() RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', '{"role":"anon"}', false)
$$;
-- Run an attack whose outcome is checked afterwards (as postgres): it may be
-- refused, filtered by RLS, or silently neutralised by a trigger.
CREATE FUNCTION tst.attempt(p_sql text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tst TO anon, authenticated, service_role;

-- ---------------------------------------------------------------- setup (postgres)
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:ADM, 'admin@test.local', '{"full_name":"Test Admin"}'),
  (:E1, 'emp1@test.local', '{"role":"employer","full_name":"Emp One","company_name":"One Logistics","phone":"9000000001","city":"Bengaluru","state":"Karnataka"}'),
  (:E2, 'emp2@test.local', '{"role":"employer","full_name":"Emp Two","company_name":"Two Transport","phone":"9000000002"}'),
  (:D1, 'drv1@test.local', '{"role":"driver","full_name":"Driver One","phone":"9100000001","driver_category":"HMV","experience_years":"5","city":"Bengaluru","state":"Karnataka","district":"Bengaluru Urban","pincode":"560058","location":"Peenya, Bengaluru Urban, Karnataka - 560058"}'),
  (:D2, 'drv2@test.local', '{"role":"driver","full_name":"Driver Two","phone":"9100000002","driver_category":"LMV","experience_years":"1","city":"Mysuru","state":"Karnataka"}'),
  (:D3, 'drv3@test.local', '{"role":"driver","full_name":"Driver Three","phone":"9100000003","driver_category":"HMV","experience_years":"8","city":"Chennai","state":"Tamil Nadu"}');
UPDATE public.profiles SET role = 'admin' WHERE id = :ADM;
DELETE FROM public.driver_profiles WHERE user_id = :ADM;

SELECT tst.check('signup: employer starts unverified + pending',
  (SELECT NOT verified AND status = 'pending' FROM public.companies WHERE user_id = :E1));
SELECT tst.check('signup: employer starts with no active plan',
  (SELECT status = 'expired' AND job_credits = 0 FROM public.employer_subscriptions WHERE employer_id = :E1));
SELECT tst.check('signup: district/PIN/location from the signup form are stored',
  (SELECT district = 'Bengaluru Urban' AND pincode = '560058' AND location LIKE 'Peenya%' FROM public.profiles WHERE id = :D1)
  AND (SELECT district = 'Bengaluru Urban' AND pincode = '560058' FROM public.driver_profiles WHERE user_id = :D1));
SELECT tst.check('signup: driver profile row created with metadata',
  (SELECT driver_category = 'HMV' AND years_experience = 5 FROM public.driver_profiles WHERE user_id = :D1));

-- Plans arrive only through the trusted payment completion function.
INSERT INTO public.driverhub_payment_orders (id, employer_id, provider_order_id, plan_code, plan_name, amount_paise, job_credits, database_credits, active_job_slots, validity_days) VALUES
  ('0e100000-0000-4000-8000-000000000001', :E1, 'order_e1_jobs', 'jobs-3', '3 Job credits', 229982, 3, 0, 0, 30),
  ('0e100000-0000-4000-8000-000000000002', :E1, 'order_e1_unl', 'unlimited-quarterly', 'DriverHub Unlimited', 707882, 0, 2, 1, 90),
  ('0e200000-0000-4000-8000-000000000001', :E2, 'order_e2_jobs', 'jobs-3', '3 Job credits', 229982, 3, 0, 0, 30);
INSERT INTO public.billing_transactions (id, employer_id, plan_details, amount, status)
  VALUES ('0e100000-0000-4000-8000-000000000001', :E1, '3 Job credits', 2299.82, 'Pending');
SELECT public.complete_driverhub_payment('0e100000-0000-4000-8000-000000000001', 'pay_1');
SELECT public.complete_driverhub_payment('0e100000-0000-4000-8000-000000000002', 'pay_2');
SELECT public.complete_driverhub_payment('0e200000-0000-4000-8000-000000000001', 'pay_3');
SELECT tst.check('payment: credits stack across two paid orders',
  (SELECT job_credits = 3 AND db_unlock_credits = 2 AND active_job_slots = 1 AND status = 'active' FROM public.employer_subscriptions WHERE employer_id = :E1));
SELECT tst.check('payment: replay of the same payment is idempotent',
  public.complete_driverhub_payment('0e100000-0000-4000-8000-000000000001', 'pay_1')
  AND (SELECT job_credits = 3 FROM public.employer_subscriptions WHERE employer_id = :E1));
SELECT tst.check('payment: pending billing row marked Success with invoice',
  (SELECT status = 'Success' AND invoice_id LIKE 'DH-%' FROM public.billing_transactions WHERE id = '0e100000-0000-4000-8000-000000000001'));
SELECT tst.expect_error('payment: second different payment id for a paid order is refused',
  $q$SELECT public.complete_driverhub_payment('0e100000-0000-4000-8000-000000000001', 'pay_other')$q$, 'already completed');

-- ---------------------------------------------------------------- anonymous visitor
SELECT tst.logout();
SET ROLE anon;
SELECT tst.expect_ok('anon: can query public jobs (live shows 42501)', $q$SELECT count(*) FROM public.jobs$q$);
SELECT tst.expect_ok('anon: can query company directory (live shows 42501)', $q$SELECT count(*) FROM public.companies$q$);
SELECT tst.expect_ok('anon: can call public stats RPC', $q$SELECT public.get_driverhub_public_stats()$q$);
SELECT tst.expect_rows('anon: cannot read any profile rows', $q$SELECT * FROM public.profiles$q$, 0);
SELECT tst.expect_error('anon: cannot read payment orders', $q$SELECT * FROM public.driverhub_payment_orders$q$);
SELECT tst.expect_error('anon: cannot search candidates', $q$SELECT * FROM public.search_driverhub_candidates()$q$);
RESET ROLE;

-- ---------------------------------------------------------------- admin verifies E1 (client: companies.update({verified}))
SELECT set_config('tst.total_profiles', (SELECT count(*) FROM public.profiles)::text, false);
SELECT tst.login(:ADM);
SET ROLE authenticated;
SELECT tst.expect_rows('admin: verify company E1', $q$UPDATE public.companies SET verified = true WHERE user_id = 'e1000000-0000-4000-8000-000000000001'$q$, 1);
SELECT tst.check('admin: can read every profile', (SELECT count(*) FROM public.profiles) = current_setting('tst.total_profiles')::bigint);
RESET ROLE;
SELECT tst.check('admin verify: company becomes active so it is listed/searchable',
  (SELECT verified AND status = 'active' FROM public.companies WHERE user_id = :E1));
SELECT tst.check('admin verify: employer is notified',
  EXISTS (SELECT 1 FROM public.notifications WHERE user_id = :E1 AND title ILIKE '%verified%'));

SELECT tst.logout();
SET ROLE anon;
SELECT tst.check('anon: verified company E1 is in the public directory',
  EXISTS (SELECT 1 FROM public.companies WHERE user_id = 'e1000000-0000-4000-8000-000000000001' AND verified AND status = 'active'));
SELECT tst.check('anon: unverified company E2 hidden from directory',
  NOT EXISTS (SELECT 1 FROM public.companies WHERE user_id = 'e2000000-0000-4000-8000-000000000002'));
RESET ROLE;

-- ---------------------------------------------------------------- employer E1 (verified, paid)
SELECT tst.login(:E1);
SET ROLE authenticated;
-- Same shape as the client's companies upsert (profile save) after verification.
SELECT tst.expect_ok('employer: edit own company profile after verification',
  $q$UPDATE public.companies SET company_name = 'One Logistics Pvt Ltd', description = 'Fleet', website = 'https://one.example' WHERE user_id = 'e1000000-0000-4000-8000-000000000001'$q$);
SELECT tst.expect_error('employer: cannot unverify/suspend own company',
  $q$UPDATE public.companies SET status = 'pending' WHERE user_id = 'e1000000-0000-4000-8000-000000000001'$q$);
SELECT tst.expect_rows('employer: cannot edit another company', $q$UPDATE public.companies SET description = 'x' WHERE user_id = 'e2000000-0000-4000-8000-000000000002'$q$, 0);
SELECT tst.expect_ok('employer: save a draft job without spending a credit',
  $q$INSERT INTO public.jobs (id, employer_id, company_name, title, category, location, city, state, description, status, experience_min_years, salary_min, salary_max)
     VALUES ('40000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000001', 'One Logistics', 'Draft driver', 'HMV', 'Bengaluru, Karnataka', 'Bengaluru', 'Karnataka', 'Draft', 'draft', 0, 15000, 18000)$q$);
SELECT tst.expect_ok('employer: publish a job (verified company goes live)',
  $q$INSERT INTO public.jobs (id, employer_id, company_name, title, category, location, city, state, description, status, experience_min_years, salary_min, salary_max)
     VALUES ('10000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'One Logistics', 'HMV Truck Driver', 'HMV', 'Bengaluru, Karnataka', 'Bengaluru', 'Karnataka', 'Long-haul', 'active', 0, 22000, 30000)$q$);
SELECT tst.expect_ok('employer: publish a second job',
  $q$INSERT INTO public.jobs (id, employer_id, company_name, title, category, location, city, state, description, status, experience_min_years, salary_min, salary_max, application_deadline)
     VALUES ('30000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000001', 'One Logistics', 'Expired deadline job', 'LMV', 'Bengaluru, Karnataka', 'Bengaluru', 'Karnataka', 'x', 'active', 1, 18000, 20000, now() - interval '1 day')$q$);
RESET ROLE;
SELECT tst.check('employer publish: job live and keeps 0-year (fresher) requirement',
  (SELECT status = 'active' AND credit_consumed AND experience_min_years = 0 AND expires_at > now() + interval '29 days' FROM public.jobs WHERE id = :J1));
SELECT tst.check('employer publish: two credits consumed, draft free',
  (SELECT job_credits = 1 FROM public.employer_subscriptions WHERE employer_id = :E1));
SELECT tst.check('employer publish: entitlement event recorded',
  (SELECT count(*) = 2 FROM public.job_entitlement_events WHERE employer_id = :E1));
SELECT tst.login(:E1);
SET ROLE authenticated;
SELECT tst.expect_error('employer: cannot extend job expiry for free',
  $q$UPDATE public.jobs SET expires_at = now() + interval '5 years' WHERE id = '10000000-0000-4000-8000-000000000001'$q$);
SELECT tst.expect_error('employer: cannot flip entitlement flags',
  $q$UPDATE public.jobs SET credit_consumed = false WHERE id = '10000000-0000-4000-8000-000000000001'$q$);
SELECT tst.expect_error('employer: cannot self-reject a live job to get a credit back',
  $q$UPDATE public.jobs SET status = 'rejected' WHERE id = '30000000-0000-4000-8000-000000000003'$q$);
SELECT tst.expect_ok('employer: edit live job details', $q$UPDATE public.jobs SET salary_max = 32000, description = 'Long-haul, updated' WHERE id = '10000000-0000-4000-8000-000000000001'$q$);
SELECT tst.expect_ok('employer: save a search with radius and "any time" activity',
  $q$INSERT INTO public.saved_searches (employer_id, title, category, city, district, pincode, radius_km, active_in_days, min_exp)
     VALUES (auth.uid(), 'Kolar 25km', '', '', 'Kolar', '563101', 25, NULL, 0)$q$);
SELECT tst.expect_ok('employer: billing profile RPC', $q$SELECT public.update_driverhub_billing_profile('29ABCDE1234F1Z5', 'One Logistics Pvt Ltd', 'Peenya, Bengaluru')$q$);
SELECT tst.expect_rows('employer: can read own hiring plan', $q$SELECT * FROM public.employer_subscriptions WHERE employer_id = auth.uid()$q$, 1);
SELECT tst.expect_rows('employer: can read own billing history', $q$SELECT * FROM public.billing_transactions WHERE employer_id = auth.uid()$q$, 1);
SELECT tst.expect_rows('employer: cannot top up own credits directly', $q$UPDATE public.employer_subscriptions SET job_credits = 999 WHERE employer_id = auth.uid()$q$, 0);
SELECT tst.expect_error('employer: cannot fake a billing transaction', $q$INSERT INTO public.billing_transactions (employer_id, plan_details, amount, status) VALUES (auth.uid(), 'free', 0, 'Success')$q$);
RESET ROLE;
SELECT tst.check('employer: credits unchanged by self-service tampering',
  (SELECT job_credits = 1 AND db_unlock_credits = 2 FROM public.employer_subscriptions WHERE employer_id = :E1));

-- ---------------------------------------------------------------- employer E2 (unverified, paid)
SELECT tst.login(:E2);
SET ROLE authenticated;
SELECT tst.expect_ok('unverified employer: submit job (goes to review)',
  $q$INSERT INTO public.jobs (id, employer_id, company_name, title, category, location, city, state, description, status)
     VALUES ('20000000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000002', 'Two Transport', 'Cab Driver', 'LMV', 'Mysuru, Karnataka', 'Mysuru', 'Karnataka', 'City cab', 'active')$q$);
RESET ROLE;
SELECT tst.check('unverified employer: job held as pending review',
  (SELECT status = 'pending' AND credit_consumed FROM public.jobs WHERE id = :J2));
SELECT tst.login(:E2);
SET ROLE authenticated;
SELECT tst.expect_error('unverified employer: cannot self-approve a pending job',
  $q$UPDATE public.jobs SET status = 'active' WHERE id = '20000000-0000-4000-8000-000000000002'$q$);
SELECT tst.expect_error('unverified employer: cannot search the driver database', $q$SELECT * FROM public.search_driverhub_candidates()$q$, 'verified');
SELECT tst.expect_error('unverified employer: cannot unlock a driver',
  $q$INSERT INTO public.candidate_unlocks (employer_id, driver_id) VALUES ('e2000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000001')$q$);
-- J1 belongs to E1 and is live, so E2 can see it.
SELECT tst.attempt($q$UPDATE public.jobs SET title = 'hijack' WHERE id = '10000000-0000-4000-8000-000000000001'$q$);
RESET ROLE;
SELECT tst.check('employer: cannot edit a job they do not own',
  (SELECT title <> 'hijack' FROM public.jobs WHERE id = :J1));
SELECT tst.check('unverified employer: job still pending after bypass attempt',
  (SELECT status = 'pending' FROM public.jobs WHERE id = :J2));

-- ---------------------------------------------------------------- drivers
SELECT tst.login(:D1);
SET ROLE authenticated;
SELECT tst.expect_rows('driver: sees live jobs only (not pending/draft)', $q$SELECT * FROM public.jobs WHERE status <> 'active'$q$, 0);
SELECT tst.expect_ok('driver: apply to a live job',
  $q$INSERT INTO public.applications (id, job_id, driver_id, cover_message, status) VALUES ('a1000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'Hi', 'applied')$q$);
SELECT tst.expect_error('driver: duplicate application refused',
  $q$INSERT INTO public.applications (job_id, driver_id, status) VALUES ('10000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'applied')$q$);
SELECT tst.expect_error('driver: cannot apply to a job under review',
  $q$INSERT INTO public.applications (job_id, driver_id, status) VALUES ('20000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000001', 'applied')$q$);
SELECT tst.expect_error('driver: cannot apply after the application deadline',
  $q$INSERT INTO public.applications (job_id, driver_id, status) VALUES ('30000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000001', 'applied')$q$);
SELECT tst.expect_error('driver: cannot apply on behalf of another driver',
  $q$INSERT INTO public.applications (job_id, driver_id, status) VALUES ('10000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000002', 'applied')$q$);
SELECT tst.expect_ok('driver: save a job', $q$INSERT INTO public.favorite_jobs (driver_id, job_id) VALUES ('d1000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001')$q$);
SELECT tst.expect_rows('driver: unsave a job', $q$DELETE FROM public.favorite_jobs WHERE driver_id = auth.uid() AND job_id = '10000000-0000-4000-8000-000000000001'$q$, 1);
SELECT tst.expect_ok('driver: update own driver profile',
  $q$UPDATE public.driver_profiles SET expected_salary = 28000, skills = ARRAY['Night driving'], police_verified = true WHERE user_id = auth.uid()$q$);
SELECT tst.expect_rows('driver: cannot read other drivers profiles', $q$SELECT * FROM public.profiles WHERE id <> auth.uid()$q$, 0);
SELECT tst.attempt($q$UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid()$q$);
RESET ROLE;
SELECT tst.check('driver: cannot change own role',
  (SELECT role::text = 'driver' FROM public.profiles WHERE id = :D1));
SET ROLE authenticated;
SELECT tst.expect_ok('driver: upload document row',
  $q$INSERT INTO public.driver_documents (id, driver_id, name, type, file_url, verification_status) VALUES ('dd100000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'dl.pdf', 'driving_license', 'd1000000-0000-4000-8000-000000000001/dl.pdf', 'verified')$q$);
SELECT tst.expect_error('driver: cannot self-verify a document',
  $q$UPDATE public.driver_documents SET verification_status = 'verified' WHERE id = 'dd100000-0000-4000-8000-000000000001'$q$);
SELECT tst.expect_error('driver: cannot search the candidate database', $q$SELECT * FROM public.search_driverhub_candidates()$q$);
SELECT tst.expect_rows('driver: cannot read any employer hiring plan', $q$SELECT * FROM public.employer_subscriptions$q$, 0);
SELECT tst.expect_error('driver: cannot message an employer they never applied to',
  $q$INSERT INTO public.direct_messages (sender_id, sender_name, sender_role, receiver_id, receiver_name, text) VALUES (auth.uid(), 'x', 'driver', 'e2000000-0000-4000-8000-000000000002', 'y', 'hello')$q$);
SELECT tst.expect_ok('driver: message the employer of a job they applied to',
  $q$INSERT INTO public.direct_messages (sender_id, sender_name, sender_role, receiver_id, receiver_name, job_id, text) VALUES (auth.uid(), 'spoofed', 'employer', 'e1000000-0000-4000-8000-000000000001', 'y', '10000000-0000-4000-8000-000000000001', 'When can I join?')$q$);
RESET ROLE;
SELECT tst.check('driver profile: police_verified not self-settable',
  (SELECT NOT police_verified AND expected_salary = 28000 FROM public.driver_profiles WHERE user_id = :D1));
SELECT tst.check('driver document: forced to pending review',
  (SELECT verification_status = 'pending' FROM public.driver_documents WHERE id = 'dd100000-0000-4000-8000-000000000001'));
SELECT tst.check('application: employer notified of new application',
  EXISTS (SELECT 1 FROM public.notifications WHERE user_id = :E1 AND type = 'new_application'));
SELECT tst.check('message: sender role/name taken from the server, not the client',
  (SELECT sender_role = 'driver' AND sender_name = 'Driver One' FROM public.direct_messages WHERE sender_id = :D1 LIMIT 1));
SELECT tst.check('message: employer notified', EXISTS (SELECT 1 FROM public.notifications WHERE user_id = :E1 AND link = '/employer/messages'));

-- D2 tries to sneak a pre-hired application in (would inflate the public "hires" stat).
SELECT tst.login(:D2);
SET ROLE authenticated;
SELECT tst.expect_ok('driver2: apply (client sends status)',
  $q$INSERT INTO public.applications (id, job_id, driver_id, status, employer_notes) VALUES ('a2000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000002', 'hired', 'self-written note')$q$);
RESET ROLE;
SELECT tst.check('driver2: new application always starts as applied, no employer fields',
  (SELECT status = 'applied' AND employer_notes IS NULL FROM public.applications WHERE id = 'a2000000-0000-4000-8000-000000000002'));

-- ---------------------------------------------------------------- employer pipeline + database
SELECT tst.login(:E1);
SET ROLE authenticated;
SELECT tst.expect_rows('employer: sees applications for own job', $q$SELECT * FROM public.applications WHERE job_id = '10000000-0000-4000-8000-000000000001'$q$, 2);
SELECT tst.expect_rows('employer: can read applicant profile', $q$SELECT * FROM public.profiles WHERE id = 'd1000000-0000-4000-8000-000000000001'$q$, 1);
SELECT tst.expect_rows('employer: cannot read a non-applicant profile directly', $q$SELECT * FROM public.profiles WHERE id = 'd3000000-0000-4000-8000-000000000003'$q$, 0);
SELECT tst.expect_error('employer: invalid jump applied -> hired refused',
  $q$UPDATE public.applications SET status = 'hired' WHERE id = 'a1000000-0000-4000-8000-000000000001'$q$, 'transition');
SELECT tst.expect_ok('employer: shortlist applicant', $q$UPDATE public.applications SET status = 'shortlisted', employer_notes = 'Good' WHERE id = 'a1000000-0000-4000-8000-000000000001'$q$);
SELECT tst.expect_ok('employer: schedule interview', $q$UPDATE public.applications SET status = 'interview', interview_date = now() + interval '2 days', interview_mode = 'In-person', interview_location = 'Depot' WHERE id = 'a1000000-0000-4000-8000-000000000001'$q$);
SELECT tst.expect_ok('employer: search driver database', $q$SELECT * FROM public.search_driverhub_candidates()$q$);
SELECT tst.check('employer search: contacts hidden before unlock',
  (SELECT phone IS NULL AND email IS NULL AND license_number IS NULL FROM public.search_driverhub_candidates(p_user_id => 'd3000000-0000-4000-8000-000000000003')));
SELECT tst.check('employer search: radius filter (Bengaluru 50 km excludes Chennai)',
  NOT EXISTS (SELECT 1 FROM public.search_driverhub_candidates(p_lat => 12.97, p_lng => 77.59, p_radius_km => 50) WHERE user_id = 'd3000000-0000-4000-8000-000000000003'));
SELECT tst.expect_ok('employer: unlock driver 3', $q$INSERT INTO public.candidate_unlocks (employer_id, driver_id) VALUES ('e1000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000003')$q$);
SELECT tst.check('employer search: contacts revealed after unlock',
  (SELECT phone = '9100000003' FROM public.search_driverhub_candidates(p_user_id => 'd3000000-0000-4000-8000-000000000003')));
SELECT tst.expect_ok('employer: re-unlock same driver via upsert is free',
  $q$INSERT INTO public.candidate_unlocks (employer_id, driver_id, downloaded_excel) VALUES ('e1000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000003', true) ON CONFLICT (employer_id, driver_id) DO UPDATE SET downloaded_excel = EXCLUDED.downloaded_excel$q$);
SELECT tst.expect_ok('employer: unlock driver 2 (last credit)', $q$INSERT INTO public.candidate_unlocks (employer_id, driver_id) VALUES ('e1000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000002')$q$);
SELECT tst.expect_ok('employer: message an unlocked driver', $q$INSERT INTO public.direct_messages (sender_id, sender_name, sender_role, receiver_id, receiver_name, text) VALUES (auth.uid(), 'x', 'employer', 'd3000000-0000-4000-8000-000000000003', 'y', 'Interested?')$q$);
RESET ROLE;
SELECT tst.check('unlock: exactly one credit per new driver',
  (SELECT db_unlock_credits = 0 FROM public.employer_subscriptions WHERE employer_id = :E1));
SELECT tst.check('unlock: driver notified', EXISTS (SELECT 1 FROM public.notifications WHERE user_id = :D3 AND link = '/driver/profile'));
SELECT tst.check('application: driver notified of status change', EXISTS (SELECT 1 FROM public.notifications WHERE user_id = :D1 AND type = 'application_status'));
SELECT tst.login(:E1);
SET ROLE authenticated;
SELECT tst.expect_error('employer: no credits left -> unlock refused', $q$INSERT INTO public.candidate_unlocks (employer_id, driver_id) VALUES ('e1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001')$q$, 'credits');
RESET ROLE;

SELECT tst.login(:E2);
SET ROLE authenticated;
SELECT tst.expect_rows('employer2: cannot see E1 applications', $q$SELECT * FROM public.applications$q$, 0);
SELECT tst.expect_rows('employer2: cannot move E1 applications', $q$UPDATE public.applications SET status = 'rejected' WHERE id = 'a2000000-0000-4000-8000-000000000002'$q$, 0);
RESET ROLE;

-- driver side of the pipeline
SELECT tst.login(:D1);
SET ROLE authenticated;
SELECT tst.expect_error('driver: cannot edit employer review fields', $q$UPDATE public.applications SET interview_location = 'Home' WHERE id = 'a1000000-0000-4000-8000-000000000001'$q$);
SELECT tst.expect_rows('driver: mark own notification read', $q$UPDATE public.notifications SET read = true WHERE user_id = auth.uid()$q$, 2);
SELECT tst.expect_error('driver: cannot rewrite notification text', $q$UPDATE public.notifications SET title = 'x' WHERE user_id = auth.uid()$q$);
SELECT tst.expect_ok('driver: withdraw application', $q$UPDATE public.applications SET status = 'withdrawn' WHERE id = 'a1000000-0000-4000-8000-000000000001'$q$);
SELECT tst.expect_error('driver: cannot reopen a withdrawn application', $q$UPDATE public.applications SET status = 'applied' WHERE id = 'a1000000-0000-4000-8000-000000000001'$q$);
RESET ROLE;
SELECT tst.check('withdrawal: employer is told the driver withdrew',
  EXISTS (SELECT 1 FROM public.notifications WHERE user_id = :E1 AND title = 'Application withdrawn'));
SELECT tst.check('withdrawal: driver is not notified about their own action',
  NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = :D1 AND message LIKE '%is now withdrawn%'));

-- ---------------------------------------------------------------- admin moderation
SELECT tst.login(:ADM);
SET ROLE authenticated;
SELECT tst.expect_ok('admin: approve pending job', $q$UPDATE public.jobs SET status = 'active' WHERE id = '20000000-0000-4000-8000-000000000002'$q$);
SELECT tst.expect_ok('admin: reject a paid job', $q$UPDATE public.jobs SET status = 'rejected' WHERE id = '30000000-0000-4000-8000-000000000003'$q$);
SELECT tst.expect_ok('admin: review document', $q$SELECT public.review_driverhub_document('dd100000-0000-4000-8000-000000000001', 'verified')$q$);
SELECT tst.expect_rows('admin: block driver 3', $q$UPDATE public.profiles SET status = 'blocked' WHERE id = 'd3000000-0000-4000-8000-000000000003'$q$, 1);
RESET ROLE;
SELECT tst.check('admin approve: employer notified', EXISTS (SELECT 1 FROM public.notifications WHERE user_id = :E2 AND link LIKE '/employer/jobs%'));
SELECT tst.check('admin reject: job credit refunded', (SELECT job_credits = 2 FROM public.employer_subscriptions WHERE employer_id = :E1));
SELECT tst.check('admin review: document verified + driver notified',
  (SELECT verification_status = 'verified' FROM public.driver_documents WHERE id = 'dd100000-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM public.notifications WHERE user_id = :D1 AND link = '/driver/documents'));

SELECT tst.login(:D2);
SET ROLE authenticated;
SELECT tst.expect_error('driver: cannot call the admin document review', $q$SELECT public.review_driverhub_document('dd100000-0000-4000-8000-000000000001', 'rejected')$q$);
RESET ROLE;
SELECT tst.login(:D3);
SET ROLE authenticated;
SELECT tst.expect_error('blocked driver: cannot apply to jobs',
  $q$INSERT INTO public.applications (job_id, driver_id, status) VALUES ('20000000-0000-4000-8000-000000000002', 'd3000000-0000-4000-8000-000000000003', 'applied')$q$);
RESET ROLE;
SELECT tst.login(:E1);
SET ROLE authenticated;
SELECT tst.check('blocked driver: hidden from candidate search',
  NOT EXISTS (SELECT 1 FROM public.search_driverhub_candidates() WHERE user_id = 'd3000000-0000-4000-8000-000000000003'));
RESET ROLE;

-- ---------------------------------------------------------------- public stats
SELECT tst.logout();
SET ROLE anon;
SELECT tst.check('stats: verified employers = 1', ((public.get_driverhub_public_stats() ->> 'verifiedEmployers')::int = 1));
SELECT tst.check('stats: open vacancies only count live, in-deadline jobs (J1 + J2)',
  ((public.get_driverhub_public_stats() ->> 'activeVacancies')::int = 6), (public.get_driverhub_public_stats())::text);
SELECT tst.check('stats: blocked driver excluded from driver count',
  ((public.get_driverhub_public_stats() ->> 'verifiedDrivers')::int <= 2), (public.get_driverhub_public_stats())::text);
SELECT tst.check('stats: self-written "hired" status does not count as a hire', ((public.get_driverhub_public_stats() ->> 'hires')::int = 0));
RESET ROLE;

\pset format unaligned
\pset tuples_only on
SELECT CASE WHEN ok THEN 'PASS ' ELSE 'FAIL ' END || name || CASE WHEN ok OR detail = '' THEN '' ELSE '  -- ' || left(detail, 160) END FROM tst.results ORDER BY id;
SELECT 'TOTAL ' || count(*) || '  PASS ' || count(*) FILTER (WHERE ok) || '  FAIL ' || count(*) FILTER (WHERE NOT ok) FROM tst.results;
