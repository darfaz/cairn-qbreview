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

  const processCSV = async (file: File) => {
    setIsUploading(true);
    setProgress(0);
    setResult(null);

    // Get user's firm_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to upload clients',
        variant: 'destructive',
      });
      setIsUploading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('firm_id')
      .eq('id', user.id)
      .single();

    const firmId = profile?.firm_id;
    if (!firmId) {
      toast({
        title: 'Firm Not Found',
        description: 'No firm found for your account',
        variant: 'destructive',
      });
      setIsUploading(false);
      return;
    }

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const errors: ValidationError[] = [];
        let successCount = 0;
        let skippedCount = 0;
        const totalRows = results.data.length;

        // Validate all rows first
        const validatedRows = results.data.map((row, index) => {
          const rowErrors = validateRow(row, index + 2); // +2 for header and 1-based index
          errors.push(...rowErrors);
          
          return {
            data: row,
            hasErrors: rowErrors.some(e => e.type === 'error'),
            index: index + 2
          };
        });

        // Process valid rows
        for (let i = 0; i < validatedRows.length; i++) {
          const { data: row, hasErrors, index } = validatedRows[i];
          
          // Skip rows with errors
          if (hasErrors) {
            skippedCount++;
            setProgress(((i + 1) / totalRows) * 100);
            continue;
          }

          try {
            // Convert realm_id from scientific notation if needed
            const realmId = convertScientificNotation(row['Realm_ID'].trim());
            
            // Check if realm_id already exists
            const { data: existingClient } = await supabase
              .from('clients')
              .select('id')
              .eq('realm_id', realmId)
              .single();

            if (existingClient) {
              errors.push({
                row: index,
                message: `Realm ID ${realmId} already exists`,
                type: 'error'
              });
              skippedCount++;
              setProgress(((i + 1) / totalRows) * 100);
              continue;
            }

            // Validate with zod
            const validatedData = clientRowSchema.parse({
              client_name: row['Client Name'].trim(),
              realm_id: realmId,
              dropbox_folder_url: row['Dropbox']?.trim() || null,
              dropbox_folder_path: row['Dropbox to']?.trim() || null,
            });

            // Insert client
            const { error: insertError } = await supabase
              .from('clients')
              .insert({
                firm_id: firmId,
                client_name: validatedData.client_name,
                realm_id: validatedData.realm_id,
                dropbox_folder_url: validatedData.dropbox_folder_url,
                dropbox_folder_path: validatedData.dropbox_folder_path,
              });

            if (insertError) {
              errors.push({
                row: index,
                message: insertError.message,
                type: 'error'
              });
              skippedCount++;
            } else {
              successCount++;
            }
          } catch (error) {
            errors.push({
              row: index,
              message: error instanceof Error ? error.message : 'Unknown error',
              type: 'error'
            });
            skippedCount++;
          }

          setProgress(((i + 1) / totalRows) * 100);
        }

        setResult({
          success: successCount,
          skipped: skippedCount,
          errors: errors
        });

        if (successCount > 0) {
          toast({
            title: 'Upload Complete',
            description: `${successCount} clients imported successfully`,
          });
          
          // Trigger dashboard refresh
          if (onUploadComplete) {
            onUploadComplete();
          }
        } else {
          toast({
            title: 'Upload Failed',
            description: 'No clients were imported',
            variant: 'destructive',
          });
        }

        setIsUploading(false);
      },
      error: (error) => {
        toast({
          title: 'Parse Error',
          description: error.message,
          variant: 'destructive',
        });
        setIsUploading(false);
      }
    });
  };

  const handleFileSelect = (file: File) => {
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

    processCSV(file);
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
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
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
            onChange={handleFileInputChange}
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