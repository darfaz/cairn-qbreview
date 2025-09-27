import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConnectRequest {
  environment?: 'production' | 'sandbox';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment check - validate required Intuit credentials
    console.log('Environment check: Validating Intuit credentials');
    const INTUIT_CLIENT_ID = Deno.env.get('INTUIT_CLIENT_ID');
    const INTUIT_CLIENT_SECRET = Deno.env.get('INTUIT_CLIENT_SECRET');
    
    if (!INTUIT_CLIENT_ID) {
      console.error('Environment check failed: INTUIT_CLIENT_ID is missing');
      return new Response(
        JSON.stringify({ 
          error: 'QuickBooks integration not configured: INTUIT_CLIENT_ID environment variable is missing. Please configure Intuit app credentials in Edge Function secrets.',
          needsSetup: true 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!INTUIT_CLIENT_SECRET) {
      console.error('Environment check failed: INTUIT_CLIENT_SECRET is missing');
      return new Response(
        JSON.stringify({ 
          error: 'QuickBooks integration not configured: INTUIT_CLIENT_SECRET environment variable is missing. Please configure Intuit app credentials in Edge Function secrets.',
          needsSetup: true 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Environment check passed: Both INTUIT_CLIENT_ID and INTUIT_CLIENT_SECRET are configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get environment from Edge Function secrets (controlled by whoever deploys)
    const environment = Deno.env.get('INTUIT_ENVIRONMENT') || 'sandbox';

    // Optional: allow override from request body if needed
    let finalEnvironment = environment;
    try {
      const body = await req.json();
      if (body?.environment) {
        finalEnvironment = body.environment;
        console.log('Environment overridden by request:', finalEnvironment);
      }
    } catch (e) {
      // No body provided, use environment from secrets
      console.log('Using environment from secrets:', finalEnvironment);
    }

    // Generate secure random state parameter for CSRF protection
    const state = globalThis.crypto.randomUUID();
    const stateExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store state in database for validation
    const { error: stateError } = await supabase
      .from('qbo_oauth_states')
      .insert({
        state,
        user_id: user.id,
        expires_at: stateExpiry.toISOString(),
        environment: finalEnvironment
      });

    if (stateError) {
      console.error('Error storing OAuth state:', stateError);
      return new Response(
        JSON.stringify({ error: 'Failed to initialize OAuth flow' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine base URL based on environment
    const baseUrl = finalEnvironment === 'sandbox' 
      ? 'https://sandbox.appcenter.intuit.com' 
      : 'https://appcenter.intuit.com';

    // Build authorization URL with all required parameters
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/quickbooks-callback`;
    
    const params = new URLSearchParams({
      client_id: INTUIT_CLIENT_ID,
      scope: 'com.intuit.quickbooks.accounting',
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
      access_type: 'offline' // Ensures we get refresh token
    });

    const authUrl = `${baseUrl}/connect/oauth2?${params}`;

    console.log('Generated OAuth URL for user:', user.id, 'Environment:', finalEnvironment);

    return new Response(
      JSON.stringify({ 
        authUrl,
        state,
        message: 'OAuth flow initialized successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Connect endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});