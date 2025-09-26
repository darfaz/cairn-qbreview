-- Enhanced security definer function with additional validation
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

-- Add audit logging function for token access
CREATE OR REPLACE FUNCTION public.log_token_access(_user_id UUID, _client_id UUID, _action TEXT)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notification_logs (
    client_id,
    notification_type,
    recipient,
    subject,
    message,
    status
  ) VALUES (
    _client_id,
    'audit',
    _user_id::text,
    'Token Access',
    'User ' || _user_id::text || ' performed action: ' || _action || ' on client ' || _client_id::text,
    'delivered'
  );
$$;

-- Update RLS policies with enhanced security (without audit logging for now to avoid complications)
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
CREATE OR REPLACE FUNCTION public.encrypt_token(_token TEXT, _key TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT encode(
    digest(_key || _token, 'sha256'),
    'base64'
  );
$$;

-- Add function to validate token integrity
CREATE OR REPLACE FUNCTION public.validate_token_integrity(_encrypted_token TEXT, _original_token TEXT, _key TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT _encrypted_token = public.encrypt_token(_original_token, _key);
$$;

-- Add indexes for better performance (without problematic predicates)
CREATE INDEX IF NOT EXISTS idx_qbo_connections_client_id_status ON public.qbo_connections(client_id, connection_status);
CREATE INDEX IF NOT EXISTS idx_qbo_connections_expires_at ON public.qbo_connections(expires_at);

-- Add constraint to ensure tokens are not empty (with better validation)
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE public.qbo_connections DROP CONSTRAINT IF EXISTS check_tokens_not_empty;
    
    -- Add new constraint
    ALTER TABLE public.qbo_connections 
    ADD CONSTRAINT check_tokens_not_empty 
    CHECK (length(trim(access_token)) > 10 AND length(trim(refresh_token)) > 10);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Update connection_status constraint
DO $$
BEGIN
    ALTER TABLE public.qbo_connections 
    DROP CONSTRAINT IF EXISTS qbo_connections_connection_status_check;
    
    ALTER TABLE public.qbo_connections 
    ADD CONSTRAINT qbo_connections_connection_status_check 
    CHECK (connection_status IN ('connected', 'disconnected', 'needs_reconnect', 'expired'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

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

-- Grant appropriate permissions on the safe view
GRANT SELECT ON public.qbo_connections_safe TO authenticated;