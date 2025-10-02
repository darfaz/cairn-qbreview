const N8N_WEBHOOK_URL = 'https://execture.app.n8n.cloud/webhook/897a01c5-2d0b-4c22-9960-386b2c5f8da2';

export interface ClientData {
  id: string;
  client_name: string;
  realm_id: string;
  dropbox_folder_url?: string | null;
  dropbox_folder_path?: string | null;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export interface ReviewResponse {
  success: boolean;
  message?: string;
  sheetUrl?: string;
  error?: string;
}

export async function sendClientsToWebhook(clients: ClientData[]): Promise<ReviewResponse> {
  try {
    console.log('Sending clients to webhook:', clients);
    
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clients }),
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
    console.error('Failed to send clients to webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}