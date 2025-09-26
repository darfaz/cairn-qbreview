import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReconciliationRequest {
  clientId?: string;
  runType: 'scheduled' | 'manual';
}

interface N8nWebhookPayload {
  realm_id: string;
  access_token: string;
  client_name: string;
  run_id: string;
  callback_url: string;
}

interface N8nResponse {
  status: 'success' | 'failed';
  google_sheet_url?: string;
  unreconciled_count?: number;
  unreconciled_accounts?: string[];
  completion_time?: string;
  error_message?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const N8N_WEBHOOK_URL = 'https://execture.app.n8n.cloud/workflow/FR1nnHx3WiQJOWGv';

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Reconciliation request received');
    
    if (req.method === 'POST') {
      const { clientId, runType }: ReconciliationRequest = await req.json();
      
      if (runType === 'scheduled') {
        // Run for all connected clients
        return await runScheduledReconciliation();
      } else if (runType === 'manual' && clientId) {
        // Run for specific client
        return await runManualReconciliation(clientId);
      }
    } else if (req.method === 'GET') {
      // Callback endpoint for n8n webhook results
      const url = new URL(req.url);
      const runId = url.searchParams.get('runId');
      const status = url.searchParams.get('status');
      const googleSheetUrl = url.searchParams.get('googleSheetUrl');
      const unreconciledCount = url.searchParams.get('unreconciledCount');
      const errorMessage = url.searchParams.get('errorMessage');
      
      if (runId) {
        return await handleWebhookCallback({
          runId,
          status: status as 'success' | 'failed',
          googleSheetUrl,
          unreconciledCount: unreconciledCount ? parseInt(unreconciledCount) : 0,
          errorMessage
        });
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in reconciliation function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

async function runScheduledReconciliation() {
  console.log('Starting scheduled reconciliation for all clients');
  
  // Get all connected clients
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .eq('connection_status', 'connected');

  if (clientsError) {
    throw new Error(`Failed to fetch clients: ${clientsError.message}`);
  }

  if (!clients || clients.length === 0) {
    return new Response(
      JSON.stringify({ message: 'No connected clients found' }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Process each client
  const results = [];
  for (const client of clients) {
    try {
      const result = await processClientReconciliation(client.id, 'scheduled');
      results.push(result);
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`Failed to process client ${client.name}:`, error);
      results.push({ clientId: client.id, error: error.message });
    }
  }

  // Update last run date
  await supabase
    .from('scheduled_runs')
    .update({ last_run_date: new Date().toISOString().split('T')[0] })
    .eq('enabled', true);

  return new Response(
    JSON.stringify({ 
      message: `Scheduled reconciliation completed for ${clients.length} clients`,
      results 
    }),
    { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}

async function runManualReconciliation(clientId: string) {
  console.log(`Starting manual reconciliation for client: ${clientId}`);
  
  const result = await processClientReconciliation(clientId, 'manual');
  
  return new Response(
    JSON.stringify(result),
    { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}

async function processClientReconciliation(clientId: string, runType: 'scheduled' | 'manual') {
  // Get client details
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (clientError || !client) {
    throw new Error(`Client not found: ${clientError?.message}`);
  }

  // Create reconciliation run record
  const { data: runRecord, error: runError } = await supabase
    .from('reconciliation_runs')
    .insert({
      client_id: clientId,
      run_type: runType,
      status: 'running'
    })
    .select()
    .single();

  if (runError || !runRecord) {
    throw new Error(`Failed to create run record: ${runError?.message}`);
  }

  try {
    // Prepare webhook payload
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/run-reconciliation?runId=${runRecord.id}`;
    
    const webhookPayload: N8nWebhookPayload = {
      realm_id: client.realm_id,
      access_token: 'mock_access_token', // In production, get from OAuth tokens table
      client_name: client.name,
      run_id: runRecord.id,
      callback_url: callbackUrl
    };

    console.log('Calling n8n webhook:', webhookPayload);

    // Call n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    if (!response.ok) {
      throw new Error(`n8n webhook failed: ${response.status} ${response.statusText}`);
    }

    const webhookResult = await response.json();
    console.log('n8n webhook response:', webhookResult);

    return {
      clientId,
      runId: runRecord.id,
      status: 'initiated',
      message: 'Reconciliation started successfully'
    };

  } catch (error: any) {
    // Update run record with error
    await supabase
      .from('reconciliation_runs')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', runRecord.id);

    throw error;
  }
}

async function handleWebhookCallback(callbackData: {
  runId: string;
  status: 'success' | 'failed';
  googleSheetUrl?: string | null;
  unreconciledCount: number;
  errorMessage?: string | null;
}) {
  console.log('Handling webhook callback:', callbackData);

  const { runId, status, googleSheetUrl, unreconciledCount, errorMessage } = callbackData;

  // Determine status color based on unreconciled count
  let statusColor: 'green' | 'yellow' | 'red' = 'green';
  if (unreconciledCount >= 4) {
    statusColor = 'red';
  } else if (unreconciledCount >= 1) {
    statusColor = 'yellow';
  }

  // Update reconciliation run
  const { error: updateError } = await supabase
    .from('reconciliation_runs')
    .update({
      status: status === 'success' ? 'completed' : 'failed',
      completed_at: new Date().toISOString(),
      google_sheet_url: googleSheetUrl,
      unreconciled_count: unreconciledCount,
      status_color: statusColor,
      error_message: errorMessage
    })
    .eq('id', runId);

  if (updateError) {
    console.error('Failed to update reconciliation run:', updateError);
  }

  // Update client status
  const { data: runData } = await supabase
    .from('reconciliation_runs')
    .select('client_id')
    .eq('id', runId)
    .single();

  if (runData?.client_id) {
    await supabase
      .from('clients')
      .update({
        status: statusColor,
        action_items_count: unreconciledCount,
        last_review_date: new Date().toISOString()
      })
      .eq('id', runData.client_id);
  }

  return new Response(
    JSON.stringify({ message: 'Webhook callback processed successfully' }),
    { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}