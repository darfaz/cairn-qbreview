import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Calendar, Settings as SettingsIcon, Key } from 'lucide-react';
import DropboxConnect from '@/components/settings/DropboxConnect';

interface ScheduledRunSettings {
  id: string;
  day_of_month: number;
  enabled: boolean;
  last_run_date: string | null;
  next_run_date: string | null;
}


const Settings = () => {
  const [settings, setSettings] = useState<ScheduledRunSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_runs')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load settings',
          variant: 'destructive',
        });
        return;
      }

      setSettings(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('scheduled_runs')
        .update({
          day_of_month: settings.day_of_month,
          enabled: settings.enabled,
        })
        .eq('id', settings.id);

      if (error) {
        throw error;
      }

      toast({
        title: 'Settings Saved',
        description: 'Scheduled run settings have been updated successfully',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };


  const runScheduledReconciliation = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('run-reconciliation', {
        body: { runType: 'scheduled' }
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Reconciliation Started',
        description: 'Scheduled reconciliation has been initiated for all connected clients',
      });

      // Refresh settings to update last run date
      setTimeout(() => {
        fetchSettings();
      }, 2000);
    } catch (error: any) {
      console.error('Error running reconciliation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start reconciliation',
        variant: 'destructive',
      });
    }
  };

  const calculateNextRunDate = (dayOfMonth: number) => {
    const now = new Date();
    const nextRun = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    
    // If the day has already passed this month, schedule for next month
    if (nextRun < now) {
      nextRun.setMonth(nextRun.getMonth() + 1);
    }
    
    return nextRun.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4 mb-8">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => window.location.href = '/'}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">C</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Cairn Accounting</h1>
              <p className="text-sm text-muted-foreground">QuickBooks Reconciliation Dashboard</p>
            </div>
          </button>
        </div>
      </header>
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {/* Scheduled Runs Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Scheduled Reconciliation
              </CardTitle>
              <CardDescription>
                Configure when automatic reconciliations should run for all connected clients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Enable Scheduled Runs</Label>
                      <div className="text-sm text-muted-foreground">
                        Automatically run reconciliations for all connected clients
                      </div>
                    </div>
                    <Switch
                      checked={settings.enabled}
                      onCheckedChange={(enabled) =>
                        setSettings({ ...settings, enabled })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dayOfMonth">Day of Month</Label>
                    <Input
                      id="dayOfMonth"
                      type="number"
                      min="1"
                      max="28"
                      value={settings.day_of_month}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          day_of_month: parseInt(e.target.value) || 15,
                        })
                      }
                      className="w-32"
                    />
                    <div className="text-sm text-muted-foreground">
                      Reconciliations will run on the {settings.day_of_month}
                      {settings.day_of_month === 1 ? 'st' : 
                       settings.day_of_month === 2 ? 'nd' : 
                       settings.day_of_month === 3 ? 'rd' : 'th'} of each month
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Last Run</Label>
                      <div className="font-medium">
                        {settings.last_run_date 
                          ? new Date(settings.last_run_date).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Next Run</Label>
                      <div className="font-medium">
                        {settings.enabled 
                          ? calculateNextRunDate(settings.day_of_month)
                          : 'Disabled'
                        }
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      onClick={runScheduledReconciliation}
                      disabled={!settings.enabled}
                    >
                      Run Now
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Webhook Integration Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Integration Status
              </CardTitle>
              <CardDescription>
                Webhook Integration with QuickBooks Online
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  Webhook Integration Pending - OAuth functionality has been removed
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Dropbox Integration */}
          <DropboxConnect />

          {/* n8n Integration Settings */}
          <Card>
            <CardHeader>
              <CardTitle>n8n Integration</CardTitle>
              <CardDescription>
                Configuration for the n8n workflow integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input 
                  value="https://execture.app.n8n.cloud/workflow/FR1nnHx3WiQJOWGv"
                  readOnly
                  className="font-mono text-sm"
                />
                <div className="text-sm text-muted-foreground">
                  This webhook URL is used to trigger reconciliation workflows
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-2">Integration Status</div>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <div className="h-2 w-2 bg-green-600 rounded-full"></div>
                  Connected
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;