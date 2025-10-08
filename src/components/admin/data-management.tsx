'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Database, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createFullBackup, exportDataAsJSON } from '@/lib/backup-manager';

export function DataManagement() {
  const [backupLoading, setBackupLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    const result = await createFullBackup();
    
    if (result.success && result.metadata) {
      toast({
        title: 'Backup Created',
        description: `Successfully backed up ${result.metadata.count} items`,
      });
    } else {
      toast({
        title: 'Backup Failed',
        description: result.error || 'Unknown error',
        variant: 'destructive',
      });
    }
    setBackupLoading(false);
  };

  const handleExportData = async () => {
    setExportLoading(true);
    const result = await exportDataAsJSON();
    
    if (result.success && result.data) {
      // Create download
      const blob = new Blob([result.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Complete',
        description: 'Data has been downloaded to your computer',
      });
    } else {
      toast({
        title: 'Export Failed',
        description: result.error || 'Unknown error',
        variant: 'destructive',
      });
    }
    setExportLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Data Backup & Export</CardTitle>
          <CardDescription>
            Backup your data to Firestore or export to JSON
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Regular backups are recommended. Always backup before major changes.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Firestore Backup */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Firestore Backup</CardTitle>
                <CardDescription className="text-xs">
                  Store backup in Firestore backups collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleCreateBackup}
                  disabled={backupLoading}
                  className="w-full"
                >
                  {backupLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Backup...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" />
                      Create Backup
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Backs up all surveys and submissions to Firestore
                </p>
              </CardContent>
            </Card>

            {/* JSON Export */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Export to JSON</CardTitle>
                <CardDescription className="text-xs">
                  Download all data as a JSON file
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleExportData}
                  disabled={exportLoading}
                  variant="outline"
                  className="w-full"
                >
                  {exportLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export Data
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Downloads a JSON file to your computer
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
            <p className="font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Best Practices
            </p>
            <ul className="space-y-1 text-muted-foreground ml-6 list-disc">
              <li>Create backups daily or before major updates</li>
              <li>Store JSON exports in a secure location</li>
              <li>Test restore procedures periodically</li>
              <li>Keep backups for at least 30 days</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

