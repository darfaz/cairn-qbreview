import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Building2, ExternalLink } from 'lucide-react';
import { getConnectedCompanies, initiateQBOAuth } from '@/lib/services/qbo-oauth';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

export function QBOConnectionCard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [connections, setConnections] = useState<any[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  const loadConnections = async () => {
    setIsLoading(true);
    try {
      const companies = await getConnectedCompanies();
      setConnections(companies);
    } catch (error) {
      console.error('Error loading connections:', error);
      toast.error('Failed to load QuickBooks connections');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    
    // Generate a temporary realm_id for new connection
    const tempRealmId = crypto.randomUUID();
    
    try {
      const result = await initiateQBOAuth(tempRealmId, 'New Company', tempRealmId);
      
      if (result.success && result.popup) {
        const checkPopup = setInterval(() => {
          if (result.popup?.closed) {
            clearInterval(checkPopup);
            setIsConnecting(false);
            loadConnections();
          }
        }, 500);

        setTimeout(() => {
          clearInterval(checkPopup);
          if (!result.popup?.closed) {
            result.popup?.close();
          }
          setIsConnecting(false);
        }, 5 * 60 * 1000);
      } else {
        toast.error(result.error || 'Failed to start OAuth flow');
        setIsConnecting(false);
      }
    } catch (error) {
      console.error('OAuth error:', error);
      toast.error('Failed to connect to QuickBooks');
      setIsConnecting(false);
    }
  };

  const activeConnections = connections.filter(c => c.is_connected && !c.is_expired);
  const hasActiveConnection = activeConnections.length > 0;

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            QuickBooks Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          QuickBooks Connection
        </CardTitle>
        <CardDescription>
          Connect your QuickBooks Online account to enable automated reviews
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasActiveConnection ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-green-900 dark:text-green-100">
                  Connected to QuickBooks ✓
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {activeConnections.length} {activeConnections.length === 1 ? 'company' : 'companies'} connected
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Connected Companies:</p>
              {activeConnections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{connection.client_name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/qbo-connections')}
                  >
                    Manage
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              variant="outline"
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Another Company'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                No QuickBooks companies connected yet
              </p>
            </div>
            
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full text-white hover:bg-[#248717]"
              style={{ backgroundColor: '#2CA01C' }}
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect to QuickBooks'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
