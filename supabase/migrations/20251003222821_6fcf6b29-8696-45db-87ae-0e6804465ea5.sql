-- Remove redundant email column from profiles table
-- Email is already available in auth.users and accessible via auth.getUser()
-- This eliminates unnecessary PII duplication and the associated security risk

ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

COMMENT ON TABLE public.profiles IS 
  'User profile data. Email is NOT stored here - use auth.users or auth.getUser() to access email.';

-- Update the handle_new_user trigger to not insert email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'first_name', 
    new.raw_user_meta_data ->> 'last_name'
  );
  RETURN new;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS 
  'Trigger function to create profile on user signup. Email is NOT copied to profiles - access via auth.users instead.';