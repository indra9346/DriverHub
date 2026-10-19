-- Activate a hiring plan for one employer by email, e.g. after an offline
-- payment (or for a test employer) while online checkout is not configured.
-- Uses the same trusted path as a verified Razorpay payment: a payment-order
-- record, a billing transaction, and complete_driverhub_payment().
-- Plans match supabase/functions/create-payment-order (price + 18% GST).
DO $$
DECLARE
  employer_email text := 'CHANGE-ME@example.com';   -- <- employer's sign-in email
  chosen_plan text := 'jobs-3';                      -- jobs-3 | jobs-6 | jobs-13 | unlimited-quarterly
  reference text := 'manual';                        -- e.g. bank transfer / UPI reference
  plan record;
  employer_id uuid;
  order_id uuid := gen_random_uuid();
BEGIN
  SELECT p.id INTO employer_id FROM public.profiles p
   WHERE lower(p.email) = lower(employer_email) AND p.role::text = 'employer';
  IF employer_id IS NULL THEN
    RAISE EXCEPTION 'No DriverHub employer account with email %', employer_email;
  END IF;

  SELECT * INTO plan FROM (VALUES
    ('jobs-3', '3 Job credits', 1949, 3, 0, 0, 30),
    ('jobs-6', '6 Job credits', 3649, 6, 0, 0, 90),
    ('jobs-13', '13 Job credits', 7099, 13, 0, 0, 180),
    ('unlimited-quarterly', 'DriverHub Unlimited', 5999, 0, 600, 1, 90)
  ) AS v(code, name, base, jobs, db_credits, slots, days)
  WHERE v.code = chosen_plan;
  IF plan IS NULL THEN RAISE EXCEPTION 'Unknown plan %', chosen_plan; END IF;

  INSERT INTO public.driverhub_payment_orders (id, employer_id, provider_order_id, plan_code, plan_name, amount_paise,
    job_credits, database_credits, active_job_slots, validity_days)
  VALUES (order_id, employer_id, 'manual_' || replace(order_id::text, '-', ''), plan.code, plan.name,
    (plan.base + round(plan.base * 0.18)) * 100, plan.jobs, plan.db_credits, plan.slots, plan.days);
  INSERT INTO public.billing_transactions (id, employer_id, plan_details, amount, status)
  VALUES (order_id, employer_id, plan.name, plan.base + round(plan.base * 0.18), 'Pending');
  PERFORM public.complete_driverhub_payment(order_id, 'manual:' || reference || ':' || left(order_id::text, 8));
  RAISE NOTICE '% activated for %', plan.name, employer_email;
END $$;
