-- Add comments to document that tokens must be encrypted
COMMENT ON COLUMN public.qbo_tokens.access_token IS 'OAuth access token - MUST be encrypted using encrypt_qbo_token() function before storage';
COMMENT ON COLUMN public.qbo_tokens.refresh_token IS 'OAuth refresh token - MUST be encrypted using encrypt_qbo_token() function before storage';

-- Create a trigger function to validate token encryption format
CREATE OR REPLACE FUNCTION public.validate_token_encryption()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Encrypted tokens from encrypt_qbo_token have format: base64:base64 (IV:encrypted_data)
  -- Check if tokens follow this format
  IF NEW.access_token IS NOT NULL THEN
    IF NEW.access_token !~ '^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$' THEN
      RAISE EXCEPTION 'access_token must be encrypted using encrypt_qbo_token() function';
    END IF;
  END IF;

  IF NEW.refresh_token IS NOT NULL THEN
    IF NEW.refresh_token !~ '^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$' THEN
      RAISE EXCEPTION 'refresh_token must be encrypted using encrypt_qbo_token() function';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to enforce encryption on INSERT and UPDATE
DROP TRIGGER IF EXISTS enforce_token_encryption ON public.qbo_tokens;
CREATE TRIGGER enforce_token_encryption
  BEFORE INSERT OR UPDATE ON public.qbo_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_token_encryption();

-- Add audit logging function for token access
CREATE OR REPLACE FUNCTION public.audit_token_decryption()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log token access for security auditing
  INSERT INTO public.notification_logs (
    client_id,
    notification_type,
    recipient,
    subject,
    message,
    status
  ) VALUES (
    NEW.client_id,
    'audit',
    'security',
    'QBO Token Access',
    'QBO tokens were accessed for client ' || NEW.client_id::text || ' at ' || now()::text,
    'delivered'
  );
  
  RETURN NEW;
END;
$$;

-- Add trigger to log token updates (security audit trail)
DROP TRIGGER IF EXISTS audit_token_updates ON public.qbo_tokens;
CREATE TRIGGER audit_token_updates
  AFTER UPDATE OF access_token, refresh_token ON public.qbo_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_token_decryption();