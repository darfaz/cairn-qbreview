import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id } = await req.json();

    if (!client_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'client_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch client details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, client_name, realm_id, dropbox_folder_path, dropbox_folder_url')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ success: false, error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing processing review in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('client_id', client_id)
      .eq('status', 'processing')
      .gte('triggered_at', fiveMinutesAgo)
      .maybeSingle();

    if (existingReview) {
      return new Response(
        JSON.stringify({ success: false, error: 'Review already in progress' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new review with status='processing'
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        client_id: client_id,
        status: 'processing',
        triggered_at: new Date().toISOString()
      })
      .select()
      .single();

    if (reviewError || !review) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create review' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call n8n webhook
    const n8nWebhookUrl = 'https://execture.app.n8n.cloud/webhook/qb-auto-review';
    const payload = {
      realm_id: client.realm_id,
      client_name: client.client_name,
      review_id: review.id,
      client_id: client.id,
      callback_url: `${supabaseUrl}/functions/v1/review-callback`,
      environment: 'sandbox',
      dropbox_folder_path: client.dropbox_folder_path || '',
      sheet_url_base: ''
    };

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!n8nResponse.ok) {
      // Mark review as failed
      await supabase
        .from('reviews')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', review.id);

      return new Response(
        JSON.stringify({ success: false, error: 'n8n webhook failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, review_id: review.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
