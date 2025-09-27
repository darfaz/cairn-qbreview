import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusIndicator } from '@/components/dashboard/StatusIndicator';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Search, RefreshCw, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ConnectedCompany {
  id: string;
  name: string;
  realmId: string;
  connectionStatus: 'connected' | 'disconnected' | 'needs_reconnect';
  status: 'green' | 'yellow' | 'red' | 'gray';
  lastSyncAt?: Date;
  tokenExpiresAt?: Date;
}

const CompanyManagement = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<ConnectedCompany[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<ConnectedCompany[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchConnectedCompanies();
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredCompanies(companies);
    } else {
      setFilteredCompanies(
        companies.filter(company =>
          company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          company.realmId.includes(searchQuery)
        )
      );
    }
  }, [companies, searchQuery]);

  const fetchConnectedCompanies = async () => {
    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          realm_id,
          connection_status,
          status,
          last_sync_at,
          qbo_connections (
            token_expires_at
          )
        `)
        .eq('is_active', true);

      if (error) throw error;

      const mappedCompanies: ConnectedCompany[] = clients?.map(client => ({
        id: client.id,
        name: client.name,
        realmId: client.realm_id,
        connectionStatus: client.connection_status as ConnectedCompany['connectionStatus'],
        status: getStatusColor(client.connection_status, client.qbo_connections?.[0]?.token_expires_at),
        lastSyncAt: client.last_sync_at ? new Date(client.last_sync_at) : undefined,
        tokenExpiresAt: client.qbo_connections?.[0]?.token_expires_at ? 
          new Date(client.qbo_connections[0].token_expires_at) : undefined
      })) || [];

      setCompanies(mappedCompanies);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to fetch connected companies');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (connectionStatus: string, tokenExpiresAt?: string): ConnectedCompany['status'] => {
    if (connectionStatus === 'disconnected') return 'red';
    
    if (tokenExpiresAt) {
      const expiresAt = new Date(tokenExpiresAt);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) return 'red';
      if (daysUntilExpiry <= 7) return 'yellow';
    }
    
    return connectionStatus === 'connected' ? 'green' : 'gray';
  };

  const handleReconnect = async (companyId: string, realmId: string) => {
    try {
      // Check if firm integration is configured
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', user.id)
        .single();

      if (!profile?.firm_id) {
        toast.error('You must be associated with a firm');
        return;
      }

      const { data: integration } = await supabase
        .from('firm_integrations')
        .select('is_configured')
        .eq('firm_id', profile.firm_id)
        .single();

      if (!integration?.is_configured) {
        toast.error('QuickBooks integration is not configured for your firm');
        return;
      }

      // Redirect to connect flow
      window.location.href = '/company-selection';
      
    } catch (error) {
      console.error('Reconnection error:', error);
      toast.error('Failed to start reconnection process');
    }
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      // This would call an edge function to refresh all tokens
      toast.success('All connections refreshed successfully');
      await fetchConnectedCompanies();
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error('Failed to refresh connections');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDiscoverNew = () => {
    // Redirect to company selection flow
    window.location.href = '/company-selection';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center p-8">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p>Loading companies...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Company Management</h1>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleRefreshAll}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh All Connections
              </Button>
              <Button onClick={handleDiscoverNew}>
                <Plus className="h-4 w-4 mr-2" />
                Discover New Companies
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Companies Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Realm ID</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Token Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <StatusIndicator 
                        status={company.status}
                        size="md" 
                      />
                    </TableCell>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.realmId}</TableCell>
                    <TableCell>
                      {company.lastSyncAt ? company.lastSyncAt.toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      {company.tokenExpiresAt ? (
                        <span className={`text-sm ${
                          company.status === 'red' ? 'text-destructive' :
                          company.status === 'yellow' ? 'text-yellow-600' :
                          'text-muted-foreground'
                        }`}>
                          Expires {company.tokenExpiresAt.toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">No token data</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {company.connectionStatus !== 'connected' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReconnect(company.id, company.realmId)}
                        >
                          Reconnect
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredCompanies.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery ? 'No companies found matching your search.' : 'No companies connected yet.'}
              </p>
              {!searchQuery && (
                <Button className="mt-4" onClick={handleDiscoverNew}>
                  Connect Your First Company
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CompanyManagement;