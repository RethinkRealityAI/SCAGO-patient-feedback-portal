'use client';

import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2, GripVertical } from 'lucide-react';
import { YEPFormField as YEPField, YEPFieldType } from '@/lib/yep-forms-types';
import { Control } from 'react-hook-form';

interface FieldEditorProps {
  field: YEPField;
  sectionIndex: number;
  fieldIndex: number;
  control: Control<any>;
  formName: string;
  removeField: (sectionIndex: number, fieldIndex: number) => void;
}

export function FieldEditor({ 
  field, 
  sectionIndex, 
  fieldIndex, 
  control, 
  formName,
  removeField
}: FieldEditorProps) {
  const { register, formState: { errors } } = useFormContext();

  const fieldName = `${formName}.${sectionIndex}.fields.${fieldIndex}`;
  const fieldError = (errors as any)?.[formName]?.[sectionIndex]?.fields?.[fieldIndex];

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          <Label className="font-medium">{field.label}</Label>
          {field.required && <span className="text-red-500">*</span>}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => removeField(sectionIndex, fieldIndex)}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${fieldName}.label`}>Field Label</Label>
          <Input
            {...register(`${fieldName}.label`)}
            placeholder="Enter field label"
          />
          {fieldError?.label && (
            <p className="text-sm text-red-500">{fieldError.label.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${fieldName}.type`}>Field Type</Label>
          <Controller
            control={control}
            name={`${fieldName}.type`}
            render={({ field: controllerField }) => (
              <Select onValueChange={controllerField.onChange} value={controllerField.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(YEPFieldType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/([A-Z])/g, ' $1').trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {fieldError?.type && (
            <p className="text-sm text-red-500">{fieldError.type.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${fieldName}.placeholder`}>Placeholder</Label>
          <Input
            {...register(`${fieldName}.placeholder`)}
            placeholder="Enter placeholder text"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${fieldName}.required`}>Required</Label>
          <Controller
            control={control}
            name={`${fieldName}.required`}
            render={({ field: controllerField }) => (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={controllerField.value}
                  onChange={controllerField.onChange}
                  className="rounded"
                />
                <Label>This field is required</Label>
              </div>
            )}
          />
        </div>
      </div>

      {fieldError && (
        <div className="text-sm text-red-500">
          {Object.values(fieldError).map((error: any, index) => (
            <p key={index}>{error.message}</p>
          ))}
        </div>
      )}
    </div>
  );
}
