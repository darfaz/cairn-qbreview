-- Fix scheduled_runs access control
-- This is a system-wide table that should only be modified by admins/service role

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view scheduled_runs" ON public.scheduled_runs;
DROP POLICY IF EXISTS "Authenticated users can update scheduled_runs" ON public.scheduled_runs;

-- Users can VIEW the schedule (read-only)
CREATE POLICY "Users can view scheduled runs"
ON public.scheduled_runs
FOR SELECT
TO authenticated
USING (true);

-- Only service role can modify (admins use service role via edge functions)
CREATE POLICY "Service role can manage scheduled runs"
ON public.scheduled_runs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE public.scheduled_runs IS 
  'Global reconciliation schedule. Read-only for users. Only admins (via service role) can modify.';

COMMENT ON POLICY "Users can view scheduled runs" ON public.scheduled_runs IS 
  'Users can see the schedule but cannot modify it';

COMMENT ON POLICY "Service role can manage scheduled runs" ON public.scheduled_runs IS 
  'Only service role (admin functions) can create/update/delete schedules';

-- Ensure RLS is enforced
ALTER TABLE public.scheduled_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_runs FORCE ROW LEVEL SECURITY;