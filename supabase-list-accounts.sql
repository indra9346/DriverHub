-- READ ONLY. Every sign-in account in this (shared) Supabase project and what
-- it is in DriverHub. Accounts with "no DriverHub profile" either belong to
-- another app in this project or cannot sign in to DriverHub yet.
SELECT u.email,
       u.created_at::date AS signed_up,
       COALESCE(p.role::text, 'no DriverHub profile') AS driverhub_role,
       p.status,
       EXISTS (SELECT 1 FROM public.driver_profiles d WHERE d.user_id = u.id) AS has_driver_profile,
       EXISTS (SELECT 1 FROM public.companies c WHERE c.user_id = u.id) AS has_company
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at;
