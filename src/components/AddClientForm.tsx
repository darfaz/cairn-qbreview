import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { addQBOClient } from '@/lib/database/clients';
import { useToast } from '@/hooks/use-toast';

export function AddClientForm() {
  const [realmId, setRealmId] = useState('');
  const [clientName, setClientName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await addQBOClient({
        realm_id: realmId.trim(),
        client_name: clientName.trim(),
      });

      if (result.success) {
        toast({
          title: result.action === 'updated' ? 'Client Updated' : 'Client Added',
          description: result.message,
          variant: result.action === 'updated' ? 'default' : 'default',
        });
        
        // Clear form only if it was a new client
        if (result.action === 'created') {
          setRealmId('');
          setClientName('');
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