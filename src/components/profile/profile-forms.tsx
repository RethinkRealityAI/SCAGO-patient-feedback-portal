'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, CheckCircle, AlertCircle, History, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getYEPFormTemplatesForParticipantProfile, getYEPFormSubmissionsForParticipant } from '@/app/yep-forms/actions';
import { YEPFormTemplate, YEPFormSubmission } from '@/lib/yep-forms-types';
import YEPFormSubmission from '@/components/yep-forms/yep-form-submission';
import { format } from 'date-fns';

interface ProfileFormsProps {
  profile: any;
  role: 'participant' | 'mentor';
}

export function ProfileForms({ profile, role }: ProfileFormsProps) {
  const [forms, setForms] = useState<YEPFormTemplate[]>([]);
  const [completedForms, setCompletedForms] = useState<YEPFormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedForm, setSelectedForm] = useState<YEPFormTemplate | null>(null);
  const [activeTab, setActiveTab] = useState('available');
  const { toast } = useToast();

  useEffect(() => {
    loadForms();
    if (role === 'participant' && profile?.id) {
      loadCompletedForms();
    }
  }, [profile?.id, role]);

  const loadForms = async () => {
    setLoading(true);
    try {
      const result = await getYEPFormTemplatesForParticipantProfile();
      if (result.success && result.data) {
        setForms(result.data);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load forms',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading forms:', error);
      toast({
        title: 'Error',
        description: 'Failed to load forms',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedForms = async () => {
    if (!profile?.id) return;
    setLoadingHistory(true);
    try {
      const result = await getYEPFormSubmissionsForParticipant(profile.id);
      if (result.success && result.data) {
        setCompletedForms(result.data);
      }
    } catch (error) {
      console.error('Error loading completed forms:', error);
    } finally {
      setLoadingHistory(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If a form is selected, show the form submission interface
  if (selectedForm) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => {
            setSelectedForm(null);
            loadCompletedForms(); // Refresh completed forms after submission
          }}
          className="mb-4"
        >
          ← Back to Forms List
        </Button>
        <YEPFormSubmission 
          formTemplate={selectedForm} 
          onSubmissionSuccess={() => {
            loadCompletedForms();
            setActiveTab('completed'); // Switch to completed tab to show the new submission
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="available" className="gap-2">
            <FileText className="h-4 w-4" />
            Available Forms
          </TabsTrigger>
          {role === 'participant' && (
            <TabsTrigger value="completed" className="gap-2">
              <History className="h-4 w-4" />
              Completed Forms ({completedForms.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : forms.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No forms are currently available for your profile. Forms will appear here once they are made available by administrators.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-2">Available Forms</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Fill out and submit forms that are available for your profile.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {forms.map((form) => {
                  const isCompleted = completedForms.some(
                    (submission) => submission.formTemplateId === form.id && 
                                  submission.processingStatus === 'completed'
                  );
                  return (
                    <Card key={form.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{form.name}</CardTitle>
                              {isCompleted && (
                                <Badge variant="default" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                            </div>
                            {form.description && (
                              <CardDescription className="mt-2">
                                {form.description}
                              </CardDescription>
                            )}
                          </div>
                          <FileText className="h-5 w-5 text-muted-foreground ml-2" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="mb-4">
                            {form.category.replace(/([A-Z])/g, ' $1').trim()}
                          </Badge>
                        </div>
                        <Button
                          onClick={() => setSelectedForm(form)}
                          className="w-full"
                        >
                          {isCompleted ? 'Fill Out Again' : 'Fill Out Form'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {role === 'participant' && (
          <TabsContent value="completed" className="space-y-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : completedForms.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You haven't completed any forms yet. Complete a form from the "Available Forms" tab to see it here.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Completed Forms</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    View your previously submitted forms and their status.
                  </p>
                </div>

                <div className="space-y-4">
                  {completedForms.map((submission) => {
                    const submittedDate = submission.submittedAt instanceof Date 
                      ? submission.submittedAt 
                      : new Date(submission.submittedAt);
                    
                    return (
                      <Card key={submission.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">
                                {submission.formTemplateName || 'Unknown Form'}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                Submitted on {format(submittedDate, 'PPP p')}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              {submission.processingStatus === 'completed' && (
                                <Badge variant="default" className="gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Completed
                                </Badge>
                              )}
                              {submission.processingStatus === 'pending' && (
                                <Badge variant="secondary" className="gap-1">
                                  <Clock className="h-3 w-3" />
                                  Pending
                                </Badge>
                              )}
                              {submission.processingStatus === 'failed' && (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Failed
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        {submission.errorMessage && (
                          <CardContent>
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>{submission.errorMessage}</AlertDescription>
                            </Alert>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

