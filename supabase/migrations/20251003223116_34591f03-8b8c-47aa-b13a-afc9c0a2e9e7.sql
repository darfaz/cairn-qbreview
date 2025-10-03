-- Remove unnecessary service role policy
-- Service role automatically bypasses RLS, so no policy needed
DROP POLICY IF EXISTS "Service role can view all tokens" ON public.qbo_tokens;

-- Service role policies are redundant since service_role bypasses RLS
-- Edge functions using service role key can access tokens without policies

COMMENT ON TABLE public.qbo_tokens IS 
  'OAuth tokens for QuickBooks. Users access via get_qbo_connection_info() function. Edge functions use service role which bypasses RLS.';

-- Verify the other policies are still in place
-- Users should have INSERT, UPDATE, DELETE but NOT SELECT
-- (SELECT is handled by the secure get_qbo_connection_info function)