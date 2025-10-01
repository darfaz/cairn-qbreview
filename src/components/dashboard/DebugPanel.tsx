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
    environment: 'Webhook Integration',
    connectionsCount: 0,
    supabaseUrl: '',
    webhookUrl: ''
  });

  useEffect(() => {
    if (isVisible) {
      loadDebugInfo();
    }
  }, [isVisible]);

  const loadDebugInfo = async () => {
    try {
      // Count client connections  
      const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact' });

      setDebugInfo({
        environment: 'Webhook Integration',
        connectionsCount: count || 0,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'Not configured',
        webhookUrl: import.meta.env.VITE_N8N_WEBHOOK_URL || 'Not configured'
      });
    } catch (error) {
      console.error('Failed to load debug info:', error);
      toast.error('Failed to load debug information');
    }
  };

  const testCallback = () => {
    console.log('Webhook URL:', debugInfo.webhookUrl);
    console.log('Environment:', debugInfo.environment);
    console.log('Active connections:', debugInfo.connectionsCount);
    
    toast.success('Debug info logged to console - OAuth functionality removed');
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
          <h4 className="text-sm font-semibold mb-2">Integration Status</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Integration:</span>
              <Badge variant="secondary">
                Webhook Pending
              </Badge>
            </div>
            <div className="flex justify-between items-start">
              <span>Webhook URL:</span>
              <span className="text-right text-xs text-muted-foreground max-w-48 break-all">
                {debugInfo.webhookUrl}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-semibold mb-2">Connection State</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Active Clients:</span>
              <Badge variant={debugInfo.connectionsCount > 0 ? 'default' : 'secondary'}>
                {debugInfo.connectionsCount}
              </Badge>
            </div>
            <div className="flex justify-between items-start">
              <span>Status:</span>
              <span className="text-right text-xs text-muted-foreground">
                OAuth Removed
              </span>
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
          <p className="font-medium mb-1">Webhook Integration:</p>
          <p className="break-all bg-muted p-2 rounded">
            OAuth functionality has been removed. Integration pending via webhook.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}