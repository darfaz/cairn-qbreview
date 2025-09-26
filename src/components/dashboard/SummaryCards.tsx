import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardSummary } from '@/types/dashboard';
import { Users, Calendar, AlertTriangle, Wifi } from 'lucide-react';

interface SummaryCardsProps {
  summary: DashboardSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Clients
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalClients}</div>
          <p className="text-xs text-muted-foreground">
            Active QuickBooks connections
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Status Distribution
          </CardTitle>
          <div className="flex space-x-1">
            <div className="w-2 h-2 rounded-full bg-status-green"></div>
            <div className="w-2 h-2 rounded-full bg-status-yellow"></div>
            <div className="w-2 h-2 rounded-full bg-status-red"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">🟢 Clean</span>
              <span className="font-semibold">{summary.greenClients}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">🟡 Review</span>
              <span className="font-semibold">{summary.yellowClients}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">🔴 Action</span>
              <span className="font-semibold">{summary.redClients}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Connection Issues
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">{summary.disconnectedClients}</div>
          <p className="text-xs text-muted-foreground">
            Require reconnection
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Next Scheduled Run
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold">{formatDate(summary.nextScheduledRun)}</div>
          <p className="text-xs text-muted-foreground">
            Monthly reconciliation
          </p>
        </CardContent>
      </Card>
    </div>
  );
}