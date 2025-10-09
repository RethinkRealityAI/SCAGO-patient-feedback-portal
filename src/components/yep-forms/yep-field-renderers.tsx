'use client';

import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// import { Switch } from '@/components/ui/switch';
import { YEPFormField as YEPField, YEPFieldType } from '@/lib/yep-forms-types';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { SINSecureField } from './sin-secure-field';

interface YEPFieldRendererProps {
  field: YEPField;
  sectionIndex: number;
  fieldIndex: number;
  parentFieldName?: string;
}

export const YEPFieldRenderer: React.FC<YEPFieldRendererProps> = ({ 
  field, 
  sectionIndex, 
  fieldIndex, 
  parentFieldName 
}) => {
  const { control, register, formState: { errors }, watch, setValue } = useFormContext();
  const fieldName = parentFieldName ? `${parentFieldName}.fields.${fieldIndex}.value` : `sections.${sectionIndex}.fields.${fieldIndex}.value`;
  const fieldError = (errors as any)?.sections?.[sectionIndex]?.fields?.[fieldIndex]?.value;

  const shouldRender = true; // For now, always render. Conditional logic will be implemented later.

  if (!shouldRender) {
    return null;
  }

  const commonProps = {
    id: field.id,
    placeholder: field.placeholder,
    ...register(fieldName, { required: field.required }),
  };

  const renderInput = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return <Input type={field.type === 'number' ? 'number' : 'text'} {...commonProps} />;
      case 'textarea':
        return <Textarea {...commonProps} />;
      case 'date':
        return (
          <Controller
            control={control}
            name={fieldName}
            render={({ field: controllerField }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !controllerField.value && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {controllerField.value ? format(new Date(controllerField.value), 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={controllerField.value ? new Date(controllerField.value) : undefined}
                    onSelect={(date) => controllerField.onChange(date?.toISOString())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          />
        );
      case 'select':
        return (
          <Controller
            control={control}
            name={fieldName}
            render={({ field: controllerField }) => (
              <div className="space-y-2">
                <Select onValueChange={controllerField.onChange} value={controllerField.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder || 'Select an option'} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option: any) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {controllerField.value === 'other' && (
                  <div className="space-y-1">
                    <Label htmlFor={`${field.id}-other-input`} className="text-sm text-muted-foreground">
                      Other:
                    </Label>
                    <Input
                      id={`${field.id}-other-input`}
                      placeholder="Please specify..."
                      value={watch(`${fieldName}_other`) || ''}
                      onChange={(e) => setValue(`${fieldName}_other`, e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          />
        );
      case 'radio':
        return (
          <Controller
            control={control}
            name={fieldName}
            render={({ field: controllerField }) => (
              <div className="space-y-2">
                <RadioGroup onValueChange={controllerField.onChange} value={controllerField.value} className="flex flex-col space-y-1">
                  {field.options?.map((option: any) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                      <Label htmlFor={`${field.id}-${option.value}`}>{option.label}</Label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id={`${field.id}-other`} />
                    <Label htmlFor={`${field.id}-other`}>Other</Label>
                  </div>
                </RadioGroup>
                {controllerField.value === 'other' && (
                  <div className="ml-6 space-y-1">
                    <Label htmlFor={`${field.id}-other-input`} className="text-sm text-muted-foreground">
                      Please specify:
                    </Label>
                    <Input
                      id={`${field.id}-other-input`}
                      placeholder="Please specify..."
                      value={watch(`${fieldName}_other`) || ''}
                      onChange={(e) => setValue(`${fieldName}_other`, e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          />
        );
      case 'checkbox':
        return (
          <Controller
            control={control}
            name={fieldName}
            render={({ field: controllerField }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={field.id}
                  checked={controllerField.value}
                  onCheckedChange={controllerField.onChange}
                />
                <Label htmlFor={field.id}>{field.label}</Label>
              </div>
            )}
          />
        );
      // 'switch' is not a supported ExtendedFieldType; render as checkbox if present
      // fallthrough handled by default
      case YEPFieldType.yepParticipantLookup:
        return <div className="p-4 border rounded-lg bg-muted/50">Participant Lookup Field (To be implemented)</div>;
      case YEPFieldType.yepMentorLookup:
        return <div className="p-4 border rounded-lg bg-muted/50">Mentor Lookup Field (To be implemented)</div>;
      case YEPFieldType.yepSIN:
        return (
          <Controller
            control={control}
            name={fieldName}
            render={({ field: controllerField }) => (
              <SINSecureField
                value={controllerField.value || ''}
                onChange={controllerField.onChange}
                placeholder="Enter SIN (will be securely hashed)"
                showValidation={true}
              />
            )}
          />
        );
      case YEPFieldType.yepFileSecure:
        return <div className="p-4 border rounded-lg bg-muted/50">Secure File Upload (To be implemented)</div>;
      case YEPFieldType.yepAttendanceBulk:
        return <div className="p-4 border rounded-lg bg-muted/50">Bulk Attendance Field (To be implemented)</div>;
      default:
        return <Input type="text" {...commonProps} />;
    }
  };

  return (
    <div className="space-y-2">
      {field.type !== 'checkbox' && (
        <Label htmlFor={field.id}>
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </Label>
      )}
      {renderInput()}
      {fieldError && <p className="text-sm text-red-500">{fieldError.message}</p>}
    </div>
  );
};