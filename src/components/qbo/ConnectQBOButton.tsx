import { Button } from '@/components/ui/button';
import { Link as LinkIcon } from 'lucide-react';
import { initiateQBOAuth } from '@/lib/services/qbo-oauth';

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
  const handleConnect = () => {
    // Initiate OAuth flow using unified method
    initiateQBOAuth(clientId, clientName, realmId);
  };

  const getButtonText = () => {
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
      variant={getButtonVariant()}
      size="sm"
    >
      <LinkIcon className="w-4 h-4 mr-2" />
      {getButtonText()}
    </Button>
  );
}
