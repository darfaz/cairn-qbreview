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

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('QBO OAuth handler invoked');
    
    const { 
      client_id,
      realm_id, 
      access_token, 
      refresh_token, 
      expires_in 
    } = await req.json();

    if (!client_id || !realm_id || !access_token || !refresh_token) {
      throw new Error('Missing required parameters');
    }

    console.log(`Storing tokens for client ${client_id}, realm ${realm_id}`);

    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString();

    // Encrypt tokens using database function
    const { data: encryptedAccessToken, error: accessError } = await supabase
      .rpc('encrypt_qbo_token', { token: access_token });

    if (accessError) {
      console.error('Failed to encrypt access token:', accessError);
      throw new Error(`Token encryption failed: ${accessError.message}`);
    }

    const { data: encryptedRefreshToken, error: refreshError } = await supabase
      .rpc('encrypt_qbo_token', { token: refresh_token });

    if (refreshError) {
      console.error('Failed to encrypt refresh token:', refreshError);
      throw new Error(`Token encryption failed: ${refreshError.message}`);
    }

    console.log('Tokens encrypted successfully');

    // Check if token record exists
    const { data: existingToken } = await supabase
      .from('qbo_tokens')
      .select('id')
      .eq('client_id', client_id)
      .eq('realm_id', realm_id)
      .single();

    if (existingToken) {
      // Update existing token
      const { error: updateError } = await supabase
        .from('qbo_tokens')
        .update({
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingToken.id);

      if (updateError) {
        console.error('Failed to update tokens:', updateError);
        throw updateError;
      }

      console.log('Tokens updated successfully');
    } else {
      // Insert new token
      const { error: insertError } = await supabase
        .from('qbo_tokens')
        .insert({
          client_id,
          realm_id,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: expiresAt
        });

      if (insertError) {
        console.error('Failed to insert tokens:', insertError);
        throw insertError;
      }

      console.log('Tokens stored successfully');
    }

    // Log token storage event
    await supabase
      .from('notification_logs')
      .insert({
        client_id,
        notification_type: 'audit',
        recipient: 'system',
        subject: 'QBO Token Storage',
        message: `QBO tokens stored for client ${client_id}`,
        status: 'delivered'
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Tokens stored successfully' 
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );

  } catch (error: any) {
    console.error('Error in qbo-oauth-handler:', error);
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
