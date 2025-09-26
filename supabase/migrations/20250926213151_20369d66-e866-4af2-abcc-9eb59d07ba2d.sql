-- Update clients table for QBOA multi-company support (only add missing columns)
DO $$ 
BEGIN
    -- Add qbo_company_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'qbo_company_name') THEN
        ALTER TABLE public.clients ADD COLUMN qbo_company_name TEXT;
    END IF;
    
    -- Add is_sandbox if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'is_sandbox') THEN
        ALTER TABLE public.clients ADD COLUMN is_sandbox BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    -- Add is_active if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'is_active') THEN
        ALTER TABLE public.clients ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;
    
    -- Add last_sync_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'last_sync_at') THEN
        ALTER TABLE public.clients ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Update qbo_connections table for QBOA (only add missing columns)
DO $$ 
BEGIN
    -- Add accountant_access if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qbo_connections' AND column_name = 'accountant_access') THEN
        ALTER TABLE public.qbo_connections ADD COLUMN accountant_access BOOLEAN NOT NULL DEFAULT true;
    END IF;
    
    -- Add token_expires_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qbo_connections' AND column_name = 'token_expires_at') THEN
        ALTER TABLE public.qbo_connections ADD COLUMN token_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add refresh_token_updated_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qbo_connections' AND column_name = 'refresh_token_updated_at') THEN
        ALTER TABLE public.qbo_connections ADD COLUMN refresh_token_updated_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add connection_method if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qbo_connections' AND column_name = 'connection_method') THEN
        ALTER TABLE public.qbo_connections ADD COLUMN connection_method TEXT NOT NULL DEFAULT 'qboa' CHECK (connection_method IN ('qboa', 'direct', 'sandbox'));
    END IF;
END $$;

-- Create qbo_sync_queue table only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qbo_sync_queue') THEN
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
    END IF;
END $$;

-- Add indexes for performance (safe approach)
CREATE INDEX IF NOT EXISTS idx_qbo_sync_queue_client_id ON public.qbo_sync_queue(client_id);
CREATE INDEX IF NOT EXISTS idx_qbo_sync_queue_status ON public.qbo_sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_qbo_sync_queue_scheduled_for ON public.qbo_sync_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_qbo_sync_queue_priority ON public.qbo_sync_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON public.clients(is_active);
CREATE INDEX IF NOT EXISTS idx_clients_last_sync_at ON public.clients(last_sync_at);

-- Update existing qbo_connections to set default values for new columns
UPDATE public.qbo_connections 
SET token_expires_at = expires_at,
    refresh_token_updated_at = updated_at
WHERE token_expires_at IS NULL;