-- Add QuickBooks OAuth credentials to firms table
ALTER TABLE public.firms 
ADD COLUMN intuit_client_id TEXT,
ADD COLUMN intuit_client_secret TEXT,
ADD COLUMN qboa_oauth_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN oauth_redirect_uri TEXT;