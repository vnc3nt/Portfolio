-- Enable RLS for the actual table used by the app client (schema: portfolio)
ALTER TABLE portfolio.projects ENABLE ROW LEVEL SECURITY;

-- Keep deleted versions recoverable instead of removing them permanently.
ALTER TABLE portfolio.projects
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

ALTER TABLE portfolio.projects
ADD COLUMN IF NOT EXISTS title_en text,
ADD COLUMN IF NOT EXISTS description_en text,
ADD COLUMN IF NOT EXISTS headline_en text,
ADD COLUMN IF NOT EXISTS text_en text;

-- Clean up possibly existing policies to make this script re-runnable.
DROP POLICY IF EXISTS "Public Read Access" ON portfolio.projects;
DROP POLICY IF EXISTS "Admin Insert" ON portfolio.projects;
DROP POLICY IF EXISTS "Admin Update" ON portfolio.projects;
DROP POLICY IF EXISTS "Admin Delete" ON portfolio.projects;

-- 1. Public can read data
CREATE POLICY "Public Read Access"
ON portfolio.projects FOR SELECT
USING (true);

-- 2. Authenticated users can insert
CREATE POLICY "Admin Insert"
ON portfolio.projects FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 3. Authenticated users can update
CREATE POLICY "Admin Update"
ON portfolio.projects FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 4. Authenticated users can delete
CREATE POLICY "Admin Delete"
ON portfolio.projects FOR DELETE
USING (auth.role() = 'authenticated');
