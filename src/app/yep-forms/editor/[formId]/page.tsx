import React from 'react';
import { notFound } from 'next/navigation';
import { getYEPFormTemplate } from '../../actions';
import YEPFormEditor from '@/components/yep-forms/yep-form-editor';

interface YEPFormEditorPageProps {
  params: {
    formId: string;
  };
}

export default async function YEPFormEditorPage({ params }: YEPFormEditorPageProps) {
  const { formId } = params;
  
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
            Edit Form: {formTemplate.name}
          </h1>
          <p className="text-muted-foreground mt-2">
            {formTemplate.description || 'Configure your YEP form fields and settings'}
          </p>
        </div>
      </div>
      
      <YEPFormEditor formTemplate={formTemplate} />
    </div>
  );
}
