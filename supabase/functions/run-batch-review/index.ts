import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchReviewRequest {
  clientIds?: string[];
  runAll?: boolean;
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

    const body: BatchReviewRequest = await req.json();
    const { clientIds, runAll } = body;

    console.log(`Starting batch review. Run all: ${runAll}, Client count: ${clientIds?.length || 0}`);

    let query = supabase
      .from('clients')
      .select('id, client_name, realm_id, sheet_url, connection_status');

    if (!runAll && clientIds && clientIds.length > 0) {
      query = query.in('id', clientIds);
    }

    const { data: clients, error: clientsError } = await query;

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    }

    if (!clients || clients.length === 0) {
      throw new Error('No clients found to process');
    }

    console.log(`Processing ${clients.length} clients`);

    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    if (!n8nWebhookUrl) {
      throw new Error('N8N_WEBHOOK_URL environment variable not set');
    }

    const batchSize = 5;
    const results = [];

    for (let i = 0; i < clients.length; i += batchSize) {
      const batch = clients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (client) => {
        try {
          if (client.connection_status !== 'connected') {
            return {
              clientId: client.id,
              clientName: client.client_name,
              status: 'skipped',
              reason: 'Not connected',
            };
          }

          console.log(`Processing client: ${client.client_name}`);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 140000);

          try {
            const n8nResponse = await fetch(n8nWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'run_review',
                realmId: client.realm_id,
                clientName: client.client_name,
                sheetUrl: client.sheet_url,
                userId: user.id,
              }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!n8nResponse.ok) {
              const errorText = await n8nResponse.text();
              throw new Error(`n8n webhook failed: ${n8nResponse.status} - ${errorText}`);
            }

            await n8nResponse.json();

            return {
              clientId: client.id,
              clientName: client.client_name,
              status: 'success',
            };
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            throw fetchError;
          }
        } catch (error: any) {
          console.error(`Error processing client ${client.client_name}:`, error);
          return {
            clientId: client.id,
            clientName: client.client_name,
            status: 'error',
            error: error.message,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      if (i + batchSize < clients.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const successes = results.filter(r => r.status === 'success');
    const failures = results.filter(r => r.status === 'error');
    const skipped = results.filter(r => r.status === 'skipped');

    console.log(`Batch review completed. Success: ${successes.length}, Errors: ${failures.length}, Skipped: ${skipped.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Batch review completed. ${successes.length} successful, ${failures.length} failed, ${skipped.length} skipped`,
        results: {
          total: results.length,
          successes: successes.length,
          failures: failures.length,
          skipped: skipped.length,
          details: results,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in run-batch-review function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred while running the batch review',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
