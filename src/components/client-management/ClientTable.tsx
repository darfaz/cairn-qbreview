import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar } from 'lucide-react';
import { format } from 'date-fns';

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

interface ClientTableProps {
  clients: Client[];
  searchQuery: string;
}

export function ClientTable({ clients, searchQuery }: ClientTableProps) {
  const filteredClients = clients.filter(client =>
    client.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.realm_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.qbo_company_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'disconnected':
      case 'needs_reconnect':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getReviewStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'red':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (filteredClients.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {searchQuery ? 'No clients match your search.' : 'No clients found.'}
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client Name</TableHead>
            <TableHead>Realm ID</TableHead>
            <TableHead>QBO Company</TableHead>
            <TableHead>Connection</TableHead>
            <TableHead>Review Status</TableHead>
            <TableHead>Last Sync</TableHead>
            <TableHead>Added</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredClients.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="font-medium">
                {client.client_name}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {client.realm_id}
              </TableCell>
              <TableCell>
                {client.qbo_company_name || '-'}
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={getStatusColor(client.connection_status)}
                >
                  {client.connection_status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={getReviewStatusColor(client.status)}
                >
                  {client.status || 'pending'}
                </Badge>
              </TableCell>
              <TableCell>
                {client.last_sync_at ? (
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(client.last_sync_at), 'MMM d, yyyy')}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Never</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(client.created_at), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}