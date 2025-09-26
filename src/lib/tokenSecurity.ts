import { supabase } from "@/integrations/supabase/client";

/**
 * Secure token management utilities for QuickBooks API tokens
 * 
 * SECURITY NOTE: These functions provide client-side encryption for additional 
 * security. In production, consider implementing server-side encryption as well.
 */

// Generate a secure encryption key from user session
const generateEncryptionKey = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No authenticated session');
  
  // Create a deterministic but secure key from session data
  const keyData = session.user.id + session.access_token.substring(0, 32);
  const encoder = new TextEncoder();
  const data = encoder.encode(keyData);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Encrypt a token using Web Crypto API
export const encryptToken = async (token: string): Promise<string> => {
  try {
    const key = await generateEncryptionKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    
    // Generate random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(16));
    
    // Import the key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key.substring(0, 32)), // Use first 32 chars as key
      { name: 'AES-CBC' },
      false,
      ['encrypt']
    );
    
    // Encrypt the token
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      cryptoKey,
      data
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Token encryption failed:', error);
    throw new Error('Failed to encrypt token');
  }
};

// Decrypt a token using Web Crypto API
export const decryptToken = async (encryptedToken: string): Promise<string> => {
  try {
    const key = await generateEncryptionKey();
    const encoder = new TextEncoder();
    
    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedToken)
        .split('')
        .map(char => char.charCodeAt(0))
    );
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 16);
    const encrypted = combined.slice(16);
    
    // Import the key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key.substring(0, 32)),
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    );
    
    // Decrypt the token
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      cryptoKey,
      encrypted
    );
    
    // Return as string
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Token decryption failed:', error);
    throw new Error('Failed to decrypt token');
  }
};

// Secure token storage and retrieval
export const storeQBOTokens = async (
  clientId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: string,
  realmId: string
) => {
  try {
    // Encrypt tokens before storing
    const encryptedAccessToken = await encryptToken(accessToken);
    const encryptedRefreshToken = await encryptToken(refreshToken);
    
    const { error } = await supabase
      .from('qbo_connections')
      .upsert({
        client_id: clientId,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt,
        token_expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        refresh_token_updated_at: new Date().toISOString(),
        realm_id: realmId,
        connection_status: 'connected',
        accountant_access: true,
        connection_method: 'qboa'
      });
    
    if (error) throw error;
    
    // Log the secure token storage
    console.log('QBO tokens stored securely for client:', clientId);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to store QBO tokens:', error);
    throw error;
  }
};

// Secure token retrieval
export const getQBOTokens = async (clientId: string) => {
  try {
    const { data, error } = await supabase
      .from('qbo_connections')
      .select('*')
      .eq('client_id', clientId)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('No tokens found for client');
    
    // Decrypt tokens before returning
    const accessToken = await decryptToken(data.access_token);
    const refreshToken = await decryptToken(data.refresh_token);
    
    return {
      accessToken,
      refreshToken,
      expiresAt: data.expires_at,
      realmId: data.realm_id,
      connectionStatus: data.connection_status
    };
  } catch (error) {
    console.error('Failed to retrieve QBO tokens:', error);
    throw error;
  }
};

// Check token expiration and refresh if needed
export const ensureValidTokens = async (clientId: string) => {
  try {
    const tokens = await getQBOTokens(clientId);
    const expiryTime = new Date(tokens.expiresAt);
    const now = new Date();
    
    // If token expires within 5 minutes, refresh it
    if (expiryTime.getTime() - now.getTime() < 5 * 60 * 1000) {
      console.log('Token expiring soon, refresh needed for client:', clientId);
      return { needsRefresh: true, tokens };
    }
    
    return { needsRefresh: false, tokens };
  } catch (error) {
    console.error('Token validation failed:', error);
    throw error;
  }
};

// Secure token deletion
export const revokeQBOTokens = async (clientId: string) => {
  try {
    const { error } = await supabase
      .from('qbo_connections')
      .update({ 
        connection_status: 'disconnected',
        access_token: '',
        refresh_token: ''
      })
      .eq('client_id', clientId);
    
    if (error) throw error;
    
    console.log('QBO tokens revoked for client:', clientId);
    return { success: true };
  } catch (error) {
    console.error('Failed to revoke QBO tokens:', error);
    throw error;
  }
};