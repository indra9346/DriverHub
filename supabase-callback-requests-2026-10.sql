-- DriverHub call-back requests (2026-10-29). Run once in the Supabase SQL
-- Editor. Safe to run again.
--
-- Visitors leave their name, mobile number and a short message from the
-- support chat ("Drop a message"). Active DriverHub administrators get a
-- notification and see every request under Admin -> Call-back Requests, where
-- they mark it as called. Nobody else can read the requests.

CREATE TABLE IF NOT EXISTS public.driverhub_callback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  phone text NOT NULL CHECK (phone ~ '^\+91[6-9][0-9]{9}$'),
  message text NOT NULL DEFAULT '' CHECK (char_length(message) <= 500),
  page text NOT NULL DEFAULT '' CHECK (char_length(page) <= 200),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted')),
  contacted_at timestamptz,
  contacted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS driverhub_callback_requests_created_idx
  ON public.driverhub_callback_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS driverhub_callback_requests_phone_idx
  ON public.driverhub_callback_requests (phone, created_at DESC);

ALTER TABLE public.driverhub_callback_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.driverhub_callback_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.driverhub_callback_requests TO authenticated;
GRANT UPDATE (status, contacted_at, contacted_by) ON public.driverhub_callback_requests TO authenticated;

DROP POLICY IF EXISTS "Admins read call-back requests" ON public.driverhub_callback_requests;
CREATE POLICY "Admins read call-back requests" ON public.driverhub_callback_requests
  FOR SELECT TO authenticated USING (public.is_driverhub_admin());

DROP POLICY IF EXISTS "Admins update call-back requests" ON public.driverhub_callback_requests;
CREATE POLICY "Admins update call-back requests" ON public.driverhub_callback_requests
  FOR UPDATE TO authenticated
  USING (public.is_driverhub_admin())
  WITH CHECK (public.is_driverhub_admin());

-- Requests are added only through this function (there is no insert policy).
-- It cleans and checks the fields, accepts Indian mobile numbers only, and
-- allows 3 requests per number per hour and 100 per hour in total.
CREATE OR REPLACE FUNCTION public.request_driverhub_callback(
  p_name text,
  p_phone text,
  p_message text DEFAULT '',
  p_page text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $driverhub$
DECLARE
  clean_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  clean_phone text := regexp_replace(coalesce(p_phone, ''), '[\s().-]', '', 'g');
  clean_message text := btrim(coalesce(p_message, ''));
  new_id uuid;
BEGIN
  IF char_length(clean_name) < 1 OR char_length(clean_name) > 80 THEN
    RAISE EXCEPTION 'Please enter your name.' USING ERRCODE = '22023';
  END IF;
  -- 10 digits, optionally written with +91, 91 or 0 in front.
  clean_phone := regexp_replace(clean_phone, '^(\+91|0091|91(?=[0-9]{10}$)|0)', '');
  IF clean_phone !~ '^[6-9][0-9]{9}$' THEN
    RAISE EXCEPTION 'Please enter a valid 10-digit mobile number.' USING ERRCODE = '22023';
  END IF;
  clean_phone := '+91' || clean_phone;
  IF char_length(clean_message) > 500 THEN
    RAISE EXCEPTION 'Please keep the message under 500 characters.' USING ERRCODE = '22023';
  END IF;

  IF (SELECT count(*) FROM public.driverhub_callback_requests
        WHERE phone = clean_phone AND created_at > now() - interval '1 hour') >= 3
     OR (SELECT count(*) FROM public.driverhub_callback_requests
        WHERE created_at > now() - interval '1 hour') >= 100 THEN
    RAISE EXCEPTION 'We already have your request. Our team will call you soon.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.driverhub_callback_requests (name, phone, message, page, user_id)
  VALUES (clean_name, clean_phone, clean_message, left(coalesce(p_page, ''), 200), auth.uid())
  RETURNING id INTO new_id;

  -- Tell every active administrator (the number is shown on the admin page only).
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT profile.id, 'New call-back request',
         clean_name || ' asked DriverHub to call them back.', 'system', '/admin/callbacks'
  FROM public.profiles AS profile
  WHERE profile.role = 'admin' AND profile.status = 'active';

  RETURN new_id;
END;
$driverhub$;
REVOKE ALL ON FUNCTION public.request_driverhub_callback(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_driverhub_callback(text, text, text, text) TO anon, authenticated;

-- New requests appear on the admin page without a refresh.
DO $driverhub$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
         AND tablename = 'driverhub_callback_requests'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.driverhub_callback_requests;
  END IF;
END;
$driverhub$;

-- Result: every row should say true.
SELECT 'call-back table' AS item, to_regclass('public.driverhub_callback_requests') IS NOT NULL AS ok
UNION ALL
SELECT 'request function', to_regprocedure('public.request_driverhub_callback(text,text,text,text)') IS NOT NULL
UNION ALL
SELECT 'admin-only policies', (SELECT count(*) = 2 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'driverhub_callback_requests')
UNION ALL
SELECT 'visitors can send', has_function_privilege('anon', 'public.request_driverhub_callback(text,text,text,text)', 'EXECUTE')
UNION ALL
SELECT 'visitors cannot read', NOT has_table_privilege('anon', 'public.driverhub_callback_requests', 'SELECT');
