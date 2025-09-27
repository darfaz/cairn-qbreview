import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DebugPanelProps {
  isVisible: boolean;
  onToggle: () => void;
}

export function DebugPanel({ isVisible, onToggle }: DebugPanelProps) {
  const [debugInfo, setDebugInfo] = useState({
    environment: 'Unknown',
    lastOAuthAttempt: null as Date | null,
    lastOAuthResult: 'None',
    connectionsCount: 0,
    supabaseUrl: '',
    redirectUri: '',
    clientIdConfigured: false
  });

  useEffect(() => {
    if (isVisible) {
      loadDebugInfo();
    }
  }, [isVisible]);

  const loadDebugInfo = async () => {
    try {
      // Get current user profile and firm integration
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', user.id)
        .single();

      let integration = null;
      if (profile?.firm_id) {
        const { data: firmIntegration } = await supabase
          .from('firm_integrations')
          .select('intuit_client_id, intuit_environment, redirect_uri, is_configured')
          .eq('firm_id', profile.firm_id)
          .single();
        integration = firmIntegration;
      }

      // Count QBO connections  
      const { count } = await supabase
        .from('qbo_connections')
        .select('*', { count: 'exact' });

      // Get recent OAuth attempts from logs
      const { data: logs } = await supabase
        .from('notification_logs')
        .select('created_at, message, status')
        .eq('notification_type', 'audit')
        .like('subject', '%OAuth%')
        .order('created_at', { ascending: false })
        .limit(1);

      setDebugInfo({
        environment: integration?.intuit_environment || 'Unknown',
        lastOAuthAttempt: logs?.[0]?.created_at ? new Date(logs[0].created_at) : null,
        lastOAuthResult: logs?.[0]?.status || 'None',
        connectionsCount: count || 0,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'Not configured',
        redirectUri: integration?.redirect_uri || 'Using default',
        clientIdConfigured: !!integration?.intuit_client_id
      });
    } catch (error) {
      console.error('Failed to load debug info:', error);
      toast.error('Failed to load debug information');
    }
  };

  const testCallback = () => {
    const callbackUrl = `${debugInfo.supabaseUrl}/functions/v1/quickbooks-callback`;
    console.log('Expected callback URL:', callbackUrl);
    console.log('Current environment:', debugInfo.environment);
    console.log('Client ID configured:', debugInfo.clientIdConfigured);
    console.log('Redirect URI:', debugInfo.redirectUri);
    
    toast.success('Debug info logged to console');
  };

  if (!isVisible) {
    return (
      <Button
        onClick={onToggle}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50"
      >
        Debug Panel
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-y-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Debug Panel</CardTitle>
        <Button onClick={onToggle} variant="ghost" size="sm">
          ×
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">QuickBooks Configuration</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Environment:</span>
              <Badge variant={debugInfo.environment === 'sandbox' ? 'secondary' : 'default'}>
                {debugInfo.environment}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Client ID:</span>
              <Badge variant={debugInfo.clientIdConfigured ? 'default' : 'destructive'}>
                {debugInfo.clientIdConfigured ? 'Configured' : 'Missing'}
              </Badge>
            </div>
            <div className="flex justify-between items-start">
              <span>Redirect URI:</span>
              <span className="text-right text-xs text-muted-foreground max-w-48 break-all">
                {debugInfo.redirectUri}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-semibold mb-2">OAuth State</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Active Connections:</span>
              <Badge variant={debugInfo.connectionsCount > 0 ? 'default' : 'secondary'}>
                {debugInfo.connectionsCount}
              </Badge>
            </div>
            <div className="flex justify-between items-start">
              <span>Last Attempt:</span>
              <span className="text-right text-xs text-muted-foreground">
                {debugInfo.lastOAuthAttempt?.toLocaleString() || 'None'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Last Result:</span>
              <Badge variant={debugInfo.lastOAuthResult === 'delivered' ? 'default' : 'secondary'}>
                {debugInfo.lastOAuthResult}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Button onClick={testCallback} size="sm" variant="outline" className="w-full">
            Log Debug Info
          </Button>
          <Button onClick={loadDebugInfo} size="sm" variant="outline" className="w-full">
            Refresh Data
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Expected Callback URL:</p>
          <p className="break-all bg-muted p-2 rounded">
            {debugInfo.supabaseUrl}/functions/v1/quickbooks-callback
          </p>
          <p className="mt-2 font-medium">Configure in Intuit Developer:</p>
          <p className="break-all bg-muted p-2 rounded">
            Redirect URIs → {debugInfo.supabaseUrl}/functions/v1/quickbooks-callback
          </p>
        </div>
      </CardContent>
    </Card>
  );
}