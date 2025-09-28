const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://execture.app.n8n.cloud/webhook/qb-auto-review';

export interface ReviewRequest {
  action: 'runReview' | 'runBatch';
  realmId?: string;
  clientName?: string;
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
    console.log('Triggering n8n webhook:', request);
    
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
  } catch (error) {
    console.error('Failed to trigger n8n webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}