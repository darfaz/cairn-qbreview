export interface Client {
  id: string;
  name: string;
  realmId: string;
  qboCompanyName: string;
  lastReviewDate: Date;
  status: 'green' | 'yellow' | 'red';
  actionItemsCount: number;
  connectionStatus: 'connected' | 'disconnected';
  dropboxFolderUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReconciliationRun {
  id: string;
  clientId: string;
  runType: 'scheduled' | 'manual';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  reportUrl?: string;
  googleSheetUrl?: string;
  unreconciledCount: number;
  statusColor: 'green' | 'yellow' | 'red';
  errorMessage?: string;
  retryCount: number;
}

export interface DashboardSummary {
  totalClients: number;
  greenClients: number;
  yellowClients: number;
  redClients: number;
  disconnectedClients: number;
  nextScheduledRun: Date;
}