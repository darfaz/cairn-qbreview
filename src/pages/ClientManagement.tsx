import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { ClientManagementHeader } from '@/components/client-management/ClientManagementHeader';
import { ClientTable } from '@/components/client-management/ClientTable';
import { AddClientDialog } from '@/components/client-management/AddClientDialog';
import { CSVUploadDialog } from '@/components/client-management/CSVUploadDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Client {
  id: string;
  client_name: string;
  realm_id: string;
  connection_status: string;
  last_sync_at: string | null;
  created_at: string;
  qbo_company_name: string | null;
  status: string;
}

export default function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', user.id)
        .single();

      if (!profile?.firm_id) return;

      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          client_name,
          realm_id,
          connection_status,
          last_sync_at,
          created_at,
          qbo_company_name,
          status
        `)
        .eq('firm_id', profile.firm_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Failed to fetch clients",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setClients(data || []);
    } catch (error) {
      toast({
        title: "Unexpected error",
        description: "Failed to load clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleClientAdded = () => {
    fetchClients();
  };

  const handleUploadComplete = () => {
    fetchClients();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <ClientManagementHeader
        totalClients={clients.length}
        onAddClient={() => setAddDialogOpen(true)}
        onBulkUpload={() => setUploadDialogOpen(true)}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients by name, Realm ID, or company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <ClientTable clients={clients} searchQuery={searchQuery} />

      <AddClientDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onClientAdded={handleClientAdded}
      />

      <CSVUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}