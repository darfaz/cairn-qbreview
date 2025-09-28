import { useState, useMemo, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { ClientGrid } from '@/components/dashboard/ClientGrid';
import { DebugPanel } from '@/components/dashboard/DebugPanel';
import { generateMockClients, mockSummary } from '@/data/mockClients';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hasClients, setHasClients] = useState<boolean | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [stats, setStats] = useState({
    totalClients: 0,
    completedToday: 0,
    pendingReviews: 0,
    failedReviews: 0
  });
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const { toast } = useToast();
  
  const allClients = useMemo(() => generateMockClients(105), []);

  useEffect(() => {
    checkForClients();
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get total clients
      const { count: totalClients } = await supabase
        .from('qbo_clients')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get today's reviews
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayReviews } = await supabase
        .from('review_history')
        .select('*')
        .gte('created_at', today.toISOString());

      // Get recent reviews with client info
      const { data: recent } = await supabase
        .from('review_history')
        .select(`
          *,
          client:qbo_clients(client_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      setStats({
        totalClients: totalClients || 0,
        completedToday: todayReviews?.filter(r => r.status === 'completed').length || 0,
        pendingReviews: todayReviews?.filter(r => r.status === 'processing').length || 0,
        failedReviews: todayReviews?.filter(r => r.status === 'failed').length || 0
      });

      setRecentReviews(recent || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

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
      title: 'Webhook Integration Pending',
      description: `Webhook integration is pending for ${client?.name}`,
    });
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
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
          <div className="text-center space-y-4 p-8">
            <h2 className="text-2xl font-semibold">Webhook Integration Pending</h2>
            <p className="text-muted-foreground max-w-md">
              QuickBooks integration will be available via webhook. OAuth functionality has been removed.
            </p>
          </div>
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
        {/* Review Statistics */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total QB Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClients}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completedToday}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingReviews}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Failed Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failedReviews}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reviews */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentReviews.length === 0 ? (
                <p className="text-muted-foreground">No reviews yet. Start by adding clients and running reviews.</p>
              ) : (
                recentReviews.map((review) => (
                  <div key={review.id} className="flex items-center justify-between py-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(review.status)}
                      <span className="font-medium">{review.client?.client_name || 'Unknown'}</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(review.created_at).toLocaleString()}
                      </span>
                    </div>
                    {review.sheet_url && (
                      <a 
                        href={review.sheet_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700"
                        title="Open Google Sheet"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

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
