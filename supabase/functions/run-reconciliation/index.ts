import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReconciliationRequest {
  clientId?: string;
  runType: 'scheduled' | 'manual' | 'bulk';
  clientIds?: string[];
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
      const { clientId, runType, clientIds }: ReconciliationRequest = await req.json();
      
      if (runType === 'scheduled') {
        // Run for all connected clients
        return await runScheduledReconciliation();
      } else if (runType === 'bulk' && clientIds && clientIds.length > 0) {
        // Run for multiple clients with rate limiting
        return await runBulkReconciliation(clientIds);
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

// New bulk reconciliation function
async function runBulkReconciliation(clientIds: string[]) {
  console.log(`Starting bulk reconciliation for ${clientIds.length} clients`);
  
  // Add all clients to the sync queue
  const queueItems = clientIds.map(clientId => ({
    client_id: clientId,
    operation_type: 'bulk_reconciliation',
    priority: 3,
    parameters: { run_type: 'bulk' }
  }));

  const { error: queueError } = await supabase
    .from('qbo_sync_queue')
    .insert(queueItems);

  if (queueError) {
    throw new Error(`Failed to queue reconciliations: ${queueError.message}`);
  }

  // Process queue with rate limiting (max 5 concurrent)
  const results = await processBulkQueue(clientIds);

  return new Response(
    JSON.stringify({ 
      message: `Bulk reconciliation queued for ${clientIds.length} clients`,
      results 
    }),
    { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}

async function processBulkQueue(clientIds: string[]) {
  const results = [];
  const maxConcurrent = 5;
  
  for (let i = 0; i < clientIds.length; i += maxConcurrent) {
    const batch = clientIds.slice(i, i + maxConcurrent);
    
    const batchPromises = batch.map(async (clientId) => {
      try {
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await processClientReconciliation(clientId, 'manual');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return { clientId, error: errorMessage };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

async function processClientReconciliation(clientId: string, runType: 'scheduled' | 'manual', retryCount = 0) {
  const maxRetries = 3;
  
  // Get client details with QBO connection
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select(`
      *,
      qbo_connections!inner(
        id,
        access_token,
        refresh_token,
        token_expires_at,
        connection_status,
        realm_id
      )
    `)
    .eq('id', clientId)
    .single();

  if (clientError || !client) {
    throw new Error(`Client not found: ${clientError?.message}`);
  }

  const connection = client.qbo_connections[0];
  if (!connection) {
    throw new Error('No QuickBooks connection found for client');
  }

  // Check if token needs refresh
  let accessToken = connection.access_token;
  const tokenExpiry = new Date(connection.token_expires_at);
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (tokenExpiry <= sevenDaysFromNow) {
    console.log(`Token expires soon for client ${clientId}, refreshing...`);
    
    try {
      const refreshResult = await supabase.functions.invoke('quickbooks-token-refresh', {
        body: { connectionId: connection.id }
      });

      if (refreshResult.error || !refreshResult.data?.success) {
        throw new Error(`Token refresh failed: ${refreshResult.data?.error || refreshResult.error?.message}`);
      }

      // Get updated token
      const { data: updatedConnection } = await supabase
        .from('qbo_connections')
        .select('access_token')
        .eq('id', connection.id)
        .single();

      if (updatedConnection) {
        accessToken = updatedConnection.access_token;
      }
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      
      // If refresh fails and it's not the last retry, throw to trigger retry
      if (retryCount < maxRetries) {
        throw new Error(`Token refresh failed, will retry: ${refreshError instanceof Error ? refreshError.message : 'Unknown error'}`);
      }
      
      // Mark connection as needing reconnect
      await supabase
        .from('qbo_connections')
        .update({ connection_status: 'needs_reconnect' })
        .eq('id', connection.id);
        
      throw new Error('Token refresh failed after max retries');
    }
  }

  // Decrypt access token for use
  let decryptedToken = accessToken;
  try {
    decryptedToken = atob(accessToken); // Simple base64 decode - matches encryption in token-refresh
  } catch (error) {
    console.error('Token decryption failed:', error);
  }

  // Create reconciliation run record
  const { data: runRecord, error: runError } = await supabase
    .from('reconciliation_runs')
    .insert({
      client_id: clientId,
      run_type: runType,
      status: 'running',
      retry_count: retryCount
    })
    .select()
    .single();

  if (runError || !runRecord) {
    throw new Error(`Failed to create run record: ${runError?.message}`);
  }

  try {
    // Prepare webhook payload with real QBOA data
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/run-reconciliation?runId=${runRecord.id}`;
    
    const webhookPayload: N8nWebhookPayload = {
      realm_id: connection.realm_id,
      access_token: decryptedToken,
      client_name: client.qbo_company_name || client.name,
      run_id: runRecord.id,
      callback_url: callbackUrl
    };

    console.log(`Calling n8n webhook for client ${client.name}:`, { ...webhookPayload, access_token: '[REDACTED]' });

    // Call n8n webhook with exponential backoff
    const baseDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
    await new Promise(resolve => setTimeout(resolve, baseDelay));

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`n8n webhook failed: ${response.status} ${response.statusText} - ${responseText}`);
    }

    const webhookResult = await response.json();
    console.log('n8n webhook response:', webhookResult);

    // Log successful reconciliation start
    await logReconciliationEvent(clientId, 'reconciliation_started', 'Reconciliation workflow initiated successfully');

    return {
      clientId,
      runId: runRecord.id,
      status: 'initiated',
      message: 'Reconciliation started successfully',
      retryCount
    };

  } catch (error) {
    console.error(`Reconciliation failed for client ${clientId} (attempt ${retryCount + 1}):`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Check if it's an auth error and we haven't hit max retries
    const isAuthError = errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('invalid_grant');
    
    if (isAuthError && retryCount < maxRetries) {
      console.log(`Auth error detected for client ${clientId}, retrying with fresh token...`);
      
      // Update retry count in run record
      await supabase
        .from('reconciliation_runs')
        .update({ retry_count: retryCount + 1 })
        .eq('id', runRecord.id);
        
      // Retry with incremented count
      return await processClientReconciliation(clientId, runType, retryCount + 1);
    }

    // Log the error
    await logReconciliationEvent(clientId, 'reconciliation_failed', errorMessage);

    // Update run record with error
    await supabase
      .from('reconciliation_runs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
        retry_count: retryCount
      })
      .eq('id', runRecord.id);

    throw error;
  }
}

async function logReconciliationEvent(clientId: string, eventType: string, message: string) {
  try {
    await supabase
      .from('notification_logs')
      .insert({
        client_id: clientId,
        notification_type: 'audit',
        recipient: 'system',
        subject: `Reconciliation Event: ${eventType}`,
        message: message,
        status: 'delivered'
      });
  } catch (error) {
    console.error('Failed to log reconciliation event:', error);
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