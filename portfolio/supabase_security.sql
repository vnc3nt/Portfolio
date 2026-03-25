-- Enable RLS for projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 1. Public can read data
CREATE POLICY "Public Read Access" 
ON public.projects FOR SELECT 
USING (true);

-- 2. Only Authenticated Users (Admins) can insert
CREATE POLICY "Admin Insert" 
ON public.projects FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 3. Only Authenticated Users (Admins) can update
CREATE POLICY "Admin Update" 
ON public.projects FOR UPDATE 
USING (auth.role() = 'authenticated');

-- 4. Only Authenticated Users (Admins) can delete
CREATE POLICY "Admin Delete" 
ON public.projects FOR DELETE 
USING (auth.role() = 'authenticated');
