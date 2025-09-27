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
        console.error('OAuth configuration issue:', { profileError, profile });
        toast.error('Please configure your QuickBooks OAuth settings in Settings first');
        return;
      }

      // Diagnostic logging
      const environment = profile.intuit_client_id?.includes('sandbox') ? 'sandbox' : 'production';
      console.log('QuickBooks OAuth Environment:', environment);
      console.log('Client ID exists:', !!profile.intuit_client_id);
      console.log('Redirect URI configured:', profile.oauth_redirect_uri || 'using default');

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
      
      // Debug: Show OAuth URL (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('OAuth URL being used:', oauthUrl);
        if (confirm('Debug Mode: Show OAuth URL?\n\n' + oauthUrl)) {
          console.log('User confirmed OAuth redirect');
        }
      }
      
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