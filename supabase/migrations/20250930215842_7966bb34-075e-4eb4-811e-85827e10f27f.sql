-- Clean up existing data before applying constraints
DELETE FROM public.clients WHERE firm_id IS NULL;

-- Update firms table schema
ALTER TABLE public.firms 
  DROP COLUMN IF EXISTS logo_url,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS website;

-- Rename name to firm_name if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'firms' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.firms RENAME COLUMN name TO firm_name;
  END IF;
END $$;

-- Ensure firm_name column exists and is not null
ALTER TABLE public.firms 
  ALTER COLUMN firm_name SET NOT NULL;

-- Update clients table schema
ALTER TABLE public.clients
  DROP COLUMN IF EXISTS is_active;

-- Ensure all required columns exist and have correct constraints
ALTER TABLE public.clients
  ALTER COLUMN firm_id SET NOT NULL,
  ALTER COLUMN client_name SET NOT NULL,
  ALTER COLUMN realm_id SET NOT NULL;

-- Add unique constraint on realm_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clients_realm_id_key'
  ) THEN
    ALTER TABLE public.clients ADD CONSTRAINT clients_realm_id_key UNIQUE (realm_id);
  END IF;
END $$;

-- Update reviews table schema
ALTER TABLE public.reviews
  ALTER COLUMN client_id SET NOT NULL,
  ALTER COLUMN triggered_at SET NOT NULL;

-- Drop and recreate status check constraint
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_status_check;
ALTER TABLE public.reviews 
  ADD CONSTRAINT reviews_status_check 
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- Create indexes on clients
CREATE INDEX IF NOT EXISTS idx_clients_firm_id ON public.clients(firm_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_realm_id ON public.clients(realm_id);

-- Create indexes on reviews
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON public.reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_triggered ON public.reviews(client_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);

-- Create or replace update trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
DROP TRIGGER IF EXISTS update_firms_updated_at ON public.firms;
CREATE TRIGGER update_firms_updated_at
  BEFORE UPDATE ON public.firms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update RLS policies for firms
DROP POLICY IF EXISTS "Users can view their own firm" ON public.firms;
DROP POLICY IF EXISTS "Users can update their own firm" ON public.firms;
DROP POLICY IF EXISTS "Users can insert their own firm" ON public.firms;
DROP POLICY IF EXISTS "Users can delete their own firm" ON public.firms;
DROP POLICY IF EXISTS "Users can view own firm" ON public.firms;
DROP POLICY IF EXISTS "Users can insert own firm" ON public.firms;
DROP POLICY IF EXISTS "Users can update own firm" ON public.firms;
DROP POLICY IF EXISTS "Users can delete own firm" ON public.firms;

CREATE POLICY "Users can view own firm"
  ON public.firms FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own firm"
  ON public.firms FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own firm"
  ON public.firms FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own firm"
  ON public.firms FOR DELETE
  USING (owner_id = auth.uid());

-- Update RLS policies for clients
DROP POLICY IF EXISTS "Users can view clients from their own firm" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients for their own firm" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients from their own firm" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients from their own firm" ON public.clients;
DROP POLICY IF EXISTS "Users can view clients from own firm" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients for own firm" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients from own firm" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients from own firm" ON public.clients;

CREATE POLICY "Users can view clients from own firm"
  ON public.clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.firms
      WHERE firms.id = clients.firm_id
      AND firms.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert clients for own firm"
  ON public.clients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.firms
      WHERE firms.id = clients.firm_id
      AND firms.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update clients from own firm"
  ON public.clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.firms
      WHERE firms.id = clients.firm_id
      AND firms.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete clients from own firm"
  ON public.clients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.firms
      WHERE firms.id = clients.firm_id
      AND firms.owner_id = auth.uid()
    )
  );

-- Update RLS policies for reviews
DROP POLICY IF EXISTS "Users can view reviews for their firm's clients" ON public.reviews;
DROP POLICY IF EXISTS "Users can insert reviews for their firm's clients" ON public.reviews;
DROP POLICY IF EXISTS "Users can update reviews for their firm's clients" ON public.reviews;
DROP POLICY IF EXISTS "Users can view reviews for own firm clients" ON public.reviews;
DROP POLICY IF EXISTS "Users can insert reviews for own firm clients" ON public.reviews;
DROP POLICY IF EXISTS "Users can update reviews for own firm clients" ON public.reviews;

CREATE POLICY "Users can view reviews for own firm clients"
  ON public.reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.firms ON firms.id = clients.firm_id
      WHERE clients.id = reviews.client_id
      AND firms.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert reviews for own firm clients"
  ON public.reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.firms ON firms.id = clients.firm_id
      WHERE clients.id = reviews.client_id
      AND firms.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update reviews for own firm clients"
  ON public.reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      JOIN public.firms ON firms.id = clients.firm_id
      WHERE clients.id = reviews.client_id
      AND firms.owner_id = auth.uid()
    )
  );