-- Create a security definer function to check token status without exposing tokens
-- This allows users to check connection status without reading the actual tokens
CREATE OR REPLACE FUNCTION public.get_qbo_connection_info(p_realm_id text)
RETURNS TABLE(
  is_connected boolean,
  is_expired boolean,
  expires_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (t.id IS NOT NULL) as is_connected,
    (t.token_expires_at < NOW()) as is_expired,
    t.token_expires_at as expires_at
  FROM public.qbo_tokens t
  WHERE t.realm_id = p_realm_id
  AND t.client_id IN (
    SELECT id FROM public.clients 
    WHERE user_id = auth.uid() AND realm_id = p_realm_id
  )
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_qbo_connection_info IS 
  'Securely checks QBO connection status without exposing tokens. Users can only check status for their own clients.';

-- Revoke direct SELECT access on qbo_tokens
-- Users should NOT be able to read tokens directly, even if encrypted
DROP POLICY IF EXISTS "Users can view tokens for their clients" ON public.qbo_tokens;

-- Users can still insert/update tokens through OAuth flows (handled by edge functions)
-- Keep these policies as they're needed for the OAuth callback flow
-- The INSERT/UPDATE policies are still safe because they require client ownership

-- Add a more restrictive SELECT policy that only works via service role
CREATE POLICY "Service role can view all tokens" 
ON public.qbo_tokens 
FOR SELECT 
TO service_role
USING (true);

COMMENT ON POLICY "Service role can view all tokens" ON public.qbo_tokens IS 
  'Only edge functions with service role key can read tokens. Regular users must use get_qbo_connection_info() function.';