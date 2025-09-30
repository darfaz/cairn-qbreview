import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useBulkReconciliation() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const { toast } = useToast();

  const runBulkReconciliation = async (clientIds: string[]) => {
    setIsRunning(true);
    setProgress({ completed: 0, total: clientIds.length });

    try {
      const { data, error } = await supabase.functions.invoke('run-reconciliation', {
        body: { 
          runType: 'bulk',
          clientIds 
        }
      });

      if (error) throw error;

      toast({
        title: "Bulk Reconciliation Started",
        description: `Processing ${clientIds.length} companies. You'll be notified when complete.`,
      });

      // Start polling for progress updates
      pollProgress(clientIds);

      return { success: true, data };
    } catch (error) {
      console.error('Bulk reconciliation error:', error);
      toast({
        title: "Reconciliation Failed",
        description: error instanceof Error ? error.message : 'Failed to start bulk reconciliation',
        variant: "destructive",
      });
      setIsRunning(false);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const pollProgress = async (clientIds: string[]) => {
    const pollInterval = setInterval(async () => {
      try {
        // Check reconciliation_runs for completion status
        const { data: runs, error } = await supabase
          .from('reconciliation_runs')
          .select('id, client_id, status')
          .in('client_id', clientIds)
          .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()); // Last 10 minutes

        if (error) throw error;

        const completedRuns = runs?.filter(run => 
          run.status === 'completed' || run.status === 'failed'
        ) || [];

        setProgress({ 
          completed: completedRuns.length, 
          total: clientIds.length 
        });

        // Stop polling when all are complete
        if (completedRuns.length >= clientIds.length) {
          clearInterval(pollInterval);
          setIsRunning(false);
          
          const successCount = runs?.filter(run => run.status === 'completed').length || 0;
          const failureCount = runs?.filter(run => run.status === 'failed').length || 0;

          toast({
            title: "Bulk Reconciliation Complete",
            description: `${successCount} successful, ${failureCount} failed`,
          });
        }
      } catch (error) {
        console.error('Progress polling error:', error);
        clearInterval(pollInterval);
        setIsRunning(false);
      }
    }, 5000); // Poll every 5 seconds

    // Stop polling after 30 minutes max
    setTimeout(() => {
      clearInterval(pollInterval);
      if (isRunning) {
        setIsRunning(false);
        toast({
          title: "Reconciliation Timeout",
          description: "Some reconciliations may still be running. Check individual client status.",
          variant: "destructive",
        });
      }
    }, 30 * 60 * 1000);
  };

  const runAllReconciliations = async () => {
    try {
      // Get all connected clients
      const { data: clients, error } = await supabase
        .from('clients')
        .select(`
          id,
          qbo_connections!inner(connection_status)
        `);

      if (error) throw error;

      // Filter for connected clients only
      const connectedClients = clients?.filter(
        (client: any) => client.qbo_connections?.connection_status === 'connected'
      ) || [];

      if (connectedClients.length === 0) {
        toast({
          title: "No Connected Clients",
          description: "No active connected clients found to reconcile.",
          variant: "destructive",
        });
        return { success: false, error: 'No connected clients' };
      }

      const clientIds = connectedClients.map((client: any) => client.id);
      return await runBulkReconciliation(clientIds);
    } catch (error) {
      console.error('Run all reconciliations error:', error);
      toast({
        title: "Failed to Run All Reconciliations",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  return {
    runBulkReconciliation,
    runAllReconciliations,
    isRunning,
    progress
  };
}