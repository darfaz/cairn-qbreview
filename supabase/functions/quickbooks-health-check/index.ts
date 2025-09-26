import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResult {
  clientId: string;
  realmId: string;
  status: 'healthy' | 'needs_reconnect' | 'error';
  lastSyncAt?: string;
  error?: string;
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

    console.log('Starting QuickBooks connection health check...');
    
    // Get all active connections
    const { data: connections, error } = await supabase
      .from('qbo_connections')
      .select(`
        id,
        client_id,
        realm_id,
        access_token,
        connection_status,
        profiles!inner(intuit_client_id, intuit_client_secret)
      `)
      .eq('connection_status', 'connected');

    if (error) {
      console.error('Error fetching connections:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch connections' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${connections?.length || 0} connections to check`);

    const results: HealthCheckResult[] = [];
    let healthyCount = 0;
    let disconnectedCount = 0;

    for (const connection of connections || []) {
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await checkConnectionHealth(supabase, connection);
      results.push(result);
      
      if (result.status === 'healthy') {
        healthyCount++;
      } else if (result.status === 'needs_reconnect') {
        disconnectedCount++;
      }
    }

    // Send notification if any companies are disconnected
    if (disconnectedCount > 0) {
      await sendDisconnectionNotification(supabase, disconnectedCount, results.filter(r => r.status === 'needs_reconnect'));
    }

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      totalChecked: connections?.length || 0,
      healthy: healthyCount,
      disconnected: disconnectedCount,
      errors: results.filter(r => r.status === 'error').length,
      results
    };

    console.log('Health check completed:', summary);

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ error: 'Health check failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function checkConnectionHealth(supabase: any, connection: any): Promise<HealthCheckResult> {
  const { client_id, realm_id, access_token, profiles } = connection;
  
  try {
    // Decrypt access token
    const decryptedToken = await decryptToken(access_token);
    
    // Call QuickBooks CompanyInfo endpoint to test connection
    const companyInfoUrl = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realm_id}/companyinfo/${realm_id}`;
    
    const response = await fetch(companyInfoUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${decryptedToken}`,
        'Accept': 'application/json'
      }
    });

    const now = new Date().toISOString();

    if (response.ok) {
      // Connection is healthy, update last sync time
      await supabase
        .from('clients')
        .update({
          last_sync_at: now,
          connection_status: 'connected',
          updated_at: now
        })
        .eq('id', client_id);

      await logHealthEvent(supabase, client_id, 'health_check_passed', 'Connection is healthy');

      return {
        clientId: client_id,
        realmId: realm_id,
        status: 'healthy',
        lastSyncAt: now
      };

    } else if (response.status === 401) {
      // Unauthorized - token is invalid, needs reconnection
      console.log(`Connection ${client_id} needs reconnection (401)`);
      
      await supabase
        .from('qbo_connections')
        .update({
          connection_status: 'needs_reconnect',
          updated_at: now
        })
        .eq('client_id', client_id);

      await supabase
        .from('clients')
        .update({
          connection_status: 'needs_reconnect',
          updated_at: now
        })
        .eq('id', client_id);

      await logHealthEvent(supabase, client_id, 'health_check_failed', '401 Unauthorized - Token invalid');

      return {
        clientId: client_id,
        realmId: realm_id,
        status: 'needs_reconnect',
        error: '401 Unauthorized'
      };

    } else {
      // Other error
      const errorText = await response.text();
      console.log(`Connection ${client_id} health check failed:`, response.status, errorText);
      
      await logHealthEvent(supabase, client_id, 'health_check_error', `HTTP ${response.status}: ${errorText}`);

      return {
        clientId: client_id,
        realmId: realm_id,
        status: 'error',
        error: `HTTP ${response.status}: ${errorText}`
      };
    }

  } catch (error) {
    console.error(`Health check error for client ${client_id}:`, error);
    
    await logHealthEvent(supabase, client_id, 'health_check_error', error.message);
    
    return {
      clientId: client_id,
      realmId: realm_id,
      status: 'error',
      error: error.message
    };
  }
}

async function sendDisconnectionNotification(supabase: any, disconnectedCount: number, disconnectedConnections: HealthCheckResult[]) {
  try {
    const message = `Health check detected ${disconnectedCount} disconnected QuickBooks companies that need reconnection:\n` +
      disconnectedConnections.map(c => `- Client ${c.clientId} (Realm: ${c.realmId})`).join('\n');

    await supabase
      .from('notification_logs')
      .insert({
        notification_type: 'alert',
        recipient: 'admin',
        subject: `${disconnectedCount} QuickBooks Companies Need Reconnection`,
        message: message,
        status: 'pending'
      });

    console.log('Disconnection notification sent');
  } catch (error) {
    console.error('Failed to send disconnection notification:', error);
  }
}

async function logHealthEvent(supabase: any, clientId: string, eventType: string, message: string) {
  try {
    await supabase
      .from('notification_logs')
      .insert({
        client_id: clientId,
        notification_type: 'audit',
        recipient: 'system',
        subject: `Health Check: ${eventType}`,
        message: message,
        status: 'delivered'
      });
  } catch (error) {
    console.error('Failed to log health event:', error);
  }
}

// Simple decryption - matches the encryption in token refresh function
async function decryptToken(encryptedToken: string): Promise<string> {
  // For simplicity, just return base64 decoded token (in production, implement proper decryption)
  return atob(encryptedToken);
}
