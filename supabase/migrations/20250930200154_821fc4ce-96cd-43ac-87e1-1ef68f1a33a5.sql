-- Add new columns to firms table
ALTER TABLE public.firms 
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS dropbox_connected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS dropbox_access_token text;

-- Add new column to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS dropbox_folder_path text;

-- Add new columns to reviews table
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS triggered_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Update reviews.triggered_at from run_date for existing records
UPDATE public.reviews 
SET triggered_at = run_date 
WHERE triggered_at IS NULL AND run_date IS NOT NULL;

-- Make triggered_at NOT NULL after backfilling
ALTER TABLE public.reviews ALTER COLUMN triggered_at SET NOT NULL;

-- Drop old RLS policies on firms
DROP POLICY IF EXISTS "Authenticated users can view firms" ON public.firms;
DROP POLICY IF EXISTS "Authenticated users can insert firms" ON public.firms;
DROP POLICY IF EXISTS "Authenticated users can update firms" ON public.firms;
DROP POLICY IF EXISTS "Authenticated users can delete firms" ON public.firms;

-- Create new RLS policies for firms (users can only access their own firm)
CREATE POLICY "Users can view their own firm"
ON public.firms FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own firm"
ON public.firms FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own firm"
ON public.firms FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own firm"
ON public.firms FOR DELETE
USING (auth.uid() = owner_id);

-- Drop old overly permissive RLS policy on reviews
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.reviews;

-- Create security definer function to check if user owns the firm for a client
CREATE OR REPLACE FUNCTION public.user_owns_client_firm(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.clients c
    JOIN public.firms f ON c.firm_id = f.id
    WHERE c.id = _client_id 
    AND f.owner_id = _user_id
  );
$$;

-- Create new RLS policies for reviews (users can only access reviews for their firm's clients)
CREATE POLICY "Users can view reviews for their firm's clients"
ON public.reviews FOR SELECT
USING (user_owns_client_firm(auth.uid(), client_id));

CREATE POLICY "Users can insert reviews for their firm's clients"
ON public.reviews FOR INSERT
WITH CHECK (user_owns_client_firm(auth.uid(), client_id));

CREATE POLICY "Users can update reviews for their firm's clients"
ON public.reviews FOR UPDATE
USING (user_owns_client_firm(auth.uid(), client_id));

CREATE POLICY "Users can delete reviews for their firm's clients"
ON public.reviews FOR DELETE
USING (user_owns_client_firm(auth.uid(), client_id));

-- Update clients RLS to use the new owner-based access
DROP POLICY IF EXISTS "Users can view clients from their firm" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients for their firm" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients from their firm" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients from their firm" ON public.clients;

-- Create security definer function to check if user owns the firm
CREATE OR REPLACE FUNCTION public.user_owns_firm(_user_id uuid, _firm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.firms
    WHERE id = _firm_id 
    AND owner_id = _user_id
  );
$$;

CREATE POLICY "Users can view clients from their own firm"
ON public.clients FOR SELECT
USING (user_owns_firm(auth.uid(), firm_id));

CREATE POLICY "Users can insert clients for their own firm"
ON public.clients FOR INSERT
WITH CHECK (user_owns_firm(auth.uid(), firm_id));

CREATE POLICY "Users can update clients from their own firm"
ON public.clients FOR UPDATE
USING (user_owns_firm(auth.uid(), firm_id));

CREATE POLICY "Users can delete clients from their own firm"
ON public.clients FOR DELETE
USING (user_owns_firm(auth.uid(), firm_id));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_firm_id ON public.clients(firm_id);
CREATE INDEX IF NOT EXISTS idx_clients_realm_id ON public.clients(realm_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON public.reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_triggered ON public.reviews(client_id, triggered_at DESC);