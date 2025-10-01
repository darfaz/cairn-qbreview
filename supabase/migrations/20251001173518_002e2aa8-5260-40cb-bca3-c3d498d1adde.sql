-- Drop QuickBooks related tables
DROP TABLE IF EXISTS public.qbo_sync_queue CASCADE;
DROP TABLE IF EXISTS public.qbo_connections CASCADE;
DROP TABLE IF EXISTS public.qbo_oauth_states CASCADE;

-- Drop unused QB functions
DROP FUNCTION IF EXISTS public.user_can_modify_qbo_tokens CASCADE;
DROP FUNCTION IF EXISTS public.user_can_access_qbo_connection CASCADE;