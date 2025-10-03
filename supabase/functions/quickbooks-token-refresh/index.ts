import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const INTUIT_CLIENT_ID = Deno.env.get('INTUIT_CLIENT_ID');
const INTUIT_CLIENT_SECRET = Deno.env.get('INTUIT_CLIENT_SECRET');
const INTUIT_TOKEN_ENDPOINT = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Token refresh request received');
    
    const { tokenId, clientId } = await req.json();

    if (!tokenId && !clientId) {
      throw new Error('Either tokenId or clientId is required');
    }

    // Get token record
    let query = supabase.from('qbo_tokens').select('*');
    
    if (tokenId) {
      query = query.eq('id', tokenId);
    } else {
      query = query.eq('client_id', clientId);
    }

    const { data: tokenRecord, error: tokenError } = await query.single();

    if (tokenError || !tokenRecord) {
      throw new Error(`Token record not found: ${tokenError?.message}`);
    }

    console.log(`Refreshing token for realm_id: ${tokenRecord.realm_id}`);

    // Decrypt the refresh token
    const { data: decryptedRefreshToken, error: decryptError } = await supabase
      .rpc('decrypt_qbo_token', { encrypted_token: tokenRecord.refresh_token });

    if (decryptError) {
      console.error('Failed to decrypt refresh token:', decryptError);
      throw new Error(`Token decryption failed: ${decryptError.message}`);
    }

    // Call Intuit token refresh endpoint
    const tokenRefreshParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: decryptedRefreshToken
    });

    const authHeader = 'Basic ' + btoa(`${INTUIT_CLIENT_ID}:${INTUIT_CLIENT_SECRET}`);

    const response = await fetch(INTUIT_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenRefreshParams.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh failed:', errorText);
      throw new Error(`Intuit token refresh failed: ${response.status} ${errorText}`);
    }

    const tokenData = await response.json();
    console.log('Token refreshed successfully from Intuit');

    // Encrypt new tokens
    const { data: encryptedAccessToken, error: accessError } = await supabase
      .rpc('encrypt_qbo_token', { token: tokenData.access_token });

    if (accessError) {
      throw new Error(`Access token encryption failed: ${accessError.message}`);
    }

    const { data: encryptedRefreshToken, error: refreshError } = await supabase
      .rpc('encrypt_qbo_token', { token: tokenData.refresh_token });

    if (refreshError) {
      throw new Error(`Refresh token encryption failed: ${refreshError.message}`);
    }

    // Calculate new expiration time
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

    // Update token record
    const { error: updateError } = await supabase
      .from('qbo_tokens')
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenRecord.id);

    if (updateError) {
      throw new Error(`Failed to update tokens: ${updateError.message}`);
    }

    console.log('Token refresh completed successfully');

    // Log the refresh event
    await supabase
      .from('notification_logs')
      .insert({
        client_id: tokenRecord.client_id,
        notification_type: 'audit',
        recipient: 'system',
        subject: 'QBO Token Refresh',
        message: `QBO tokens refreshed for client ${tokenRecord.client_id}`,
        status: 'delivered'
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        expires_at: expiresAt
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );

  } catch (error: any) {
    console.error('Error in token refresh:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  }
});
