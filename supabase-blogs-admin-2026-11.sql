-- DriverHub blogs written in the admin panel (2026-11-14). Run once in the
-- Supabase SQL Editor (project of driverhub.in). Safe to run again.
--
-- Admin -> Blog Management adds, edits, hides and deletes blogs. Visitors see
-- only Active blogs whose date has come, on /blogs. Pictures go to the public
-- storage bucket "driverhub-blog-images"; only active DriverHub administrators
-- can upload or delete them. The four built-in guides stay in the site code.

BEGIN;

CREATE TABLE IF NOT EXISTS public.driverhub_blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 120)
    -- Addresses of the built-in guides are taken.
    CHECK (slug NOT IN ('find-and-apply-for-driver-jobs', 'upload-driving-licence-and-documents',
                        'post-a-driver-job-as-an-employer', 'install-driver-hub-app-on-your-phone')),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  category text NOT NULL DEFAULT '' CHECK (char_length(category) <= 60),
  summary text NOT NULL DEFAULT '' CHECK (char_length(summary) <= 320),
  content_html text NOT NULL DEFAULT '' CHECK (char_length(content_html) <= 300000),
  cover_url text NOT NULL DEFAULT '' CHECK (cover_url = '' OR cover_url ~ '^https://'),
  cover_path text NOT NULL DEFAULT '' CHECK (char_length(cover_path) <= 300),
  cover_alt text NOT NULL DEFAULT '' CHECK (char_length(cover_alt) <= 200),
  meta_title text NOT NULL DEFAULT '' CHECK (char_length(meta_title) <= 200),
  meta_description text NOT NULL DEFAULT '' CHECK (char_length(meta_description) <= 320),
  meta_keywords text NOT NULL DEFAULT '' CHECK (char_length(meta_keywords) <= 300),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  published_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS driverhub_blogs_public_idx
  ON public.driverhub_blogs (status, published_at DESC);

-- Who and when, set by the database (not trusted from the browser).
CREATE OR REPLACE FUNCTION public.driverhub_blogs_stamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $driverhub$
BEGIN
  NEW.slug := lower(btrim(NEW.slug));
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.created_by := auth.uid();
  ELSE
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;
  END IF;
  RETURN NEW;
END;
$driverhub$;
DROP TRIGGER IF EXISTS driverhub_blogs_stamp ON public.driverhub_blogs;
CREATE TRIGGER driverhub_blogs_stamp
  BEFORE INSERT OR UPDATE ON public.driverhub_blogs
  FOR EACH ROW EXECUTE FUNCTION public.driverhub_blogs_stamp();

ALTER TABLE public.driverhub_blogs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.driverhub_blogs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.driverhub_blogs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.driverhub_blogs TO authenticated;

DROP POLICY IF EXISTS "Visitors read published blogs" ON public.driverhub_blogs;
CREATE POLICY "Visitors read published blogs" ON public.driverhub_blogs
  FOR SELECT TO anon
  USING (status = 'active' AND published_at <= now());

DROP POLICY IF EXISTS "Members read published blogs, admins read all" ON public.driverhub_blogs;
CREATE POLICY "Members read published blogs, admins read all" ON public.driverhub_blogs
  FOR SELECT TO authenticated
  USING ((status = 'active' AND published_at <= now()) OR public.is_driverhub_admin());

DROP POLICY IF EXISTS "Admins add blogs" ON public.driverhub_blogs;
CREATE POLICY "Admins add blogs" ON public.driverhub_blogs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_driverhub_admin());

DROP POLICY IF EXISTS "Admins edit blogs" ON public.driverhub_blogs;
CREATE POLICY "Admins edit blogs" ON public.driverhub_blogs
  FOR UPDATE TO authenticated
  USING (public.is_driverhub_admin())
  WITH CHECK (public.is_driverhub_admin());

DROP POLICY IF EXISTS "Admins delete blogs" ON public.driverhub_blogs;
CREATE POLICY "Admins delete blogs" ON public.driverhub_blogs
  FOR DELETE TO authenticated
  USING (public.is_driverhub_admin());

-- Blog pictures: anyone can view them (public bucket); only admins change them.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('driverhub-blog-images', 'driverhub-blog-images', true, 6291456,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS driverhub_blog_images_admin_read ON storage.objects;
CREATE POLICY driverhub_blog_images_admin_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'driverhub-blog-images' AND public.is_driverhub_admin());

DROP POLICY IF EXISTS driverhub_blog_images_admin_insert ON storage.objects;
CREATE POLICY driverhub_blog_images_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'driverhub-blog-images' AND public.is_driverhub_admin());

DROP POLICY IF EXISTS driverhub_blog_images_admin_update ON storage.objects;
CREATE POLICY driverhub_blog_images_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'driverhub-blog-images' AND public.is_driverhub_admin())
  WITH CHECK (bucket_id = 'driverhub-blog-images' AND public.is_driverhub_admin());

DROP POLICY IF EXISTS driverhub_blog_images_admin_delete ON storage.objects;
CREATE POLICY driverhub_blog_images_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'driverhub-blog-images' AND public.is_driverhub_admin());

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Result: every row should say true.
SELECT 'blogs table' AS item, to_regclass('public.driverhub_blogs') IS NOT NULL AS ok
UNION ALL
SELECT 'blog policies', (SELECT count(*) = 5 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'driverhub_blogs')
UNION ALL
SELECT 'visitors can read', has_table_privilege('anon', 'public.driverhub_blogs', 'SELECT')
UNION ALL
SELECT 'visitors cannot write', NOT has_table_privilege('anon', 'public.driverhub_blogs', 'INSERT')
  AND NOT has_table_privilege('anon', 'public.driverhub_blogs', 'UPDATE')
  AND NOT has_table_privilege('anon', 'public.driverhub_blogs', 'DELETE')
UNION ALL
SELECT 'picture bucket is public', COALESCE((SELECT public FROM storage.buckets WHERE id = 'driverhub-blog-images'), false)
UNION ALL
SELECT 'picture admin policies', (SELECT count(*) = 4 FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'driverhub_blog_images_admin_%')
UNION ALL
SELECT 'admin check function', to_regprocedure('public.is_driverhub_admin()') IS NOT NULL;
