import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QBOReviewRequest {
  realmId: string;
  clientName: string;
  clientId: string;
  sheetUrl?: string;
}

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
    // Get authenticated user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      const body: QBOReviewRequest = await req.json();
      const { realmId, clientName, clientId, sheetUrl } = body;

      console.log('QBO Review request:', { realmId, clientName, clientId });

      // Get QBO connection tokens from database
      const { data: qboConnection, error: connectionError } = await supabase
        .from('qbo_connections')
        .select('access_token, refresh_token')
        .eq('realm_id', realmId)
        .single();

      if (connectionError || !qboConnection) {
        console.error('QBO connection error:', connectionError);
        return new Response(
          JSON.stringify({ error: 'QBO connection not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get N8N webhook URL from environment
      const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL') || 
        'https://execture.app.n8n.cloud/webhook/qb-auto-review';

      try {
        console.log('Calling N8N webhook:', n8nWebhookUrl);
        
        const webhookResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Realm_ID: realmId,
            'Client Name': clientName,
            'Sheet URL': sheetUrl,
            access_token: qboConnection.access_token,
            refresh_token: qboConnection.refresh_token,
          }),
        });

        if (!webhookResponse.ok) {
          throw new Error(`Webhook failed with status: ${webhookResponse.status}`);
        }

        const result = await webhookResponse.json();
        console.log('N8N webhook result:', result);

        // Store the review run in database
        const { error: insertError } = await supabase
          .from('review_history')
          .insert({
            client_id: clientId,
            status: 'completed',
            sheet_url: result.sheetUrl || sheetUrl,
            review_date: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Failed to store review run:', insertError);
        }

        // Update client's last review info
        await supabase
          .from('qbo_clients')
          .update({
            last_review_date: new Date().toISOString(),
            last_review_status: 'completed',
            sheet_url: result.sheetUrl || sheetUrl,
          })
          .eq('id', clientId);

        return new Response(
          JSON.stringify({ success: true, data: result }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );

      } catch (error) {
        console.error('Webhook error:', error);
        
        // Store failed review run
        await supabase
          .from('review_history')
          .insert({
            client_id: clientId,
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            review_date: new Date().toISOString(),
          });

        return new Response(
          JSON.stringify({ error: 'Failed to run review', details: error instanceof Error ? error.message : 'Unknown error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});