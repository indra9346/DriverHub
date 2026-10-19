-- Test helper: simulate the live project state of 2026-10: anon/authenticated have lost
-- table privileges on DriverHub tables (live returns 42501 for jobs/companies).
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;
