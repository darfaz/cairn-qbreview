-- Ensure profiles table has firm_id column (already exists but this is safe)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id);

-- Drop and recreate RLS policies for clients table
DROP POLICY IF EXISTS "Users can view clients from own firm" ON clients;
DROP POLICY IF EXISTS "Users can insert clients for own firm" ON clients;
DROP POLICY IF EXISTS "Users can update clients from own firm" ON clients;
DROP POLICY IF EXISTS "Users can delete clients from own firm" ON clients;

CREATE POLICY "Users can view clients in their firm"
  ON clients FOR SELECT
  USING (firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert clients in their firm"
  ON clients FOR INSERT
  WITH CHECK (firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update clients in their firm"
  ON clients FOR UPDATE
  USING (firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete clients in their firm"
  ON clients FOR DELETE
  USING (firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid()));

-- Drop and recreate RLS policies for reviews table
DROP POLICY IF EXISTS "Users can view reviews for own firm clients" ON reviews;
DROP POLICY IF EXISTS "Users can insert reviews for own firm clients" ON reviews;
DROP POLICY IF EXISTS "Users can update reviews for own firm clients" ON reviews;

CREATE POLICY "Users can view reviews for their clients"
  ON reviews FOR SELECT
  USING (client_id IN (
    SELECT c.id FROM clients c
    JOIN profiles p ON c.firm_id = p.firm_id
    WHERE p.id = auth.uid()
  ));

CREATE POLICY "Users can insert reviews for their clients"
  ON reviews FOR INSERT
  WITH CHECK (client_id IN (
    SELECT c.id FROM clients c
    JOIN profiles p ON c.firm_id = p.firm_id
    WHERE p.id = auth.uid()
  ));

CREATE POLICY "Users can update reviews for their clients"
  ON reviews FOR UPDATE
  USING (client_id IN (
    SELECT c.id FROM clients c
    JOIN profiles p ON c.firm_id = p.firm_id
    WHERE p.id = auth.uid()
  ));

-- Ensure RLS is enabled on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;