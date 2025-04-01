import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, AlertCircle, FileUp, CheckCircle, XCircle } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

interface ImportResponse {
  message: string;
  result: ImportResult;
}

interface GoogleSheetsImportFormData {
  credentials: string;
  spreadsheetId: string;
  range: string;
}

export default function ScheduleImport() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'google-sheets' | 'csv'>('google-sheets');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<GoogleSheetsImportFormData>({
    defaultValues: {
      credentials: '',
      spreadsheetId: '',
      range: 'Sheet1!A1:E'
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleGoogleSheetsImport = async (data: GoogleSheetsImportFormData) => {
    try {
      setImporting(true);
      setImportResult(null);

      const response = await apiRequest(
        'POST',
        '/api/schedule/import/google-sheets',
        {
          credentials: JSON.parse(data.credentials),
          spreadsheetId: data.spreadsheetId,
          range: data.range
        }
      ) as ImportResponse;

      setImportResult(response.result);
      toast({
        title: 'Import Completed',
        description: response.message,
        variant: 'default'
      });

      // Invalidate schedule queries to reflect the new data
      queryClient.invalidateQueries({ queryKey: ['/api/schedule'] });
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleCsvImport = async () => {
    if (!selectedFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a CSV file to import',
        variant: 'destructive'
      });
      return;
    }

    try {
      setImporting(true);
      setImportResult(null);

      const formData = new FormData();
      formData.append('csvFile', selectedFile);

      const response = await fetch('/api/schedule/import/csv', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import from CSV');
      }

      const result = await response.json();
      setImportResult(result.result);
      
      toast({
        title: 'Import Completed',
        description: result.message,
        variant: 'default'
      });

      // Reset file input
      setSelectedFile(null);
      const fileInput = document.getElementById('csvFile') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Invalidate schedule queries to reflect the new data
      queryClient.invalidateQueries({ queryKey: ['/api/schedule'] });
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Schedule</CardTitle>
          <CardDescription>
            Import schedules from Google Sheets or a CSV file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue={activeTab}
            onValueChange={(value) => setActiveTab(value as 'google-sheets' | 'csv')}
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="google-sheets">
                Google Sheets (API)
              </TabsTrigger>
              <TabsTrigger value="csv">
                CSV Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="google-sheets">
              <form onSubmit={handleSubmit(handleGoogleSheetsImport)}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="credentials">Google API Credentials (JSON)</Label>
                    <Textarea
                      id="credentials"
                      placeholder='{"type": "service_account", ...}'
                      className="h-32"
                      {...register('credentials', {
                        required: 'Google API credentials are required',
                        validate: (value) => {
                          try {
                            JSON.parse(value);
                            return true;
                          } catch (e) {
                            return 'Invalid JSON format';
                          }
                        }
                      })}
                    />
                    {errors.credentials && (
                      <p className="text-sm text-red-500">{errors.credentials.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="spreadsheetId">Google Spreadsheet ID</Label>
                    <Input
                      id="spreadsheetId"
                      placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                      {...register('spreadsheetId', {
                        required: 'Spreadsheet ID is required'
                      })}
                    />
                    {errors.spreadsheetId && (
                      <p className="text-sm text-red-500">{errors.spreadsheetId.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="range">
                      Sheet Range <span className="text-gray-500">(Optional)</span>
                    </Label>
                    <Input
                      id="range"
                      placeholder="Sheet1!A1:E"
                      {...register('range')}
                    />
                    <p className="text-xs text-gray-500">
                      Format: SheetName!StartCell:EndColumn (e.g., Sheet1!A1:E)
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" disabled={importing} className="w-full">
                      {importing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        'Import from Google Sheets'
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="csv">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csvFile">Upload CSV File</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                    <Input
                      id="csvFile"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="csvFile"
                      className="cursor-pointer flex flex-col items-center justify-center"
                    >
                      <FileUp className="h-8 w-8 text-gray-500 mb-2" />
                      <span className="text-sm font-medium">
                        {selectedFile ? selectedFile.name : 'Click to select CSV file'}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        The file should have columns: subjectId, dayOfWeek, startTime, endTime, roomNumber
                      </p>
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleCsvImport}
                    disabled={importing || !selectedFile}
                    className="w-full"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      'Import from CSV'
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Import Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>
              Successfully imported {importResult.success} out of {importResult.total} schedule items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 mb-4 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="font-medium">Success: {importResult.success}</span>
              </div>
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="font-medium">Failed: {importResult.failed}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium">Total: {importResult.total}</span>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-red-600">Errors</h3>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {importResult.errors.map((error, index) => (
                    <Alert variant="destructive" key={index}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Row {error.row}</AlertTitle>
                      <AlertDescription>{error.error}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => setImportResult(null)}>
              Close Results
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}