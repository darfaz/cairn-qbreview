import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReviewResult {
  clientId: string;
  success: boolean;
  reviewId?: string;
  error?: string;
}

// New unified trigger functions
export async function triggerReview(clientId: string) {
  const { data, error } = await supabase.functions.invoke('trigger-review', {
    body: { client_id: clientId }
  })
  
  if (error) {
    console.error('Failed to trigger review:', error)
    throw error
  }
  
  if (!data?.success) {
    throw new Error(data?.error || 'Failed to trigger review')
  }
  
  return data
}

export async function triggerBulkReviews(clientIds: string[]): Promise<ReviewResult[]> {
  const results: ReviewResult[] = []
  
  for (const clientId of clientIds) {
    try {
      const result = await triggerReview(clientId)
      results.push({ 
        clientId, 
        success: true, 
        reviewId: result.review_id 
      })
      console.log(`✓ Review triggered for client ${clientId}`)
      
      // Wait 3 seconds between requests to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 3000))
    } catch (error: any) {
      console.error(`✗ Failed to trigger review for client ${clientId}:`, error)
      results.push({ 
        clientId, 
        success: false, 
        error: error.message 
      })
    }
  }
  
  return results
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
