import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CSVUpload } from '@/components/clients/CSVUpload';
import { Loader2, Save, Calendar, Settings as SettingsIcon, Key, Upload, Download, Trash2, FileText, Building2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '@/components/Footer';

interface ScheduledRunSettings {
  id: string;
  day_of_month: number;
  enabled: boolean;
  last_run_date: string | null;
  next_run_date: string | null;
}

const Settings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<ScheduledRunSettings | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [clientCount, setClientCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
    fetchUserEmail();
    fetchClientCount();
  }, []);

  const fetchUserEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || '');
    } catch (error) {
      console.error('Error fetching user email:', error);
    }
  };

  const fetchClientCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setClientCount(count || 0);
    } catch (error) {
      console.error('Error fetching client count:', error);
    }
  };

  const handleUploadComplete = () => {
    toast({
      title: 'Upload Complete',
      description: 'Refreshing client list...',
    });
    
    fetchClientCount();
    
    setTimeout(() => {
      navigate('/dashboard');
    }, 1500);
  };

  const handleExportClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clients, error } = await supabase
        .from('clients')
        .select('client_name, realm_id, dropbox_folder_url, dropbox_folder_path')
        .eq('user_id', user.id)
        .order('client_name');

      if (error) throw error;

      // Convert to CSV
      const headers = ['client_name', 'realm_id', 'dropbox_folder_url', 'dropbox_folder_path'];
      const rows = clients?.map(c => [
        c.client_name,
        c.realm_id,
        c.dropbox_folder_url || '',
        c.dropbox_folder_path || ''
      ]) || [];

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clients_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: `${clients?.length || 0} clients exported to CSV`,
      });
    } catch (error) {
      console.error('Error exporting clients:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export clients',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      'client_name,realm_id,dropbox_folder_url,dropbox_folder_path',
      'Example Corp,9340000000000000,https://www.dropbox.com/scl/fo/example,/Clients/Example/'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Template Downloaded',
      description: 'CSV template has been downloaded',
    });
  };

  const handleDeleteAllClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Clients Deleted',
        description: 'All clients have been removed. Past reviews are preserved.',
      });

      setClientCount(0);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting clients:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete clients',
        variant: 'destructive',
      });
    }
  };

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
      <DashboardHeader showSearch={false} />
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <div className="space-y-6 max-w-4xl">
          {/* Section 1: Firm Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Your account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Email</Label>
                <Input
                  id="ownerEmail"
                  value={userEmail}
                  readOnly
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Logged in as {userEmail}. {clientCount} clients connected.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Client Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Client Management
              </CardTitle>
              <CardDescription>
                {clientCount} clients imported
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CSV Upload */}
              <CSVUpload onUploadComplete={handleUploadComplete} />

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleExportClients}
                  disabled={clientCount === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Current List
                </Button>

                <Button 
                  variant="outline" 
                  onClick={handleDownloadTemplate}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Download CSV Template
                </Button>

                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      disabled={clientCount === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Re-upload and Replace All Clients
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete All Clients?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will delete all existing clients. Past reviews will be preserved. Continue?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAllClients}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete All Clients
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Dropbox Setup Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Dropbox Setup Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription className="space-y-4">
                  <p className="font-semibold text-base">📋 How to prepare your Dropbox:</p>
                  
                  <ol className="space-y-2 ml-4 list-decimal">
                    <li>Create a folder for each client in your Dropbox</li>
                    <li>
                      Share each folder with: <strong>fazulyanov@gmail.com</strong> (with edit permission)
                    </li>
                    <li>
                      Generate a shareable link for each folder (right-click → Share → Create link)
                    </li>
                    <li>
                      Add both the shareable link and folder path to your CSV
                    </li>
                  </ol>

                  <div className="p-3 bg-muted rounded-md text-sm">
                    <strong>Note:</strong> The shareable link is for viewing files in the dashboard. 
                    Sharing with <strong>fazulyanov@gmail.com</strong> allows our system to save 
                    automated review files to your folders.
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Settings;