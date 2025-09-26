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

    // Get user's OAuth settings
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('intuit_client_id, oauth_redirect_uri, qboa_oauth_enabled')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.qboa_oauth_enabled) {
      return new Response(
        JSON.stringify({ 
          error: 'QuickBooks OAuth is not configured. Please configure OAuth settings first.',
          needsSetup: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { environment = 'production' }: ConnectRequest = await req.json();

    // Generate secure random state parameter for CSRF protection
    const state = crypto.randomUUID();
    const stateExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store state in database for validation
    const { error: stateError } = await supabase
      .from('qbo_oauth_states')
      .insert({
        state,
        user_id: user.id,
        expires_at: stateExpiry.toISOString(),
        environment
      });

    if (stateError) {
      console.error('Error storing OAuth state:', stateError);
      return new Response(
        JSON.stringify({ error: 'Failed to initialize OAuth flow' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine base URL based on environment
    const baseUrl = environment === 'sandbox' 
      ? 'https://sandbox.appcenter.intuit.com' 
      : 'https://appcenter.intuit.com';

    // Build authorization URL with all required parameters
    const redirectUri = profile.oauth_redirect_uri || `${Deno.env.get('SUPABASE_URL')}/functions/v1/quickbooks-callback`;
    
    const params = new URLSearchParams({
      client_id: profile.intuit_client_id,
      scope: 'com.intuit.quickbooks.accounting',
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
      access_type: 'offline' // Ensures we get refresh token
    });

    const authUrl = `${baseUrl}/connect/oauth2?${params}`;

    console.log('Generated OAuth URL for user:', user.id, 'Environment:', environment);

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