-- Skill assets storage bucket + image support columns on agent_skill_resources

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('skill-assets', 'skill-assets', true, 10485760)
ON CONFLICT (id) DO UPDATE SET public = excluded.public, file_size_limit = excluded.file_size_limit;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'skill_assets_bucket_public_read'
  ) THEN
    CREATE POLICY skill_assets_bucket_public_read
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'skill-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'skill_assets_bucket_service_role'
  ) THEN
    CREATE POLICY skill_assets_bucket_service_role
      ON storage.objects
      FOR ALL
      USING (bucket_id = 'skill-assets' AND auth.role() = 'service_role')
      WITH CHECK (bucket_id = 'skill-assets' AND auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'skill_assets_bucket_authenticated_upload'
  ) THEN
    CREATE POLICY skill_assets_bucket_authenticated_upload
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'skill-assets');
  END IF;
END $$;

ALTER TABLE public.agent_skill_resources
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'text/markdown',
  ADD COLUMN IF NOT EXISTS storage_url text;

ALTER TABLE public.agent_skill_resources
  ALTER COLUMN content DROP NOT NULL;
