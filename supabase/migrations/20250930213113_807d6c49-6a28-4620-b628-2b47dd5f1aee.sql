-- Drop existing conflicting tables and recreate with proper schema
-- This migration consolidates the database structure for the QuickBooks Review Management app

-- Drop existing review-related tables
DROP TABLE IF EXISTS public.review_history CASCADE;
DROP TABLE IF EXISTS public.review_runs CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.qbo_clients CASCADE;
DROP TABLE IF EXISTS public.qbo_firms CASCADE;

-- Ensure firms table has correct structure
ALTER TABLE public.firms DROP COLUMN IF EXISTS dropbox_connected;
ALTER TABLE public.firms DROP COLUMN IF EXISTS dropbox_access_token;

-- Ensure firms table has proper columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='firms' AND column_name='owner_id') THEN
    ALTER TABLE public.firms ADD COLUMN owner_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Update clients table to match specification
ALTER TABLE public.clients DROP COLUMN IF EXISTS qbo_company_name CASCADE;
ALTER TABLE public.clients DROP COLUMN IF EXISTS status CASCADE;
ALTER TABLE public.clients DROP COLUMN IF EXISTS connection_status CASCADE;
ALTER TABLE public.clients DROP COLUMN IF EXISTS last_review_date CASCADE;
ALTER TABLE public.clients DROP COLUMN IF EXISTS action_items_count CASCADE;
ALTER TABLE public.clients DROP COLUMN IF EXISTS last_review_at CASCADE;
ALTER TABLE public.clients DROP COLUMN IF EXISTS sheet_url CASCADE;
ALTER TABLE public.clients DROP COLUMN IF EXISTS review_status CASCADE;
ALTER TABLE public.clients DROP COLUMN IF EXISTS last_error CASCADE;
ALTER TABLE public.clients DROP COLUMN IF EXISTS last_sync_at CASCADE;
ALTER TABLE public.clients DROP COLUMN IF EXISTS created_by CASCADE;
ALTER TABLE public.clients DROP COLUMN IF EXISTS is_sandbox CASCADE;
ALTER TABLE public.clients DROP COLUMN IF EXISTS name CASCADE;

-- Rename client_name if it exists to ensure consistency
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='client_name') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='name') THEN
      ALTER TABLE public.clients RENAME COLUMN name TO client_name;
    ELSE
      ALTER TABLE public.clients ADD COLUMN client_name TEXT NOT NULL DEFAULT 'Unknown Client';
    END IF;
  END IF;
END $$;

-- Ensure dropbox_folder_url and dropbox_folder_path exist
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS dropbox_folder_url TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS dropbox_folder_path TEXT;

-- Create reviews table with proper structure
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  action_items_count INTEGER DEFAULT 0,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  sheet_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_firm_id ON public.clients(firm_id);
CREATE INDEX IF NOT EXISTS idx_clients_realm_id ON public.clients(realm_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON public.reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_triggered ON public.reviews(client_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);

-- Update RLS policies for firms
DROP POLICY IF EXISTS "Users can view their own firm" ON public.firms;
DROP POLICY IF EXISTS "Users can update their own firm" ON public.firms;
DROP POLICY IF EXISTS "Users can insert their own firm" ON public.firms;
DROP POLICY IF EXISTS "Users can delete their own firm" ON public.firms;

CREATE POLICY "Users can view their own firm" ON public.firms
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can update their own firm" ON public.firms
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own firm" ON public.firms
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own firm" ON public.firms
  FOR DELETE USING (auth.uid() = owner_id);

-- Update RLS policies for clients
DROP POLICY IF EXISTS "Users can view clients from their own firm" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients from their own firm" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients for their own firm" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients from their own firm" ON public.clients;

CREATE POLICY "Users can view clients from their own firm" ON public.clients
  FOR SELECT USING (user_owns_firm(auth.uid(), firm_id));

CREATE POLICY "Users can update clients from their own firm" ON public.clients
  FOR UPDATE USING (user_owns_firm(auth.uid(), firm_id));

CREATE POLICY "Users can insert clients for their own firm" ON public.clients
  FOR INSERT WITH CHECK (user_owns_firm(auth.uid(), firm_id));

CREATE POLICY "Users can delete clients from their own firm" ON public.clients
  FOR DELETE USING (user_owns_firm(auth.uid(), firm_id));

-- Create RLS policies for reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reviews for their firm's clients" ON public.reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = reviews.client_id
      AND user_owns_firm(auth.uid(), c.firm_id)
    )
  );

CREATE POLICY "Users can insert reviews for their firm's clients" ON public.reviews
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = reviews.client_id
      AND user_owns_firm(auth.uid(), c.firm_id)
    )
  );

CREATE POLICY "Users can update reviews for their firm's clients" ON public.reviews
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = reviews.client_id
      AND user_owns_firm(auth.uid(), c.firm_id)
    )
  );

-- Enable realtime for reviews table
ALTER TABLE public.reviews REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;