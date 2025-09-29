import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReviewRequest {
  realmId: string;
  clientName: string;
  sheetUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body: ReviewRequest = await req.json();
    const { realmId, clientName, sheetUrl } = body;

    if (!realmId || !clientName) {
      throw new Error('Missing required fields: realmId and clientName');
    }

    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    if (!n8nWebhookUrl) {
      throw new Error('N8N_WEBHOOK_URL environment variable not set');
    }

    console.log(`Starting review for client: ${clientName} (realmId: ${realmId})`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 140000);

    try {
      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'run_review',
          realmId: realmId,
          clientName: clientName,
          sheetUrl: sheetUrl,
          userId: user.id,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error('n8n webhook error:', errorText);
        throw new Error(`n8n webhook failed: ${n8nResponse.status} - ${errorText}`);
      }

      const n8nResult = await n8nResponse.json();
      console.log('n8n workflow completed successfully');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Review completed successfully',
          data: n8nResult,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('n8n webhook timeout after 140 seconds');
        throw new Error('Review process timed out. Please try again or contact support.');
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Error in run-review function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred while running the review',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
