import { useState } from 'react';
import { Client } from '@/types/dashboard';
import { StatusIndicator } from './StatusIndicator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  MoreVertical, 
  History, 
  Link as LinkIcon, 
  ExternalLink,
  RefreshCw 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientGridProps {
  clients: Client[];
  onRunReconciliation: (clientId: string) => void;
  onViewHistory: (clientId: string) => void;
  onReconnect: (clientId: string) => void;
}

export function ClientGrid({ 
  clients, 
  onRunReconciliation, 
  onViewHistory, 
  onReconnect 
}: ClientGridProps) {
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());

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
      needs_reconnect: 'secondary',
    } as const;

    const labels = {
      connected: 'Connected',
      disconnected: 'Disconnected',
      needs_reconnect: 'Needs Reconnect',
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
          Monitor and manage QuickBooks reconciliation status for all clients
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="table-header">Company Name</TableHead>
            <TableHead className="table-header">Last Review</TableHead>
            <TableHead className="table-header">Status</TableHead>
            <TableHead className="table-header">Connection</TableHead>
            <TableHead className="table-header">Dropbox</TableHead>
            <TableHead className="table-header text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id} className="hover:bg-muted/50">
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
              
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRunReconciliation(client.id)}
                    disabled={client.connectionStatus === 'disconnected'}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Run
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewHistory(client.id)}>
                        <History className="w-4 h-4 mr-2" />
                        View History
                      </DropdownMenuItem>
                      {client.connectionStatus !== 'connected' && (
                        <DropdownMenuItem onClick={() => onReconnect(client.id)}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reconnect
                        </DropdownMenuItem>
                      )}
                      {client.dropboxFolderUrl && (
                        <DropdownMenuItem asChild>
                          <a
                            href={client.dropboxFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <LinkIcon className="w-4 h-4 mr-2" />
                            Open in Dropbox
                          </a>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}