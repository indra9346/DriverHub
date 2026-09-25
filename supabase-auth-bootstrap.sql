-- DriverHub Auth bootstrap. Apply after supabase-schema.sql.
-- Public sign-up may create driver/employer accounts only. Admin is assigned manually.

CREATE OR REPLACE FUNCTION public.handle_new_driverhub_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text := NEW.raw_user_meta_data ->> 'role';
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email, phone, city, state, status)
  VALUES (
    NEW.id,
    CASE WHEN requested_role = 'employer' THEN 'employer'::public.user_role ELSE 'driver'::public.user_role END,
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'city', ''), 'Bengaluru'),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'state', ''), 'Karnataka'),
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_driverhub ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created_driverhub
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_driverhub_user();

-- Role/status cannot be changed by a user's own profile update. Assign admin role
-- from the Supabase SQL editor or a trusted server only.
CREATE OR REPLACE FUNCTION public.protect_driverhub_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status)
     AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RAISE EXCEPTION 'Only a DriverHub administrator can change account role or status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_driverhub_profile_role ON public.profiles;
CREATE TRIGGER protect_driverhub_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_driverhub_profile_role();
