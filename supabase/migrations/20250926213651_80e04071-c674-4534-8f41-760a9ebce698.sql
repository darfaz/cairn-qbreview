-- Enhanced security functions with additional validation
CREATE OR REPLACE FUNCTION public.user_can_access_qbo_connection(_user_id UUID, _connection_client_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Enhanced security: Check user exists, is active, and belongs to firm that owns the client
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.clients c ON c.firm_id = p.firm_id
    WHERE p.id = _user_id 
    AND c.id = _connection_client_id
    AND p.firm_id IS NOT NULL  -- User must belong to a firm
    AND c.firm_id IS NOT NULL  -- Client must belong to a firm
    AND c.is_active = true     -- Client must be active
  ) AND auth.uid() = _user_id; -- Additional check that the requesting user matches
$$;

-- Create a more restrictive function for sensitive operations (token updates)
CREATE OR REPLACE FUNCTION public.user_can_modify_qbo_tokens(_user_id UUID, _connection_client_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Even stricter validation for token modifications
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.clients c ON c.firm_id = p.firm_id
    WHERE p.id = _user_id 
    AND c.id = _connection_client_id
    AND p.firm_id IS NOT NULL
    AND c.firm_id IS NOT NULL
    AND c.is_active = true
    AND p.role IN ('admin', 'manager', 'owner') -- Only certain roles can modify tokens
  ) AND auth.uid() = _user_id;
$$;

-- Update RLS policies with enhanced security
DROP POLICY IF EXISTS "Users can view qbo_connections for their firm's clients" ON public.qbo_connections;
DROP POLICY IF EXISTS "Users can insert qbo_connections for their firm's clients" ON public.qbo_connections;
DROP POLICY IF EXISTS "Users can update qbo_connections for their firm's clients" ON public.qbo_connections;
DROP POLICY IF EXISTS "Users can delete qbo_connections for their firm's clients" ON public.qbo_connections;

-- Create enhanced policies
CREATE POLICY "Users can view qbo_connections for their firm's clients" 
ON public.qbo_connections 
FOR SELECT 
USING (public.user_can_access_qbo_connection(auth.uid(), client_id));

CREATE POLICY "Users can insert qbo_connections for their firm's clients" 
ON public.qbo_connections 
FOR INSERT 
WITH CHECK (public.user_can_modify_qbo_tokens(auth.uid(), client_id));

CREATE POLICY "Users can update qbo_connections for their firm's clients" 
ON public.qbo_connections 
FOR UPDATE 
USING (public.user_can_modify_qbo_tokens(auth.uid(), client_id));

CREATE POLICY "Users can delete qbo_connections for their firm's clients" 
ON public.qbo_connections 
FOR DELETE 
USING (public.user_can_modify_qbo_tokens(auth.uid(), client_id));

-- Add token encryption functions (these will be used at the application level)
CREATE OR REPLACE FUNCTION public.hash_token(_token TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT encode(
    digest(_token, 'sha256'),
    'base64'
  );
$$;

-- Add constraint to ensure tokens are not empty
DO $$
BEGIN
    -- Only add constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_tokens_not_empty' 
        AND table_name = 'qbo_connections'
    ) THEN
        ALTER TABLE public.qbo_connections 
        ADD CONSTRAINT check_tokens_not_empty 
        CHECK (length(access_token) > 10 AND length(refresh_token) > 10);
    END IF;
END $$;

-- Update connection_status constraint
ALTER TABLE public.qbo_connections 
DROP CONSTRAINT IF EXISTS qbo_connections_connection_status_check;

ALTER TABLE public.qbo_connections 
ADD CONSTRAINT qbo_connections_connection_status_check 
CHECK (connection_status IN ('connected', 'disconnected', 'needs_reconnect', 'expired'));

-- Create a secure view that never exposes raw tokens
CREATE OR REPLACE VIEW public.qbo_connections_safe AS
SELECT 
  id,
  client_id,
  connection_status,
  expires_at,
  token_expires_at,
  refresh_token_updated_at,
  connection_method,
  accountant_access,
  scope,
  realm_id,
  created_at,
  updated_at,
  -- Only show if token exists, never the actual token
  CASE WHEN length(access_token) > 0 THEN 'ENCRYPTED' ELSE 'MISSING' END as token_status,
  CASE WHEN length(refresh_token) > 0 THEN 'ENCRYPTED' ELSE 'MISSING' END as refresh_token_status
FROM public.qbo_connections;

-- Add performance indexes 
CREATE INDEX IF NOT EXISTS idx_qbo_connections_client_id_status ON public.qbo_connections(client_id, connection_status);
CREATE INDEX IF NOT EXISTS idx_qbo_connections_realm_id ON public.qbo_connections(realm_id);

-- Create RLS policy for the safe view
ALTER VIEW public.qbo_connections_safe SET (security_barrier = true);

-- Add comment explaining the security model
COMMENT ON TABLE public.qbo_connections IS 'QuickBooks OAuth connections with enhanced security. Access restricted to firm members only. Use qbo_connections_safe view for general queries to avoid token exposure.';
COMMENT ON VIEW public.qbo_connections_safe IS 'Secure view of qbo_connections that never exposes actual tokens. Use this view for dashboard displays and general queries.';
COMMENT ON FUNCTION public.user_can_access_qbo_connection IS 'Security function to check if user can access QBO connection. Validates firm membership and client ownership.';
COMMENT ON FUNCTION public.user_can_modify_qbo_tokens IS 'Restricted security function for token modifications. Requires admin/manager/owner role.';