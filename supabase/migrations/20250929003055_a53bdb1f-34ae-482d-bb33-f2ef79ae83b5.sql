-- Add missing columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Update existing records to use name as client_name if client_name is null
UPDATE public.clients 
SET client_name = name 
WHERE client_name IS NULL;

-- Make client_name NOT NULL after populating it
ALTER TABLE public.clients 
ALTER COLUMN client_name SET NOT NULL;

-- Create bulk upload history table
CREATE TABLE IF NOT EXISTS public.bulk_upload_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  successful_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  error_details JSONB,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on bulk_upload_history
ALTER TABLE public.bulk_upload_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for bulk_upload_history
CREATE POLICY "Users can view their firm's upload history" 
ON public.bulk_upload_history 
FOR SELECT 
USING (
  firm_id IN (
    SELECT p.firm_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.firm_id IS NOT NULL
  )
);

CREATE POLICY "Users can insert upload history for their firm" 
ON public.bulk_upload_history 
FOR INSERT 
WITH CHECK (
  firm_id IN (
    SELECT p.firm_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.firm_id IS NOT NULL
  )
);

-- Add trigger for updating updated_at on bulk_upload_history
CREATE TRIGGER update_bulk_upload_history_updated_at
BEFORE UPDATE ON public.bulk_upload_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add unique constraint for firm_id + realm_id combination
ALTER TABLE public.clients 
ADD CONSTRAINT unique_firm_realm_id 
UNIQUE (firm_id, realm_id);