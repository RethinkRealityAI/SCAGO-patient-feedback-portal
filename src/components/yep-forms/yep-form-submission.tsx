'use client';

import React, { useTransition } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { YEPFormTemplate, type YEPFormSubmission as YEPFormSubmissionType } from '@/lib/yep-forms-types';
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

  const form = useForm<any>({
    defaultValues: {},
  });

  const onSubmit = async (rawFormData: any) => {
    startTransition(async () => {
      try {
        // Extract field values from the nested sections structure into a flat map
        // The form stores data as sections[i].fields[j].value, but we need { fieldId: value }
        const data: Record<string, any> = {};
        if (rawFormData.sections && Array.isArray(rawFormData.sections)) {
          formTemplate.sections.forEach((section, sectionIndex) => {
            const sectionData = rawFormData.sections[sectionIndex];
            if (!sectionData?.fields) return;
            section.fields.forEach((fieldDef, fieldIndex) => {
              const fieldData = sectionData.fields[fieldIndex];
              if (fieldData?.value !== undefined && fieldData?.value !== null) {
                data[fieldDef.id] = fieldData.value;
              }
            });
          });
        }

        // Strip undefined values to prevent Firestore errors
        for (const key of Object.keys(data)) {
          if (data[key] === undefined) {
            delete data[key];
          }
        }

        // Create the submission record via server action
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