import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ReviewHistoryModal } from '@/components/ReviewHistoryModal';
import { Building2, ExternalLink, MoreVertical, Play, Loader2, History, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';

interface ClientWithReview {
  id: string;
  client_name: string;
  realm_id: string;
  dropbox_folder_url: string | null;
  latest_review?: {
    action_items_count: number;
    triggered_at: string;
    completed_at: string | null;
    sheet_url: string | null;
    status: string;
  } | null;
}

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [clients, setClients] = useState<ClientWithReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningReviews, setRunningReviews] = useState<Set<string>>(new Set());
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    checkAuthAndFetchData();
    
    // Subscribe to realtime updates on reviews
    const channel = supabase
      .channel('reviews-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
        fetchClients();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchClients();
    }
  }, [debouncedSearch]);

  const checkAuthAndFetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if user has a firm, create one if not
    const { data: firms, error: firmError } = await supabase
      .from('firms')
      .select('*')
      .eq('owner_id', user.id);

    if (!firms || firms.length === 0) {
      // Create default firm
      const { error: createError } = await supabase
        .from('firms')
        .insert({
          name: 'My Firm',
          owner_id: user.id,
          email: user.email
        });

      if (createError) {
        console.error('Error creating firm:', createError);
      }
    }

    fetchClients();
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('clients')
        .select('id, client_name, realm_id, dropbox_folder_url, is_active')
        .eq('is_active', true)
        .order('client_name');

      if (debouncedSearch) {
        query = query.or(`client_name.ilike.%${debouncedSearch}%,realm_id.ilike.%${debouncedSearch}%`);
      }

      const { data: clientsData, error: clientsError } = await query;

      if (clientsError) throw clientsError;

      if (!clientsData || clientsData.length === 0) {
        setClients([]);
        setLoading(false);
        return;
      }

      // Fetch latest review for each client
      const clientIds = clientsData.map(c => c.id);
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*')
        .in('client_id', clientIds)
        .order('triggered_at', { ascending: false });

      const clientsWithReviews: ClientWithReview[] = clientsData.map(client => {
        const clientReviews = reviewsData?.filter(r => r.client_id === client.id) || [];
        const latestReview = clientReviews[0] || null;

        return {
          ...client,
          latest_review: latestReview ? {
            action_items_count: latestReview.action_items_count || 0,
            triggered_at: latestReview.triggered_at,
            completed_at: latestReview.completed_at,
            sheet_url: latestReview.sheet_url,
            status: latestReview.status
          } : null
        };
      });

      setClients(clientsWithReviews);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const runReview = async (client: ClientWithReview) => {
    if (runningReviews.has(client.id)) return;

    setRunningReviews(prev => new Set(prev).add(client.id));
    
    try {
      const { data, error } = await supabase.functions.invoke('trigger-review', {
        body: { client_id: client.id }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to trigger review');

      toast.success(`Review started for ${client.client_name}`);
      fetchClients();
    } catch (error: any) {
      console.error('Error starting review:', error);
      toast.error(error.message || 'Failed to start review');
    } finally {
      setRunningReviews(prev => {
        const next = new Set(prev);
        next.delete(client.id);
        return next;
      });
    }
  };

  const getStatusIndicator = (review: ClientWithReview['latest_review']) => {
    if (!review) return null;

    if (review.status === 'processing') {
      return (
        <span className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          Processing...
        </span>
      );
    }

    if (review.status === 'failed') {
      return <span className="text-sm text-muted-foreground">Failed</span>;
    }

    if (review.status === 'completed') {
      const count = review.action_items_count;
      let color = 'text-green-600';
      if (count > 3) color = 'text-red-600';
      else if (count > 0) color = 'text-yellow-600';

      return (
        <span className={`flex items-center gap-2 text-sm font-medium ${color}`}>
          <span className={`h-2 w-2 rounded-full ${count === 0 ? 'bg-green-600' : count <= 3 ? 'bg-yellow-600' : 'bg-red-600'}`} />
          {count}
        </span>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (clients.length === 0 && !debouncedSearch) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">C</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold">Cairn Accounting</h1>
              <p className="text-sm text-muted-foreground">QuickBooks Review Management</p>
            </div>
          </div>
        </header>

        <main className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
          <div className="text-center space-y-6 p-8 max-w-md">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">No clients yet</h2>
            <p className="text-muted-foreground">
              Upload your CSV in Settings to import QuickBooks clients and start running reviews.
            </p>
            <Button onClick={() => navigate('/settings')} size="lg">
              Go to Settings
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">C</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold">Cairn Accounting</h1>
              <p className="text-sm text-muted-foreground">QuickBooks Review Management</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/settings')}>
            Settings
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Client Reconciliations</h1>
          <p className="text-muted-foreground">Monitor and manage QuickBooks reconciliation reviews</p>
        </div>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client name or Realm ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Dropbox</TableHead>
                <TableHead>Last Review</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{client.client_name}</div>
                      <div className="text-sm text-muted-foreground">{client.realm_id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.dropbox_folder_url ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(client.dropbox_folder_url!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" disabled>
                        No link
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.latest_review ? (
                      <div className="text-sm">
                        {format(new Date(client.latest_review.triggered_at), 'MMM dd, yyyy hh:mm a')}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusIndicator(client.latest_review)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => runReview(client)}
                        disabled={runningReviews.has(client.id)}
                      >
                        {runningReviews.has(client.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Run
                          </>
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedClient({ id: client.id, name: client.client_name });
                              setHistoryModalOpen(true);
                            }}
                          >
                            <History className="h-4 w-4 mr-2" />
                            View History
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>

      {selectedClient && (
        <ReviewHistoryModal
          clientId={selectedClient.id}
          clientName={selectedClient.name}
          open={historyModalOpen}
          onOpenChange={setHistoryModalOpen}
        />
      )}
    </div>
  );
};

export default Index;
