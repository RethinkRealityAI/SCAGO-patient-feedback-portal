'use client';

import React, { useTransition } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { YEPFormTemplate, yepFormTemplateSchema } from '@/lib/yep-forms-types';
import { useToast } from '@/hooks/use-toast';
import { YEPFormRenderer } from './yep-form-renderer';
import { processYEPFormSubmission } from '@/lib/yep-forms-processor';

interface YEPFormSubmissionProps {
  formTemplate: YEPFormTemplate;
}

export default function YEPFormSubmission({ formTemplate }: YEPFormSubmissionProps) {
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
      const submissionData = {
        formId: formTemplate.id!,
        formTitle: formTemplate.name,
        category: formTemplate.category,
        submittedAt: new Date().toISOString(),
        formData: data,
      };

      // Use provided template prop directly
      const result = await processYEPFormSubmission(submissionData as any, formTemplate as any);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Form submitted successfully.',
        });
        form.reset();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to submit form.',
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