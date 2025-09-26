import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface QBConnectButtonProps {
  onConnectionSuccess?: () => void;
}

export function QBConnectButton({ onConnectionSuccess }: QBConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      // Get current user's OAuth settings
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('intuit_client_id, oauth_redirect_uri, qboa_oauth_enabled')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError || !profile?.qboa_oauth_enabled) {
        toast.error('Please configure your QuickBooks OAuth settings in Settings first');
        return;
      }

      // Build OAuth URL
      const params = new URLSearchParams({
        client_id: profile.intuit_client_id,
        scope: 'com.intuit.quickbooks.accounting',
        redirect_uri: profile.oauth_redirect_uri || `${window.location.origin}/company-selection`,
        response_type: 'code',
        access_type: 'offline',
        approval_prompt: 'auto'
      });

      const oauthUrl = `https://appcenter.intuit.com/connect/oauth2?${params}`;
      
      // Redirect to QuickBooks OAuth
      window.location.href = oauthUrl;
      
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to start connection process');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Connect Your QuickBooks Account</h2>
        <p className="text-muted-foreground">
          Connect to QuickBooks Online to start monitoring your clients' companies
        </p>
      </div>
      
      <Button 
        onClick={handleConnect}
        disabled={isConnecting}
        size="lg"
        className="min-w-[200px]"
      >
        {isConnecting ? 'Connecting...' : 'Connect QuickBooks Account'}
      </Button>
    </div>
  );
}