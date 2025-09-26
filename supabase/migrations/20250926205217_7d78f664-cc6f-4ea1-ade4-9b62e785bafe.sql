-- Create user profiles table for CPA firm staff
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profile policies (users can read their own profile, admins can read all)
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Update clients table RLS policies to require authentication
DROP POLICY IF EXISTS "Allow all operations on clients" ON public.clients;

CREATE POLICY "Authenticated users can view clients" ON public.clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients" ON public.clients
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete clients" ON public.clients
  FOR DELETE TO authenticated USING (true);

-- Update reconciliation_runs table RLS policies
DROP POLICY IF EXISTS "Allow all operations on reconciliation_runs" ON public.reconciliation_runs;

CREATE POLICY "Authenticated users can view reconciliation_runs" ON public.reconciliation_runs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert reconciliation_runs" ON public.reconciliation_runs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update reconciliation_runs" ON public.reconciliation_runs
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete reconciliation_runs" ON public.reconciliation_runs
  FOR DELETE TO authenticated USING (true);

-- Update scheduled_runs table RLS policies
DROP POLICY IF EXISTS "Allow all operations on scheduled_runs" ON public.scheduled_runs;

CREATE POLICY "Authenticated users can view scheduled_runs" ON public.scheduled_runs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update scheduled_runs" ON public.scheduled_runs
  FOR UPDATE TO authenticated USING (true);

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.email
  );
  RETURN new;
END;
$$;

-- Create trigger to automatically create profiles for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();