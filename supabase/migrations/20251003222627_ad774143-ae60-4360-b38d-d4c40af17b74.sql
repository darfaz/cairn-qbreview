-- First, let's verify the current policies are correct
-- The profiles table should ONLY be readable by the profile owner

-- Drop existing policies to recreate them with explicit security
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a restrictive SELECT policy that explicitly limits to owner only
CREATE POLICY "Users can only view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create a restrictive UPDATE policy
CREATE POLICY "Users can only update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Add explicit comments for security audit trail
COMMENT ON POLICY "Users can only view their own profile" ON public.profiles IS 
  'SECURITY: Users can ONLY read their own profile. Email addresses are restricted to profile owner.';

COMMENT ON POLICY "Users can only update their own profile" ON public.profiles IS 
  'SECURITY: Users can ONLY update their own profile. Prevents unauthorized profile modifications.';

-- Verify RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (additional security)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;