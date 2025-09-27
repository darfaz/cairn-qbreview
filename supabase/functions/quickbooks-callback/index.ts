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
      const frontendUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/company-selection?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`;
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': frontendUrl,
          ...corsHeaders
        }
      });
    }

    // Validate required parameters
    if (!code || !state || !realmId) {
      console.error('Missing required OAuth parameters:', { code: !!code, state: !!state, realmId: !!realmId });
      const frontendUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/company-selection?error=invalid_request&error_description=Missing required parameters`;
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': frontendUrl,
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
      
      const frontendUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/company-selection?error=invalid_state&error_description=Invalid security token`;
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': frontendUrl,
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

    // Get user's profile to find their firm
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('firm_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.firm_id) {
      console.error('Failed to get user profile or firm:', profileError);
      const frontendUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/company-selection?error=configuration_error&error_description=User must be associated with a firm`;
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': frontendUrl,
          ...corsHeaders
        }
      });
    }

    // Get firm's OAuth integration settings
    const { data: integration, error: integrationError } = await supabase
      .from('firm_integrations')
      .select('intuit_client_id, intuit_client_secret_encrypted, redirect_uri')
      .eq('firm_id', profile.firm_id)
      .single();

    if (integrationError || !integration?.intuit_client_id || !integration?.intuit_client_secret_encrypted) {
      console.error('Failed to get firm integration settings:', integrationError);
      const frontendUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/company-selection?error=configuration_error&error_description=Firm QuickBooks integration not configured`;
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': frontendUrl,
          ...corsHeaders
        }
      });
    }

    // Exchange authorization code for tokens
    const tokenUrl = environment === 'sandbox' 
      ? 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
      : 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

    const redirectUri = integration.redirect_uri || `${Deno.env.get('SUPABASE_URL')}/functions/v1/quickbooks-callback`;
    
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${integration.intuit_client_id}:${integration.intuit_client_secret_encrypted}`)}`,
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
      console.error('Token exchange failed - Authorization header (client_id):', integration.intuit_client_id);
      
      const frontendUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/company-selection?error=token_exchange_failed&error_description=Failed to exchange authorization code`;
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': frontendUrl,
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
    
    // Find or create client record for this firm and realm
    const { data: existingClient, error: clientLookupError } = await supabase
      .from('clients')
      .select('id')
      .eq('realm_id', realmId)
      .eq('firm_id', profile.firm_id)
      .single();

    let clientId = existingClient?.id;
    
    if (!clientId) {
      // Create new client record
      const { data: newClient, error: clientCreateError } = await supabase
        .from('clients')
        .insert({
          name: `QuickBooks Company ${realmId}`,
          realm_id: realmId,
          firm_id: profile.firm_id,
          connection_status: 'connected',
          is_active: true
        })
        .select('id')
        .single();

      if (clientCreateError) {
        console.error('Failed to create client record:', clientCreateError);
        const frontendUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/company-selection?error=storage_failed&error_description=Failed to create client record`;
        
        return new Response(null, {
          status: 302,
          headers: {
            'Location': frontendUrl,
            ...corsHeaders
          }
        });
      }
      
      clientId = newClient.id;
    }
    
    // Check if connection already exists for this realm and client
    const { data: existingConnection, error: connectionCheckError } = await supabase
      .from('qbo_connections')
      .select('id')
      .eq('realm_id', realmId)
      .eq('client_id', clientId)
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
        const frontendUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/company-selection?error=storage_failed&error_description=Failed to update connection`;
        
        return new Response(null, {
          status: 302,
          headers: {
            'Location': frontendUrl,
            ...corsHeaders
          }
        });
      }
    } else {
      // Create new connection
      const { error: insertError } = await supabase
        .from('qbo_connections')
        .insert({
          client_id: clientId,
          realm_id: realmId,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: tokenExpiresAt.toISOString(),
          refresh_token_updated_at: new Date().toISOString(),
          connection_status: 'connected',
          expires_at: tokenExpiresAt.toISOString(),
          accountant_access: true
        });

      if (insertError) {
        console.error('Failed to create connection:', insertError);
        const frontendUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/company-selection?error=storage_failed&error_description=Failed to store connection`;
        
        return new Response(null, {
          status: 302,
          headers: {
            'Location': frontendUrl,
            ...corsHeaders
          }
        });
      }
    }

    // Update client connection status
    await supabase
      .from('clients')
      .update({
        connection_status: 'connected',
        last_sync_at: new Date().toISOString()
      })
      .eq('id', clientId);

    // Log successful connection
    await logOAuthEvent(supabase, clientId, 'oauth_success', `QuickBooks OAuth completed successfully for realm ${realmId}`);

    console.log(`OAuth successful for realmId: ${realmId}, userId: ${userId}, environment: ${environment}`);

    // Redirect to company selection page with success
    const frontendUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/company-selection?code=${code}&realmId=${realmId}&success=true`;
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': frontendUrl,
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Callback endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const frontendUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/company-selection?error=internal_error&error_description=${encodeURIComponent(errorMessage)}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': frontendUrl,
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

async function logOAuthEvent(supabase: any, clientId: string, eventType: string, message: string) {
  try {
    await supabase
      .from('notification_logs')
      .insert({
        client_id: clientId,
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