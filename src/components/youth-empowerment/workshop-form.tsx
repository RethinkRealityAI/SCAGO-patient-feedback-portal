'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Calendar, MapPin, Users, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createWorkshop, updateWorkshop, getSurveys } from '@/app/youth-empowerment/actions';
import { YEPWorkshop } from '@/lib/youth-empowerment';

const workshopFormSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(10, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  location: z.string().optional(),
  capacity: z.number().optional(),
  feedbackSurveyId: z.string().optional(),
});

type WorkshopFormData = z.infer<typeof workshopFormSchema>;

interface WorkshopFormProps {
  workshop?: YEPWorkshop;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function WorkshopForm({ workshop, isOpen, onClose, onSuccess }: WorkshopFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [surveys, setSurveys] = useState<Array<{ id: string; title: string; description?: string }>>([]);
  const { toast } = useToast();

  const form = useForm<WorkshopFormData>({
    resolver: zodResolver(workshopFormSchema),
    defaultValues: {
      title: workshop?.title || '',
      description: workshop?.description || '',
      date: workshop?.date ? new Date(workshop.date).toISOString().split('T')[0] : '',
      location: workshop?.location || '',
      capacity: workshop?.capacity || undefined,
      feedbackSurveyId: workshop?.feedbackSurveyId || '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      loadSurveys();
    }
  }, [isOpen]);

  const loadSurveys = async () => {
    try {
      const surveysData = await getSurveys();
      setSurveys(surveysData);
    } catch (error) {
      console.error('Error loading surveys:', error);
    }
  };

  const onSubmit = async (data: WorkshopFormData) => {
    setIsLoading(true);
    try {
      // Handle "none" value for feedbackSurveyId
      const processedData = {
        ...data,
        feedbackSurveyId: data.feedbackSurveyId === 'none' ? undefined : data.feedbackSurveyId
      };
      
      let result;
      if (workshop) {
        result = await updateWorkshop(workshop.id, processedData);
      } else {
        result = await createWorkshop(processedData);
      }

      if (result.success) {
        toast({
          title: workshop ? 'Workshop Updated' : 'Workshop Created',
          description: workshop 
            ? 'Workshop information has been updated successfully.'
            : 'New workshop has been added to the system.',
        });
        onSuccess();
        onClose();
        form.reset();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save workshop',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {workshop ? 'Edit Workshop' : 'Add New Workshop'}
          </DialogTitle>
          <DialogDescription>
            {workshop 
              ? 'Update workshop information and settings.'
              : 'Add a new workshop to the program.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Workshop Details
                </CardTitle>
                <CardDescription>Basic workshop information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workshop Title *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter workshop title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Describe the workshop content and objectives..."
                          rows={4}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a detailed description of what participants will learn
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Workshop Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder="Maximum participants"
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum number of participants
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location & Logistics
                </CardTitle>
                <CardDescription>Workshop location and additional details</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., SCAGO Office, Online, Community Center" />
                      </FormControl>
                      <FormDescription>
                        Physical location or online platform
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Feedback Survey
                </CardTitle>
                <CardDescription>Optional feedback collection for this workshop</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="feedbackSurveyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Feedback Survey</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a survey (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No survey</SelectItem>
                          {surveys.map((survey) => (
                            <SelectItem key={survey.id} value={survey.id}>
                              {survey.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose a survey to collect feedback from participants
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {workshop ? 'Update Workshop' : 'Create Workshop'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
