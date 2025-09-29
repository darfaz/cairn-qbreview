import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Plus, Users } from 'lucide-react';

interface ClientManagementHeaderProps {
  totalClients: number;
  onAddClient: () => void;
  onBulkUpload: () => void;
}

export function ClientManagementHeader({ totalClients, onAddClient, onBulkUpload }: ClientManagementHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Client Management</h1>
        <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
          {totalClients} clients
        </span>
      </div>
      
      <div className="flex gap-2">
        <Button onClick={onAddClient} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
        <Button onClick={onBulkUpload} variant="outline" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Bulk Upload
        </Button>
      </div>
    </div>
  );
}