'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Calendar, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createWorkshop, updateWorkshop } from '@/app/youth-empowerment/actions';
import { YEPWorkshop } from '@/lib/youth-empowerment';

const workshopFormSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
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
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const form = useForm<WorkshopFormData>({
    resolver: zodResolver(workshopFormSchema),
    defaultValues: {
      title: workshop?.title || '',
      description: workshop?.description || '',
      date: workshop?.date ? new Date(workshop.date).toISOString().split('T')[0] : '',
    },
  });

  // Initialize/reset when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    if (workshop) {
      form.reset({
        title: workshop.title || '',
        description: workshop.description || '',
        date: workshop.date ? new Date(workshop.date).toISOString().split('T')[0] : '',
      });
    } else {
      form.reset({
        title: '',
        description: '',
        date: '',
      });
    }

    setShowSuccess(false);
  }, [isOpen, workshop?.id]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setShowSuccess(false);
    }
  }, [isOpen]);

  // No separate handler to avoid confusing non-submit flows

  const onSubmit = async (data: WorkshopFormData) => {
    setIsLoading(true);
    try {
      let result;
      if (workshop) {
        result = await updateWorkshop(workshop.id, data);
      } else {
        result = await createWorkshop(data);
      }

      if (result.success) {
        toast({
          title: workshop ? 'Workshop Updated' : 'Workshop Created',
          description: workshop 
            ? 'Workshop information has been updated successfully.'
            : 'New workshop has been added to the system.',
        });
        
        // For both create and update: close and refresh
        onSuccess();
        onClose();
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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 min-h-0">
            {showSuccess && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-lg">Workshop created successfully!</p>
                  <p className="text-sm text-green-700">You can create another workshop or close this form.</p>
                </div>
              </div>
            )}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Describe the workshop content and objectives..."
                          rows={4}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a detailed description of what participants will learn (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>


            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {workshop ? 'Close' : 'Close'}
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
