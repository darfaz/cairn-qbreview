import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CSVRow {
  'Client Name': string;
  'Realm_ID': string;
  'Dropbox': string;
  'Dropbox to': string;
}

interface ValidationError {
  row: number;
  message: string;
}

interface CSVUploadProps {
  firmId: string;
  onUploadComplete: () => void;
}

export function CSVUpload({ firmId, onUploadComplete }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [successCount, setSuccessCount] = useState(0);

  const parseScientificNotation = (value: string): string => {
    // Handle scientific notation like 9.34E+15
    if (value.includes('E') || value.includes('e')) {
      return parseFloat(value).toFixed(0);
    }
    return value;
  };

  const validateRow = (row: CSVRow, rowIndex: number): ValidationError | null => {
    if (!row['Client Name']?.trim()) {
      return { row: rowIndex, message: 'Missing Client Name' };
    }
    if (!row['Realm_ID']?.trim()) {
      return { row: rowIndex, message: 'Missing Realm_ID' };
    }
    if (row['Dropbox']?.trim() && !row['Dropbox'].startsWith('https://www.dropbox.com/')) {
      return { row: rowIndex, message: 'Invalid Dropbox URL format' };
    }
    if (row['Dropbox to']?.trim() && !row['Dropbox to'].startsWith('/')) {
      return { row: rowIndex, message: 'Dropbox path must start with /' };
    }
    return null;
  };

  const processCSV = async (file: File) => {
    setIsProcessing(true);
    setErrors([]);
    setSuccessCount(0);

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const validationErrors: ValidationError[] = [];
        const validRows: any[] = [];

        results.data.forEach((row, index) => {
          const error = validateRow(row, index + 2); // +2 for header and 0-indexing
          if (error) {
            validationErrors.push(error);
          } else {
            validRows.push({
              firm_id: firmId,
              client_name: row['Client Name'].trim(),
              realm_id: parseScientificNotation(row['Realm_ID'].trim()),
              dropbox_folder_url: row['Dropbox']?.trim() || null,
              dropbox_folder_path: row['Dropbox to']?.trim() || null,
            });
          }
        });

        if (validationErrors.length > 0) {
          setErrors(validationErrors);
          toast.error(`Found ${validationErrors.length} validation error(s)`);
        }

        if (validRows.length > 0) {
          try {
            const { data, error } = await supabase
              .from('clients')
              .upsert(validRows, { 
                onConflict: 'realm_id',
                ignoreDuplicates: false 
              })
              .select();

            if (error) {
              toast.error(`Database error: ${error.message}`);
            } else {
              setSuccessCount(data?.length || validRows.length);
              toast.success(`Successfully imported ${data?.length || validRows.length} clients`);
              onUploadComplete();
            }
          } catch (err: any) {
            toast.error(`Import failed: ${err.message}`);
          }
        }

        setIsProcessing(false);
      },
      error: (error) => {
        toast.error(`CSV parsing error: ${error.message}`);
        setIsProcessing(false);
      }
    });
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    processCSV(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [firmId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Import Clients from CSV
        </CardTitle>
        <CardDescription>
          Upload a CSV file with columns: Client Name, Realm_ID, Dropbox, Dropbox to
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border'
          }`}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop your CSV file here, or click to browse
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
            id="csv-upload"
            disabled={isProcessing}
          />
          <label htmlFor="csv-upload">
            <Button asChild disabled={isProcessing}>
              <span>{isProcessing ? 'Processing...' : 'Choose File'}</span>
            </Button>
          </label>
        </div>

        {successCount > 0 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Successfully imported {successCount} client{successCount !== 1 ? 's' : ''}
            </AlertDescription>
          </Alert>
        )}

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Validation Errors:</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {errors.slice(0, 5).map((error, idx) => (
                  <li key={idx}>Row {error.row}: {error.message}</li>
                ))}
                {errors.length > 5 && (
                  <li className="text-muted-foreground">...and {errors.length - 5} more</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
