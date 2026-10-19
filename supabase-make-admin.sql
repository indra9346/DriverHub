-- Make one existing sign-in account a DriverHub administrator.
-- Works whether or not the account already has a DriverHub profile.
DO $$
DECLARE
  admin_email text := 'CHANGE-ME@example.com';   -- <- put the admin's email here
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE lower(email) = lower(admin_email);
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No sign-in account with email %. Create it first under Authentication -> Users -> Add user.', admin_email;
  END IF;
  INSERT INTO public.profiles (id, role, full_name, email, status)
  SELECT u.id, 'admin', COALESCE(NULLIF(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1)), lower(u.email), 'active'
  FROM auth.users u WHERE u.id = admin_id
  -- A row made by another app's sign-up trigger may lack the email and name.
  ON CONFLICT (id) DO UPDATE SET role = 'admin', status = 'active', email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name);
  DELETE FROM public.driver_profiles WHERE user_id = admin_id;
  RAISE NOTICE '% is now a DriverHub administrator. Sign in at /login?role=admin', admin_email;
END $$;
