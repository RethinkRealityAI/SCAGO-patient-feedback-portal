import React from 'react';
import { notFound } from 'next/navigation';
import { getYEPFormTemplate } from '../../actions';
import YEPFormSubmission from '@/components/yep-forms/yep-form-submission';

interface YEPFormSubmissionPageProps {
  params: Promise<{
    formId: string;
  }>;
}

export default async function YEPFormSubmissionPage({ params }: YEPFormSubmissionPageProps) {
  const { formId } = await params;
  
  const result = await getYEPFormTemplate(formId);
  
  if (!result.success || !result.data) {
    notFound();
  }
  
  const formTemplate = result.data;
  
  return (
    <div className="container flex flex-col gap-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            {formTemplate.name}
          </h1>
          <p className="text-muted-foreground mt-2">
            {formTemplate.description || 'Complete the form below'}
          </p>
        </div>
      </div>
      
      <YEPFormSubmission formTemplate={formTemplate} />
    </div>
  );
}
