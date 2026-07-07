-- Fix infinite recursion in user_profiles RLS policies.
-- The admin policies query user_profiles inside user_profiles RLS, causing recursion.
-- Solution: SECURITY DEFINER function bypasses RLS to check admin status.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Drop the recursive policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.user_profiles;

-- Recreate with the safe function
CREATE POLICY "Admins can read all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update profiles"
  ON public.user_profiles
  FOR UPDATE
  USING (public.is_admin());
