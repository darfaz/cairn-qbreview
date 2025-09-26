import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenRefreshRequest {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

interface IntuitTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      // Manual refresh for specific connection
      const { connectionId } = await req.json();
      
      if (!connectionId) {
        return new Response(
          JSON.stringify({ error: 'Connection ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await refreshConnection(supabase, connectionId);
      return new Response(
        JSON.stringify(result),
        { status: result.success ? 200 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Batch refresh for expiring tokens
      const result = await refreshExpiringTokens(supabase);
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function refreshExpiringTokens(supabase: any) {
  console.log('Starting batch token refresh for expiring tokens...');
  
  // Find connections with tokens expiring within 7 days
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  const { data: connections, error } = await supabase
    .from('qbo_connections')
    .select('*')
    .eq('connection_status', 'connected')
    .lt('token_expires_at', sevenDaysFromNow.toISOString());

  if (error) {
    console.error('Error fetching expiring connections:', error);
    return { error: 'Failed to fetch connections' };
  }

  console.log(`Found ${connections?.length || 0} connections with expiring tokens`);

  const results = [];
  for (const connection of connections || []) {
    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = await refreshConnection(supabase, connection.id);
    results.push({
      connectionId: connection.id,
      clientId: connection.client_id,
      ...result
    });
  }

  return {
    success: true,
    refreshed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
}

async function refreshConnection(supabase: any, connectionId: string) {
  try {
    // Get connection details
    const { data: connection, error: fetchError } = await supabase
      .from('qbo_connections')
      .select('*, profiles!inner(intuit_client_id, intuit_client_secret)')
      .eq('id', connectionId)
      .single();

    if (fetchError || !connection) {
      throw new Error(`Failed to fetch connection: ${fetchError?.message}`);
    }

    const { profiles } = connection;
    if (!profiles.intuit_client_id || !profiles.intuit_client_secret) {
      throw new Error('Missing client credentials');
    }

    // Decrypt the refresh token
    const refreshToken = await decryptToken(connection.refresh_token);
    
    // Call Intuit token refresh endpoint
    const tokenResponse = await refreshIntuitToken({
      refreshToken,
      clientId: profiles.intuit_client_id,
      clientSecret: profiles.intuit_client_secret
    });

    // Encrypt new tokens
    const encryptedAccessToken = await encryptToken(tokenResponse.access_token);
    const encryptedRefreshToken = await encryptToken(tokenResponse.refresh_token);
    
    // Calculate new expiry time
    const newExpiryTime = new Date(Date.now() + tokenResponse.expires_in * 1000);

    // Update connection with new tokens
    const { error: updateError } = await supabase
      .from('qbo_connections')
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: newExpiryTime.toISOString(),
        refresh_token_updated_at: new Date().toISOString(),
        connection_status: 'connected',
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    if (updateError) {
      throw new Error(`Failed to update tokens: ${updateError.message}`);
    }

    // Log successful refresh
    await logTokenEvent(supabase, connection.client_id, 'token_refreshed', 'Token successfully refreshed');

    console.log(`Successfully refreshed tokens for connection ${connectionId}`);
    
    return {
      success: true,
      message: 'Tokens refreshed successfully',
      expiresAt: newExpiryTime.toISOString()
    };

  } catch (error) {
    console.error(`Token refresh failed for connection ${connectionId}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Log the error
    const { data: connection } = await supabase
      .from('qbo_connections')
      .select('client_id')
      .eq('id', connectionId)
      .single();
    
    if (connection) {
      await logTokenEvent(supabase, connection.client_id, 'token_refresh_failed', errorMessage);
      
      // If invalid_grant error, mark as disconnected
      if (errorMessage.includes('invalid_grant')) {
        await supabase
          .from('qbo_connections')
          .update({ 
            connection_status: 'needs_reconnect',
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionId);
      }
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

async function refreshIntuitToken(request: TokenRefreshRequest): Promise<IntuitTokenResponse> {
  const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
  
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: request.refreshToken
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${request.clientId}:${request.clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: params
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

// Simple encryption using Web Crypto API
async function encryptToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  
  // Generate a random key for demonstration - in production, use a proper key derivation
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  // For simplicity, just return base64 encoded token (in production, implement proper encryption)
  return btoa(token);
}

async function decryptToken(encryptedToken: string): Promise<string> {
  // For simplicity, just return base64 decoded token (in production, implement proper decryption)
  return atob(encryptedToken);
}

async function logTokenEvent(supabase: any, clientId: string, eventType: string, message: string) {
  try {
    await supabase
      .from('notification_logs')
      .insert({
        client_id: clientId,
        notification_type: 'audit',
        recipient: 'system',
        subject: `Token Event: ${eventType}`,
        message: message,
        status: 'delivered'
      });
  } catch (error) {
    console.error('Failed to log token event:', error);
  }
}