import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ClientReconciliationTable } from '@/components/dashboard/ClientReconciliationTable';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';

interface ClientWithReview {
  id: string;
  name: string;
  client_name: string;
  realm_id: string;
  connection_status: string | null;
  dropbox_folder_url: string | null;
  latest_review?: {
    action_items_count: number;
    run_date: string;
    sheet_url: string | null;
    status: string;
  } | null;
}

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [hasClients, setHasClients] = useState<boolean | null>(null);
  const [clients, setClients] = useState<ClientWithReview[]>([]);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          client_name,
          realm_id,
          dropbox_folder_url,
          qbo_connections(connection_status)
        `)
        .order('client_name');

      if (error) throw error;

      if (!data || data.length === 0) {
        setHasClients(false);
        setClients([]);
        return;
      }

      // Fetch all reviews for these clients
      const clientIds = data.map(c => c.id);
      const reviewsResponse = await supabase
        .from('reviews')
        .select('id, client_id, action_items_count, triggered_at, sheet_url, status')
        .in('client_id', clientIds)
        .order('triggered_at', { ascending: false });
      
      const allReviews = reviewsResponse.data || [];

      // Match each client with their latest review
      const clientsWithReviews: ClientWithReview[] = data.map((client) => {
        const clientReviews = allReviews.filter((r) => r.client_id === client.id) || [];
        const latestReview = clientReviews.length > 0 ? clientReviews[0] : null;
        const qboConnection = Array.isArray(client.qbo_connections) ? client.qbo_connections[0] : client.qbo_connections;

        return {
          id: client.id,
          name: client.client_name,
          client_name: client.client_name,
          realm_id: client.realm_id,
          connection_status: qboConnection?.connection_status || null,
          dropbox_folder_url: client.dropbox_folder_url,
          latest_review: latestReview ? {
            action_items_count: latestReview.action_items_count || 0,
            run_date: latestReview.triggered_at || '',
            sheet_url: latestReview.sheet_url || null,
            status: latestReview.status || 'unknown',
          } : null,
        };
      });

      setClients(clientsWithReviews);
      setHasClients(true);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setHasClients(false);
      setClients([]);
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

  // Show getting started message if no clients exist
  if (!hasClients) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader
          searchQuery=""
          onSearchChange={() => {}}
        />
        
        <main className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center space-y-6 p-8 max-w-md">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">Welcome to Cairn Accounting</h2>
            <p className="text-muted-foreground">
              Get started by adding your first QuickBooks client to begin automated reconciliation reviews.
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
      />
      
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Client Reconciliations</h1>
          <p className="text-muted-foreground">
            Monitor and manage QuickBooks reconciliation status for all clients
          </p>
        </div>

        <ClientReconciliationTable clients={clients} onRefresh={fetchClients} />
      </main>
    </div>
  );
};

export default Index;
