-- Update clients table for QBOA multi-company support
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS qbo_company_name TEXT,
ADD COLUMN IF NOT EXISTS is_sandbox BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- Ensure realm_id is unique (it should be unique per QuickBooks company)
ALTER TABLE public.clients 
ADD CONSTRAINT clients_realm_id_unique UNIQUE (realm_id);

-- Update qbo_connections table for QBOA
ALTER TABLE public.qbo_connections 
ADD COLUMN IF NOT EXISTS accountant_access BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refresh_token_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS connection_method TEXT NOT NULL DEFAULT 'qboa' CHECK (connection_method IN ('qboa', 'direct', 'sandbox'));

-- Update the expires_at column name to be more specific (rename if needed)
-- The token_expires_at is the new column for proactive refresh tracking

-- Create qbo_sync_queue table for bulk operations and rate limiting
CREATE TABLE public.qbo_sync_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  retry_count INTEGER NOT NULL DEFAULT 0,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('reconciliation', 'sync', 'bulk_reconciliation')),
  parameters JSONB,
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on qbo_sync_queue
ALTER TABLE public.qbo_sync_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for qbo_sync_queue
CREATE POLICY "Authenticated users can view qbo_sync_queue" 
ON public.qbo_sync_queue 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert qbo_sync_queue" 
ON public.qbo_sync_queue 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update qbo_sync_queue" 
ON public.qbo_sync_queue 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete qbo_sync_queue" 
ON public.qbo_sync_queue 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at on qbo_sync_queue
CREATE TRIGGER update_qbo_sync_queue_updated_at
BEFORE UPDATE ON public.qbo_sync_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_qbo_sync_queue_client_id ON public.qbo_sync_queue(client_id);
CREATE INDEX idx_qbo_sync_queue_status ON public.qbo_sync_queue(status);
CREATE INDEX idx_qbo_sync_queue_scheduled_for ON public.qbo_sync_queue(scheduled_for);
CREATE INDEX idx_qbo_sync_queue_priority ON public.qbo_sync_queue(priority DESC);
CREATE INDEX idx_clients_is_active ON public.clients(is_active);
CREATE INDEX idx_clients_last_sync_at ON public.clients(last_sync_at);

-- Update existing qbo_connections to set default values for new columns
UPDATE public.qbo_connections 
SET token_expires_at = expires_at,
    refresh_token_updated_at = updated_at
WHERE token_expires_at IS NULL;