-- Add table to store firm-specific QuickBooks credentials
CREATE TABLE public.firm_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
  intuit_client_id TEXT,
  intuit_client_secret_encrypted TEXT, -- Will be encrypted using Supabase Vault
  intuit_environment TEXT DEFAULT 'sandbox' CHECK (intuit_environment IN ('sandbox', 'production')),
  intuit_app_name TEXT,
  redirect_uri TEXT,
  is_configured BOOLEAN DEFAULT false,
  configured_at TIMESTAMP WITH TIME ZONE,
  configured_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(firm_id)
);

-- Enable RLS
ALTER TABLE public.firm_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see/edit their own firm's integration
CREATE POLICY "Users manage own firm integration" ON public.firm_integrations
  FOR ALL USING (
    firm_id IN (
      SELECT firm_id FROM public.profiles WHERE id = auth.uid() AND firm_id IS NOT NULL
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_firm_integrations_updated_at
  BEFORE UPDATE ON public.firm_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Remove firm-specific OAuth config from profiles table since it will be in firm_integrations
ALTER TABLE public.profiles DROP COLUMN IF EXISTS intuit_client_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS intuit_client_secret;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS oauth_redirect_uri;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS qboa_oauth_enabled;