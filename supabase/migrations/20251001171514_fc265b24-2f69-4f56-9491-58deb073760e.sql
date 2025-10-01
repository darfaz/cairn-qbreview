-- Remove firm_id system and simplify to user-based access
-- Part 1: Add user_id and update data

-- Step 1: Add user_id to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Migrate existing data - assign all clients to their firm's owner
UPDATE public.clients c
SET user_id = f.owner_id
FROM public.firms f
WHERE c.firm_id = f.id AND c.user_id IS NULL;

-- Step 3: Make user_id NOT NULL after data migration
ALTER TABLE public.clients ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Drop old RLS policies on clients
DROP POLICY IF EXISTS "Users can view clients in their firm" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients in their firm" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients in their firm" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients in their firm" ON public.clients;

-- Step 5: Create new user-based RLS policies for clients
CREATE POLICY "Users can view their own clients"
ON public.clients FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients"
ON public.clients FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
ON public.clients FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
ON public.clients FOR DELETE
USING (auth.uid() = user_id);

-- Step 6: Replace the user_can_access_client function
CREATE OR REPLACE FUNCTION public.user_can_access_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.clients c
    WHERE c.id = _client_id 
    AND c.user_id = _user_id
  );
$$;

-- Step 7: Replace other security functions
CREATE OR REPLACE FUNCTION public.user_can_modify_qbo_tokens(_user_id uuid, _connection_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.clients c
    WHERE c.id = _connection_client_id
    AND c.user_id = _user_id
  ) AND auth.uid() = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_qbo_connection(_user_id uuid, _connection_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.clients c
    WHERE c.id = _connection_client_id
    AND c.user_id = _user_id
  ) AND auth.uid() = _user_id;
$$;

-- Step 8: Update reviews policies to not depend on firm_id
DROP POLICY IF EXISTS "Users can view reviews for their clients" ON public.reviews;
DROP POLICY IF EXISTS "Users can insert reviews for their clients" ON public.reviews;
DROP POLICY IF EXISTS "Users can update reviews for their clients" ON public.reviews;

CREATE POLICY "Users can view their own client reviews"
ON public.reviews FOR SELECT
USING (client_id IN (
  SELECT id FROM public.clients WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert their own client reviews"
ON public.reviews FOR INSERT
WITH CHECK (client_id IN (
  SELECT id FROM public.clients WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update their own client reviews"
ON public.reviews FOR UPDATE
USING (client_id IN (
  SELECT id FROM public.clients WHERE user_id = auth.uid()
));