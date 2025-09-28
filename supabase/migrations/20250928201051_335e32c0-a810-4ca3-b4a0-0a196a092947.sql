-- Fix search_path for existing functions to address security warnings

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix user_can_access_client function
CREATE OR REPLACE FUNCTION public.user_can_access_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.clients c ON c.firm_id = p.firm_id
    WHERE p.id = _user_id 
    AND c.id = _client_id
  );
$$;

-- Fix user_can_access_qbo_connection function
CREATE OR REPLACE FUNCTION public.user_can_access_qbo_connection(_user_id uuid, _connection_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.clients c ON c.firm_id = p.firm_id
    WHERE p.id = _user_id 
    AND c.id = _connection_client_id
    AND p.firm_id IS NOT NULL
    AND c.firm_id IS NOT NULL
    AND c.is_active = true
  ) AND auth.uid() = _user_id;
$$;

-- Fix user_can_modify_qbo_tokens function  
CREATE OR REPLACE FUNCTION public.user_can_modify_qbo_tokens(_user_id uuid, _connection_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.clients c ON c.firm_id = p.firm_id
    WHERE p.id = _user_id 
    AND c.id = _connection_client_id
    AND p.firm_id IS NOT NULL
    AND c.firm_id IS NOT NULL
    AND c.is_active = true
    AND p.role IN ('admin', 'manager', 'owner')
  ) AND auth.uid() = _user_id;
$$;