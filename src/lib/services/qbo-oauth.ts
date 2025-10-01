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
    const { data, error } = await supabase
      .from('qbo_tokens')
      .select('token_expires_at')
      .eq('realm_id', realmId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return { isConnected: false, isExpired: false };
    }

    const isExpired = new Date(data.token_expires_at) < new Date();
    
    return {
      isConnected: true,
      isExpired,
      expiresAt: data.token_expires_at
    };
  } catch (error) {
    console.error('Failed to check QBO connection:', error);
    return { isConnected: false, isExpired: false };
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
    const { data, error } = await supabase
      .from('clients')
      .select(`
        id,
        client_name,
        realm_id,
        created_at,
        qbo_tokens (
          token_expires_at
        )
      `);

    if (error) throw error;

    const connections: QBOConnection[] = (data || []).map((client: any) => {
      const token = Array.isArray(client.qbo_tokens) && client.qbo_tokens.length > 0 
        ? client.qbo_tokens[0] 
        : null;
      
      const isConnected = !!token;
      const isExpired = token ? new Date(token.token_expires_at) < new Date() : false;

      return {
        id: client.id,
        realm_id: client.realm_id,
        client_id: client.id,
        client_name: client.client_name,
        is_connected: isConnected,
        is_expired: isExpired,
        expires_at: token?.token_expires_at || null,
        last_synced: client.created_at
      };
    });

    return connections;
  } catch (error) {
    console.error('Failed to get connected companies:', error);
    return [];
  }
}
