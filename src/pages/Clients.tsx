import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { runReview as runSingleReview, runBatchReview as runBatch } from '@/lib/reviews';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Play, Plus, FileSpreadsheet, Link as LinkIcon } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ConnectQBOButton } from '@/components/qbo/ConnectQBOButton';
import { useNavigate } from 'react-router-dom';

interface QBOClient {
  id: string;
  client_name: string;
  realm_id: string;
  last_review_date: string | null;
  action_items_count: number | null;
  sheet_url: string | null;
}

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<QBOClient[]>([]);
  const [runningClients, setRunningClients] = useState<Set<string>>(new Set());
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClient, setNewClient] = useState({ client_name: '', realm_id: '' });
  const [isLoadingClients, setIsLoadingClients] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setIsLoadingClients(true);
    const { data, error } = await supabase
      .from('clients')
      .select(`
        id,
        client_name,
        realm_id,
        reviews (
          triggered_at,
          action_items_count,
          sheet_url
        )
      `)
      .order('client_name');
    
    if (error) {
      toast.error('Failed to load clients');
      console.error(error);
    } else {
      // Map the data to include the latest review info
      const mappedClients: QBOClient[] = data?.map(client => {
        const latestReview = Array.isArray(client.reviews) && client.reviews.length > 0 
          ? client.reviews[0] 
          : null;
        
        return {
          id: client.id,
          client_name: client.client_name,
          realm_id: client.realm_id,
          last_review_date: latestReview?.triggered_at || null,
          action_items_count: latestReview?.action_items_count ?? null,
          sheet_url: latestReview?.sheet_url || null,
        };
      }) || [];
      
      setClients(mappedClients);
    }
    setIsLoadingClients(false);
  };

  const addClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    const { error } = await supabase
      .from('clients')
      .insert({
        ...newClient,
        user_id: user.id
      });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Client added successfully');
      setNewClient({ client_name: '', realm_id: '' });
      setShowAddForm(false);
      fetchClients();
    }
  };

  const runReview = async (client: QBOClient) => {
    // Prevent if already running
    if (runningClients.has(client.id) || isBatchRunning) {
      toast.error('Review already in progress');
      return;
    }

    setRunningClients(prev => new Set(prev).add(client.id));
    
    try {
      await runSingleReview({
        id: client.id,
        client_name: client.client_name,
        realm_id: client.realm_id,
        sheet_url: client.sheet_url || undefined,
      });
      
      // Refresh clients list after successful review
      await fetchClients();
    } catch (error) {
      console.error('Review failed:', error);
      // Error handling is done in the review utility
    } finally {
      setRunningClients(prev => {
        const next = new Set(prev);
        next.delete(client.id);
        return next;
      });
    }
  };

  const runBatchReview = async () => {
    // Prevent if any individual reviews running
    if (runningClients.size > 0 || isBatchRunning) {
      toast.error('Wait for individual reviews to complete first');
      return;
    }

    if (!confirm(`Run review for all ${clients.length} clients? This may take some time.`)) {
      return;
    }

    setIsBatchRunning(true);
    
    try {
      await runBatch({ runAll: true });
      
      // Refresh clients list after batch review
      await fetchClients();
    } catch (error) {
      console.error('Batch review failed:', error);
      // Error handling is done in the review utility
    } finally {
      setIsBatchRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader showSearch={false} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-muted-foreground">
            Manage your clients and run reconciliation reviews via n8n integration.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/qbo-connections')}
              variant="outline"
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              QBO Connections
            </Button>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
            <Button
              onClick={runBatchReview}
              disabled={clients.length === 0 || isBatchRunning || runningClients.size > 0}
            >
              {isBatchRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                'Run All Reviews'
              )}
            </Button>
          </div>
        </div>

        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Add New Client</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addClient} className="flex gap-2">
                <Input
                  placeholder="Client Name"
                  value={newClient.client_name}
                  onChange={(e) => setNewClient({...newClient, client_name: e.target.value})}
                  required
                />
                <Input
                  placeholder="Realm ID"
                  value={newClient.realm_id}
                  onChange={(e) => setNewClient({...newClient, realm_id: e.target.value})}
                  required
                />
                <Button type="submit">Add</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoadingClients ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="text-lg font-semibold mb-2">No clients found</h3>
              <p className="text-muted-foreground mb-4">Add your first client to get started.</p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map(client => (
              <Card key={client.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{client.client_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">Realm: {client.realm_id}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {client.last_review_date && (
                      <div className="text-sm">
                        <span className="font-medium">Last Review:</span>
                        <br />
                        {new Date(client.last_review_date).toLocaleDateString()}
                      </div>
                    )}
                    {client.action_items_count !== null && (
                      <div className="text-sm">
                        <span className="font-medium">Status:</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                          client.action_items_count === 0 ? 'bg-green-100 text-green-800' :
                          client.action_items_count >= 1 && client.action_items_count <= 3 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {client.action_items_count === 0 ? 'Clean' :
                           client.action_items_count >= 1 && client.action_items_count <= 3 ? `Review (${client.action_items_count})` :
                           `Action (${client.action_items_count})`}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => runReview(client)}
                        disabled={runningClients.has(client.id) || isBatchRunning}
                        size="sm"
                        className="flex-1"
                      >
                        {runningClients.has(client.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Run Review
                          </>
                        )}
                      </Button>
                      {client.sheet_url && (
                        <Button
                          onClick={() => window.open(client.sheet_url!, '_blank')}
                          size="sm"
                          variant="outline"
                          title="Open Google Sheet"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}