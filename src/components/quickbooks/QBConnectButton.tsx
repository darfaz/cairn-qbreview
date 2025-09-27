import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface QBConnectButtonProps {
  onConnectionSuccess?: () => void;
}

export function QBConnectButton({ onConnectionSuccess }: QBConnectButtonProps) {
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!user) return;
    
    setIsConnecting(true);
    try {
      console.log('🔗 Starting QuickBooks connection...');
      
      // Get user's firm
      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', user.id)
        .single();

      if (!profile?.firm_id) {
        toast.error('You must be associated with a firm to connect QuickBooks');
        return;
      }

      // Get firm's QuickBooks integration
      const { data: integration } = await supabase
        .from('firm_integrations')
        .select('intuit_client_id, intuit_environment, is_configured')
        .eq('firm_id', profile.firm_id)
        .single();

      if (!integration?.is_configured) {
        toast.error('QuickBooks integration is not configured for your firm. Please contact your administrator.');
        return;
      }

      console.log('📋 Environment:', integration.intuit_environment);
      console.log('🔑 Client ID configured:', !!integration.intuit_client_id);

      // Call the connect function
      const { data, error } = await supabase.functions.invoke('quickbooks-connect', {
        body: { environment: integration.intuit_environment }
      });

      if (error) throw error;

      if (data?.authUrl) {
        console.log('🚀 Redirecting to OAuth URL:', data.authUrl);
        // Show alert with OAuth URL for debugging
        if (process.env.NODE_ENV === 'development') {
          alert(`OAuth URL: ${data.authUrl}`);
        }
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect to QuickBooks. Please try again.');
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