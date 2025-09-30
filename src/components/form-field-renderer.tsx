'use client';

import { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider as UiSlider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Star, Check, ChevronsUpDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { provinces, ontarioCities } from "@/lib/location-data";
import { hospitalDepartments } from "@/lib/hospital-departments";
import { ontarioHospitals } from "@/lib/hospital-names";
import { translateFieldLabel, translateOption, useTranslation } from '@/lib/translations';
import { SignaturePad } from '@/components/signature-pad';

// Define field type
export type FieldDef = {
  id: string;
  type: string;
  label: string;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
  validation?: {
    required?: boolean;
    pattern?: string;
  };
  conditionField?: string;
  conditionValue?: string;
  fields?: FieldDef[];
};

interface FormFieldRendererProps {
  fieldConfig: FieldDef;
  form: UseFormReturn<any>;
  isFrench: boolean;
  labelSizeClass?: string;
}

export function FormFieldRenderer({ 
  fieldConfig, 
  form, 
  isFrench, 
  labelSizeClass = 'text-xs' 
}: FormFieldRendererProps) {
  const t = useTranslation(isFrench ? 'fr' : 'en');
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Translate the field label
  const translatedLabel = translateFieldLabel(fieldConfig.label, isFrench ? 'fr' : 'en');
  
  // Translate options if they exist
  const translatedOptions = fieldConfig.options?.map(option => ({
    ...option,
    label: translateOption(option.label, isFrench ? 'fr' : 'en')
  }));

  const renderFieldContent = () => {
    switch (fieldConfig.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <FormControl>
            <Input
              type={fieldConfig.type === 'email' ? 'email' : fieldConfig.type === 'phone' ? 'tel' : fieldConfig.type === 'url' ? 'url' : 'text'}
              placeholder={
                fieldConfig.type === 'email' ? t.enterEmail : 
                fieldConfig.type === 'phone' ? t.enterPhoneNumber : 
                ''
              }
              {...form.register(fieldConfig.id)}
            />
          </FormControl>
        );

      case 'textarea':
        return (
          <FormControl>
            <Textarea
              placeholder={translatedLabel}
              className="min-h-[100px]"
              {...form.register(fieldConfig.id)}
            />
          </FormControl>
        );

      case 'number':
        return (
          <FormControl>
            <Input
              type="number"
              min={fieldConfig.min}
              max={fieldConfig.max}
              step={fieldConfig.step}
              {...form.register(fieldConfig.id, { valueAsNumber: true })}
            />
          </FormControl>
        );

      case 'select':
      case 'province-ca':
        const selectOptions = fieldConfig.type === 'province-ca' ? provinces : translatedOptions;
        return (
          <Select onValueChange={(value) => form.setValue(fieldConfig.id, value)} value={form.watch(fieldConfig.id) || ''}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={
                  fieldConfig.type === 'province-ca' ? t.selectProvince : t.selectAnOption
                } />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {selectOptions?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {translateOption(option.label, isFrench ? 'fr' : 'en')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'radio':
        return (
          <FormControl>
            <RadioGroup
              onValueChange={(value) => form.setValue(fieldConfig.id, value)}
              value={form.watch(fieldConfig.id) || ''}
              className="flex flex-col space-y-1"
            >
              {translatedOptions?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`${fieldConfig.id}-${option.value}`} />
                  <label
                    htmlFor={`${fieldConfig.id}-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </FormControl>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {translatedOptions?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${fieldConfig.id}-${option.value}`}
                  checked={form.watch(fieldConfig.id)?.includes(option.value) || false}
                  onCheckedChange={(checked) => {
                    const currentValues = form.watch(fieldConfig.id) || [];
                    if (checked) {
                      form.setValue(fieldConfig.id, [...currentValues, option.value]);
                    } else {
                      form.setValue(fieldConfig.id, currentValues.filter((v: string) => v !== option.value));
                    }
                  }}
                />
                <label
                  htmlFor={`${fieldConfig.id}-${option.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );

      case 'boolean-checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={fieldConfig.id}
              checked={form.watch(fieldConfig.id) || false}
              onCheckedChange={(checked) => form.setValue(fieldConfig.id, checked)}
            />
            <label htmlFor={fieldConfig.id} className="text-sm font-normal cursor-pointer">
              {translatedLabel}
            </label>
          </div>
        );

      case 'slider':
        return (
          <div className="space-y-3">
            <FormControl>
              <UiSlider
                min={fieldConfig.min || 0}
                max={fieldConfig.max || 100}
                step={fieldConfig.step || 1}
                value={[form.watch(fieldConfig.id) || fieldConfig.min || 0]}
                onValueChange={(value) => form.setValue(fieldConfig.id, value[0])}
                className="w-full"
              />
            </FormControl>
            <div className="text-center text-sm text-muted-foreground">
              {form.watch(fieldConfig.id) || fieldConfig.min || 0}
            </div>
          </div>
        );

      case 'rating':
        return (
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-6 w-6 cursor-pointer transition-colors ${
                  star <= (form.watch(fieldConfig.id) || 0)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 hover:text-yellow-400'
                }`}
                onClick={() => form.setValue(fieldConfig.id, star)}
              />
            ))}
          </div>
        );

      case 'date':
        return (
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className="w-full pl-3 text-left font-normal"
                >
                  {form.watch(fieldConfig.id) ? (
                    format(new Date(form.watch(fieldConfig.id) + 'T00:00:00'), 'PPP')
                  ) : (
                    <span className="text-muted-foreground">{t.pickADate}</span>
                  )}
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={form.watch(fieldConfig.id) ? new Date(form.watch(fieldConfig.id) + 'T00:00:00') : undefined}
                defaultMonth={form.watch(fieldConfig.id) ? new Date(form.watch(fieldConfig.id) + 'T00:00:00') : new Date()}
                onSelect={(date) => {
                  if (date) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    form.setValue(fieldConfig.id, `${year}-${month}-${day}`);
                  } else {
                    form.setValue(fieldConfig.id, '');
                  }
                  setCalendarOpen(false);
                }}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const compareDate = new Date(date);
                  compareDate.setHours(0, 0, 0, 0);
                  return compareDate > today || compareDate < new Date('1900-01-01');
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'digital-signature':
        return (
          <SignaturePad
            value={form.watch(fieldConfig.id) || ''}
            onChange={(value) => form.setValue(fieldConfig.id, value)}
            placeholder={t.typeYourSignatureHere}
          />
        );

      // Add more field types as needed...
      default:
        return (
          <FormControl>
            <Input
              type="text"
              {...form.register(fieldConfig.id)}
            />
          </FormControl>
        );
    }
  };

  return (
    <FormField
      control={form.control}
      name={fieldConfig.id}
      render={({ field }) => (
        <FormItem className={labelSizeClass}>
          {fieldConfig.type !== 'boolean-checkbox' && (
            <FormLabel className="text-sm font-medium">
              {translatedLabel}
              {fieldConfig.validation?.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </FormLabel>
          )}
          {renderFieldContent()}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
