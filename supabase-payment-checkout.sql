-- Apply after supabase-marketplace-flows.sql.
-- Entitlements are written only by the trusted payment verification function.
CREATE TABLE IF NOT EXISTS public.driverhub_payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_order_id text NOT NULL UNIQUE,
  provider_payment_id text UNIQUE,
  plan_code text NOT NULL CHECK (plan_code IN ('jobs-3', 'jobs-6', 'jobs-13', 'unlimited-quarterly')),
  plan_name text NOT NULL,
  amount_paise integer NOT NULL CHECK (amount_paise > 0),
  job_credits integer NOT NULL DEFAULT 0 CHECK (job_credits >= 0),
  database_credits integer NOT NULL DEFAULT 0 CHECK (database_credits >= 0),
  active_job_slots integer NOT NULL DEFAULT 0 CHECK (active_job_slots >= 0),
  validity_days integer NOT NULL CHECK (validity_days > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
ALTER TABLE public.driverhub_payment_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.driverhub_payment_orders FROM anon, authenticated;
GRANT SELECT ON public.driverhub_payment_orders TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.driverhub_payment_orders TO service_role;

CREATE OR REPLACE FUNCTION public.complete_driverhub_payment(p_order_id uuid, p_payment_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  payment_order public.driverhub_payment_orders%ROWTYPE;
  old_expiry timestamptz;
  next_expiry timestamptz;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Only the trusted payment verifier may grant hiring entitlements';
  END IF;
  SELECT * INTO payment_order FROM public.driverhub_payment_orders
    WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment order was not found'; END IF;
  IF payment_order.status = 'paid' THEN
    IF payment_order.provider_payment_id = p_payment_id THEN RETURN true; END IF;
    RAISE EXCEPTION 'Payment order is already completed';
  END IF;
  IF payment_order.status <> 'pending' OR length(trim(p_payment_id)) = 0 THEN
    RAISE EXCEPTION 'Payment order is not payable';
  END IF;

  SELECT expires_at INTO old_expiry FROM public.employer_subscriptions
    WHERE employer_id = payment_order.employer_id AND status = 'active' AND expires_at > now();
  next_expiry := greatest(COALESCE(old_expiry, now()), now()) + make_interval(days => payment_order.validity_days);

  INSERT INTO public.employer_subscriptions (
    employer_id, plan_name, job_credits, db_unlock_credits, total_job_credits,
    total_db_unlock_credits, active_job_slots, status, expires_at, gstin,
    billing_company_name, billing_address, gstin_verified
  ) VALUES (
    payment_order.employer_id, payment_order.plan_name, payment_order.job_credits,
    payment_order.database_credits, payment_order.job_credits, payment_order.database_credits,
    payment_order.active_job_slots, 'active', next_expiry, '', '', '', false
  ) ON CONFLICT (employer_id) DO UPDATE SET
    plan_name = EXCLUDED.plan_name,
    job_credits = CASE WHEN old_expiry IS NOT NULL THEN employer_subscriptions.job_credits + EXCLUDED.job_credits ELSE EXCLUDED.job_credits END,
    db_unlock_credits = CASE WHEN old_expiry IS NOT NULL THEN employer_subscriptions.db_unlock_credits + EXCLUDED.db_unlock_credits ELSE EXCLUDED.db_unlock_credits END,
    total_job_credits = CASE WHEN old_expiry IS NOT NULL THEN employer_subscriptions.total_job_credits + EXCLUDED.total_job_credits ELSE EXCLUDED.total_job_credits END,
    total_db_unlock_credits = CASE WHEN old_expiry IS NOT NULL THEN employer_subscriptions.total_db_unlock_credits + EXCLUDED.total_db_unlock_credits ELSE EXCLUDED.total_db_unlock_credits END,
    active_job_slots = CASE WHEN old_expiry IS NOT NULL THEN greatest(employer_subscriptions.active_job_slots, EXCLUDED.active_job_slots) ELSE EXCLUDED.active_job_slots END,
    status = 'active', expires_at = next_expiry, updated_at = now();

  UPDATE public.driverhub_payment_orders SET status = 'paid', provider_payment_id = p_payment_id, paid_at = now()
    WHERE id = p_order_id;
  UPDATE public.billing_transactions SET status = 'Success', applies_until = next_expiry,
      invoice_id = 'DH-' || upper(substr(replace(p_order_id::text, '-', ''), 1, 12)),
      job_credits_added = payment_order.job_credits, db_credits_added = payment_order.database_credits
    WHERE id = p_order_id AND employer_id = payment_order.employer_id;
  INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (payment_order.employer_id, 'Hiring plan activated', payment_order.plan_name || ' is active.', 'system', '/employer/billing');
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_driverhub_payment(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_driverhub_payment(uuid,text) TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'employer_subscriptions') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.employer_subscriptions;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'billing_transactions') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.billing_transactions;
    END IF;
  END IF;
END;
$$;
