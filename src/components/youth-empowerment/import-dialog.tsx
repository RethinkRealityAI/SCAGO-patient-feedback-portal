'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  Database, 
  Shield, 
  Filter,
  Calendar,
  Users,
  GraduationCap,
  MessageSquare,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
  Eye,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  ImportOptions, 
  ImportResult, 
  ImportMapping, 
  ImportPreview,
  parseCSV, 
  parseJSON,
  generateMappingSuggestions,
  generateImportPreview,
  validateData,
  convertDataTypes,
  checkDuplicates,
  SUPPORTED_FORMATS
} from '@/lib/import-utils';
import { importData } from '@/app/youth-empowerment/import-actions';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultTargetTable?: 'participants' | 'mentors' | 'workshops' | 'attendance' | 'meetings';
}

export function ImportDialog({ isOpen, onClose, onSuccess, defaultTargetTable = 'participants' }: ImportDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'select' | 'upload' | 'mapping' | 'preview' | 'import'>('select');
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    targetTable: defaultTargetTable,
    format: 'csv',
    skipDuplicates: true,
    updateExisting: false,
    validateData: true,
    batchSize: 50
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const dataTypes = [
    { 
      id: 'participants', 
      label: 'Participants', 
      icon: Users, 
      description: 'Youth participants and their information',
      requiredFields: ['youthParticipant', 'email', 'region', 'dob', 'canadianStatus']
    },
    { 
      id: 'mentors', 
      label: 'Mentors', 
      icon: GraduationCap, 
      description: 'Mentor information and assignments',
      requiredFields: ['name', 'email']
    },
    { 
      id: 'workshops', 
      label: 'Workshops', 
      icon: Calendar, 
      description: 'Workshop schedules and details',
      requiredFields: ['title', 'date', 'description']
    },
    { 
      id: 'attendance', 
      label: 'Attendance', 
      icon: Target, 
      description: 'Workshop attendance records',
      requiredFields: ['participantId', 'workshopId', 'attended']
    },
    { 
      id: 'meetings', 
      label: 'Meetings', 
      icon: MessageSquare, 
      description: 'Advisor meeting records',
      requiredFields: ['participantId', 'mentorId', 'meetingDate', 'type']
    },
  ];

  const handleTableSelect = (table: string) => {
    setImportOptions(prev => ({ ...prev, targetTable: table as any }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFile(file);
    setImportOptions(prev => ({ 
      ...prev, 
      format: file.name.split('.').pop()?.toLowerCase() as any || 'csv' 
    }));

    try {
      const content = await file.text();
      setFileContent(content);

      // Parse file based on format
      let data: any[] = [];
      if (file.name.endsWith('.csv')) {
        const parsed = parseCSV(content);
        data = parsed.data;
      } else if (file.name.endsWith('.json')) {
        data = parseJSON(content);
      } else {
        throw new Error('Unsupported file format');
      }

      setParsedData(data);

      // Generate mapping suggestions
      const headers = data.length > 0 ? Object.keys(data[0]) : [];
      const suggestions = generateMappingSuggestions(headers, importOptions.targetTable);
      setMapping(suggestions);

      // Generate preview
      const previewData = generateImportPreview(data, importOptions.targetTable, suggestions);
      setPreview(previewData);

      setCurrentStep('mapping');
    } catch (error) {
      toast({
        title: 'File Parse Error',
        description: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const handleMappingChange = (csvColumn: string, dbField: string) => {
    setMapping(prev => ({ ...prev, [csvColumn]: dbField }));
  };

  const handlePreview = () => {
    if (!parsedData.length) return;

    const previewData = generateImportPreview(parsedData, importOptions.targetTable, mapping);
    setPreview(previewData);
    setCurrentStep('preview');
  };

  const handleImport = async () => {
    if (!parsedData.length) return;

    setIsLoading(true);
    try {
      const result = await importData(parsedData, importOptions, mapping);
      setImportResult(result);
      setCurrentStep('import');

      if (result.success) {
        toast({
          title: 'Import Successful',
          description: result.message,
        });
        onSuccess?.();
      } else {
        toast({
          title: 'Import Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Import Error',
        description: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep('select');
    setFile(null);
    setFileContent('');
    setParsedData([]);
    setMapping({});
    setPreview(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const selectedDataType = dataTypes.find(dt => dt.id === importOptions.targetTable);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data
          </DialogTitle>
          <DialogDescription>
            Import data from CSV, JSON, or Excel files into your YEP system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Select Table */}
          {currentStep === 'select' && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Select Data Type</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose which type of data you want to import.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dataTypes.map((dataType) => {
                  const Icon = dataType.icon;
                  return (
                    <Card 
                      key={dataType.id}
                      className={`cursor-pointer transition-colors ${
                        importOptions.targetTable === dataType.id 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleTableSelect(dataType.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5" />
                          <CardTitle className="text-lg">{dataType.label}</CardTitle>
                        </div>
                        <CardDescription>{dataType.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Required Fields:</p>
                          <div className="flex flex-wrap gap-1">
                            {dataType.requiredFields.map(field => (
                              <Badge key={field} variant="secondary" className="text-xs">
                                {field}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setCurrentStep('upload')}>
                  Next: Upload File
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Upload File */}
          {currentStep === 'upload' && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Upload File</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Select a {importOptions.format.toUpperCase()} file to import.
                </p>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium">Choose file to upload</p>
                      <p className="text-sm text-muted-foreground">
                        Supported formats: CSV, JSON, Excel
                      </p>
                    </div>
                    <Button 
                      className="mt-4"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Select File
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.json,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </CardContent>
              </Card>

              {file && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('select')}>
                  Back
                </Button>
                {file && (
                  <Button onClick={() => setCurrentStep('mapping')}>
                    Next: Field Mapping
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Field Mapping */}
          {currentStep === 'mapping' && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Field Mapping</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Map your file columns to the database fields.
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Column Mapping</CardTitle>
                  <CardDescription>
                    Match your file columns to the required database fields.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Column</TableHead>
                        <TableHead>Database Field</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.length > 0 && Object.keys(parsedData[0]).map((column) => (
                        <TableRow key={column}>
                          <TableCell className="font-medium">{column}</TableCell>
                          <TableCell>
                            <Select
                              value={(mapping[column] as string) || 'skip'}
                              onValueChange={(value) => handleMappingChange(column, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select field" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="skip">Skip this column</SelectItem>
                                {selectedDataType?.requiredFields.map(field => (
                                  <SelectItem key={field} value={field}>
                                    {field} (Required)
                                  </SelectItem>
                                ))}
                                {importOptions.targetTable === 'participants' && ['etransferEmailAddress', 'mailingAddress', 'phoneNumber', 'approved', 'contractSigned', 'signedSyllabus', 'availability', 'assignedMentor', 'idProvided', 'canadianStatusOther', 'sin', 'youthProposal', 'proofOfAffiliationWithSCD', 'scagoCounterpart', 'age', 'citizenshipStatus', 'location', 'projectCategory', 'duties', 'affiliationWithSCD', 'notes', 'nextSteps', 'interviewed', 'interviewNotes', 'recruited'].map(field => (
                                  <SelectItem key={field} value={field}>
                                    {field} (Optional)
                                  </SelectItem>
                                ))}
                                {importOptions.targetTable === 'mentors' && ['email', 'phone', 'vulnerableSectorCheck', 'contractSigned', 'availability', 'assignedStudents', 'file'].map(field => (
                                  <SelectItem key={field} value={field}>
                                    {field} (Optional)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {mapping[column] ? (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Mapped
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                <XCircle className="h-3 w-3 mr-1" />
                                Skipped
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                  Back
                </Button>
                <Button onClick={handlePreview}>
                  Next: Preview Data
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Preview */}
          {currentStep === 'preview' && preview && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Import Preview</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Review the data before importing.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span className="font-medium">Total Rows</span>
                    </div>
                    <p className="text-2xl font-bold">{preview.totalRows}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">Mapped Fields</span>
                    </div>
                    <p className="text-2xl font-bold">{Object.keys(preview.mapping).length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Validation Errors</span>
                    </div>
                    <p className="text-2xl font-bold text-destructive">{preview.validationErrors.length}</p>
                  </CardContent>
                </Card>
              </div>

              {preview.validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Found {preview.validationErrors.length} validation errors. 
                    Please review and fix before importing.
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sample Data</CardTitle>
                  <CardDescription>
                    First 5 rows of your data (mapped fields only)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.entries(preview.mapping).map(([csvColumn, dbField]) => (
                            <TableHead key={csvColumn}>{dbField}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.sampleData.slice(0, 5).map((row, index) => (
                          <TableRow key={index}>
                            {Object.entries(preview.mapping).map(([csvColumn, dbField]) => (
                              <TableCell key={csvColumn}>
                                {row[csvColumn] || '-'}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('mapping')}>
                  Back
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={preview.validationErrors.length > 0}
                >
                  Import Data
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Import Results */}
          {currentStep === 'import' && importResult && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Import Results</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Import process completed.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Imported</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Updated</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{importResult.updated}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-gray-600" />
                      <span className="font-medium">Skipped</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-600">{importResult.skipped}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="font-medium">Errors</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{importResult.errors.length}</p>
                  </CardContent>
                </Card>
              </div>

              {importResult.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-destructive">Import Errors</CardTitle>
                    <CardDescription>
                      {importResult.errors.length} errors occurred during import
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {importResult.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="text-sm p-2 bg-destructive/10 rounded">
                          <span className="font-medium">Row {error.row}:</span> {error.message}
                        </div>
                      ))}
                      {importResult.errors.length > 10 && (
                        <p className="text-sm text-muted-foreground">
                          ... and {importResult.errors.length - 10} more errors
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end">
                <Button onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Data is processed securely
            </span>
          </div>
          <div className="flex gap-2">
            {currentStep !== 'select' && (
              <Button variant="outline" onClick={handleReset}>
                Start Over
              </Button>
            )}
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
