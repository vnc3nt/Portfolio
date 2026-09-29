-- Enable RLS for the actual table used by the app client (schema: portfolio)
ALTER TABLE portfolio.projects ENABLE ROW LEVEL SECURITY;

-- Store the Supabase Auth user IDs that are allowed to manage the portfolio.
-- Add the administrator once in the Supabase SQL editor, for example:
-- INSERT INTO portfolio.admin_users (user_id) VALUES ('YOUR-SUPABASE-USER-UUID');
CREATE TABLE IF NOT EXISTS portfolio.admin_users (
	user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE portfolio.admin_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION portfolio.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = portfolio, public
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM portfolio.admin_users
		WHERE user_id = (SELECT auth.uid())
	);
$$;

REVOKE ALL ON FUNCTION portfolio.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION portfolio.is_admin() TO anon, authenticated;

-- Keep deleted versions recoverable instead of removing them permanently.
ALTER TABLE portfolio.projects
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

ALTER TABLE portfolio.projects
ADD COLUMN IF NOT EXISTS title_en text,
ADD COLUMN IF NOT EXISTS description_en text,
ADD COLUMN IF NOT EXISTS headline_en text,
ADD COLUMN IF NOT EXISTS text_en text;

-- Clean up possibly existing policies to make this script re-runnable.
DO $$
DECLARE
	policy_record record;
BEGIN
	FOR policy_record IN
		SELECT policyname
		FROM pg_policies
		WHERE schemaname = 'portfolio'
		  AND tablename = 'projects'
		  AND cmd = 'SELECT'
	LOOP
		EXECUTE format('DROP POLICY IF EXISTS %I ON portfolio.projects', policy_record.policyname);
	END LOOP;
END
$$;

DROP POLICY IF EXISTS "Public Read Access" ON portfolio.projects;
DROP POLICY IF EXISTS "Admin Read Access" ON portfolio.projects;
DROP POLICY IF EXISTS "Admin Insert" ON portfolio.projects;
DROP POLICY IF EXISTS "Admin Update" ON portfolio.projects;
DROP POLICY IF EXISTS "Admin Delete" ON portfolio.projects;

-- 1. Public can read only published, non-deleted data
CREATE POLICY "Public Read Access"
ON portfolio.projects FOR SELECT
USING (
	COALESCE(is_private, false) = false
	AND COALESCE(is_deleted, false) = false
);

-- 2. Administrators can read all versions, including private and deleted rows
CREATE POLICY "Admin Read Access"
ON portfolio.projects FOR SELECT
USING ((SELECT portfolio.is_admin()));

-- 3. Only explicitly allowlisted administrators can insert
CREATE POLICY "Admin Insert"
ON portfolio.projects FOR INSERT
WITH CHECK ((SELECT portfolio.is_admin()));

-- 4. Only explicitly allowlisted administrators can update
CREATE POLICY "Admin Update"
ON portfolio.projects FOR UPDATE
USING ((SELECT portfolio.is_admin()))
WITH CHECK ((SELECT portfolio.is_admin()));

-- 5. Only explicitly allowlisted administrators can delete
CREATE POLICY "Admin Delete"
ON portfolio.projects FOR DELETE
USING ((SELECT portfolio.is_admin()));

-- Keep portfolio images publicly viewable through their public URLs, but do not
-- allow anonymous listing, uploading, replacing, or deleting of objects.
UPDATE storage.buckets
SET public = true
WHERE id = 'portfolio-images';

DO $$
DECLARE
	policy_record record;
BEGIN
	FOR policy_record IN
		SELECT policyname
		FROM pg_policies
		WHERE schemaname = 'storage'
		  AND tablename = 'objects'
		  AND (
				qual ILIKE '%portfolio-images%'
				OR with_check ILIKE '%portfolio-images%'
		  )
	LOOP
		EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
	END LOOP;
END
$$;

DROP POLICY IF EXISTS "Admin List Portfolio Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Portfolio Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Portfolio Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Portfolio Images" ON storage.objects;

CREATE POLICY "Admin List Portfolio Images"
ON storage.objects FOR SELECT
USING (
	bucket_id = 'portfolio-images'
	AND (SELECT portfolio.is_admin())
);

CREATE POLICY "Admin Upload Portfolio Images"
ON storage.objects FOR INSERT
WITH CHECK (
	bucket_id = 'portfolio-images'
	AND (SELECT portfolio.is_admin())
);

CREATE POLICY "Admin Update Portfolio Images"
ON storage.objects FOR UPDATE
USING (
	bucket_id = 'portfolio-images'
	AND (SELECT portfolio.is_admin())
)
WITH CHECK (
	bucket_id = 'portfolio-images'
	AND (SELECT portfolio.is_admin())
);

CREATE POLICY "Admin Delete Portfolio Images"
ON storage.objects FOR DELETE
USING (
	bucket_id = 'portfolio-images'
	AND (SELECT portfolio.is_admin())
);
