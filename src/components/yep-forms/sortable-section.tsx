'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, PlusCircle } from 'lucide-react';
import { YEPFormSection } from '@/lib/yep-forms-types';
import { FieldEditor } from './field-editor';
import { Control } from 'react-hook-form';

interface SortableSectionProps {
  section: YEPFormSection;
  index: number;
  control: Control<any>;
  removeSection: (index: number) => void;
  formName: string;
}

export function SortableSection({ 
  section, 
  index, 
  control, 
  removeSection, 
  formName 
}: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'opacity-50' : ''}
    >
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab hover:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  // Add new field logic here
                }}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Field
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeSection(index)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {section.fields.map((field, fieldIndex) => (
              <FieldEditor
                key={field.id}
                field={field}
                sectionIndex={index}
                fieldIndex={fieldIndex}
                control={control}
                formName={formName}
              />
            ))}
            {section.fields.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No fields in this section. Click "Add Field" to get started.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
