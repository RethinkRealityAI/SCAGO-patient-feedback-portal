'use client';

import React from 'react';
import { YEPFormTemplate } from '@/lib/yep-forms-types';
import { YEPFieldRenderer } from './yep-field-renderers';

interface YEPFormRendererProps {
  formTemplate: YEPFormTemplate;
}

export function YEPFormRenderer({ formTemplate }: YEPFormRendererProps) {
  return (
    <div className="space-y-6">
      {formTemplate.sections.map((section, sectionIndex) => (
        <div key={section.id} className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{section.title}</h3>
            {section.description && (
              <p className="text-sm text-muted-foreground">{section.description}</p>
            )}
          </div>
          
          <div className="space-y-4">
            {section.fields.map((field, fieldIndex) => (
              <YEPFieldRenderer
                key={field.id}
                field={field}
                sectionIndex={sectionIndex}
                fieldIndex={fieldIndex}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
