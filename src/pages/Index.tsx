import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { BulkReconciliationControls } from '@/components/dashboard/BulkReconciliationControls';
import { ClientGrid } from '@/components/dashboard/ClientGrid';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Search } from 'lucide-react';
import { Client, DashboardSummary } from '@/types/dashboard';
import { useToast } from '@/hooks/use-toast';

interface ClientWithReview {
  id: string;
  client_name: string;
  realm_id: string;
  dropbox_folder_url: string | null;
  last_review_date: string | null;
  review_status: string | null;
  action_items_count: number | null;
}

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [hasClients, setHasClients] = useState<boolean | null>(null);
  const [clients, setClients] = useState<ClientWithReview[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setError(null); // Clear previous errors
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasClients(false);
        return;
      }

      // Fetch clients directly for the logged-in user
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          client_name,
          realm_id,
          dropbox_folder_url
        `)
        .eq('user_id', user.id)
        .order('client_name');

      if (error) throw error;

      if (!data || data.length === 0) {
        setHasClients(false);
        setClients([]);
        return;
      }

      // Fetch latest review for each client
      const clientIds = data.map(c => c.id);
      const { data: reviews } = await supabase
        .from('reviews')
        .select('client_id, triggered_at, status, action_items_count')
        .in('client_id', clientIds)
        .order('triggered_at', { ascending: false });

      // Group reviews by client_id and get the latest one
      const latestReviewsByClient = new Map();
      reviews?.forEach(review => {
        if (!latestReviewsByClient.has(review.client_id)) {
          latestReviewsByClient.set(review.client_id, review);
        }
      });

      // Map clients with their latest review
      const clientsWithReviews: ClientWithReview[] = data.map((client) => {
        const latestReview = latestReviewsByClient.get(client.id);
        
        return {
          id: client.id,
          client_name: client.client_name,
          realm_id: client.realm_id,
          dropbox_folder_url: client.dropbox_folder_url,
          last_review_date: latestReview?.triggered_at || null,
          review_status: latestReview?.status || null,
          action_items_count: latestReview?.action_items_count ?? null,
        };
      });

      setClients(clientsWithReviews);
      setHasClients(true);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setError(error instanceof Error ? error.message : 'Failed to load clients');
      setHasClients(false);
      setClients([]);
    }
  };

  // Helper function - defined before useMemo calls
  const getStatusFromActionItems = (count: number | null): 'green' | 'yellow' | 'red' => {
    if (count === null || count === 0) return 'green';
    if (count >= 1 && count <= 3) return 'yellow';
    return 'red';
  };

  // Convert ClientWithReview to Client type for components
  const displayClients: Client[] = useMemo(() => {
    if (!clients || clients.length === 0) return [];
    
    return clients.map(client => ({
      id: client.id,
      name: client.client_name,
      realmId: client.realm_id,
      qboCompanyName: client.client_name,
      lastReviewDate: client.last_review_date ? new Date(client.last_review_date) : new Date(),
      status: getStatusFromActionItems(client.action_items_count),
      actionItemsCount: client.action_items_count ?? 0,
      connectionStatus: client.review_status === 'failed' ? 'needs_reconnect' : 'connected',
      dropboxFolderUrl: client.dropbox_folder_url || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }, [clients]);

  // Filter clients based on search query and status
  const filteredClients = useMemo(() => {
    let filtered = displayClients;
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => client.status === statusFilter);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client => 
        client.name.toLowerCase().includes(query) ||
        client.realmId.toLowerCase().includes(query) ||
        client.qboCompanyName.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [displayClients, searchQuery, statusFilter]);

  // Calculate summary statistics
  const summary: DashboardSummary = useMemo(() => {
    if (!clients || clients.length === 0) {
      return {
        totalClients: 0,
        greenClients: 0,
        yellowClients: 0,
        redClients: 0,
        disconnectedClients: 0,
        nextScheduledRun: new Date(),
      };
    }

    const total = clients.length;
    const greenClients = clients.filter(c => c.action_items_count === 0).length;
    const yellowClients = clients.filter(c => c.action_items_count && c.action_items_count >= 1 && c.action_items_count <= 3).length;
    const redClients = clients.filter(c => c.action_items_count && c.action_items_count >= 4).length;
    const disconnectedClients = clients.filter(c => c.review_status === 'failed').length;

    return {
      totalClients: total,
      greenClients,
      yellowClients,
      redClients,
      disconnectedClients,
      nextScheduledRun: new Date(),
    };
  }, [clients]);

  const handleRunReconciliation = async (clientId: string) => {
    try {
      const { triggerReview } = await import('@/lib/reviews');
      
      toast({
        title: 'Starting Review',
        description: 'Initiating review process...',
      });

      await triggerReview(clientId);
      
      toast({
        title: 'Review Started',
        description: 'The review is now processing. This may take a few minutes.',
      });

      // Refresh the client data after a short delay
      setTimeout(() => {
        fetchClients();
      }, 2000);
    } catch (error: any) {
      console.error('Failed to run review:', error);
      toast({
        title: 'Failed to Start Review',
        description: error.message || 'An error occurred while starting the review.',
        variant: 'destructive',
      });
    }
  };

  const handleViewHistory = (clientId: string) => {
    toast({
      title: 'View History',
      description: 'Opening review history for this client.',
    });
    // TODO: Implement history view
  };

  const handleReconnect = (clientId: string) => {
    toast({
      title: 'Review Required',
      description: 'Please review this client.',
    });
    // TODO: Implement reconnection logic
  };


  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader searchQuery="" onSearchChange={() => {}} statusFilter="all" onStatusFilterChange={() => {}} />
        <main className="container mx-auto px-6 py-8">
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
            <p className="font-semibold">Error loading dashboard</p>
            <p className="text-sm">{error}</p>
            <Button 
              onClick={() => {
                setError(null);
                fetchClients();
              }} 
              className="mt-4"
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Show loading state while checking for clients
  if (hasClients === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show getting started message if no clients exist
  if (!hasClients) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader
          searchQuery=""
          onSearchChange={() => {}}
          statusFilter="all"
          onStatusFilterChange={() => {}}
        />
        
        <main className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center space-y-6 p-8 max-w-md">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">Welcome to Cairn Accounting</h2>
            <p className="text-muted-foreground">
              Get started by adding your first client to begin automated reconciliation reviews.
            </p>
            <Button onClick={() => navigate('/clients')} size="lg">
              Add Your First Client
            </Button>
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
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />
      
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Client Reconciliations</h1>
          <p className="text-muted-foreground">
            Monitor and manage reconciliation status for all clients
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <SummaryCards summary={summary} />
        
        {/* Bulk Reconciliation Controls */}
        <div className="mb-8">
          <BulkReconciliationControls
            selectedClientIds={selectedClientIds}
            onSelectionChange={setSelectedClientIds}
            totalClients={filteredClients.length}
            allClientIds={filteredClients.map(c => c.id)}
          />
        </div>

        {/* Client Grid */}
        <ClientGrid
          clients={filteredClients}
          onRunReconciliation={handleRunReconciliation}
          onViewHistory={handleViewHistory}
          onReconnect={handleReconnect}
          selectedClientIds={selectedClientIds}
          onSelectionChange={setSelectedClientIds}
        />
      </main>
    </div>
  );
};

export default Index;
