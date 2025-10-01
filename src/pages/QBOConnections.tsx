import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ConnectQBOButton } from '@/components/qbo/ConnectQBOButton';
import { getConnectedCompanies, disconnectQBO, type QBOConnection } from '@/lib/services/qbo-oauth';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function QBOConnectionsPage() {
  const [connections, setConnections] = useState<QBOConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const fetchConnections = async () => {
    setIsLoading(true);
    const data = await getConnectedCompanies();
    setConnections(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleDisconnect = async (realmId: string, companyName: string) => {
    setDisconnecting(realmId);
    
    const result = await disconnectQBO(realmId);
    
    if (result.success) {
      toast.success(`Disconnected ${companyName} from QuickBooks`);
      await fetchConnections();
    } else {
      toast.error(result.error || 'Failed to disconnect');
    }
    
    setDisconnecting(null);
  };

  const getStatusIcon = (connection: QBOConnection) => {
    if (!connection.is_connected) {
      return <XCircle className="w-5 h-5 text-muted-foreground" />;
    }
    if (connection.is_expired) {
      return <AlertCircle className="w-5 h-5 text-destructive" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getStatusBadge = (connection: QBOConnection) => {
    if (!connection.is_connected) {
      return <Badge variant="secondary">Not Connected</Badge>;
    }
    if (connection.is_expired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">Connected</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader showSearch={false} />

      <main className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">QuickBooks Connections</h1>
          <p className="text-muted-foreground">
            Manage OAuth connections to your QuickBooks Online companies
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : connections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="text-lg font-semibold mb-2">No clients found</h3>
              <p className="text-muted-foreground mb-4">
                Add clients first to connect them to QuickBooks.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connections.map((connection) => (
              <Card key={connection.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getStatusIcon(connection)}
                        {connection.client_name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Realm ID: {connection.realm_id}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    {getStatusBadge(connection)}
                  </div>

                  {connection.is_connected && connection.expires_at && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Token expires:</span>
                      <br />
                      <span className={connection.is_expired ? 'text-destructive' : ''}>
                        {new Date(connection.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {connection.last_synced && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Last synced:</span>
                      <br />
                      {new Date(connection.last_synced).toLocaleDateString()}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <ConnectQBOButton
                      clientId={connection.client_id}
                      clientName={connection.client_name}
                      realmId={connection.realm_id}
                      isConnected={connection.is_connected}
                      isExpired={connection.is_expired}
                      onSuccess={fetchConnections}
                    />

                    {connection.is_connected && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={disconnecting === connection.realm_id}
                          >
                            {disconnecting === connection.realm_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Disconnect QuickBooks?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the OAuth connection for {connection.client_name}.
                              You'll need to reconnect to access QuickBooks data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDisconnect(connection.realm_id, connection.client_name)}
                            >
                              Disconnect
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
