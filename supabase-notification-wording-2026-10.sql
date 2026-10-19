-- DriverHub notification wording (2026-10-19). Run once in the Supabase SQL
-- Editor if supabase-live-repair-2026-10.sql was run before this date. Safe to
-- run again; replaces two DriverHub notification functions only.
-- Before: "Your application for X is now interview." After: "Your application
-- for X has an interview scheduled. See the date and place in My Applications."

CREATE OR REPLACE FUNCTION public.notify_driverhub_job_moderation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND public.is_driverhub_admin() AND auth.uid() <> NEW.employer_id THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (NEW.employer_id,
      CASE NEW.status::text
        WHEN 'active' THEN 'Job approved'
        WHEN 'rejected' THEN 'Job not approved'
        WHEN 'closed' THEN 'Job closed by DriverHub'
        ELSE 'Job status updated' END,
      '"' || COALESCE(NEW.title, 'Your job') || '" ' ||
        CASE NEW.status::text
          WHEN 'active' THEN 'is approved and live. Drivers can apply now'
          WHEN 'rejected' THEN 'was not approved'
          WHEN 'closed' THEN 'was closed by DriverHub'
          ELSE 'is now ' || replace(NEW.status::text, '_', ' ') END ||
        CASE WHEN NEW.status::text = 'rejected' AND OLD.credit_consumed THEN '. Your job credit was returned.' ELSE '.' END,
      'system', '/employer/jobs');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_driverhub_marketplace_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_employer uuid;
  target_title text;
  receiver_role text;
BEGIN
  IF TG_TABLE_NAME = 'applications' THEN
    SELECT jobs.employer_id, jobs.title INTO target_employer, target_title
      FROM public.jobs WHERE jobs.id = NEW.job_id;
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.notifications(user_id, title, message, type, link)
      VALUES (target_employer, 'New driver application', 'A driver applied for ' || COALESCE(target_title, 'your job') || '.', 'new_application', '/employer/applications');
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status::text = 'withdrawn' AND auth.uid() IS NOT DISTINCT FROM NEW.driver_id THEN
        INSERT INTO public.notifications(user_id, title, message, type, link)
        VALUES (target_employer, 'Application withdrawn', 'A driver withdrew their application for ' || COALESCE(target_title, 'your job') || '.', 'new_application', '/employer/applications');
      ELSE
        INSERT INTO public.notifications(user_id, title, message, type, link)
        VALUES (NEW.driver_id, 'Application status updated', 'Your application for ' || COALESCE(target_title, 'a driver job') || ' ' ||
          CASE NEW.status::text
            WHEN 'viewed' THEN 'was viewed by the employer'
            WHEN 'under_review' THEN 'is under review'
            WHEN 'shortlisted' THEN 'has been shortlisted'
            WHEN 'contacted' THEN 'is moving ahead: the employer will contact you'
            WHEN 'interview' THEN 'has an interview scheduled. See the date and place in My Applications'
            WHEN 'selected' THEN 'was selected'
            WHEN 'hired' THEN 'was successful: you are hired'
            WHEN 'rejected' THEN 'was not selected this time'
            WHEN 'withdrawn' THEN 'was withdrawn'
            ELSE 'is now ' || replace(NEW.status::text, '_', ' ') END || '.', 'application_status', '/driver/applications');
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'direct_messages' THEN
    SELECT role::text INTO receiver_role FROM public.profiles WHERE id = NEW.receiver_id;
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (NEW.receiver_id, 'New message from ' || COALESCE(NEW.sender_name, 'DriverHub user'), left(NEW.text, 120), 'system',
      CASE WHEN receiver_role = 'employer' THEN '/employer/messages' ELSE '/driver/messages' END);
  ELSIF TG_TABLE_NAME = 'candidate_unlocks' THEN
    SELECT companies.company_name INTO target_title FROM public.companies WHERE companies.user_id = NEW.employer_id;
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (NEW.driver_id, 'An employer viewed your contact', COALESCE(target_title, 'An employer') || ' unlocked your driver profile.', 'application_status', '/driver/profile');
  END IF;
  RETURN NEW;
END;
$$;
