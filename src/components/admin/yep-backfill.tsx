'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  RefreshCw, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Key
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { backfillAuthFields, generateInviteCodes } from '@/app/youth-empowerment/backfill-auth-fields';

export function YEPBackfill() {
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);
  const [backfillResults, setBackfillResults] = useState<any>(null);
  const [codeResults, setCodeResults] = useState<any>(null);
  const { toast } = useToast();

  const handleBackfill = async () => {
    if (!confirm('This will update all existing participant and mentor records. Continue?')) {
      return;
    }

    setIsBackfilling(true);
    setBackfillResults(null);

    try {
      const results = await backfillAuthFields();
      setBackfillResults(results);

      if (results.success) {
        toast({
          title: 'Backfill Complete',
          description: `Updated ${results.participantsUpdated} participants and ${results.mentorsUpdated} mentors`,
        });
      } else {
        toast({
          title: 'Backfill Completed with Errors',
          description: `Updated records but encountered ${results.errors.length} errors`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error running backfill:', error);
      toast({
        title: 'Error',
        description: 'Failed to run backfill',
        variant: 'destructive',
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleGenerateCodes = async () => {
    if (!confirm('This will generate invite codes for records without them. Continue?')) {
      return;
    }

    setIsGeneratingCodes(true);
    setCodeResults(null);

    try {
      const results = await generateInviteCodes();
      setCodeResults(results);

      if (results.success) {
        toast({
          title: 'Codes Generated',
          description: `Generated codes for ${results.participantsUpdated} participants and ${results.mentorsUpdated} mentors`,
        });
      } else {
        toast({
          title: 'Error',
          description: results.error || 'Failed to generate codes',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error generating codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate codes',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Migration & Backfill
          </CardTitle>
          <CardDescription>
            One-time operations to prepare existing data for the new profile system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              These operations should only be run once after deploying the profile system.
              They update existing participant and mentor records to work with user profiles.
            </AlertDescription>
          </Alert>

          {/* Backfill Auth Fields */}
          <div className="space-y-3">
            <div>
              <h4 className="font-medium mb-2">Backfill Auth Fields</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Add authEmail and profileCompleted fields to all existing records based on their email addresses.
              </p>
            </div>

            <Button
              onClick={handleBackfill}
              disabled={isBackfilling}
              variant="outline"
              className="w-full"
            >
              {isBackfilling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Backfill...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run Auth Fields Backfill
                </>
              )}
            </Button>

            {backfillResults && (
              <Alert variant={backfillResults.success ? 'default' : 'destructive'}>
                {backfillResults.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <div className="space-y-1">
                    <p>Participants updated: {backfillResults.participantsUpdated}</p>
                    <p>Mentors updated: {backfillResults.mentorsUpdated}</p>
                    {backfillResults.errors.length > 0 && (
                      <p className="text-red-600">Errors: {backfillResults.errors.length}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Generate Invite Codes */}
          <div className="space-y-3 pt-4 border-t">
            <div>
              <h4 className="font-medium mb-2">Generate Invite Codes</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Generate unique invite codes for records that don't have them yet.
                Users can use these codes to claim their profiles if email matching fails.
              </p>
            </div>

            <Button
              onClick={handleGenerateCodes}
              disabled={isGeneratingCodes}
              variant="outline"
              className="w-full"
            >
              {isGeneratingCodes ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Codes...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Generate Invite Codes
                </>
              )}
            </Button>

            {codeResults && (
              <Alert variant={codeResults.success ? 'default' : 'destructive'}>
                {codeResults.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <div className="space-y-1">
                    <p>Participant codes generated: {codeResults.participantsUpdated}</p>
                    <p>Mentor codes generated: {codeResults.mentorsUpdated}</p>
                    {codeResults.error && (
                      <p className="text-red-600">{codeResults.error}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}








