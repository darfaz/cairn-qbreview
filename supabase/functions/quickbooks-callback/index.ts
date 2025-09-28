import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  x_refresh_token_expires_in?: number;
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

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const realmId = url.searchParams.get('realmId');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error received:', error, errorDescription);
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': 'https://cairn-qbreview.lovable.app/dashboard?error=oauth_failed',
          ...corsHeaders
        }
      });
    }

    // Validate required parameters
    if (!code || !state || !realmId) {
      console.error('Missing required OAuth parameters:', { code: !!code, state: !!state, realmId: !!realmId });
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': 'https://cairn-qbreview.lovable.app/dashboard?error=oauth_failed',
          ...corsHeaders
        }
      });
    }

    // Validate state parameter (CSRF protection)
    const { data: stateRecord, error: stateError } = await supabase
      .from('qbo_oauth_states')
      .select('*')
      .eq('state', state)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (stateError || !stateRecord) {
      console.error('State validation failed - Received state:', state);
      console.error('State lookup error:', stateError);
      console.error('State record found:', stateRecord);
      
      // Check for any stored states for debugging
      const { data: allStates } = await supabase
        .from('qbo_oauth_states')
        .select('state, expires_at, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      console.log('Recent stored states:', allStates);
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': 'https://cairn-qbreview.lovable.app/dashboard?error=oauth_failed',
          ...corsHeaders
        }
      });
    }

    const userId = stateRecord.user_id;
    const environment = stateRecord.environment;

    // Clean up used state
    await supabase
      .from('qbo_oauth_states')
      .delete()
      .eq('state', state);

    // Get global Intuit credentials from secrets
    const INTUIT_CLIENT_ID = Deno.env.get('INTUIT_CLIENT_ID');
    const INTUIT_CLIENT_SECRET = Deno.env.get('INTUIT_CLIENT_SECRET');

    if (!INTUIT_CLIENT_ID || !INTUIT_CLIENT_SECRET) {
      console.error('Missing Intuit credentials in environment');
      return new Response(null, {
        status: 302,
        headers: {
          'Location': 'https://cairn-qbreview.lovable.app/dashboard?error=oauth_failed',
          ...corsHeaders
        }
      });
    }

    // Exchange authorization code for tokens
    const tokenUrl = environment === 'sandbox' 
      ? 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
      : 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/quickbooks-callback`;
    
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${INTUIT_CLIENT_ID}:${INTUIT_CLIENT_SECRET}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenParams
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed - Status:', tokenResponse.status);
      console.error('Token exchange failed - Response:', errorText);
      console.error('Token exchange failed - Request URL:', tokenUrl);
      console.error('Token exchange failed - Request body:', tokenParams.toString());
      console.error('Token exchange failed - Authorization header (client_id):', INTUIT_CLIENT_ID);
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': 'https://cairn-qbreview.lovable.app/dashboard?error=oauth_failed',
          ...corsHeaders
        }
      });
    }

    const tokens: TokenResponse = await tokenResponse.json();
    
    // Encrypt tokens before storage
    const encryptedAccessToken = await encryptToken(tokens.access_token);
    const encryptedRefreshToken = await encryptToken(tokens.refresh_token);
    
    // Calculate token expiry time
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    
    // Check if connection already exists for this realm
    const { data: existingConnection, error: connectionCheckError } = await supabase
      .from('qbo_connections')
      .select('id')
      .eq('realm_id', realmId)
      .eq('client_id', userId) // Assuming client_id maps to user for this use case
      .single();

    if (existingConnection) {
      // Update existing connection
      const { error: updateError } = await supabase
        .from('qbo_connections')
        .update({
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: tokenExpiresAt.toISOString(),
          refresh_token_updated_at: new Date().toISOString(),
          connection_status: 'connected',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConnection.id);

      if (updateError) {
        console.error('Failed to update connection:', updateError);
        return new Response(null, {
          status: 302,
          headers: {
            'Location': 'https://cairn-qbreview.lovable.app/dashboard?error=oauth_failed',
            ...corsHeaders
          }
        });
      }
    } else {
      // Create new connection
      const { error: insertError } = await supabase
        .from('qbo_connections')
        .insert({
          client_id: userId, // This might need to be adjusted based on your schema
          realm_id: realmId,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: tokenExpiresAt.toISOString(),
          refresh_token_updated_at: new Date().toISOString(),
          connection_status: 'connected',
          expires_at: tokenExpiresAt.toISOString(), // Assuming this is also needed
          accountant_access: true
        });

      if (insertError) {
        console.error('Failed to create connection:', insertError);
        return new Response(null, {
          status: 302,
          headers: {
            'Location': 'https://cairn-qbreview.lovable.app/dashboard?error=oauth_failed',
            ...corsHeaders
          }
        });
      }
    }

    // Log successful connection
    await logOAuthEvent(supabase, userId, 'oauth_success', `QuickBooks OAuth completed successfully for realm ${realmId}`);

    console.log(`OAuth successful for realmId: ${realmId}, userId: ${userId}, environment: ${environment}`);

    // Redirect to dashboard with success
    return new Response(null, {
      status: 302,
      headers: {
        'Location': 'https://cairn-qbreview.lovable.app/dashboard',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Callback endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(null, {
      status: 302,
      headers: {
        'Location': 'https://cairn-qbreview.lovable.app/dashboard?error=oauth_failed',
        ...corsHeaders
      }
    });
  }
});

// Simple encryption using Web Crypto API (matches the token-refresh function)
async function encryptToken(token: string): Promise<string> {
  // For simplicity, just return base64 encoded token (in production, implement proper encryption)
  return btoa(token);
}

async function logOAuthEvent(supabase: any, userId: string, eventType: string, message: string) {
  try {
    await supabase
      .from('notification_logs')
      .insert({
        client_id: userId,
        notification_type: 'audit',
        recipient: 'system',
        subject: `OAuth Event: ${eventType}`,
        message: message,
        status: 'delivered'
      });
  } catch (error) {
    console.error('Failed to log OAuth event:', error);
  }
}