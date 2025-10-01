import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { addQBOClient } from '@/lib/database/clients';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ConnectQBOButton } from './qbo/ConnectQBOButton';

export function AddClientForm({ onSuccess }: { onSuccess?: () => void }) {
  const [realmId, setRealmId] = useState('');
  const [clientName, setClientName] = useState('');
  const [dropboxFolderUrl, setDropboxFolderUrl] = useState('');
  const [dropboxFolderPath, setDropboxFolderPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQBOConnect, setShowQBOConnect] = useState(false);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in');
        setIsLoading(false);
        return;
      }

      const result = await addQBOClient({
        realm_id: realmId.trim(),
        client_name: clientName.trim(),
        dropbox_folder_url: dropboxFolderUrl.trim(),
        dropbox_folder_path: dropboxFolderPath.trim(),
        user_id: user.id,
      });

      if (result.success) {
        toast({
          title: result.action === 'updated' ? 'Client Updated' : 'Client Added',
          description: result.message,
          variant: result.action === 'updated' ? 'default' : 'default',
        });
        
        // Show QBO connect step for new clients
        if (result.action === 'created' && result.data) {
          setCreatedClientId(result.data.id);
          setShowQBOConnect(true);
        } else {
          // Clear form for updates
          setRealmId('');
          setClientName('');
          setDropboxFolderUrl('');
          setDropboxFolderPath('');
          
          // Call success callback
          if (onSuccess) {
            onSuccess();
          }
        }
      } else {
        setError(result.error || 'Failed to add client');
      }
    } catch (err: any) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQBOConnectSuccess = () => {
    // Clear form and call success callback
    setRealmId('');
    setClientName('');
    setDropboxFolderUrl('');
    setDropboxFolderPath('');
    setShowQBOConnect(false);
    setCreatedClientId(null);
    
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleSkipQBO = () => {
    // Clear form and call success callback
    setRealmId('');
    setClientName('');
    setDropboxFolderUrl('');
    setDropboxFolderPath('');
    setShowQBOConnect(false);
    setCreatedClientId(null);
    
    if (onSuccess) {
      onSuccess();
    }
  };

  if (showQBOConnect && createdClientId) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            <strong>Client added successfully!</strong> Now connect to QuickBooks to enable automated reviews.
          </AlertDescription>
        </Alert>
        
        <div className="flex flex-col gap-4">
          <ConnectQBOButton
            clientId={createdClientId}
            clientName={clientName}
            realmId={realmId}
            onSuccess={handleQBOConnectSuccess}
          />
          <Button variant="outline" onClick={handleSkipQBO}>
            Skip for Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="realm_id">Realm ID</Label>
        <Input
          id="realm_id"
          type="text"
          value={realmId}
          onChange={(e) => setRealmId(e.target.value)}
          placeholder="e.g., 9341455289024527"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <Label htmlFor="client_name">Client Name</Label>
        <Input
          id="client_name"
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="e.g., Sample Company LLC"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <Label htmlFor="dropbox_folder_url">Dropbox Folder URL</Label>
        <Input
          id="dropbox_folder_url"
          type="url"
          value={dropboxFolderUrl}
          onChange={(e) => setDropboxFolderUrl(e.target.value)}
          placeholder="https://www.dropbox.com/scl/fo/..."
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <Label htmlFor="dropbox_folder_path">Dropbox Folder Path</Label>
        <Input
          id="dropbox_folder_path"
          type="text"
          value={dropboxFolderPath}
          onChange={(e) => setDropboxFolderPath(e.target.value)}
          placeholder="/Cairn Automation/Client Name"
          required
          disabled={isLoading}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Add Client'}
      </Button>
    </form>
  );
}