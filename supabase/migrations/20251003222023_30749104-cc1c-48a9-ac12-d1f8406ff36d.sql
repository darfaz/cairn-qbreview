-- Attach validation trigger to enforce token encryption
-- This ensures all tokens in qbo_tokens table are encrypted
DROP TRIGGER IF EXISTS validate_qbo_token_encryption ON public.qbo_tokens;

CREATE TRIGGER validate_qbo_token_encryption
  BEFORE INSERT OR UPDATE ON public.qbo_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_token_encryption();

-- Add comment explaining the security measure
COMMENT ON TRIGGER validate_qbo_token_encryption ON public.qbo_tokens IS 
  'Validates that access_token and refresh_token are encrypted before storage. Encrypted tokens follow the format: base64_iv:base64_encrypted_data';

-- Ensure audit logging trigger is also attached
DROP TRIGGER IF EXISTS audit_qbo_token_access ON public.qbo_tokens;

CREATE TRIGGER audit_qbo_token_access
  AFTER UPDATE ON public.qbo_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_token_decryption();

COMMENT ON TRIGGER audit_qbo_token_access ON public.qbo_tokens IS 
  'Logs all token access events for security auditing purposes';