import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { triggerQBReview } from '@/lib/services/n8n-webhook';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Play, Plus, FileSpreadsheet } from 'lucide-react';

interface QBOClient {
  id: string;
  client_name: string;
  realm_id: string;
  last_review_date: string | null;
  last_review_status: string | null;
  sheet_url: string | null;
  is_active: boolean;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<QBOClient[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClient, setNewClient] = useState({ client_name: '', realm_id: '' });
  const [isLoadingClients, setIsLoadingClients] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setIsLoadingClients(true);
    const { data, error } = await supabase
      .from('qbo_clients')
      .select('*')
      .eq('is_active', true)
      .order('client_name');
    
    if (error) {
      toast.error('Failed to load clients');
      console.error(error);
    } else {
      setClients(data || []);
    }
    setIsLoadingClients(false);
  };

  const addClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get the first firm ID (we're using single firm for now)
    const { data: firms } = await supabase
      .from('qbo_firms')
      .select('id')
      .limit(1);
    
    const firmId = firms?.[0]?.id;
    
    if (!firmId) {
      toast.error('No firm found. Please set up a firm first.');
      return;
    }

    const { error } = await supabase
      .from('qbo_clients')
      .insert({
        ...newClient,
        firm_id: firmId
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
    setLoading(prev => ({ ...prev, [client.id]: true }));
    
    try {
      // Record the review attempt
      const { data: review } = await supabase
        .from('review_history')
        .insert({
          client_id: client.id,
          status: 'processing'
        })
        .select()
        .single();

      // Trigger n8n webhook
      const result = await triggerQBReview({
        action: 'runReview',
        realmId: client.realm_id,
        clientName: client.client_name,
        clientId: client.id
      });

      if (result.success) {
        // Update review status
        if (review?.id) {
          await supabase
            .from('review_history')
            .update({
              status: 'completed',
              sheet_url: result.sheetUrl
            })
            .eq('id', review.id);
        }

        // Update client's last review
        await supabase
          .from('qbo_clients')
          .update({
            last_review_date: new Date().toISOString(),
            last_review_status: 'completed',
            sheet_url: result.sheetUrl
          })
          .eq('id', client.id);

        toast.success(`Review completed for ${client.client_name}`);
        fetchClients();
      } else {
        throw new Error(result.error || 'Review failed');
      }
    } catch (error) {
      toast.error(`Review failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Review failed:', error);
      
      // Update review status as failed
      const { data: review } = await supabase
        .from('review_history')
        .select('id')
        .eq('client_id', client.id)
        .eq('status', 'processing')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (review?.id) {
        await supabase
          .from('review_history')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', review.id);
      }
    } finally {
      setLoading(prev => ({ ...prev, [client.id]: false }));
    }
  };

  const runBatchReview = async () => {
    if (!confirm(`Run review for all ${clients.length} clients? This may take some time.`)) {
      return;
    }

    toast.info('Starting batch review...');
    
    const clientData = clients.map(c => ({
      realmId: c.realm_id,
      clientName: c.client_name
    }));

    try {
      const result = await triggerQBReview({
        action: 'runBatch',
        clients: clientData
      });

      if (result.success) {
        toast.success('Batch review started successfully');
      } else {
        throw new Error(result.error || 'Batch review failed');
      }
    } catch (error) {
      toast.error(`Batch review failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-semibold">QuickBooks Clients</h1>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-muted-foreground">
            Manage your QuickBooks clients and run reconciliation reviews via webhook integration.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
            <Button
              onClick={runBatchReview}
              disabled={clients.length === 0}
            >
              Run All Reviews
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
                  placeholder="QuickBooks Realm ID"
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
              <p className="text-muted-foreground mb-4">Add your first QuickBooks client to get started.</p>
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
                    {client.last_review_status && (
                      <div className="text-sm">
                        <span className="font-medium">Status:</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                          client.last_review_status === 'completed' ? 'bg-green-100 text-green-800' :
                          client.last_review_status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {client.last_review_status}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => runReview(client)}
                        disabled={loading[client.id]}
                        size="sm"
                        className="flex-1"
                      >
                        {loading[client.id] ? (
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