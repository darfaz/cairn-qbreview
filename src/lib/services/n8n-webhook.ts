const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://execture.app.n8n.cloud/webhook/qb-auto-review';

export interface ReviewRequest {
  action: 'runReview' | 'runBatch';
  realmId?: string;
  clientName?: string;
  clientId?: string;
  clients?: Array<{
    realmId: string;
    clientName: string;
  }>;
}

export interface ReviewResponse {
  success: boolean;
  message?: string;
  sheetUrl?: string;
  error?: string;
}

export async function triggerQBReview(request: ReviewRequest): Promise<ReviewResponse> {
  try {
    console.log('Triggering QBO review via edge function:', request);
    
    // Use Supabase edge function for authenticated requests
    const { supabase } = await import('@/integrations/supabase/client');
    
    if (request.action === 'runReview') {
      // Single client review through edge function
      const { data, error } = await supabase.functions.invoke('qbo-review', {
        body: {
          realmId: request.realmId,
          clientName: request.clientName,
          clientId: request.clientId, // You'll need to pass this
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        ...data.data
      };
    } else {
      // Batch review - call n8n webhook directly for now
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        ...data
      };
    }
  } catch (error) {
    console.error('Failed to trigger QBO review:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}