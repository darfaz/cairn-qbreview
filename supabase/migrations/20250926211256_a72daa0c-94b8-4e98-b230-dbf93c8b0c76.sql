-- Create firms table (single CPA firm)
CREATE TABLE public.firms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create qbo_connections table (OAuth tokens)
CREATE TABLE public.qbo_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL, -- Should be encrypted at application level
  refresh_token TEXT NOT NULL, -- Should be encrypted at application level
  connection_status TEXT NOT NULL DEFAULT 'connected' CHECK (connection_status IN ('connected', 'disconnected', 'needs_reconnect')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  realm_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Create notification_logs table
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  reconciliation_run_id UUID REFERENCES public.reconciliation_runs(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'slack', 'webhook')),
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add firm_id to clients table to link clients to firms
ALTER TABLE public.clients 
ADD COLUMN firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE;

-- Enable Row Level Security on all tables
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qbo_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for firms
CREATE POLICY "Authenticated users can view firms" 
ON public.firms 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert firms" 
ON public.firms 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update firms" 
ON public.firms 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete firms" 
ON public.firms 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for qbo_connections
CREATE POLICY "Authenticated users can view qbo_connections" 
ON public.qbo_connections 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert qbo_connections" 
ON public.qbo_connections 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update qbo_connections" 
ON public.qbo_connections 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete qbo_connections" 
ON public.qbo_connections 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for notification_logs
CREATE POLICY "Authenticated users can view notification_logs" 
ON public.notification_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert notification_logs" 
ON public.notification_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update notification_logs" 
ON public.notification_logs 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete notification_logs" 
ON public.notification_logs 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create triggers for updated_at columns
CREATE TRIGGER update_firms_updated_at
BEFORE UPDATE ON public.firms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qbo_connections_updated_at
BEFORE UPDATE ON public.qbo_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_logs_updated_at
BEFORE UPDATE ON public.notification_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_qbo_connections_client_id ON public.qbo_connections(client_id);
CREATE INDEX idx_qbo_connections_realm_id ON public.qbo_connections(realm_id);
CREATE INDEX idx_notification_logs_client_id ON public.notification_logs(client_id);
CREATE INDEX idx_notification_logs_reconciliation_run_id ON public.notification_logs(reconciliation_run_id);
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX idx_clients_firm_id ON public.clients(firm_id);