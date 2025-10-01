-- Create qbo_tokens table for storing QuickBooks OAuth tokens
CREATE TABLE public.qbo_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  realm_id TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_qbo_tokens_realm_id ON public.qbo_tokens(realm_id);
CREATE INDEX idx_qbo_tokens_client_id ON public.qbo_tokens(client_id);
CREATE INDEX idx_qbo_tokens_expires_at ON public.qbo_tokens(token_expires_at);

-- Enable RLS
ALTER TABLE public.qbo_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access tokens for their own clients
CREATE POLICY "Users can view tokens for their clients"
ON public.qbo_tokens
FOR SELECT
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert tokens for their clients"
ON public.qbo_tokens
FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update tokens for their clients"
ON public.qbo_tokens
FOR UPDATE
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete tokens for their clients"
ON public.qbo_tokens
FOR DELETE
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_qbo_tokens_updated_at
BEFORE UPDATE ON public.qbo_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check if token is expired
CREATE OR REPLACE FUNCTION public.is_qbo_token_expired(token_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT token_expires_at < NOW()
  FROM public.qbo_tokens
  WHERE id = token_id;
$$;

-- Create function to get connection status for a client
CREATE OR REPLACE FUNCTION public.get_qbo_connection_status(p_client_id UUID)
RETURNS TABLE (
  is_connected BOOLEAN,
  is_expired BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE
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
  FROM public.clients c
  LEFT JOIN public.qbo_tokens t ON c.id = t.client_id
  WHERE c.id = p_client_id;
$$;