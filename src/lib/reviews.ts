import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sendClientsToWebhook, ClientData } from './services/n8n-webhook';

export interface ReviewResult {
  clientId: string;
  success: boolean;
  reviewId?: string;
  error?: string;
}

async function fetchClientData(clientId: string): Promise<ClientData | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();
  
  if (error) {
    console.error('Failed to fetch client data:', error);
    return null;
  }
  
  return data;
}

async function fetchMultipleClientsData(clientIds: string[]): Promise<ClientData[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .in('id', clientIds);
  
  if (error) {
    console.error('Failed to fetch clients data:', error);
    return [];
  }
  
  return data || [];
}

// New unified trigger functions
export async function triggerReview(clientId: string) {
  // Fetch full client data
  const clientData = await fetchClientData(clientId);
  
  if (!clientData) {
    throw new Error('Failed to fetch client data');
  }
  
  // Send to webhook as a list with single item
  const result = await sendClientsToWebhook([clientData]);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to trigger review');
  }
  
  return result;
}

export async function triggerBulkReviews(clientIds: string[]): Promise<ReviewResult[]> {
  try {
    // Fetch all client data at once
    const clientsData = await fetchMultipleClientsData(clientIds);
    
    if (clientsData.length === 0) {
      throw new Error('No client data found');
    }
    
    // Send all clients to webhook in one request
    const result = await sendClientsToWebhook(clientsData);
    
    if (!result.success) {
      // If failed, return failure for all
      return clientIds.map(clientId => ({
        clientId,
        success: false,
        error: result.error || 'Failed to trigger reviews'
      }));
    }
    
    // If successful, return success for all
    return clientIds.map(clientId => ({
      clientId,
      success: true
    }));
  } catch (error: any) {
    console.error('Failed to trigger bulk reviews:', error);
    return clientIds.map(clientId => ({
      clientId,
      success: false,
      error: error.message
    }));
  }
}

// Legacy exports for backwards compatibility
export interface Client {
  id: string;
  client_name: string;
  realm_id: string;
  sheet_url?: string;
}

export const runReview = async (client: Client) => {
  try {
    await triggerReview(client.id);
    toast.success(`Review started for ${client.client_name}`);
  } catch (error: any) {
    console.error('Review error:', error);
    const errorMessage = error.message || 'Failed to run review';
    toast.error(errorMessage);
    throw error;
  }
};

export const runBatchReview = async (options: {
  clientIds?: string[];
  runAll?: boolean;
}) => {
  try {
    // Get all client IDs if runAll is true
    let clientIds = options.clientIds || [];
    
    if (options.runAll && clientIds.length === 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id);
      
      clientIds = clients?.map(c => c.id) || [];
    }
    
    const results = await triggerBulkReviews(clientIds);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    if (failCount === 0) {
      toast.success(`Successfully started ${successCount} reviews`);
    } else {
      toast.warning(`Started ${successCount} reviews, ${failCount} failed`);
    }
    
    return { success: true, results };
  } catch (error: any) {
    console.error('Batch review error:', error);
    const errorMessage = error.message || 'Failed to run batch review';
    toast.error(errorMessage);
    throw error;
  }
};
