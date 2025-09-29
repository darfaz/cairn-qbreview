import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Client {
  id: string;
  client_name: string;
  realm_id: string;
  sheet_url?: string;
}

export const runReview = async (client: Client) => {
  try {
    const { data, error } = await supabase.functions.invoke('run-review', {
      body: {
        realmId: client.realm_id,
        clientName: client.client_name,
        sheetUrl: client.sheet_url,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Failed to invoke Edge Function');
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Review failed');
    }

    toast.success(`Review completed for ${client.client_name}`);
    return data;
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
    const { data, error } = await supabase.functions.invoke('run-batch-review', {
      body: options,
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Failed to invoke Edge Function');
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Batch review failed');
    }

    toast.success(data.message || 'Batch review completed');
    return data;
  } catch (error: any) {
    console.error('Batch review error:', error);
    const errorMessage = error.message || 'Failed to run batch review';
    toast.error(errorMessage);
    throw error;
  }
};
