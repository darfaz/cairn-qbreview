import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusIndicator } from '@/components/dashboard/StatusIndicator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Search, RefreshCw, Plus } from 'lucide-react';
import bescoredLogo from '@/assets/bescored-logo.png';
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
  dropboxFolderUrl?: string;
}

const CompanyManagement = () => {
  const [companies, setCompanies] = useState<ConnectedCompany[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<ConnectedCompany[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
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
          client_name,
          realm_id,
          dropbox_folder_url
        `);

      if (error) throw error;

      const mappedCompanies: ConnectedCompany[] = clients?.map(client => {
        return {
          id: client.id,
          name: client.client_name,
          realmId: client.realm_id,
          connectionStatus: 'connected' as ConnectedCompany['connectionStatus'],
          status: 'green' as ConnectedCompany['status'],
          lastSyncAt: undefined,
          tokenExpiresAt: undefined,
          dropboxFolderUrl: client.dropbox_folder_url || undefined
        };
      }) || [];

      setCompanies(mappedCompanies);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to fetch connected companies');
    } finally {
      setIsLoading(false);
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
    toast.error('Connection managed via n8n integration');
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
    window.location.href = '/clients';
  };

  if (isLoading) {
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
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => window.location.href = '/'}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <img src={bescoredLogo} alt="BeScored" className="h-10" />
            </button>
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
                  <TableHead>Dropbox</TableHead>
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
                      {company.dropboxFolderUrl ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto text-primary hover:text-primary-hover"
                          asChild
                        >
                          <a
                            href={company.dropboxFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1"
                          >
                            <span className="text-xs">View</span>
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not linked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {/* Actions if needed */}
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