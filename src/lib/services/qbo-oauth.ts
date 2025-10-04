import { supabase } from '@/integrations/supabase/client';

const N8N_OAUTH_WEBHOOK = 'https://execture.app.n8n.cloud/webhook/qbo-oauth-callback';

export interface QBOConnection {
  id: string;
  realm_id: string;
  client_id: string;
  client_name: string;
  is_connected: boolean;
  is_expired: boolean;
  expires_at: string | null;
  last_synced: string | null;
}

/**
 * Initiates QuickBooks OAuth flow for a client
 */
export async function initiateQBOAuth(clientId: string, clientName: string, realmId: string) {
  try {
    // Store state in localStorage to verify callback
    const state = crypto.randomUUID();
    localStorage.setItem('qbo_oauth_state', JSON.stringify({
      clientId,
      clientName,
      realmId,
      state,
      timestamp: Date.now()
    }));

    // Build OAuth URL that redirects to n8n
    const params = new URLSearchParams({
      clientId,
      clientName,
      realmId,
      state,
      returnUrl: `${window.location.origin}/#/qbo-callback`
    });

    // Open OAuth popup
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      `${N8N_OAUTH_WEBHOOK}?${params.toString()}`,
      'QuickBooks OAuth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    return { success: true, popup };
  } catch (error) {
    console.error('Failed to initiate QBO OAuth:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Checks if a QuickBooks connection is valid and not expired
 */
export async function checkQBOConnection(realmId: string): Promise<{
  isConnected: boolean;
  isExpired: boolean;
  expiresAt?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // First get the client for this realm_id
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('realm_id', realmId)
      .eq('user_id', user.id)
      .single();

    if (!client) {
      return { isConnected: false, isExpired: false };
    }

    // Use secure function to check connection status without exposing tokens
    const { data: connectionInfo, error } = await supabase
      .rpc('get_qbo_connection_info', { p_realm_id: realmId })
      .single();

    if (error || !connectionInfo) {
      return { isConnected: false, isExpired: false };
    }

    return {
      isConnected: connectionInfo.is_connected,
      isExpired: connectionInfo.is_expired,
      expiresAt: connectionInfo.expires_at,
    };
  } catch (error) {
    console.error('Error checking QBO connection:', error);
    return { isConnected: false, isExpired: false };
  }
}

/**
 * Helper function to check connection status for a client ID
 */
export async function checkClientQBOConnection(clientId: string): Promise<'connected' | 'disconnected'> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return 'disconnected';
    }

    // Get client's realm_id
    const { data: client } = await supabase
      .from('clients')
      .select('realm_id')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    if (!client) {
      return 'disconnected';
    }

    // Use secure function to check connection status
    const { data: connectionInfo, error } = await supabase
      .rpc('get_qbo_connection_info', { p_realm_id: client.realm_id })
      .single();

    if (error || !connectionInfo || !connectionInfo.is_connected) {
      return 'disconnected';
    }

    return connectionInfo.is_expired ? 'disconnected' : 'connected';
  } catch (error) {
    console.error('Error checking client QBO connection:', error);
    return 'disconnected';
  }
}

/**
 * Disconnects a QuickBooks company by removing its tokens
 */
export async function disconnectQBO(realmId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from('qbo_tokens')
      .delete()
      .eq('realm_id', realmId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Failed to disconnect QBO:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Gets all connected QuickBooks companies for the current user
 */
export async function getConnectedCompanies(): Promise<QBOConnection[]> {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, client_name, realm_id, created_at');

    if (error) throw error;

    // For each client, check connection status using secure function
    const connections: QBOConnection[] = await Promise.all(
      (clients || []).map(async (client) => {
        const { data: connectionInfo } = await supabase
          .rpc('get_qbo_connection_info', { p_realm_id: client.realm_id })
          .single();
        
        const isConnected = connectionInfo?.is_connected ?? false;
        const isExpired = connectionInfo?.is_expired ?? false;

        return {
          id: client.id,
          realm_id: client.realm_id,
          client_id: client.id,
          client_name: client.client_name,
          is_connected: isConnected,
          is_expired: isExpired,
          expires_at: connectionInfo?.expires_at || null,
          last_synced: client.created_at
        };
      })
    );

    return connections;
  } catch (error) {
    console.error('Failed to get connected companies:', error);
    return [];
  }
}
