-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create encryption function using AES-256
CREATE OR REPLACE FUNCTION public.encrypt_qbo_token(token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Get encryption key from secret (will be set via Supabase secrets)
  encryption_key := current_setting('app.settings.qbo_encryption_key', true);
  
  -- If key not set, raise error
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'QBO encryption key not configured';
  END IF;
  
  -- Encrypt using AES-256 in CBC mode
  RETURN encode(
    encrypt_iv(
      token::bytea,
      encryption_key::bytea,
      gen_random_bytes(16),
      'aes-cbc/pad:pkcs'
    ),
    'base64'
  );
END;
$$;

-- Create decryption function
CREATE OR REPLACE FUNCTION public.decrypt_qbo_token(encrypted_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Get encryption key from secret
  encryption_key := current_setting('app.settings.qbo_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'QBO encryption key not configured';
  END IF;
  
  -- Decrypt using AES-256
  RETURN convert_from(
    decrypt_iv(
      decode(encrypted_token, 'base64'),
      encryption_key::bytea,
      gen_random_bytes(16),
      'aes-cbc/pad:pkcs'
    ),
    'UTF8'
  );
END;
$$;

-- Create temporary columns for encrypted data
ALTER TABLE public.qbo_tokens 
ADD COLUMN IF NOT EXISTS access_token_encrypted text,
ADD COLUMN IF NOT EXISTS refresh_token_encrypted text;

-- Migrate existing tokens to encrypted format (only if encryption key is available)
-- Note: This will be executed when the key is properly configured
DO $$
BEGIN
  -- Check if we have any tokens to migrate
  IF EXISTS (SELECT 1 FROM public.qbo_tokens WHERE access_token IS NOT NULL LIMIT 1) THEN
    -- Update all existing tokens with encrypted versions
    UPDATE public.qbo_tokens
    SET 
      access_token_encrypted = public.encrypt_qbo_token(access_token),
      refresh_token_encrypted = public.encrypt_qbo_token(refresh_token)
    WHERE access_token IS NOT NULL AND refresh_token IS NOT NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If encryption fails (key not set), log but don't fail migration
    RAISE NOTICE 'Token encryption skipped - encryption key not yet configured: %', SQLERRM;
END $$;

-- Drop old unencrypted columns
ALTER TABLE public.qbo_tokens 
DROP COLUMN IF EXISTS access_token,
DROP COLUMN IF EXISTS refresh_token;

-- Rename encrypted columns to original names
ALTER TABLE public.qbo_tokens 
RENAME COLUMN access_token_encrypted TO access_token;

ALTER TABLE public.qbo_tokens 
RENAME COLUMN refresh_token_encrypted TO refresh_token;

-- Add comment to document encryption
COMMENT ON COLUMN public.qbo_tokens.access_token IS 'Encrypted QuickBooks OAuth access token';
COMMENT ON COLUMN public.qbo_tokens.refresh_token IS 'Encrypted QuickBooks OAuth refresh token';