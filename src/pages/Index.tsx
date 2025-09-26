import { useState, useMemo, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { ClientGrid } from '@/components/dashboard/ClientGrid';
import { QBConnectButton } from '@/components/quickbooks/QBConnectButton';
import { DebugPanel } from '@/components/dashboard/DebugPanel';
import { generateMockClients, mockSummary } from '@/data/mockClients';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hasClients, setHasClients] = useState<boolean | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const { toast } = useToast();
  
  const allClients = useMemo(() => generateMockClients(105), []);

  useEffect(() => {
    checkForClients();
  }, []);

  const checkForClients = async () => {
    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id')
        .eq('is_active', true)
        .limit(1);

      if (error) throw error;
      setHasClients(clients && clients.length > 0);
    } catch (error) {
      console.error('Error checking for clients:', error);
      // Fallback to showing mock data
      setHasClients(true);
    }
  };
  
  const filteredClients = useMemo(() => {
    if (!searchQuery) return allClients.slice(0, 20); // Show first 20 for demo
    
    return allClients.filter(client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.realmId.includes(searchQuery)
    ).slice(0, 20);
  }, [allClients, searchQuery]);

  const handleRunReconciliation = async (clientId: string) => {
    const client = allClients.find(c => c.id === clientId);
    
    try {
      const { data, error } = await supabase.functions.invoke('run-reconciliation', {
        body: { clientId, runType: 'manual' }
      });

      if (error) throw error;

      toast({
        title: 'Reconciliation Started',
        description: `Running reconciliation for ${client?.name}`,
      });
    } catch (error) {
      console.error('Reconciliation error:', error);
      toast({
        title: 'Reconciliation Failed',
        description: error instanceof Error ? error.message : 'Failed to start reconciliation',
        variant: 'destructive',
      });
    }
  };

  const handleViewHistory = (clientId: string) => {
    const client = allClients.find(c => c.id === clientId);
    toast({
      title: 'History View',
      description: `Viewing history for ${client?.name}`,
    });
  };

  const handleReconnect = (clientId: string) => {
    const client = allClients.find(c => c.id === clientId);
    toast({
      title: 'Reconnection Required',
      description: `Please reconnect QuickBooks for ${client?.name}`,
    });
  };

  // Show loading state while checking for clients
  if (hasClients === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show connect button if no clients exist
  if (!hasClients) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader
          searchQuery=""
          onSearchChange={() => {}}
        />
        
        <main className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <QBConnectButton onConnectionSuccess={checkForClients} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <main className="px-6 py-8">
        <SummaryCards summary={mockSummary} />
        
        <ClientGrid
          clients={filteredClients}
          onRunReconciliation={handleRunReconciliation}
          onViewHistory={handleViewHistory}
          onReconnect={handleReconnect}
          selectedClientIds={selectedClientIds}
          onSelectionChange={setSelectedClientIds}
        />
      </main>

      {/* Debug panel - only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <DebugPanel
          isVisible={showDebugPanel}
          onToggle={() => setShowDebugPanel(!showDebugPanel)}
        />
      )}
    </div>
  );
};

export default Index;
