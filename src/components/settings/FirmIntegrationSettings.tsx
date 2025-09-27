import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface FirmIntegration {
  intuit_client_id: string;
  intuit_client_secret_encrypted: string;
  intuit_environment: 'sandbox' | 'production';
  intuit_app_name: string;
  redirect_uri: string;
  is_configured: boolean;
}

export function FirmIntegrationSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firmId, setFirmId] = useState<string | null>(null);
  const [integration, setIntegration] = useState<Partial<FirmIntegration>>({
    intuit_client_id: '',
    intuit_client_secret_encrypted: '',
    intuit_environment: 'sandbox',
    intuit_app_name: '',
    redirect_uri: '',
    is_configured: false
  });

  useEffect(() => {
    const loadFirmIntegration = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Get user's firm
        const { data: profile } = await supabase
          .from('profiles')
          .select('firm_id')
          .eq('id', user.id)
          .single();

        if (!profile?.firm_id) {
          toast.error('You must be associated with a firm to manage integrations');
          return;
        }

        setFirmId(profile.firm_id);

        // Get firm's integration settings
        const { data: firmIntegration, error } = await supabase
          .from('firm_integrations')
          .select('*')
          .eq('firm_id', profile.firm_id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (firmIntegration) {
          setIntegration({
            intuit_client_id: firmIntegration.intuit_client_id || '',
            intuit_client_secret_encrypted: '••••••••', // Show masked value
            intuit_environment: (firmIntegration.intuit_environment as 'sandbox' | 'production') || 'sandbox',
            intuit_app_name: firmIntegration.intuit_app_name || '',
            redirect_uri: firmIntegration.redirect_uri || `${window.location.origin.replace('5173', '54321')}/functions/v1/quickbooks-callback`,
            is_configured: firmIntegration.is_configured || false
          });
        } else {
          // Set default redirect URI for new integrations
          setIntegration(prev => ({
            ...prev,
            redirect_uri: `${window.location.origin.replace('5173', '54321')}/functions/v1/quickbooks-callback`
          }));
        }
      } catch (error) {
        console.error('Error loading firm integration:', error);
        toast.error('Failed to load integration settings');
      } finally {
        setLoading(false);
      }
    };

    loadFirmIntegration();
  }, [user]);

  const handleSave = async () => {
    if (!user || !firmId) return;
    
    setSaving(true);
    try {
      const updateData = {
        firm_id: firmId,
        intuit_client_id: integration.intuit_client_id,
        intuit_environment: integration.intuit_environment,
        intuit_app_name: integration.intuit_app_name,
        redirect_uri: integration.redirect_uri,
        is_configured: integration.is_configured,
        configured_at: new Date().toISOString(),
        configured_by: user.id
      };

      // Only include client secret if it's not the masked value
      if (integration.intuit_client_secret_encrypted && integration.intuit_client_secret_encrypted !== '••••••••') {
        // In a real implementation, this should be encrypted
        (updateData as any).intuit_client_secret_encrypted = integration.intuit_client_secret_encrypted;
      }

      const { error } = await supabase
        .from('firm_integrations')
        .upsert(updateData);

      if (error) throw error;

      toast.success('Integration settings saved successfully');
    } catch (error) {
      console.error('Error saving integration:', error);
      toast.error('Failed to save integration settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading integration settings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>QuickBooks Integration Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="app-name">Intuit App Name</Label>
          <Input
            id="app-name"
            value={integration.intuit_app_name}
            onChange={(e) => setIntegration({ ...integration, intuit_app_name: e.target.value })}
            placeholder="Your app name in Intuit Developer console"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client-id">Client ID</Label>
          <Input
            id="client-id"
            value={integration.intuit_client_id}
            onChange={(e) => setIntegration({ ...integration, intuit_client_id: e.target.value })}
            placeholder="Your Intuit app client ID"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client-secret">Client Secret</Label>
          <Input
            id="client-secret"
            type="password"
            value={integration.intuit_client_secret_encrypted}
            onChange={(e) => setIntegration({ ...integration, intuit_client_secret_encrypted: e.target.value })}
            placeholder="Your Intuit app client secret"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="environment">Environment</Label>
          <Select
            value={integration.intuit_environment}
            onValueChange={(value: 'sandbox' | 'production') => 
              setIntegration({ ...integration, intuit_environment: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sandbox">Sandbox</SelectItem>
              <SelectItem value="production">Production</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="redirect-uri">Redirect URI</Label>
          <Input
            id="redirect-uri"
            value={integration.redirect_uri}
            onChange={(e) => setIntegration({ ...integration, redirect_uri: e.target.value })}
            placeholder="OAuth redirect URI"
          />
          <p className="text-sm text-muted-foreground">
            Add this URL to your Intuit app's redirect URIs
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is-configured"
            checked={integration.is_configured}
            onCheckedChange={(checked) => setIntegration({ ...integration, is_configured: checked })}
          />
          <Label htmlFor="is-configured">Enable QuickBooks Integration</Label>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}