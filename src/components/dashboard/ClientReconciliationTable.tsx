import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Play, MoreVertical } from 'lucide-react';
import { runReview } from '@/lib/reviews';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

interface ClientReconciliationTableProps {
  clients: ClientWithReview[];
  onRefresh: () => void;
}

export function ClientReconciliationTable({ clients, onRefresh }: ClientReconciliationTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [runningClients, setRunningClients] = useState<Set<string>>(new Set());

  const toggleSelectAll = () => {
    if (selectedIds.size === clients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(clients.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleRunReview = async (client: ClientWithReview) => {
    if (runningClients.has(client.id)) return;
    
    setRunningClients(prev => new Set(prev).add(client.id));
    try {
      await runReview({
        id: client.id,
        client_name: client.client_name,
        realm_id: client.realm_id,
        sheet_url: client.latest_review?.sheet_url || undefined,
      });
      onRefresh();
    } finally {
      setRunningClients(prev => {
        const next = new Set(prev);
        next.delete(client.id);
        return next;
      });
    }
  };

  const getStatusDisplay = (actionItems?: number) => {
    if (actionItems === undefined || actionItems === null) {
      return (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-400"></span>
          <span className="text-muted-foreground">—</span>
        </div>
      );
    }
    
    if (actionItems === 0) {
      return (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          <span className="text-foreground">Clean</span>
        </div>
      );
    }
    
    if (actionItems <= 3) {
      return (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
          <span className="text-foreground">{actionItems} items</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500"></span>
        <span className="text-foreground">{actionItems} items</span>
      </div>
    );
  };

  const formatReviewDate = (date?: string | null) => {
    if (!date) return <span className="text-muted-foreground">Never</span>;
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch {
      return <span className="text-muted-foreground">Invalid date</span>;
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left w-12">
                <Checkbox
                  checked={selectedIds.size === clients.length && clients.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Company Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Last Review
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                QBO Connection
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Dropbox
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No clients found. Add your first client to get started.
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4">
                    <Checkbox
                      checked={selectedIds.has(client.id)}
                      onCheckedChange={() => toggleSelect(client.id)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{client.client_name || client.name}</span>
                      <span className="text-sm text-muted-foreground">ID: {client.realm_id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-foreground">
                    {formatReviewDate(client.latest_review?.run_date)}
                  </td>
                  <td className="px-4 py-4">
                    {getStatusDisplay(client.latest_review?.action_items_count)}
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={client.connection_status === 'connected' ? 'default' : 'secondary'}>
                      {client.connection_status === 'connected' ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    {client.dropbox_folder_url ? (
                      <a
                        href={client.dropbox_folder_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:text-primary-hover transition-colors"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRunReview(client)}
                        disabled={runningClients.has(client.id)}
                        className="h-8"
                      >
                        {runningClients.has(client.id) ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <>
                            <Play className="w-3 h-3 mr-1" />
                            Run
                          </>
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRunReview(client)}>
                            Run Review
                          </DropdownMenuItem>
                          {client.latest_review?.sheet_url && (
                            <DropdownMenuItem
                              onClick={() => window.open(client.latest_review!.sheet_url!, '_blank')}
                            >
                              View Sheet
                            </DropdownMenuItem>
                          )}
                          {client.dropbox_folder_url && (
                            <DropdownMenuItem
                              onClick={() => window.open(client.dropbox_folder_url!, '_blank')}
                            >
                              Open Dropbox
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
