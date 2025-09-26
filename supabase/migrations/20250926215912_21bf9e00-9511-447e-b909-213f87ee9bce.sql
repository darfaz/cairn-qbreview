-- Add OAuth credentials directly to profiles table instead of firms
ALTER TABLE public.profiles 
ADD COLUMN intuit_client_id TEXT,
ADD COLUMN intuit_client_secret TEXT,
ADD COLUMN qboa_oauth_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN oauth_redirect_uri TEXT;

-- Remove OAuth columns from firms table since they're not needed
ALTER TABLE public.firms 
DROP COLUMN IF EXISTS intuit_client_id,
DROP COLUMN IF EXISTS intuit_client_secret,
DROP COLUMN IF EXISTS qboa_oauth_enabled,
DROP COLUMN IF EXISTS oauth_redirect_uri;