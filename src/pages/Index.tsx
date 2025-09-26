import { useState, useMemo } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { ClientGrid } from '@/components/dashboard/ClientGrid';
import { generateMockClients, mockSummary } from '@/data/mockClients';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  
  const allClients = useMemo(() => generateMockClients(105), []);
  
  const filteredClients = useMemo(() => {
    if (!searchQuery) return allClients.slice(0, 20); // Show first 20 for demo
    
    return allClients.filter(client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.realmId.includes(searchQuery)
    ).slice(0, 20);
  }, [allClients, searchQuery]);

  const handleRunReconciliation = (clientId: string) => {
    const client = allClients.find(c => c.id === clientId);
    toast({
      title: 'Reconciliation Started',
      description: `Running reconciliation for ${client?.name}`,
    });
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
        />
      </main>
    </div>
  );
};

export default Index;
