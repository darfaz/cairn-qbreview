import { Button } from '@/components/ui/button';
import { Link as LinkIcon } from 'lucide-react';
import { connectToQuickBooks } from '@/lib/quickbooksOAuth';

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
    // Store client info in sessionStorage for callback processing
    sessionStorage.setItem('qb_client_id', clientId);
    sessionStorage.setItem('qb_client_name', clientName);
    sessionStorage.setItem('qb_realm_id', realmId);
    
    // Initiate OAuth flow
    connectToQuickBooks();
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
