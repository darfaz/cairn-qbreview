-- Create firms table (note: there's already a 'firms' table, this creates 'qbo_firms' to avoid conflicts)
CREATE TABLE IF NOT EXISTS public.qbo_firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create qbo_clients table
CREATE TABLE IF NOT EXISTS public.qbo_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES public.qbo_firms(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  realm_id TEXT UNIQUE NOT NULL,
  last_review_date TIMESTAMP WITH TIME ZONE,
  last_review_status TEXT,
  sheet_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create review_history table
CREATE TABLE IF NOT EXISTS public.review_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.qbo_clients(id) ON DELETE CASCADE,
  review_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending',
  sheet_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qbo_realm_id ON public.qbo_clients(realm_id);
CREATE INDEX IF NOT EXISTS idx_qbo_firm_active ON public.qbo_clients(firm_id, is_active);
CREATE INDEX IF NOT EXISTS idx_review_client_date ON public.review_history(client_id, review_date);

-- Enable Row Level Security
ALTER TABLE public.qbo_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qbo_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for qbo_firms
CREATE POLICY "Authenticated users can view firms" 
ON public.qbo_firms 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert firms" 
ON public.qbo_firms 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update firms" 
ON public.qbo_firms 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete firms" 
ON public.qbo_firms 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- RLS Policies for qbo_clients
CREATE POLICY "Authenticated users can view qbo_clients" 
ON public.qbo_clients 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert qbo_clients" 
ON public.qbo_clients 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update qbo_clients" 
ON public.qbo_clients 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete qbo_clients" 
ON public.qbo_clients 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- RLS Policies for review_history
CREATE POLICY "Authenticated users can view review_history" 
ON public.review_history 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert review_history" 
ON public.review_history 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update review_history" 
ON public.review_history 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete review_history" 
ON public.review_history 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_qbo_firms_updated_at
BEFORE UPDATE ON public.qbo_firms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qbo_clients_updated_at
BEFORE UPDATE ON public.qbo_clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default firm
INSERT INTO public.qbo_firms (name) 
VALUES ('Cairn Accounting') 
ON CONFLICT DO NOTHING;