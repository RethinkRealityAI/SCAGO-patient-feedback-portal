'use client';

import React, { useState, useRef } from 'react';
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
import { CalendarIcon, Upload, X, FileText } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { SINSecureField } from './sin-secure-field';
import { sanitizeOptions, coerceSelectValue } from '@/lib/select-utils';
import { ParticipantLookupField } from '@/components/yep-forms/participant-lookup-field';
import { MentorLookupField } from '@/components/yep-forms/mentor-lookup-field';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
                <Select onValueChange={controllerField.onChange} value={coerceSelectValue(controllerField.value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder || 'Select an option'} />
                  </SelectTrigger>
                  <SelectContent>
                    {sanitizeOptions(field.options as any)?.map((option: any) => (
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
      case 'boolean-row':
        return (
          <Controller
            control={control}
            name={fieldName}
            render={({ field: controllerField }) => (
              <div className="flex flex-row items-center justify-between gap-4 w-full py-2">
                <Label className="flex-1 font-medium text-sm leading-tight">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </Label>
                <RadioGroup
                  onValueChange={(val) => controllerField.onChange(val === 'true')}
                  value={controllerField.value === true ? 'true' : controllerField.value === false ? 'false' : undefined}
                  className="flex flex-row space-x-4 shrink-0"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id={`${field.id}-yes`} />
                    <Label htmlFor={`${field.id}-yes`} className="cursor-pointer text-sm">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id={`${field.id}-no`} />
                    <Label htmlFor={`${field.id}-no`} className="cursor-pointer text-sm">No</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          />
        );
      case 'text-block':
        return (
          <div className={cn("text-sm text-muted-foreground whitespace-pre-wrap py-1", field.className)}>
            {field.helperText || field.label}
          </div>
        );
      // 'switch' is not a supported ExtendedFieldType; render as checkbox if present
      // fallthrough handled by default
      case YEPFieldType.yepParticipantLookup:
        return (
          <Controller
            control={control}
            name={fieldName}
            render={({ field: controllerField }) => (
              <ParticipantLookupField
                value={controllerField.value || ''}
                onChange={controllerField.onChange}
                allowCreate={true}
              />
            )}
          />
        );
      case YEPFieldType.yepMentorLookup:
        return (
          <Controller
            control={control}
            name={fieldName}
            render={({ field: controllerField }) => (
              <MentorLookupField
                value={controllerField.value || ''}
                onChange={controllerField.onChange}
                allowCreate={true}
              />
            )}
          />
        );
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
      case 'file-upload':
        return (
          <Controller
            control={control}
            name={fieldName}
            render={({ field: controllerField }) => {
              const [localFiles, setLocalFiles] = useState<File[]>([]);
              const [uploading, setUploading] = useState(false);
              const [error, setError] = useState<string | null>(null);
              const fileInputRef = useRef<HTMLInputElement>(null);
              const maxFiles = (field as any).maxFiles || 1;
              const allowedTypes: string[] = (field as any).fileTypes || [];

              // The form value is an array of uploaded file metadata objects
              const uploadedFiles: any[] = Array.isArray(controllerField.value) ? controllerField.value : [];

              const handleFileSelect = async (selectedFiles: FileList | null) => {
                if (!selectedFiles || selectedFiles.length === 0) return;
                setError(null);
                setUploading(true);
                try {
                  const newUploaded = [...uploadedFiles];
                  for (let i = 0; i < selectedFiles.length && newUploaded.length < maxFiles; i++) {
                    const file = selectedFiles[i];
                    // Validate type
                    if (allowedTypes.length > 0) {
                      const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
                      if (!allowedTypes.includes(ext)) {
                        setError(`File type ${ext} not allowed. Accepted: ${allowedTypes.join(', ')}`);
                        continue;
                      }
                    }
                    // Upload to Firebase Storage
                    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                    const filePath = `yep-form-uploads/${field.id}/${Date.now()}_${safeName}`;
                    const storageRef = ref(storage, filePath);
                    const contentType = file.type || 'application/octet-stream';
                    const snapshot = await uploadBytes(storageRef, file, { contentType });
                    const downloadUrl = await getDownloadURL(snapshot.ref);
                    newUploaded.push({
                      name: file.name,
                      url: downloadUrl,
                      size: file.size,
                      type: file.type,
                      path: filePath,
                      uploadedAt: new Date().toISOString()
                    });
                  }
                  controllerField.onChange(newUploaded);
                  setLocalFiles([]);
                } catch (err: any) {
                  console.error('File upload failed:', err);
                  setError(err?.message || 'Upload failed. Please try again.');
                } finally {
                  setUploading(false);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }
              };

              const removeFile = (index: number) => {
                const updated = uploadedFiles.filter((_, i) => i !== index);
                controllerField.onChange(updated.length > 0 ? updated : undefined);
              };

              return (
                <div className="space-y-3">
                  {uploadedFiles.length < maxFiles && (
                    <label className={cn(
                      "flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                      error ? "border-destructive bg-destructive/5" : "border-border",
                      uploading && "opacity-50 pointer-events-none"
                    )}>
                      <div className="flex flex-col items-center justify-center py-4">
                        <Upload className="w-6 h-6 mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {uploading ? 'Uploading...' : <><span className="font-semibold">Click to upload</span> or drag and drop</>}
                        </p>
                        {allowedTypes.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">{allowedTypes.join(', ')}</p>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept={allowedTypes.length > 0 ? allowedTypes.join(',') : '*/*'}
                        disabled={uploading}
                        onChange={(e) => handleFileSelect(e.target.files)}
                      />
                    </label>
                  )}
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  {uploadedFiles.map((file: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          {file.size && <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>}
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(index)} className="flex-shrink-0">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              );
            }}
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
    <div className={cn("space-y-2", field.className)}>
      {field.type !== 'checkbox' && field.type !== 'boolean-row' && field.type !== 'text-block' && (
        <Label htmlFor={field.id}>
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </Label>
      )}
      {renderInput()}
      {fieldError && <p className="text-sm text-red-500">{fieldError.message}</p>}
    </div>
  );
};