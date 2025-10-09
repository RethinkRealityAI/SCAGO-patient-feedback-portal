'use client';

import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { sanitizeOptions, coerceSelectValue } from '@/lib/select-utils';

interface SelectWithOtherProps {
  name: string;
  options: { label: string; value: string }[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  otherLabel?: string;
  otherPlaceholder?: string;
}

export function SelectWithOther({
  name,
  options,
  placeholder = "Select an option",
  label,
  required = false,
  className,
  otherLabel = "Other",
  otherPlaceholder = "Please specify..."
}: SelectWithOtherProps) {
  const { watch, setValue, register } = useFormContext();
  
  const selectedValue = watch(name);
  const otherValue = watch(`${name}_other`);

  const handleSelectionChange = (value: string) => {
    if (value === 'other') {
      setValue(name, 'other');
    } else {
      setValue(name, value);
      setValue(`${name}_other`, ''); // Clear other value when selecting a regular option
    }
  };

  const handleOtherInputChange = (value: string) => {
    setValue(`${name}_other`, value);
    if (value.trim()) {
      setValue(name, 'other');
    }
  };

  // Check if we should show other input based on current selection
  const shouldShowOther = selectedValue === 'other';

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={name}>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <Select onValueChange={handleSelectionChange} value={coerceSelectValue(selectedValue)}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {sanitizeOptions(options).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
          <SelectItem value="other">{otherLabel}</SelectItem>
        </SelectContent>
      </Select>
      
      {shouldShowOther && (
        <div className="space-y-1">
          <Label htmlFor={`${name}_other`} className="text-sm text-muted-foreground">
            {otherLabel}:
          </Label>
          <Input
            id={`${name}_other`}
            placeholder={otherPlaceholder}
            value={otherValue || ''}
            {...register(`${name}_other`)}
            onChange={(e) => handleOtherInputChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
