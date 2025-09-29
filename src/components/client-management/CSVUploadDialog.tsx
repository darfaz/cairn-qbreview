import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CSVUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

interface UploadResult {
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: string[];
}

export function CSVUploadDialog({ open, onOpenChange, onUploadComplete }: CSVUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResult(null);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive",
      });
    }
  };

  const parseCSV = (csvText: string): Array<{ realmId: string; clientName: string }> => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    const realmIdIndex = headers.findIndex(h => h.includes('realm') && h.includes('id'));
    const clientNameIndex = headers.findIndex(h => h.includes('client') && h.includes('name'));
    
    if (realmIdIndex === -1 || clientNameIndex === -1) {
      throw new Error('CSV must contain "Realm_ID" and "Client Name" columns');
    }

    const data: Array<{ realmId: string; clientName: string }> = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length >= Math.max(realmIdIndex, clientNameIndex) + 1) {
        const realmId = values[realmIdIndex];
        const clientName = values[clientNameIndex];
        
        if (realmId && clientName) {
          data.push({ realmId, clientName });
        }
      }
    }
    
    return data;
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    
    try {
      // Get current user and their firm
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', user.id)
        .single();

      if (!profile?.firm_id) throw new Error('User not associated with a firm');

      // Read and parse CSV
      const csvText = await file.text();
      const csvData = parseCSV(csvText);
      
      setProgress(25);

      // Process each row
      const results = {
        totalRows: csvData.length,
        successfulRows: 0,
        failedRows: 0,
        errors: [] as string[]
      };

      for (let i = 0; i < csvData.length; i++) {
        const { realmId, clientName } = csvData[i];
        
        try {
          const { error } = await supabase
            .from('clients')
            .insert({
              firm_id: profile.firm_id,
              realm_id: realmId,
              client_name: clientName,
              name: clientName, // Keep both for compatibility
              created_by: user.id,
              connection_status: 'pending',
              is_active: true
            });

          if (error) {
            if (error.code === '23505') { // Unique constraint violation
              results.errors.push(`Row ${i + 2}: Client with Realm ID "${realmId}" already exists`);
            } else {
              results.errors.push(`Row ${i + 2}: ${error.message}`);
            }
            results.failedRows++;
          } else {
            results.successfulRows++;
          }
        } catch (err) {
          results.errors.push(`Row ${i + 2}: Unexpected error - ${err}`);
          results.failedRows++;
        }
        
        setProgress(25 + ((i + 1) / csvData.length) * 60);
      }

      // Save upload history
      await supabase
        .from('bulk_upload_history')
        .insert({
          firm_id: profile.firm_id,
          uploaded_by: user.id,
          file_name: file.name,
          total_rows: results.totalRows,
          successful_rows: results.successfulRows,
          failed_rows: results.failedRows,
          error_details: results.errors.length > 0 ? { errors: results.errors } : null
        });

      setProgress(100);
      setResult(results);

      toast({
        title: "Upload completed",
        description: `${results.successfulRows} clients added successfully`,
      });

      onUploadComplete();
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    setUploading(false);
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Client Upload
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file with client data. Format: Realm_ID, Client Name
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!result && (
            <>
              <div className="space-y-2">
                <Label htmlFor="csv-file">CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </div>

              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {file.name} ({Math.round(file.size / 1024)} KB)
                </div>
              )}

              {uploading && (
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-center text-muted-foreground">
                    Processing... {Math.round(progress)}%
                  </p>
                </div>
              )}
            </>
          )}

          {result && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Upload completed: {result.successfulRows} of {result.totalRows} clients added successfully
                </AlertDescription>
              </Alert>

              {result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div>{result.failedRows} rows failed:</div>
                      <div className="max-h-32 overflow-y-auto text-xs">
                        {result.errors.slice(0, 5).map((error, i) => (
                          <div key={i}>{error}</div>
                        ))}
                        {result.errors.length > 5 && (
                          <div>... and {result.errors.length - 5} more errors</div>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result && (
              <Button 
                onClick={handleUpload} 
                disabled={!file || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}