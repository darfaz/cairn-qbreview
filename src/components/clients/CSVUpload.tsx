import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { z } from 'zod';

interface CSVRow {
  'Client Name': string;
  'Realm_ID': string;
  'Dropbox'?: string;
  'Dropbox to'?: string;
}

interface ValidationError {
  row: number;
  message: string;
  type: 'error' | 'warning';
}

interface ImportResult {
  success: number;
  skipped: number;
  errors: ValidationError[];
}

const clientRowSchema = z.object({
  client_name: z.string().trim().min(1, 'Client Name is required').max(255, 'Client Name too long'),
  realm_id: z.string().trim().min(1, 'Realm ID is required').max(50, 'Realm ID too long'),
  dropbox_folder_url: z.string().optional(),
  dropbox_folder_path: z.string().optional(),
});

export function CSVUpload({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Convert scientific notation to full string
  const convertScientificNotation = (value: string): string => {
    if (!value) return '';
    
    // Check if it's in scientific notation
    if (value.includes('E') || value.includes('e')) {
      try {
        const num = parseFloat(value);
        // Convert to full string without scientific notation
        return num.toFixed(0);
      } catch {
        return value;
      }
    }
    
    return value;
  };

  const validateRow = (row: CSVRow, rowIndex: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // Check required fields
    if (!row['Client Name'] || row['Client Name'].trim() === '') {
      errors.push({
        row: rowIndex,
        message: 'Missing Client Name',
        type: 'error'
      });
    }
    
    if (!row['Realm_ID'] || row['Realm_ID'].trim() === '') {
      errors.push({
        row: rowIndex,
        message: 'Missing Realm ID',
        type: 'error'
      });
    }
    
    // Validate Dropbox URL format (warning only)
    if (row['Dropbox'] && !row['Dropbox'].startsWith('https://www.dropbox.com/')) {
      errors.push({
        row: rowIndex,
        message: 'Dropbox URL should start with "https://www.dropbox.com/"',
        type: 'warning'
      });
    }
    
    // Validate Dropbox path format (warning only)
    if (row['Dropbox to'] && !row['Dropbox to'].startsWith('/')) {
      errors.push({
        row: rowIndex,
        message: 'Dropbox path should start with "/"',
        type: 'warning'
      });
    }
    
    return errors;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'File size must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setResult(null);

    try {
      // Step 1: Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: 'Authentication Error',
          description: 'Not authenticated',
          variant: 'destructive',
        });
        setIsUploading(false);
        return;
      }

      // Step 2: Get or create firm
      let firmId: string;
      
      const { data: existingFirm } = await supabase
        .from('firms')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (existingFirm) {
        firmId = existingFirm.id;
      } else {
        // Create firm if doesn't exist
        const { data: newFirm, error: firmError } = await supabase
          .from('firms')
          .insert({ 
            firm_name: user.email?.split('@')[0] || 'My Firm',
            owner_id: user.id 
          })
          .select('id')
          .single();
        
        if (firmError || !newFirm) {
          console.error('Failed to create firm:', firmError);
          toast({
            title: 'Error',
            description: 'Failed to create firm',
            variant: 'destructive',
          });
          setIsUploading(false);
          return;
        }
        firmId = newFirm.id;
      }

      // Step 3: Update profile with firm_id
      await supabase
        .from('profiles')
        .update({ firm_id: firmId })
        .eq('id', user.id);

      // Step 4: Parse CSV and insert clients
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const validRows = results.data.filter((row: any) => 
            row.client_name && row.realm_id
          );

          if (validRows.length === 0) {
            toast({
              title: 'No Valid Data',
              description: 'No valid rows found in CSV',
              variant: 'destructive',
            });
            setIsUploading(false);
            return;
          }

          const clientsToInsert = validRows.map((row: any) => ({
            client_name: row.client_name?.trim(),
            realm_id: row.realm_id?.trim(),
            firm_id: firmId,
            dropbox_folder_url: row.dropbox_folder_url?.trim() || null,
          }));

          const { data, error } = await supabase
            .from('clients')
            .insert(clientsToInsert)
            .select();

          if (error) {
            console.error('Insert error:', error);
            toast({
              title: 'Upload Failed',
              description: `Failed to upload: ${error.message}`,
              variant: 'destructive',
            });
            setResult({
              success: 0,
              skipped: validRows.length,
              errors: [{ row: 0, message: error.message, type: 'error' }]
            });
          } else {
            toast({
              title: 'Upload Complete',
              description: `Successfully uploaded ${data.length} clients`,
            });
            setResult({
              success: data.length,
              skipped: 0,
              errors: []
            });
            if (onUploadComplete) onUploadComplete();
          }

          setProgress(100);
          setIsUploading(false);
        },
        error: (error) => {
          console.error('Parse error:', error);
          toast({
            title: 'Parse Error',
            description: 'Failed to parse CSV file',
            variant: 'destructive',
          });
          setIsUploading(false);
        },
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload CSV',
        variant: 'destructive',
      });
      setIsUploading(false);
    }
  };


  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && fileInputRef.current) {
      // Set the files on the input and trigger the change event
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
      fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Client Upload
        </CardTitle>
        <CardDescription>
          Upload a CSV file to import multiple clients at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleUpload}
            className="hidden"
            disabled={isUploading}
          />
          
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            {isDragging ? 'Drop your file here' : 'Upload CSV File'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop your CSV file here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Maximum file size: 5MB • Supported format: .csv
          </p>
        </div>

        {/* CSV Format Instructions */}
        <Alert>
          <AlertDescription>
            <p className="font-medium mb-2">Required CSV columns:</p>
            <ul className="text-sm space-y-1 ml-4 list-disc">
              <li><strong>Client Name</strong> - Name of the client (required)</li>
              <li><strong>Realm_ID</strong> - QuickBooks Realm ID (required, must be unique)</li>
              <li><strong>Dropbox</strong> - Dropbox folder URL (optional)</li>
              <li><strong>Dropbox to</strong> - Dropbox folder path (optional)</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Progress Bar */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Processing clients and validating data...
            </p>
          </div>
        )}

        {/* Results */}
        {result && !isUploading && (
          <div className="space-y-4">
            {/* Success Summary */}
            {result.success > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>✓ {result.success} clients imported successfully</strong>
                </AlertDescription>
              </Alert>
            )}

            {/* Error Summary */}
            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">
                    {result.skipped > 0 && `Skipped ${result.skipped} rows with errors:`}
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-sm">
                        <strong>Row {error.row}:</strong> {error.message}
                        {error.type === 'warning' && ' (Warning)'}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Reset Button */}
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setProgress(0);
              }}
              className="w-full"
            >
              Upload Another File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}