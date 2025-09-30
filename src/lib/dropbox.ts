import { supabase } from '@/integrations/supabase/client';
import { Dropbox } from 'dropbox';

// Dropbox App Configuration
// NOTE: This is the public App Key - safe to store in code
export const DROPBOX_APP_KEY = 'YOUR_DROPBOX_APP_KEY_HERE';
export const DROPBOX_REDIRECT_URI = `${window.location.origin}/auth/dropbox/callback`;

/**
 * Generate a random string for PKCE code verifier
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate code challenge from code verifier for PKCE
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Initiate Dropbox OAuth flow with PKCE
 * Returns the authorization URL to redirect the user to
 */
export async function initiateDropboxOAuth(): Promise<string> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  // Store code verifier in session storage for later use
  sessionStorage.setItem('dropbox_code_verifier', codeVerifier);
  
  const authUrl = new URL('https://www.dropbox.com/oauth2/authorize');
  authUrl.searchParams.append('client_id', DROPBOX_APP_KEY);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', DROPBOX_REDIRECT_URI);
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  authUrl.searchParams.append('token_access_type', 'offline'); // Get refresh token
  
  return authUrl.toString();
}

/**
 * Exchange authorization code for access token using PKCE
 */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const codeVerifier = sessionStorage.getItem('dropbox_code_verifier');
  
  if (!codeVerifier) {
    throw new Error('Code verifier not found. Please restart the OAuth flow.');
  }
  
  const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: DROPBOX_APP_KEY,
      redirect_uri: DROPBOX_REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
  }
  
  const data = await response.json();
  
  // Clean up code verifier
  sessionStorage.removeItem('dropbox_code_verifier');
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
}

/**
 * Store Dropbox access token in the firms table
 */
export async function storeDropboxToken(
  firmId: string,
  accessToken: string,
  refreshToken?: string
): Promise<void> {
  // Note: In production, consider encrypting the token before storing
  const { error } = await supabase
    .from('firms')
    .update({
      dropbox_connected: true,
      dropbox_access_token: accessToken,
      updated_at: new Date().toISOString(),
    })
    .eq('id', firmId);
  
  if (error) {
    throw new Error(`Failed to store Dropbox token: ${error.message}`);
  }
}

/**
 * Get the stored Dropbox access token for a firm
 */
export async function getDropboxToken(firmId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('firms')
    .select('dropbox_access_token')
    .eq('id', firmId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data.dropbox_access_token;
}

/**
 * Disconnect Dropbox by removing the access token
 */
export async function disconnectDropbox(firmId: string): Promise<void> {
  const { error } = await supabase
    .from('firms')
    .update({
      dropbox_connected: false,
      dropbox_access_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', firmId);
  
  if (error) {
    throw new Error(`Failed to disconnect Dropbox: ${error.message}`);
  }
}

/**
 * Validate Dropbox connection by making a test API call
 */
export async function validateDropboxConnection(accessToken: string): Promise<boolean> {
  try {
    const dbx = new Dropbox({ accessToken });
    await dbx.usersGetCurrentAccount();
    return true;
  } catch (error) {
    console.error('Dropbox connection validation failed:', error);
    return false;
  }
}

/**
 * Get current Dropbox account info
 */
export async function getDropboxAccountInfo(accessToken: string) {
  const dbx = new Dropbox({ accessToken });
  const response = await dbx.usersGetCurrentAccount();
  return response.result;
}
