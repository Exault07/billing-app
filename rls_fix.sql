-- ============================================================
-- RLS QUICK FIX — Run this in the Supabase SQL Editor
-- This fixes the issue where dashboard stats show nothing
-- ============================================================

-- 1. Make the get_auth_role function bypass RLS properly
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Allow authenticated users to INSERT their own profile
-- (needed when a new user logs in for the first time)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Allow users to read their OWN profile (critical for get_auth_role to work)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 4. Grant authenticated role usage on the function
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated;

-- 5. Verify your profile exists with role = 'owner'
-- (Run this separately to check — should return 1 row with role='owner')
SELECT id, role, email FROM profiles WHERE id = auth.uid();
