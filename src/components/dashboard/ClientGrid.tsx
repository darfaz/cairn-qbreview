import { Client } from '@/types/dashboard';
import { StatusIndicator } from './StatusIndicator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Play, 
  Clock,
  ExternalLink
} from 'lucide-react';

interface ClientGridProps {
  clients: Client[];
  onRunReconciliation: (clientId: string) => void;
  onViewHistory: (clientId: string) => void;
  onReconnect: (clientId: string) => void;
  selectedClientIds?: string[];
  onSelectionChange?: (clientIds: string[]) => void;
}

export function ClientGrid({ 
  clients, 
  onRunReconciliation, 
  onViewHistory, 
  onReconnect,
  selectedClientIds = [],
  onSelectionChange = () => {}
}: ClientGridProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allClientIds = clients.map(client => client.id);
      onSelectionChange(allClientIds);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectClient = (clientId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedClientIds, clientId]);
    } else {
      onSelectionChange(selectedClientIds.filter(id => id !== clientId));
    }
  };

  const allClientsSelected = clients.length > 0 && 
    clients.every(client => selectedClientIds.includes(client.id));

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getConnectionBadge = (status: Client['connectionStatus']) => {
    const variants = {
      connected: 'default',
      disconnected: 'destructive',
    } as const;

    const labels = {
      connected: 'Connected',
      disconnected: 'Disconnected',
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <div className="dashboard-card">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Client Reconciliations</h2>
        <p className="text-sm text-muted-foreground">
          Monitor and manage reconciliation status for all clients
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="table-header w-12">
              <Checkbox
                checked={allClientsSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all clients"
              />
            </TableHead>
            <TableHead className="table-header">Review</TableHead>
            <TableHead className="table-header">Company Name</TableHead>
            <TableHead className="table-header">Last Review</TableHead>
            <TableHead className="table-header">Status</TableHead>
            <TableHead className="table-header">QuickBooks</TableHead>
            <TableHead className="table-header">History</TableHead>
            <TableHead className="table-header">Dropbox</TableHead>
          </TableRow>
        </TableHeader>
          <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id} className="hover:bg-muted/50">
              <TableCell>
                <Checkbox
                  checked={selectedClientIds.includes(client.id)}
                  onCheckedChange={(checked) => handleSelectClient(client.id, !!checked)}
                  aria-label={`Select ${client.name}`}
                />
              </TableCell>
              
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRunReconciliation(client.id)}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Run
                </Button>
              </TableCell>
              
              <TableCell>
                <div>
                  <div className="font-medium text-foreground">{client.name}</div>
                  <div className="text-sm text-muted-foreground">
                    ID: {client.realmId}
                  </div>
                </div>
              </TableCell>
            
              <TableCell>
                <div className="text-sm font-medium">
                  {formatDate(client.lastReviewDate)}
                </div>
              </TableCell>
            
              <TableCell>
                <StatusIndicator 
                  status={client.status} 
                  count={client.actionItemsCount}
                />
              </TableCell>
              
              <TableCell>
                {getConnectionBadge(client.connectionStatus)}
              </TableCell>
              
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewHistory(client.id)}
                  className="p-0 h-auto text-primary hover:text-primary-hover"
                >
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">View</span>
                  </div>
                </Button>
              </TableCell>
            
              <TableCell>
                {client.dropboxFolderUrl ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto text-primary hover:text-primary-hover"
                    asChild
                  >
                    <a
                      href={client.dropboxFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span className="text-xs">View</span>
                    </a>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Not linked</span>
                )}
              </TableCell>
          </TableRow>
        ))}
        </TableBody>
      </Table>
    </div>
  );
}