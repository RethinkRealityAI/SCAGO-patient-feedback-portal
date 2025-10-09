'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { importCurrentParticipants } from '@/app/youth-empowerment/import-current-participants';

interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  skipped: number;
}

export function CurrentParticipantsImporter() {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const handleImport = async () => {
    setIsImporting(true);
    setImportResult(null);
    
    try {
      const result = await importCurrentParticipants();
      setImportResult(result);
      
      if (result.success) {
        toast({
          title: 'Import Successful',
          description: result.message,
        });
      } else {
        toast({
          title: 'Import Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Import Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setImportResult({
        success: false,
        message: errorMessage,
        imported: 0,
        skipped: 0
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Import Current Participants
        </CardTitle>
        <CardDescription>
          Import all current participants from the markdown data into the youth participants table.
          This will add new columns and import all existing participant data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium">What this import will do:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• Import 35+ current participants from the markdown data</li>
            <li>• Add new columns: age, citizenship status, location, project category, etc.</li>
            <li>• Map citizenship status to Canadian Citizen/Permanent Resident/Other</li>
            <li>• Map locations to regions (Toronto, Ottawa, Quebec, Other)</li>
            <li>• Calculate DOB from age where available</li>
            <li>• Skip participants that already exist (by email)</li>
            <li>• Set recruited status based on existing data</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleImport} 
            disabled={isImporting}
            className="flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Users className="h-4 w-4" />
                Import Current Participants
              </>
            )}
          </Button>
        </div>

        {importResult && (
          <Alert className={importResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <div className="flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={importResult.success ? 'text-green-800' : 'text-red-800'}>
                {importResult.message}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground">
          <p><strong>Note:</strong> This import will only add new participants. Existing participants (by email) will be skipped.</p>
          <p>The import includes participants from the Current Participants.md file with all their associated data.</p>
        </div>
      </CardContent>
    </Card>
  );
}
