import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useTokenRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const refreshConnection = async (connectionId: string) => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('quickbooks-token-refresh', {
        body: { connectionId }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Connection Refreshed",
          description: "QuickBooks connection tokens have been refreshed successfully.",
        });
        return { success: true };
      } else {
        throw new Error(data.error || 'Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : 'Failed to refresh connection',
        variant: "destructive",
      });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshAllTokens = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('quickbooks-token-refresh');

      if (error) throw error;

      toast({
        title: "Batch Refresh Complete",
        description: `Refreshed ${data.refreshed} connections, ${data.failed} failed.`,
      });

      return { success: true, data };
    } catch (error) {
      console.error('Batch refresh error:', error);
      toast({
        title: "Batch Refresh Failed",
        description: error instanceof Error ? error.message : 'Failed to refresh connections',
        variant: "destructive",
      });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      setIsRefreshing(false);
    }
  };

  const runHealthCheck = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('quickbooks-health-check');

      if (error) throw error;

      toast({
        title: "Health Check Complete",
        description: `${data.healthy} healthy, ${data.disconnected} need reconnection.`,
      });

      return { success: true, data };
    } catch (error) {
      console.error('Health check error:', error);
      toast({
        title: "Health Check Failed",
        description: error instanceof Error ? error.message : 'Health check failed',
        variant: "destructive",
      });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  return {
    refreshConnection,
    refreshAllTokens,
    runHealthCheck,
    isRefreshing
  };
}