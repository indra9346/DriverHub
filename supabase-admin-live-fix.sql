-- Safe, idempotent production repair for the admin document review queue.
-- Run after supabase-schema.sql and supabase-marketplace-flows.sql.
-- Existing installations may have created driver_documents before upload_date
-- was added to the canonical schema. The admin queue orders by this column.
ALTER TABLE public.driver_documents
  ADD COLUMN IF NOT EXISTS upload_date timestamptz;

UPDATE public.driver_documents
SET upload_date = now()
WHERE upload_date IS NULL;

ALTER TABLE public.driver_documents
  ALTER COLUMN upload_date SET DEFAULT now();

-- Keep the review page and newly uploaded documents visible through Realtime.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'driver_documents'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_documents;
  END IF;
END;
$$;
