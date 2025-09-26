-- First, let's establish proper user-to-firm relationships
-- Add firm_id to profiles table to link users to firms
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE;

-- Create a security definer function to check if a user belongs to a firm that owns a client
CREATE OR REPLACE FUNCTION public.user_can_access_client(_user_id UUID, _client_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.clients c ON c.firm_id = p.firm_id
    WHERE p.id = _user_id 
    AND c.id = _client_id
  );
$$;

-- Create a security definer function to check if a user can access QBO connections
CREATE OR REPLACE FUNCTION public.user_can_access_qbo_connection(_user_id UUID, _connection_client_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_can_access_client(_user_id, _connection_client_id);
$$;

-- Drop existing overly permissive RLS policies on qbo_connections
DROP POLICY IF EXISTS "Authenticated users can view qbo_connections" ON public.qbo_connections;
DROP POLICY IF EXISTS "Authenticated users can insert qbo_connections" ON public.qbo_connections;
DROP POLICY IF EXISTS "Authenticated users can update qbo_connections" ON public.qbo_connections;
DROP POLICY IF EXISTS "Authenticated users can delete qbo_connections" ON public.qbo_connections;

-- Create secure RLS policies for qbo_connections
CREATE POLICY "Users can view qbo_connections for their firm's clients" 
ON public.qbo_connections 
FOR SELECT 
USING (public.user_can_access_qbo_connection(auth.uid(), client_id));

CREATE POLICY "Users can insert qbo_connections for their firm's clients" 
ON public.qbo_connections 
FOR INSERT 
WITH CHECK (public.user_can_access_qbo_connection(auth.uid(), client_id));

CREATE POLICY "Users can update qbo_connections for their firm's clients" 
ON public.qbo_connections 
FOR UPDATE 
USING (public.user_can_access_qbo_connection(auth.uid(), client_id));

CREATE POLICY "Users can delete qbo_connections for their firm's clients" 
ON public.qbo_connections 
FOR DELETE 
USING (public.user_can_access_qbo_connection(auth.uid(), client_id));

-- Also update clients table RLS policies to be more secure
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;

-- Create secure RLS policies for clients
CREATE POLICY "Users can view clients from their firm" 
ON public.clients 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND firm_id = clients.firm_id
  )
);

CREATE POLICY "Users can insert clients for their firm" 
ON public.clients 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND firm_id = clients.firm_id
  )
);

CREATE POLICY "Users can update clients from their firm" 
ON public.clients 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND firm_id = clients.firm_id
  )
);

CREATE POLICY "Users can delete clients from their firm" 
ON public.clients 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND firm_id = clients.firm_id
  )
);

-- Update reconciliation_runs policies to be secure as well
DROP POLICY IF EXISTS "Authenticated users can view reconciliation_runs" ON public.reconciliation_runs;
DROP POLICY IF EXISTS "Authenticated users can insert reconciliation_runs" ON public.reconciliation_runs;
DROP POLICY IF EXISTS "Authenticated users can update reconciliation_runs" ON public.reconciliation_runs;
DROP POLICY IF EXISTS "Authenticated users can delete reconciliation_runs" ON public.reconciliation_runs;

CREATE POLICY "Users can view reconciliation_runs for their firm's clients" 
ON public.reconciliation_runs 
FOR SELECT 
USING (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can insert reconciliation_runs for their firm's clients" 
ON public.reconciliation_runs 
FOR INSERT 
WITH CHECK (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can update reconciliation_runs for their firm's clients" 
ON public.reconciliation_runs 
FOR UPDATE 
USING (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can delete reconciliation_runs for their firm's clients" 
ON public.reconciliation_runs 
FOR DELETE 
USING (public.user_can_access_client(auth.uid(), client_id));

-- Update qbo_sync_queue policies to be secure
DROP POLICY IF EXISTS "Authenticated users can view qbo_sync_queue" ON public.qbo_sync_queue;
DROP POLICY IF EXISTS "Authenticated users can insert qbo_sync_queue" ON public.qbo_sync_queue;
DROP POLICY IF EXISTS "Authenticated users can update qbo_sync_queue" ON public.qbo_sync_queue;
DROP POLICY IF EXISTS "Authenticated users can delete qbo_sync_queue" ON public.qbo_sync_queue;

CREATE POLICY "Users can view qbo_sync_queue for their firm's clients" 
ON public.qbo_sync_queue 
FOR SELECT 
USING (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can insert qbo_sync_queue for their firm's clients" 
ON public.qbo_sync_queue 
FOR INSERT 
WITH CHECK (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can update qbo_sync_queue for their firm's clients" 
ON public.qbo_sync_queue 
FOR UPDATE 
USING (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can delete qbo_sync_queue for their firm's clients" 
ON public.qbo_sync_queue 
FOR DELETE 
USING (public.user_can_access_client(auth.uid(), client_id));

-- Add index for better performance on the new firm_id column in profiles
CREATE INDEX IF NOT EXISTS idx_profiles_firm_id ON public.profiles(firm_id);