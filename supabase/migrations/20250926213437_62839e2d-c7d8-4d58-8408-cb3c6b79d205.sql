-- First, let's establish proper user-to-firm relationships
-- Add firm_id to profiles table to link users to firms
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'firm_id') THEN
        ALTER TABLE public.profiles ADD COLUMN firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create security definer functions to check permissions
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

CREATE OR REPLACE FUNCTION public.user_can_access_qbo_connection(_user_id UUID, _connection_client_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_can_access_client(_user_id, _connection_client_id);
$$;

-- Drop all existing policies and recreate them securely
-- QBO Connections policies
DO $$
BEGIN
    -- Drop existing qbo_connections policies
    DROP POLICY IF EXISTS "Authenticated users can view qbo_connections" ON public.qbo_connections;
    DROP POLICY IF EXISTS "Authenticated users can insert qbo_connections" ON public.qbo_connections;
    DROP POLICY IF EXISTS "Authenticated users can update qbo_connections" ON public.qbo_connections;
    DROP POLICY IF EXISTS "Authenticated users can delete qbo_connections" ON public.qbo_connections;
    DROP POLICY IF EXISTS "Users can view qbo_connections for their firm's clients" ON public.qbo_connections;
    DROP POLICY IF EXISTS "Users can insert qbo_connections for their firm's clients" ON public.qbo_connections;
    DROP POLICY IF EXISTS "Users can update qbo_connections for their firm's clients" ON public.qbo_connections;
    DROP POLICY IF EXISTS "Users can delete qbo_connections for their firm's clients" ON public.qbo_connections;
    
    -- Create secure qbo_connections policies
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
END $$;

-- Clients policies
DO $$
BEGIN
    -- Drop existing clients policies
    DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
    DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
    DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
    DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;
    DROP POLICY IF EXISTS "Users can view clients from their firm" ON public.clients;
    DROP POLICY IF EXISTS "Users can insert clients for their firm" ON public.clients;
    DROP POLICY IF EXISTS "Users can update clients from their firm" ON public.clients;
    DROP POLICY IF EXISTS "Users can delete clients from their firm" ON public.clients;
    
    -- Create secure clients policies
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
END $$;

-- Add index for better performance on the new firm_id column in profiles
CREATE INDEX IF NOT EXISTS idx_profiles_firm_id ON public.profiles(firm_id);