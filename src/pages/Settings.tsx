import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CSVUpload } from '@/components/CSVUpload';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Building2, Download, Upload, AlertTriangle, Users } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface Firm {
  id: string;
  name: string;
  owner_id: string;
  email: string | null;
}

const Settings = () => {
  const navigate = useNavigate();
  const [firm, setFirm] = useState<Firm | null>(null);
  const [firmName, setFirmName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [clientCount, setClientCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch firm
      const { data: firmData, error: firmError } = await supabase
        .from('firms')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (firmError && firmError.code !== 'PGRST116') {
        throw firmError;
      }

      if (firmData) {
        setFirm(firmData);
        setFirmName(firmData.name);
        setOwnerEmail(user.email || '');
      }

      // Fetch client count
      const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      setClientCount(count || 0);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFirm = async () => {
    if (!firm) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('firms')
        .update({ name: firmName })
        .eq('id', firm.id);

      if (error) throw error;

      toast.success('Firm name updated successfully');
      setFirm({ ...firm, name: firmName });
    } catch (error: any) {
      console.error('Error updating firm:', error);
      toast.error('Failed to update firm name');
    } finally {
      setSaving(false);
    }
  };

  const downloadCurrentList = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('client_name, realm_id, dropbox_folder_url, dropbox_folder_path')
        .eq('is_active', true)
        .order('client_name');

      if (error) throw error;

      const csv = Papa.unparse(data || [], {
        columns: ['client_name', 'realm_id', 'dropbox_folder_url', 'dropbox_folder_path'],
        header: true
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Client list downloaded');
    } catch (error: any) {
      console.error('Error downloading list:', error);
      toast.error('Failed to download client list');
    }
  };

  const downloadTemplate = () => {
    const template = `Client Name,Realm_ID,Dropbox,Dropbox to
Example Client,1234567890123456,https://www.dropbox.com/scl/fo/example,/Clients/Example/`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Template downloaded');
  };

  const replaceAllClients = async () => {
    if (!confirm('This will delete ALL existing clients and their review history. Are you sure?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      toast.success('All clients removed. Upload your new CSV.');
      setClientCount(0);
    } catch (error: any) {
      console.error('Error deleting clients:', error);
      toast.error('Failed to delete clients');
    }
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
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">C</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold">Cairn Accounting</h1>
              <p className="text-sm text-muted-foreground">QuickBooks Review Management</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Firm Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Firm Information
              </CardTitle>
              <CardDescription>Manage your firm details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firmName">Firm Name</Label>
                <Input
                  id="firmName"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  placeholder="Enter firm name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Owner Email</Label>
                <Input
                  id="ownerEmail"
                  value={ownerEmail}
                  disabled
                  className="bg-muted"
                />
              </div>
              <Button onClick={handleUpdateFirm} disabled={saving || !firmName.trim()}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Update Firm Name
              </Button>
            </CardContent>
          </Card>

          {/* Client Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Client Management
              </CardTitle>
              <CardDescription>
                {clientCount} client{clientCount !== 1 ? 's' : ''} imported
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {firm && <CSVUpload firmId={firm.id} onUploadComplete={fetchData} />}

              <div className="flex flex-wrap gap-2 pt-4">
                <Button variant="outline" onClick={downloadCurrentList} disabled={clientCount === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Current List
                </Button>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
                <Button
                  variant="destructive"
                  onClick={replaceAllClients}
                  disabled={clientCount === 0}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Replace All Clients
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Dropbox Setup Instructions */}
          <Alert>
            <Upload className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <h4 className="font-semibold">Dropbox Setup Instructions:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Create a folder in Dropbox for each client</li>
                  <li>Share each folder with fazulyanov@gmail.com (edit permission)</li>
                  <li>Generate a shareable link for each folder</li>
                  <li>Add both the shareable link and folder path to your CSV</li>
                </ol>
                <p className="text-sm text-muted-foreground mt-2">
                  Note: The shareable link is for viewing in the dashboard. The shared folder allows n8n to save review files automatically.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </main>
    </div>
  );
};

export default Settings;
