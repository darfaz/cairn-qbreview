-- Fix remaining security issues in profiles and notification_logs

-- 1. Add INSERT policy for profiles (safety net if trigger fails)
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

COMMENT ON POLICY "Users can insert their own profile" ON public.profiles IS 
  'Safety policy allowing users to create their own profile if trigger fails. Normally handled by handle_new_user trigger.';

-- 2. Fix notification_logs to restrict access to user's own clients
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view notification_logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Authenticated users can insert notification_logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Authenticated users can update notification_logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Authenticated users can delete notification_logs" ON public.notification_logs;

-- Create restrictive policies that check client ownership
CREATE POLICY "Users can view notifications for their own clients"
ON public.notification_logs
FOR SELECT
TO authenticated
USING (
  client_id IS NULL OR 
  client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert notifications for their own clients"
ON public.notification_logs
FOR INSERT
TO authenticated
WITH CHECK (
  client_id IS NULL OR
  client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update notifications for their own clients"
ON public.notification_logs
FOR UPDATE
TO authenticated
USING (
  client_id IS NULL OR
  client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete notifications for their own clients"
ON public.notification_logs
FOR DELETE
TO authenticated
USING (
  client_id IS NULL OR
  client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);

COMMENT ON TABLE public.notification_logs IS 
  'Notification logs restricted to user''s own clients. client_id IS NULL allows system notifications visible to all.';

-- Ensure RLS is enabled
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs FORCE ROW LEVEL SECURITY;