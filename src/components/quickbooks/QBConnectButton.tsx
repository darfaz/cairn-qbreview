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
      console.log('Starting QuickBooks connection...');
      
      // Call the quickbooks-connect Edge Function
      const { data, error } = await supabase.functions.invoke('quickbooks-connect');

      if (error) {
        console.error('Connection error:', error);
        toast.error(error.message || 'Failed to start connection process');
        return;
      }

      if (data?.authUrl) {
        console.log('Redirecting to QuickBooks OAuth...');
        // Redirect to the OAuth URL returned by the Edge Function
        window.location.href = data.authUrl;
      } else {
        console.error('No auth URL received from Edge Function');
        toast.error('Failed to get authorization URL');
      }
      
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