-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  realm_id TEXT UNIQUE NOT NULL,
  qbo_company_name TEXT,
  last_review_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'green' CHECK (status IN ('green', 'yellow', 'red')),
  action_items_count INTEGER DEFAULT 0,
  connection_status TEXT DEFAULT 'connected' CHECK (connection_status IN ('connected', 'disconnected', 'needs_reconnect')),
  dropbox_folder_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reconciliation_runs table
CREATE TABLE public.reconciliation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL CHECK (run_type IN ('scheduled', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  report_url TEXT,
  google_sheet_url TEXT,
  unreconciled_count INTEGER DEFAULT 0,
  status_color TEXT DEFAULT 'green' CHECK (status_color IN ('green', 'yellow', 'red')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scheduled_runs table
CREATE TABLE public.scheduled_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_month INTEGER NOT NULL DEFAULT 15 CHECK (day_of_month >= 1 AND day_of_month <= 28),
  enabled BOOLEAN DEFAULT true,
  last_run_date DATE,
  next_run_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default scheduled run configuration
INSERT INTO public.scheduled_runs (day_of_month, enabled) VALUES (15, true);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_runs ENABLE ROW LEVEL SECURITY;

-- Create policies for clients table (allow all operations for now since it's internal use)
CREATE POLICY "Allow all operations on clients" ON public.clients FOR ALL USING (true);

-- Create policies for reconciliation_runs table
CREATE POLICY "Allow all operations on reconciliation_runs" ON public.reconciliation_runs FOR ALL USING (true);

-- Create policies for scheduled_runs table
CREATE POLICY "Allow all operations on scheduled_runs" ON public.scheduled_runs FOR ALL USING (true);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_runs_updated_at
  BEFORE UPDATE ON public.scheduled_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();