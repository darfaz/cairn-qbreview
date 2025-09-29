-- Add missing columns to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS connection_status TEXT DEFAULT 'disconnected',
ADD COLUMN IF NOT EXISTS sheet_url TEXT,
ADD COLUMN IF NOT EXISTS last_review_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Add check constraints
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_connection_status_check') THEN
    ALTER TABLE clients 
    ADD CONSTRAINT clients_connection_status_check 
    CHECK (connection_status IN ('connected', 'disconnected', 'needs_reconnect', 'error'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_review_status_check') THEN
    ALTER TABLE clients 
    ADD CONSTRAINT clients_review_status_check 
    CHECK (review_status IN ('pending', 'running', 'completed', 'failed'));
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_connection_status ON clients(connection_status);
CREATE INDEX IF NOT EXISTS idx_clients_review_status ON clients(review_status);
CREATE INDEX IF NOT EXISTS idx_clients_last_review_at ON clients(last_review_at DESC);

-- Create review_runs table for tracking review history
CREATE TABLE IF NOT EXISTS review_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  sheet_url TEXT,
  action_items_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB
);

-- Create indexes for review_runs
CREATE INDEX IF NOT EXISTS idx_review_runs_client_id ON review_runs(client_id);
CREATE INDEX IF NOT EXISTS idx_review_runs_firm_id ON review_runs(firm_id);
CREATE INDEX IF NOT EXISTS idx_review_runs_status ON review_runs(status);
CREATE INDEX IF NOT EXISTS idx_review_runs_started_at ON review_runs(started_at DESC);

-- Enable RLS
ALTER TABLE review_runs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies using profiles table (matching existing schema pattern)
DROP POLICY IF EXISTS "Users can view their firm's review runs" ON review_runs;
CREATE POLICY "Users can view their firm's review runs"
ON review_runs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.firm_id = review_runs.firm_id
  )
);

DROP POLICY IF EXISTS "Users can insert their firm's review runs" ON review_runs;
CREATE POLICY "Users can insert their firm's review runs"
ON review_runs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.firm_id = review_runs.firm_id
  )
);

DROP POLICY IF EXISTS "Users can update their firm's review runs" ON review_runs;
CREATE POLICY "Users can update their firm's review runs"
ON review_runs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.firm_id = review_runs.firm_id
  )
);