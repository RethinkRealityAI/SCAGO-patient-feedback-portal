'use client';

import React, { useTransition } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { YEPFormTemplate, type YEPFormSubmission as YEPFormSubmissionType, yepFormTemplateSchema } from '@/lib/yep-forms-types';
import { useToast } from '@/hooks/use-toast';
import { YEPFormRenderer } from './yep-form-renderer';
import { submitYEPForm } from '@/app/yep-forms/actions';
import { processYEPFormSubmission } from '@/lib/yep-forms-processor';

interface YEPFormSubmissionProps {
  formTemplate: YEPFormTemplate;
  onSubmissionSuccess?: () => void;
}

export default function YEPFormSubmission({ formTemplate, onSubmissionSuccess }: YEPFormSubmissionProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Dynamically create a Zod schema for the form values based on the template
  const dynamicSchema = yepFormTemplateSchema.pick({ sections: true }).transform((data) => {
    const values: Record<string, any> = {};
    data.sections.forEach(section => {
      section.fields.forEach(field => {
        values[field.id] = undefined;
      });
    });
    return values;
  });

  const form = useForm<any>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: {},
  });

  const onSubmit = async (data: any) => {
    startTransition(async () => {
      try {
        // First, create the submission record via server action
        const submitResult = await submitYEPForm(formTemplate.id!, data);

        if (!submitResult.success || !submitResult.data) {
          toast({
            title: 'Error',
            description: submitResult.error || 'Failed to submit form.',
            variant: 'destructive',
          });
          return;
        }

        const submissionData = {
          ...submitResult.data,
          submittedAt: new Date(submitResult.data.submittedAt)
        } as YEPFormSubmissionType;

        // Then process the submission to create/update entities
        const processResult = await processYEPFormSubmission(submissionData, formTemplate);


        if (processResult.success) {
          toast({
            title: 'Success',
            description: 'Form submitted and processed successfully.',
          });
          form.reset();
          // Call success callback if provided
          if (onSubmissionSuccess) {
            onSubmissionSuccess();
          }
        } else {
          toast({
            title: 'Warning',
            description: `Form submitted but processing had issues: ${processResult.error || 'Unknown error'}`,
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error submitting form:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to submit form.',
          variant: 'destructive',
        });
      }
    });
  };

  const onInvalid = (errors: any) => {
    console.error('Form validation errors:', errors);
    toast({
      title: 'Validation Error',
      description: 'Please fix the errors in the form.',
      variant: 'destructive',
    });
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>{formTemplate.name}</CardTitle>
          <CardDescription>{formTemplate.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
              <YEPFormRenderer formTemplate={formTemplate} />
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Submitting...' : 'Submit Form'}
              </Button>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  );
}