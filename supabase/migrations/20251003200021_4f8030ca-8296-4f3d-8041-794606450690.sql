-- Fix encryption/decryption functions to properly handle IV

-- Drop existing functions
DROP FUNCTION IF EXISTS public.encrypt_qbo_token(text);
DROP FUNCTION IF EXISTS public.decrypt_qbo_token(text);

-- Create improved encryption function that stores IV with encrypted data
CREATE OR REPLACE FUNCTION public.encrypt_qbo_token(token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
  iv bytea;
  encrypted bytea;
BEGIN
  -- Get encryption key from Supabase secret
  encryption_key := current_setting('app.qbo_token_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'QBO_TOKEN_ENCRYPTION_KEY not configured in Supabase secrets';
  END IF;
  
  -- Generate random IV for this encryption
  iv := gen_random_bytes(16);
  
  -- Encrypt using AES-256-CBC
  encrypted := encrypt_iv(
    token::bytea,
    decode(encryption_key, 'hex')::bytea,
    iv,
    'aes-cbc/pad:pkcs'
  );
  
  -- Return IV and encrypted data separated by colon, both base64 encoded
  RETURN encode(iv, 'base64') || ':' || encode(encrypted, 'base64');
END;
$$;

-- Create improved decryption function that extracts IV from stored data
CREATE OR REPLACE FUNCTION public.decrypt_qbo_token(encrypted_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
  iv bytea;
  encrypted bytea;
  parts text[];
BEGIN
  -- Get encryption key from Supabase secret
  encryption_key := current_setting('app.qbo_token_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'QBO_TOKEN_ENCRYPTION_KEY not configured in Supabase secrets';
  END IF;
  
  -- Split IV and encrypted data
  parts := string_to_array(encrypted_token, ':');
  
  IF array_length(parts, 1) != 2 THEN
    RAISE EXCEPTION 'Invalid encrypted token format';
  END IF;
  
  -- Decode IV and encrypted data
  iv := decode(parts[1], 'base64');
  encrypted := decode(parts[2], 'base64');
  
  -- Decrypt using AES-256-CBC
  RETURN convert_from(
    decrypt_iv(
      encrypted,
      decode(encryption_key, 'hex')::bytea,
      iv,
      'aes-cbc/pad:pkcs'
    ),
    'UTF8'
  );
END;
$$;

COMMENT ON FUNCTION public.encrypt_qbo_token IS 'Encrypts QBO tokens using AES-256-CBC with random IV';
COMMENT ON FUNCTION public.decrypt_qbo_token IS 'Decrypts QBO tokens encrypted with encrypt_qbo_token';