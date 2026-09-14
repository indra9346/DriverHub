-- =====================================================================
-- DRIVER HUB — COMPLETE ERROR-FREE SUPABASE SEED SCRIPT
-- Handles existing trigger records & unique constraints gracefully.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Insert/Update auth.users (Credentials: DriverHub@2026)
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@driverhub.in',
    crypt('DriverHub@2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"admin","full_name":"System Administrator"}',
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'deepa@bharatlogistics.in',
    crypt('DriverHub@2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"employer","full_name":"Deepa Sharma","company_name":"Bharat Logistics Pvt Ltd"}',
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'vikram@fasttrackcabs.in',
    crypt('DriverHub@2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"employer","full_name":"Vikram Malhotra","company_name":"FastTrack Urban Cabs"}',
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'transit@sunriseschools.org',
    crypt('DriverHub@2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"employer","full_name":"Anand Kulkarni","company_name":"Sunrise Educational Transit"}',
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'ravi.kumar@driverhub.in',
    crypt('DriverHub@2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"driver","full_name":"Ravi Kumar"}',
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000006',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'manjunath.r@driverhub.in',
    crypt('DriverHub@2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"driver","full_name":"Manjunath R"}',
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000007',
    '00000000-0000-4000-8000-000000000000',
    'authenticated',
    'authenticated',
    'suresh.patel@driverhub.in',
    crypt('DriverHub@2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"driver","full_name":"Suresh Patel"}',
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000008',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'mohammed.arif@driverhub.in',
    crypt('DriverHub@2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"driver","full_name":"Mohammed Arif"}',
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000009',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'venkatesh.rao@driverhub.in',
    crypt('DriverHub@2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"driver","full_name":"Venkatesh Rao"}',
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password;

-- 2. Update/Insert Profiles
INSERT INTO public.profiles (id, role, full_name, email, phone, city, state, status) VALUES
  ('00000000-0000-4000-8000-000000000001', 'admin', 'System Administrator', 'admin@driverhub.in', '+91 99000 11223', 'Bengaluru', 'Karnataka', 'active'),
  ('00000000-0000-4000-8000-000000000002', 'employer', 'Deepa Sharma', 'deepa@bharatlogistics.in', '+91 80 2200 0001', 'Bengaluru', 'Karnataka', 'active'),
  ('00000000-0000-4000-8000-000000000003', 'employer', 'Vikram Malhotra', 'vikram@fasttrackcabs.in', '+91 80 4455 6677', 'Bengaluru', 'Karnataka', 'active'),
  ('00000000-0000-4000-8000-000000000004', 'employer', 'Anand Kulkarni', 'transit@sunriseschools.org', '+91 82 1234 5678', 'Mysuru', 'Karnataka', 'active'),
  ('00000000-0000-4000-8000-000000000005', 'driver', 'Ravi Kumar', 'ravi.kumar@driverhub.in', '+91 98765 43210', 'Bengaluru', 'Karnataka', 'active'),
  ('00000000-0000-4000-8000-000000000006', 'driver', 'Manjunath R', 'manjunath.r@driverhub.in', '+91 98450 11223', 'Bengaluru', 'Karnataka', 'active'),
  ('00000000-0000-4000-8000-000000000007', 'driver', 'Suresh Patel', 'suresh.patel@driverhub.in', '+91 97312 34567', 'Hubballi', 'Karnataka', 'active'),
  ('00000000-0000-4000-8000-000000000008', 'driver', 'Mohammed Arif', 'mohammed.arif@driverhub.in', '+91 94480 98765', 'Mangaluru', 'Karnataka', 'active'),
  ('00000000-0000-4000-8000-000000000009', 'driver', 'Venkatesh Rao', 'venkatesh.rao@driverhub.in', '+91 99801 23456', 'Mysuru', 'Karnataka', 'active')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone;

-- 3. Upsert Companies (Using user_id as unique conflict target)
INSERT INTO public.companies (user_id, company_name, contact_person, email, phone, industry, location, city, state, address, verified, status) VALUES
  ('00000000-0000-4000-8000-000000000002', 'Bharat Logistics Pvt Ltd', 'Deepa Sharma', 'deepa@bharatlogistics.in', '+91 80 2200 0001', 'Interstate Heavy Freight & Logistics', 'Electronic City Phase 1', 'Bengaluru', 'Karnataka', 'Plot 42, Heavy Vehicle Industrial Area, Bengaluru - 560100', true, 'active'),
  ('00000000-0000-4000-8000-000000000003', 'FastTrack Urban Cabs', 'Vikram Malhotra', 'vikram@fasttrackcabs.in', '+91 80 4455 6677', 'Urban Mobility & Fleet Services', 'Indiranagar 100ft Road', 'Bengaluru', 'Karnataka', '12, 100ft Road, HAL 2nd Stage, Bengaluru - 560038', true, 'active'),
  ('00000000-0000-4000-8000-000000000004', 'Sunrise Educational Transit', 'Anand Kulkarni', 'transit@sunriseschools.org', '+91 82 1234 5678', 'Student & Corporate Staff Transit', 'Vijayanagar 2nd Stage', 'Mysuru', 'Karnataka', 'Campus Road, Vijayanagar, Mysuru - 570017', true, 'active')
ON CONFLICT (user_id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  contact_person = EXCLUDED.contact_person,
  industry = EXCLUDED.industry,
  location = EXCLUDED.location,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  address = EXCLUDED.address,
  verified = EXCLUDED.verified,
  status = EXCLUDED.status;

-- 4. Upsert Driver Profiles (Using user_id as unique conflict target)
INSERT INTO public.driver_profiles (user_id, driver_category, years_experience, license_number, license_type, license_expiry, skills, preferred_location, expected_salary, availability, bio) VALUES
  ('00000000-0000-4000-8000-000000000005', 'HMV', 6, 'KA01 20180012345', 'Heavy Motor Vehicle (HMV-Transport)', '2032-05-15', ARRAY['Interstate Freight', 'Multi-Axle Handling', 'Night Driving', 'GPS Navigation'], 'Bengaluru / Interstate Karnataka', 28000, 'Immediate', 'Professional commercial driver with over 6 years of flawless interstate freight transit experience.'),
  ('00000000-0000-4000-8000-000000000006', 'Trailer Driver', 8, 'KA05 20160098765', 'Heavy Articulated Trailer (40ft+)', '2030-11-20', ARRAY['Container Trailer (40ft)', 'Port Logistics', 'Preventive Maintenance'], 'Bengaluru, Chennai Port Corridor', 35000, 'Immediate', 'Specialist in 40ft container chassis and high-value cargo transport across south Indian hubs.'),
  ('00000000-0000-4000-8000-000000000007', 'Personal Driver', 5, 'KA25 20190045678', 'Light Motor Vehicle (LMV-Commercial)', '2035-08-10', ARRAY['VIP Courtesy', 'Automatic Transmission', 'Luxury Sedans'], 'Bengaluru Urban', 25000, '2 Weeks', 'Courteous executive chauffeur with extensive experience navigating city traffic.'),
  ('00000000-0000-4000-8000-000000000008', 'Bus Driver', 10, 'KA19 20140023456', 'Passenger Heavy Transport (PSV Badge)', '2029-03-30', ARRAY['Passenger Safety', 'Staff Transit Routes', 'Defensive Driving'], 'Mysuru & Outskirts', 30000, 'Immediate', 'Senior passenger transport captain with clean zero-accident safety track record over 10 years.')
ON CONFLICT (user_id) DO UPDATE SET
  driver_category = EXCLUDED.driver_category,
  years_experience = EXCLUDED.years_experience,
  license_number = EXCLUDED.license_number,
  license_type = EXCLUDED.license_type,
  skills = EXCLUDED.skills,
  preferred_location = EXCLUDED.preferred_location,
  expected_salary = EXCLUDED.expected_salary,
  availability = EXCLUDED.availability,
  bio = EXCLUDED.bio;

-- 5. Insert Driver Documents
INSERT INTO public.driver_documents (driver_id, name, type, file_url, file_size, verification_status)
SELECT dp.id, 'Commercial Driving License (HMV)', 'driving_license', 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600', '2.4 MB', 'verified'
FROM public.driver_profiles dp WHERE dp.user_id = '00000000-0000-4000-8000-000000000005'
ON CONFLICT DO NOTHING;

INSERT INTO public.driver_documents (driver_id, name, type, file_url, file_size, verification_status)
SELECT dp.id, 'Aadhar Card (Identity Proof)', 'aadhar', 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600', '1.8 MB', 'verified'
FROM public.driver_profiles dp WHERE dp.user_id = '00000000-0000-4000-8000-000000000005'
ON CONFLICT DO NOTHING;

-- 6. Insert Jobs (Active & Pending Approval)
INSERT INTO public.jobs (
  id, employer_id, title, category, location, city, state,
  experience_required, experience_min_years, salary_min, salary_max, salary_type,
  working_hours, employment_type, description, required_skills, required_docs,
  vacancies, status, posted_date
) VALUES
  (
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000002',
    'Senior Heavy Truck Driver (Multi-Axle Interstate)',
    'HMV',
    'Electronic City Phase 1, Bengaluru',
    'Bengaluru',
    'Karnataka',
    '3-5 Years',
    3,
    25000,
    32000,
    'monthly',
    'Full-time (Interstate routes)',
    'Full-time',
    'Operate heavy multi-axle freight containers between Bengaluru, Chennai, and Hyderabad hubs. Safe driving, trip logs, night allowance and meal benefits provided.',
    ARRAY['Interstate Freight', 'GPS Navigation', 'Night Driving', 'Safe Operation'],
    ARRAY['Commercial Driving License', 'Heavy Motor Vehicle (HMV) Badge', 'Aadhar Card', 'Medical Fitness Certificate'],
    5,
    'active',
    '2026-09-01'
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000002',
    'Container Trailer Truck Driver (40ft Trailer)',
    'Trailer Driver',
    'Nelamangala Industrial Hub, Bengaluru',
    'Bengaluru',
    'Karnataka',
    '5+ Years',
    5,
    32000,
    42000,
    'monthly',
    'Full-time',
    'Full-time',
    'Handling 40ft container chassis between Nelamangala warehouse and Chennai seaport. Must have prior experience in prime mover handling.',
    ARRAY['40ft Trailer Chassis', 'Port Corridor Transit', 'Vehicle Inspection'],
    ARRAY['Commercial Driving License', 'Aadhar Card', 'Police Clearance Certificate'],
    3,
    'active',
    '2026-09-05'
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-000000000003',
    'Corporate Executive Chauffeur & Sedan Driver',
    'Personal Driver',
    'Indiranagar / MG Road, Bengaluru',
    'Bengaluru',
    'Karnataka',
    '2-4 Years',
    2,
    22000,
    28000,
    'monthly',
    'Day shift (8:30 AM - 6:30 PM)',
    'Full-time',
    'Seeking polite, well-groomed chauffeur for corporate leadership. Modern automatic sedan fleet with fuel card and overtime bonus.',
    ARRAY['Automatic Transmission', 'VIP Hospitality', 'City Routes', 'Punctuality'],
    ARRAY['Commercial Driving License', 'Aadhar Card', 'Police Clearance Certificate'],
    4,
    'active',
    '2026-09-08'
  ),
  (
    '00000000-0000-4000-8000-000000000104',
    '00000000-0000-4000-8000-000000000004',
    'School & Staff Bus Driver (PSV Badge Mandatory)',
    'Bus Driver',
    'Vijayanagar 2nd Stage, Mysuru',
    'Mysuru',
    'Karnataka',
    '4+ Years',
    4,
    24000,
    30000,
    'monthly',
    'Morning & Afternoon split shifts',
    'Full-time',
    'Safe student and faculty transit across designated school routes in Mysuru. Zero tolerance for speeding or rash driving.',
    ARRAY['PSV Bus Handling', 'Student Safety', 'Route Navigation'],
    ARRAY['Commercial Driving License', 'Heavy Motor Vehicle (HMV) Badge', 'Medical Fitness Certificate'],
    2,
    'active',
    '2026-09-10'
  ),
  (
    '00000000-0000-4000-8000-000000000105',
    '00000000-0000-4000-8000-000000000002',
    'Container Truck Driver – Port & Logistics Operations',
    'HMV',
    'Manali Industrial Area, Chennai Corridor',
    'Chennai',
    'Tamil Nadu',
    '3-5 Years',
    3,
    28000,
    38000,
    'monthly',
    'Full-time, Rotational Shift',
    'Full-time',
    'Operate container trucks safely between logistics terminals and cargo hubs. Pre-trip and post-trip inspections mandatory.',
    ARRAY['Container Truck Driving', 'Heavy Vehicle Handling', 'GPS Navigation'],
    ARRAY['Commercial Driving License', 'Heavy Motor Vehicle (HMV) Badge', 'Aadhar Card'],
    2,
    'pending',
    '2026-09-14'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  status = EXCLUDED.status,
  vacancies = EXCLUDED.vacancies;

-- 7. Insert Applications (Showing Candidate Pipeline & Conflict Detection)
INSERT INTO public.applications (
  id, job_id, driver_id, cover_message, status, applied_date, updated_date, employer_notes
) VALUES
  (
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000005',
    'I have 6 years experience in interstate heavy container driving across Karnataka routes.',
    'selected',
    '2026-09-03',
    '2026-09-06',
    'Completed driving test with 95% score. Selected for interstate freight fleet.'
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000006',
    '8 years driving 40ft container trailers for port transit.',
    'interview',
    '2026-09-06',
    '2026-09-12',
    'Interview scheduled for September 20th at Depot 2.'
  ),
  (
    '00000000-0000-4000-8000-000000000203',
    '00000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-000000000007',
    '5 years driving executive Mercedes and Toyota sedans.',
    'shortlisted',
    '2026-09-09',
    '2026-09-11',
    'Profile verified. Ready for chauffeur grooming test.'
  ),
  (
    '00000000-0000-4000-8000-000000000204',
    '00000000-0000-4000-8000-000000000105',
    '00000000-0000-4000-8000-000000000005',
    'Applied for Port & Logistics operations vacancy.',
    'rejected',
    '2026-09-14',
    '2026-09-14',
    'Rejected: Candidate is currently hired and active in Senior Heavy Truck Driver position.'
  )
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  employer_notes = EXCLUDED.employer_notes;

-- 8. Insert Notifications
INSERT INTO public.notifications (user_id, title, message, type, read, link) VALUES
  ('00000000-0000-4000-8000-000000000005', 'Application Status: Selected 🎉', 'Congratulations Ravi! Bharat Logistics has selected you for Senior Heavy Truck Driver.', 'application_status', false, '/driver/applications'),
  ('00000000-0000-4000-8000-000000000002', 'New Application Received', 'Ravi Kumar applied for Container Truck Driver – Port & Logistics Operations.', 'new_application', false, '/employer/applications'),
  ('00000000-0000-4000-8000-000000000001', 'Pending Job Approval Queue', 'Bharat Logistics submitted a new vacancy for port operations.', 'system', false, '/admin/jobs')
ON CONFLICT DO NOTHING;
