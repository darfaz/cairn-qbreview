import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { initiateDropboxOAuth, disconnectDropbox, getDropboxAccountInfo, getDropboxToken, validateDropboxConnection } from '@/lib/dropbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function DropboxConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [firmId, setFirmId] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', user.id)
        .single();

      if (!profile?.firm_id) {
        toast.error('No firm associated with your account');
        return;
      }

      setFirmId(profile.firm_id);

      const { data: firm } = await supabase
        .from('firms')
        .select('dropbox_connected, dropbox_access_token')
        .eq('id', profile.firm_id)
        .single();

      if (firm?.dropbox_connected && firm?.dropbox_access_token) {
        // Validate the token is still working
        const isValid = await validateDropboxConnection(firm.dropbox_access_token);
        
        if (isValid) {
          setIsConnected(true);
          try {
            const info = await getDropboxAccountInfo(firm.dropbox_access_token);
            setAccountInfo(info);
          } catch (error) {
            console.error('Failed to get account info:', error);
          }
        } else {
          // Token is invalid, disconnect
          await disconnectDropbox(profile.firm_id);
          setIsConnected(false);
          toast.error('Dropbox connection expired. Please reconnect.');
        }
      }
    } catch (error: any) {
      console.error('Error checking Dropbox connection:', error);
      toast.error('Failed to check Dropbox connection status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const authUrl = await initiateDropboxOAuth();
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('Error initiating Dropbox OAuth:', error);
      toast.error('Failed to start Dropbox connection');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!firmId) {
      toast.error('Firm ID not found');
      return;
    }

    try {
      await disconnectDropbox(firmId);
      setIsConnected(false);
      setAccountInfo(null);
      toast.success('Dropbox disconnected successfully');
    } catch (error: any) {
      console.error('Error disconnecting Dropbox:', error);
      toast.error('Failed to disconnect Dropbox');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dropbox Integration</CardTitle>
          <CardDescription>Connect your Dropbox account to store client documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Dropbox Integration</CardTitle>
            <CardDescription>Connect your Dropbox account to store client documents</CardDescription>
          </div>
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Not Connected
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && accountInfo && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Connected Account</p>
            <p className="text-sm text-muted-foreground">
              {accountInfo.name?.display_name || accountInfo.email}
            </p>
            {accountInfo.email && (
              <p className="text-xs text-muted-foreground">{accountInfo.email}</p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {!isConnected ? (
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect to Dropbox'
              )}
            </Button>
          ) : (
            <Button onClick={handleDisconnect} variant="destructive">
              Disconnect Dropbox
            </Button>
          )}
        </div>

        {!isConnected && (
          <p className="text-xs text-muted-foreground">
            Connecting to Dropbox allows you to automatically store client review documents in your Dropbox folders.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
