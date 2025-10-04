import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Link as LinkIcon } from 'lucide-react';
import { initiateQBOAuth } from '@/lib/services/qbo-oauth';
import { toast } from 'sonner';

interface ConnectQBOButtonProps {
  clientId: string;
  clientName: string;
  realmId: string;
  isConnected?: boolean;
  isExpired?: boolean;
  onSuccess?: () => void;
}

export function ConnectQBOButton({
  clientId,
  clientName,
  realmId,
  isConnected,
  isExpired,
  onSuccess
}: ConnectQBOButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    
    try {
      const result = await initiateQBOAuth(clientId, clientName, realmId);
      
      if (result.success && result.popup) {
        // Listen for popup close
        const checkPopup = setInterval(() => {
          if (result.popup?.closed) {
            clearInterval(checkPopup);
            setIsLoading(false);
            
            // Check if OAuth was successful by looking for updated data
            setTimeout(() => {
              if (onSuccess) {
                onSuccess();
              }
            }, 1000);
          }
        }, 500);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkPopup);
          if (!result.popup?.closed) {
            result.popup?.close();
          }
          setIsLoading(false);
        }, 5 * 60 * 1000);
      } else {
        toast.error(result.error || 'Failed to start OAuth flow');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('OAuth error:', error);
      toast.error('Failed to connect to QuickBooks');
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (isLoading) return 'Connecting...';
    if (isExpired) return 'Reconnect QuickBooks';
    if (isConnected) return 'Reconnect';
    return 'Connect QuickBooks';
  };

  const getButtonVariant = () => {
    if (isExpired) return 'destructive' as const;
    if (isConnected) return 'outline' as const;
    return 'default' as const;
  };

  return (
    <Button
      onClick={handleConnect}
      disabled={isLoading}
      variant={getButtonVariant()}
      size="sm"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {getButtonText()}
        </>
      ) : (
        <>
          <LinkIcon className="w-4 h-4 mr-2" />
          {getButtonText()}
        </>
      )}
    </Button>
  );
}
