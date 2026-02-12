'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useForm, useFieldArray, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
/**
 * ⚠️ CRITICAL IMPORT - DO NOT CHANGE
 * Must import from '@/lib/client-actions' (not '@/app/editor/actions')
 * Client actions have auth context; server actions don't and will fail with PERMISSION_DENIED
 */
import { updateSurvey } from '@/lib/client-actions';
import { useToast } from '@/hooks/use-toast';
import { DndContext, closestCenter, KeyboardSensor as DndKeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, PlusCircle, GripVertical, Loader2, ArrowUp, ArrowDown, X, Plus, Eraser, GitBranch, Zap, Mail, Send, CheckCircle2, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { regexPresets } from '@/lib/regex-presets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SectionTemplateSelector, BlockTemplateSelector } from '@/components/template-selectors';
import { QuestionBankSelector } from '@/components/question-bank-selector';

// Schemas & Types
const optionSchema = z.object({ id: z.string(), label: z.string().min(1, 'Option label is required.'), value: z.string().min(1, 'Option value is required.') });
const otherOptionSchema = z.object({
  enabled: z.boolean().optional(),
  optionValue: z.string().optional(),
  fieldType: z.enum(['text', 'textarea']).optional(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
}).optional();
const fieldSchema: z.ZodType<FormFieldConfig> = z.lazy(() => z.object({
  id: z.string(),
  label: z.string().min(1, 'Question label is required.'),
  type: z.enum(['text', 'textarea', 'email', 'phone', 'url', 'date', 'time', 'time-amount', 'number', 'digital-signature', 'select', 'radio', 'checkbox', 'slider', 'rating', 'nps', 'group', 'boolean-checkbox', 'anonymous-toggle', 'province-ca', 'city-on', 'hospital-on', 'department-on', 'duration-hm', 'duration-dh', 'file-upload', 'multi-text', 'matrix-single', 'matrix-multiple', 'matrix-text', 'likert-scale', 'pain-scale', 'calculated', 'ranking', 'datetime', 'color', 'range', 'percentage', 'currency', 'logo', 'text-block']),
  options: z.array(optionSchema).optional(),
  fields: z.array(fieldSchema).optional(),
  conditionField: z.string().optional(),
  conditionValue: z.string().optional(),
  validation: z.object({
    required: z.boolean().optional(),
    pattern: z.string().optional(),
  }).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  rows: z.array(optionSchema).optional(),
  columns: z.array(optionSchema).optional(),
  calculation: z.string().optional(),
  fileTypes: z.array(z.string()).optional(),
  maxFileSize: z.number().optional(),
  maxFiles: z.number().optional(),
  placeholder: z.string().optional(),
  helperText: z.string().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  logoUrl: z.string().optional(),
  altText: z.string().optional(),
  alignment: z.enum(['left', 'center', 'right']).optional(),
  width: z.string().optional(),
  otherOption: otherOptionSchema,
}));
const sectionSchema = z.object({ id: z.string(), title: z.string().min(1, 'Section title is required.'), allRequired: z.boolean().default(false).optional(), fields: z.array(fieldSchema) });
const appearanceSchema = z.object({
  themeColor: z.string().default('#C8262A').optional(),
  cardShadow: z.enum(['none', 'sm', 'md', 'lg']).default('sm').optional(),
  cardTitleSize: z.enum(['sm', 'md', 'lg', 'xl']).default('lg').optional(),
  sectionTitleSize: z.enum(['sm', 'md', 'lg', 'xl']).default('lg').optional(),
  labelSize: z.enum(['xs', 'sm', 'md']).default('sm').optional(),
  gradient: z.boolean().default(true).optional(),
}).optional();

const thankYouSettingsSchema = z.object({
  icon: z.enum(['checkmark', 'party', 'star', 'none']).default('checkmark').optional(),
  title: z.string().default('Thank You!').optional(),
  description: z.string().default('Your submission has been received successfully.').optional(),
  showButton: z.boolean().default(true).optional(),
  buttonText: z.string().default('Submit Another').optional(),
  buttonLink: z.string().optional().or(z.literal('')),
  themeColor: z.string().default('#22c55e').optional(),
}).optional();

const surveySchema = z.object({
  title: z.string().min(1, 'Survey title is required.'),
  description: z.string().optional(),
  appearance: appearanceSchema,
  // New: submission and sharing controls
  submitButtonLabel: z.string().default('Submit').optional(),
  saveProgressEnabled: z.boolean().default(true).optional(),
  shareButtonEnabled: z.boolean().default(true).optional(),
  shareTitle: z.string().default('Share this survey').optional(),
  shareText: z.string().default("I'd like your feedback—please fill out this survey.").optional(),
  // Webhook integration
  webhookUrl: z.string().url().optional().or(z.literal('')),
  webhookSecret: z.string().optional().or(z.literal('')),
  webhookEnabled: z.boolean().default(false).optional(),
  // Email notifications
  emailNotifications: z.object({
    enabled: z.boolean().default(false).optional(),
    recipients: z.array(z.string().email()).optional(),
    subject: z.string().optional(),
    bodyTemplate: z.string().optional(),
    attachPdf: z.boolean().default(true).optional(),
    senderName: z.string().optional(),
  }).optional(),
  resumeSettings: z.object({
    showResumeModal: z.boolean().default(true).optional(),
    resumeTitle: z.string().default('Resume your saved progress?').optional(),
    resumeDescription: z.string().default('We found a saved draft. Continue where you left off or start over.').optional(),
    continueLabel: z.string().default('Continue').optional(),
    startOverLabel: z.string().default('Start over').optional(),
    showContinue: z.boolean().default(true).optional(),
    showStartOver: z.boolean().default(true).optional(),
  }).optional(),
  thankYouSettings: thankYouSettingsSchema,
  sections: z.array(sectionSchema),
});
type SurveyFormData = z.infer<typeof surveySchema>;
type FieldTypePath = `sections.${number}.fields.${number}`;
interface FormFieldConfig {
  id: string;
  label: string;
  type: any;
  options?: any[];
  fields?: FormFieldConfig[];
  conditionField?: string;
  conditionValue?: any;
  logoUrl?: string;
  altText?: string;
  alignment?: 'left' | 'center' | 'right';
  width?: string;
  validation?: { required?: boolean; pattern?: string; };
  otherOption?: {
    enabled?: boolean;
    optionValue?: string;
    fieldType?: 'text' | 'textarea';
    label?: string;
    placeholder?: string;
    required?: boolean;
  };
}

// Event handler to prevent dnd-kit from capturing clicks on interactive elements
const stopPropagation = (e: React.PointerEvent) => e.stopPropagation();

// A more robust KeyboardSensor that ignores key events from form inputs
class CustomKeyboardSensor extends DndKeyboardSensor {
  static shouldHandleEvent(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    return !target.closest('input, textarea, select, button[role!="button"]');
  }
}

function FieldEditor({ fieldPath, fieldIndex, remove, move, totalFields, listeners }: { fieldPath: FieldTypePath; fieldIndex: number; remove: (index: number) => void; move: (from: number, to: number) => void; totalFields: number; listeners?: any }) {
  const { control, watch, getValues, setValue } = useFormContext<SurveyFormData>();
  const field = watch(fieldPath);
  const { fields: options, append: appendOption, remove: removeOption } = useFieldArray({ control, name: `${fieldPath}.options` as any });
  // Determine which section this field belongs to
  const sectionIndexMatch = String(fieldPath).match(/^sections\.(\d+)\./);
  const sectionIndexFromPath = sectionIndexMatch ? Number(sectionIndexMatch[1]) : -1;
  const sectionAllRequired = sectionIndexFromPath >= 0 ? !!getValues(`sections.${sectionIndexFromPath}.allRequired` as any) : false;

  const handleTypeChange = (newType: string) => {
    setValue(`${fieldPath}.type`, newType as any);
    setValue(`${fieldPath}.options`, []);

    // Automatically apply regex for email and phone types
    if (newType === 'email') {
      const emailPreset = regexPresets.find(p => p.label === 'Email');
      if (emailPreset) {
        setValue(`${fieldPath}.validation.pattern`, emailPreset.value);
      }
    } else if (newType === 'phone') {
      const phonePreset = regexPresets.find(p => p.label === 'Phone (North America)');
      if (phonePreset) {
        setValue(`${fieldPath}.validation.pattern`, phonePreset.value);
      }
    }
  };

  const availableConditionalFields = useMemo(() => {
    const collected: { label: string; value: string }[] = [];
    const sections = getValues('sections');
    const visit = (items: any[]) => {
      for (const f of items) {
        if (f.id !== field.id && ['radio', 'select', 'checkbox', 'boolean-checkbox', 'boolean-row', 'province-ca', 'city-on', 'hospital-on'].includes(f.type)) {
          collected.push({ label: `${f.label} (ID: ${f.id})`, value: f.id });
        }
        if (f.type === 'group' && Array.isArray(f.fields)) visit(f.fields);
      }
    };
    (sections || []).forEach((s: any) => visit(s.fields || []));
    return collected;
  }, [getValues, field?.id]);

  const conditionalFieldId = watch(`${fieldPath}.conditionField` as any);
  const conditionalFieldType = useMemo(() => {
    const sections = getValues('sections');
    const findType = (items: any[]): string | null => {
      for (const f of items) {
        if (f.id === conditionalFieldId) return f.type;
        if (f.type === 'group' && Array.isArray(f.fields)) {
          const t = findType(f.fields);
          if (t) return t;
        }
      }
      return null;
    };
    for (const section of sections) {
      const t = findType(section.fields || []);
      if (t) return t;
    }
    return null;
  }, [conditionalFieldId, getValues]);

  const clearConditionalLogic = () => {
    setValue(`${fieldPath}.conditionField`, '');
    setValue(`${fieldPath}.conditionValue`, '');
  };

  const showOptions = ['select', 'radio', 'checkbox'].includes(field.type);

  return (
    <Card className="bg-muted/30 relative">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div {...(listeners || {})} className="cursor-grab p-2"><GripVertical /></div>
            <CardTitle className="text-lg">Question</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="icon" onPointerDown={stopPropagation} onClick={() => move(fieldIndex, fieldIndex - 1)} disabled={fieldIndex === 0}><ArrowUp className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" onPointerDown={stopPropagation} onClick={() => move(fieldIndex, fieldIndex + 1)} disabled={fieldIndex === totalFields - 1}><ArrowDown className="h-4 w-4" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button type="button" variant="destructive" size="icon" onPointerDown={stopPropagation}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will delete the question.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove(fieldIndex)}>Delete</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField control={control} name={`${fieldPath}.label` as any} render={({ field: formField }) => (<FormItem><FormLabel>Label</FormLabel><FormControl><Input {...formField} value={formField.value ?? ''} onPointerDown={stopPropagation} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={control} name={`${fieldPath}.type` as any} render={({ field: formField }) => (
          <FormItem>
            <FormLabel>Type</FormLabel>
            <Select onValueChange={handleTypeChange} defaultValue={formField.value}>
              <FormControl><SelectTrigger onPointerDown={stopPropagation}><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="textarea">Text Area</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="time">Time</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="digital-signature">Digital Signature</SelectItem>
                <SelectItem value="rating">Rating (1-5 Stars)</SelectItem>
                <SelectItem value="nps">NPS Scale (1-10)</SelectItem>
                <SelectItem value="select">Select</SelectItem>
                <SelectItem value="radio">Radio</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
                <SelectItem value="slider">Slider</SelectItem>
                <SelectItem value="boolean-checkbox">Yes/No</SelectItem>
                <SelectItem value="anonymous-toggle">Anonymous Toggle</SelectItem>
                <SelectItem value="group">Group (Side-by-side fields)</SelectItem>
                <SelectItem value="province-ca">Province (Canada)</SelectItem>
                <SelectItem value="city-on">City (Ontario)</SelectItem>
                <SelectItem value="hospital-on">Hospital (Ontario)</SelectItem>
                <SelectItem value="department-on">Department (Ontario - popular)</SelectItem>
                <SelectItem value="duration-hm">Duration (Hours/Minutes)</SelectItem>
                <SelectItem value="duration-dh">Duration (Days/Hours)</SelectItem>
                <SelectItem value="time-amount">Time Amount (Days/Hours)</SelectItem>
                <SelectItem value="file-upload">File Upload</SelectItem>
                <SelectItem value="multi-text">Multi-Text (Add Multiple)</SelectItem>
                <SelectItem value="matrix-single">Matrix (Single Choice)</SelectItem>
                <SelectItem value="matrix-multiple">Matrix (Multiple Choice)</SelectItem>
                <SelectItem value="matrix-text">Matrix (Text Input)</SelectItem>
                <SelectItem value="likert-scale">Likert Scale (Agreement)</SelectItem>
                <SelectItem value="pain-scale">Pain Scale (0-10 Visual)</SelectItem>
                <SelectItem value="calculated">Calculated Field</SelectItem>
                <SelectItem value="ranking">Ranking (Drag to Order)</SelectItem>
                <SelectItem value="datetime">Date & Time Combined</SelectItem>
                <SelectItem value="color">Color Picker</SelectItem>
                <SelectItem value="range">Range Slider</SelectItem>
                <SelectItem value="percentage">Percentage (0-100%)</SelectItem>
                <SelectItem value="currency">Currency (CAD)</SelectItem>
                <SelectItem value="logo">Logo / Image</SelectItem>
                <SelectItem value="text-block">Text Block / Description</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        {showOptions && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Options</Label>
              <span className="text-xs text-muted-foreground">{options.length} option{options.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {options.map((option, optionIndex) => (
                <Card key={option.id} className="p-3 bg-background border border-border hover:border-primary/50 transition-colors">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground min-w-6">#{optionIndex + 1}</span>
                      <FormField control={control} name={`${fieldPath}.options.${optionIndex}.label` as any} render={({ field: formField }) => (
                        <FormItem className="flex-1 space-y-0">
                          <FormControl>
                            <Input
                              {...formField}
                              value={formField.value ?? ''}
                              onPointerDown={stopPropagation}
                              placeholder="Option label (shown to user)"
                              className="h-9"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="button" variant="ghost" size="icon" onPointerDown={stopPropagation} onClick={() => removeOption(optionIndex)} className="h-9 w-9 shrink-0">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <FormField control={control} name={`${fieldPath}.options.${optionIndex}.value` as any} render={({ field: formField }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <div className="flex items-center gap-2 ml-8">
                            <span className="text-xs text-muted-foreground">Value:</span>
                            <Input
                              {...formField}
                              value={formField.value ?? ''}
                              onPointerDown={stopPropagation}
                              placeholder="option-value (used in logic)"
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </Card>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onPointerDown={stopPropagation}
                onClick={() => appendOption({ id: nanoid(), label: '', value: '' })}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Option
              </Button>
              {options.length > 2 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onPointerDown={stopPropagation}
                  onClick={() => {
                    const emptyIndices: number[] = [];
                    options.forEach((opt: any, idx) => {
                      if (!opt.label && !opt.value) emptyIndices.push(idx);
                    });
                    emptyIndices.reverse().forEach(idx => removeOption(idx));
                  }}
                  className="text-xs"
                >
                  <Eraser className="h-4 w-4 mr-1" />
                  Clear Empty
                </Button>
              )}
            </div>
          </div>
        )}
        {showOptions && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="other-option" className="border rounded-lg">
              <AccordionTrigger onPointerDown={stopPropagation} className="px-4 hover:no-underline hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span>Other Option</span>
                  {watch(`${fieldPath}.otherOption.enabled` as any) && (
                    <span className="ml-2 px-2 py-0.5 bg-amber-500/10 text-amber-600 text-xs rounded-full font-medium">
                      Active
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 space-y-4 bg-muted/30">
                <div className="flex items-start gap-2 p-3 bg-background rounded-lg border border-border">
                  <Zap className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <FormDescription className="text-xs leading-relaxed">
                    Automatically show a text field when a specific option (like "Other") is selected. Perfect for collecting additional details.
                  </FormDescription>
                </div>

                <FormField control={control} name={`${fieldPath}.otherOption.enabled` as any} render={({ field: formField }) => (
                  <FormItem className="flex items-center justify-between space-y-0 rounded-lg border p-3">
                    <div className="space-y-1">
                      <FormLabel className="text-sm font-medium">Enable Other Option</FormLabel>
                      <FormDescription className="text-xs">
                        Show an additional input field for a specific option value
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={formField.value || false}
                        onCheckedChange={formField.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )} />

                {watch(`${fieldPath}.otherOption.enabled` as any) && (
                  <>
                    <FormField control={control} name={`${fieldPath}.otherOption.optionValue` as any} render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Trigger Option Value</FormLabel>
                        <FormControl>
                          <Input
                            {...formField}
                            value={formField.value ?? ''}
                            onPointerDown={stopPropagation}
                            placeholder="e.g., other"
                            className="font-mono text-sm"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Enter the option value that triggers the text field (e.g., <code className="px-1 py-0.5 bg-muted rounded">other</code>)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={control} name={`${fieldPath}.otherOption.fieldType` as any} render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Input Field Type</FormLabel>
                        <Select onValueChange={formField.onChange} value={formField.value || 'text'}>
                          <FormControl>
                            <SelectTrigger onPointerDown={stopPropagation}>
                              <SelectValue placeholder="Select field type..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="text">Text (single line)</SelectItem>
                            <SelectItem value="textarea">Text Area (multiple lines)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          Choose the type of input field to show
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={control} name={`${fieldPath}.otherOption.label` as any} render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Field Label (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...formField}
                            value={formField.value ?? ''}
                            onPointerDown={stopPropagation}
                            placeholder="Please specify"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Custom label for the text field. Defaults to "Please specify"
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={control} name={`${fieldPath}.otherOption.placeholder` as any} render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Placeholder (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...formField}
                            value={formField.value ?? ''}
                            onPointerDown={stopPropagation}
                            placeholder="Enter details..."
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Placeholder text shown inside the input field
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={control} name={`${fieldPath}.otherOption.required` as any} render={({ field: formField }) => (
                      <FormItem className="flex items-center justify-between space-y-0 rounded-lg border p-3">
                        <div className="space-y-1">
                          <FormLabel className="text-sm font-medium">Required Field</FormLabel>
                          <FormDescription className="text-xs">
                            Make the other option field required when shown
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={formField.value || false}
                            onCheckedChange={formField.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )} />

                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Zap className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="text-xs space-y-1">
                          <div className="font-medium text-amber-600">Preview</div>
                          <div className="text-muted-foreground">
                            When <strong className="text-foreground">
                              {watch(`${fieldPath}.otherOption.optionValue` as any) || '(trigger value)'}
                            </strong> is selected, a <strong className="text-foreground">
                              {watch(`${fieldPath}.otherOption.fieldType` as any) === 'textarea' ? 'text area' : 'text input'}
                            </strong> will appear{watch(`${fieldPath}.otherOption.required` as any) ? ' (required)' : ''}.
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        {field?.type === 'group' && (
          <GroupChildrenEditor parentFieldPath={fieldPath} />
        )}
        {['matrix-single', 'matrix-multiple', 'matrix-text'].includes(field?.type) && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Matrix Rows</Label>
              <FormField control={control} name={`${fieldPath}.rows` as any} render={() => (
                <div className="space-y-2">
                  {(watch(`${fieldPath}.rows` as any) || []).map((row: any, idx: number) => (
                    <div key={row.id} className="flex gap-2">
                      <Input placeholder="Row label" value={row.label} onChange={(e) => {
                        const rows = watch(`${fieldPath}.rows` as any) || [];
                        rows[idx].label = e.target.value;
                        rows[idx].value = e.target.value.toLowerCase().replace(/\s+/g, '-');
                        setValue(`${fieldPath}.rows` as any, [...rows]);
                      }} onPointerDown={stopPropagation} />
                      <Button type="button" variant="ghost" size="icon" onPointerDown={stopPropagation} onClick={() => {
                        const rows = (watch(`${fieldPath}.rows` as any) || []).filter((_: any, i: number) => i !== idx);
                        setValue(`${fieldPath}.rows` as any, rows);
                      }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onPointerDown={stopPropagation} onClick={() => {
                    const rows = watch(`${fieldPath}.rows` as any) || [];
                    setValue(`${fieldPath}.rows` as any, [...rows, { id: nanoid(), label: '', value: '' }]);
                  }}>Add Row</Button>
                </div>
              )} />
            </div>
            <div className="space-y-2">
              <Label>Matrix Columns</Label>
              <FormField control={control} name={`${fieldPath}.columns` as any} render={() => (
                <div className="space-y-2">
                  {(watch(`${fieldPath}.columns` as any) || []).map((col: any, idx: number) => (
                    <div key={col.id} className="flex gap-2">
                      <Input placeholder="Column label" value={col.label} onChange={(e) => {
                        const cols = watch(`${fieldPath}.columns` as any) || [];
                        cols[idx].label = e.target.value;
                        cols[idx].value = e.target.value.toLowerCase().replace(/\s+/g, '-');
                        setValue(`${fieldPath}.columns` as any, [...cols]);
                      }} onPointerDown={stopPropagation} />
                      <Button type="button" variant="ghost" size="icon" onPointerDown={stopPropagation} onClick={() => {
                        const cols = (watch(`${fieldPath}.columns` as any) || []).filter((_: any, i: number) => i !== idx);
                        setValue(`${fieldPath}.columns` as any, cols);
                      }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onPointerDown={stopPropagation} onClick={() => {
                    const cols = watch(`${fieldPath}.columns` as any) || [];
                    setValue(`${fieldPath}.columns` as any, [...cols, { id: nanoid(), label: '', value: '' }]);
                  }}>Add Column</Button>
                </div>
              )} />
            </div>
          </div>
        )}
        {field?.type === 'file-upload' && (
          <div className="space-y-3">
            <FormField control={control} name={`${fieldPath}.maxFiles` as any} render={({ field: formField }) => (
              <FormItem><FormLabel>Max Files</FormLabel><FormControl><Input type="number" min="1" max="10" {...formField} value={formField.value ?? 1} onChange={e => formField.onChange(parseInt(e.target.value))} onPointerDown={stopPropagation} /></FormControl><FormDescription>Maximum number of files (1-10)</FormDescription></FormItem>
            )} />
            <FormField control={control} name={`${fieldPath}.maxFileSize` as any} render={({ field: formField }) => (
              <FormItem><FormLabel>Max File Size (MB)</FormLabel><FormControl><Input type="number" min="1" max="50" {...formField} value={formField.value ?? 5} onChange={e => formField.onChange(parseInt(e.target.value))} onPointerDown={stopPropagation} /></FormControl><FormDescription>Maximum size per file in megabytes</FormDescription></FormItem>
            )} />
            <FormField control={control} name={`${fieldPath}.fileTypes` as any} render={({ field: formField }) => (
              <FormItem><FormLabel>Allowed File Types</FormLabel><FormControl><Input {...formField} value={formField.value?.join(', ') ?? '.pdf,.jpg,.png'} onChange={e => formField.onChange(e.target.value.split(',').map((t: string) => t.trim()))} onPointerDown={stopPropagation} placeholder=".pdf,.jpg,.png,.doc,.docx" /></FormControl><FormDescription>Comma-separated file extensions</FormDescription></FormItem>
            )} />
          </div>
        )}
        {field?.type === 'calculated' && (
          <FormField control={control} name={`${fieldPath}.calculation` as any} render={({ field: formField }) => (
            <FormItem><FormLabel>Calculation Formula</FormLabel><FormControl><Textarea {...formField} value={formField.value ?? ''} onPointerDown={stopPropagation} placeholder="fieldId1 + fieldId2" className="font-mono text-sm" /></FormControl><FormDescription>Use field IDs in formula (e.g., age + years or total * 1.13)</FormDescription></FormItem>
          )} />
        )}
        {['text', 'textarea'].includes(field?.type) && (
          <div className="grid grid-cols-2 gap-3">
            <FormField control={control} name={`${fieldPath}.minLength` as any} render={({ field: formField }) => (
              <FormItem><FormLabel>Min Length</FormLabel><FormControl><Input type="number" min="0" {...formField} value={formField.value ?? ''} onChange={e => formField.onChange(e.target.value ? parseInt(e.target.value) : undefined)} onPointerDown={stopPropagation} /></FormControl></FormItem>
            )} />
            <FormField control={control} name={`${fieldPath}.maxLength` as any} render={({ field: formField }) => (
              <FormItem><FormLabel>Max Length</FormLabel><FormControl><Input type="number" min="1" {...formField} value={formField.value ?? ''} onChange={e => formField.onChange(e.target.value ? parseInt(e.target.value) : undefined)} onPointerDown={stopPropagation} /></FormControl></FormItem>
            )} />
          </div>
        )}
        {['text', 'textarea', 'number', 'email', 'phone'].includes(field?.type) && (
          <FormField control={control} name={`${fieldPath}.placeholder` as any} render={({ field: formField }) => (
            <FormItem><FormLabel>Placeholder Text</FormLabel><FormControl><Input {...formField} value={formField.value ?? ''} onPointerDown={stopPropagation} placeholder="Enter placeholder..." /></FormControl></FormItem>
          )} />
        )}
        {field?.type === 'currency' && (
          <div className="grid grid-cols-2 gap-3">
            <FormField control={control} name={`${fieldPath}.prefix` as any} render={({ field: formField }) => (
              <FormItem><FormLabel>Prefix</FormLabel><FormControl><Input {...formField} value={formField.value ?? '$'} onPointerDown={stopPropagation} /></FormControl></FormItem>
            )} />
            <FormField control={control} name={`${fieldPath}.suffix` as any} render={({ field: formField }) => (
              <FormItem><FormLabel>Suffix</FormLabel><FormControl><Input {...formField} value={formField.value ?? 'CAD'} onPointerDown={stopPropagation} /></FormControl></FormItem>
            )} />
          </div>
        )}
        {field?.type === 'logo' && (
          <div className="space-y-3">
            <FormField control={control} name={`${fieldPath}.logoUrl` as any} render={({ field: formField }) => (
              <FormItem><FormLabel>Image URL</FormLabel><FormControl><Input {...formField} value={formField.value ?? ''} onPointerDown={stopPropagation} placeholder="https://..." /></FormControl><FormDescription>Direct link to the logo image.</FormDescription></FormItem>
            )} />
            <FormField control={control} name={`${fieldPath}.altText` as any} render={({ field: formField }) => (
              <FormItem><FormLabel>Alt Text</FormLabel><FormControl><Input {...formField} value={formField.value ?? ''} onPointerDown={stopPropagation} placeholder="e.g., Company Logo" /></FormControl><FormDescription>Description for accessibility.</FormDescription></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={control} name={`${fieldPath}.alignment` as any} render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>Alignment</FormLabel>
                  <Select onValueChange={formField.onChange} value={formField.value ?? 'center'}>
                    <FormControl><SelectTrigger onPointerDown={stopPropagation}><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={control} name={`${fieldPath}.width` as any} render={({ field: formField }) => (
                <FormItem><FormLabel>Width (optional)</FormLabel><FormControl><Input {...formField} value={formField.value ?? ''} onPointerDown={stopPropagation} placeholder="e.g., 200px or 50%" /></FormControl></FormItem>
              )} />
            </div>
          </div>
        )}
        {!(field?.type === 'group' || field?.type === 'anonymous-toggle' || field?.type === 'calculated') && (
          <div className="flex items-center justify-between">
            <FormField control={control} name={`${fieldPath}.validation.required` as any} render={({ field: formField }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 pr-3 shadow-sm">
                <div className="space-y-0.5 px-3"><FormLabel className="text-xs">Required</FormLabel></div>
                <FormControl><Switch checked={!!formField.value} onCheckedChange={formField.onChange} onPointerDown={stopPropagation} disabled={sectionAllRequired} /></FormControl>
              </FormItem>
            )} />
            {sectionAllRequired && (
              <div className="text-xs text-muted-foreground ml-3">Section requires all; per-question toggle disabled.</div>
            )}
          </div>
        )}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="conditional-logic" className="border rounded-lg">
            <AccordionTrigger onPointerDown={stopPropagation} className="px-4 hover:no-underline hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                <span>Conditional Logic</span>
                {conditionalFieldId && (
                  <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                    Active
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 space-y-4 bg-muted/30">
              <div className="flex items-start gap-2 p-3 bg-background rounded-lg border border-border">
                <Zap className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <FormDescription className="text-xs leading-relaxed">
                  Show this question only when another question has a specific answer. Great for creating dynamic, personalized surveys.
                </FormDescription>
              </div>

              {field?.conditionField && field?.conditionField === (getValues(fieldPath as any) as any)?.id && (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded text-xs">
                  <X className="h-3 w-3" />
                  A field cannot depend on itself.
                </div>
              )}

              <FormField control={control} name={`${fieldPath}.conditionField` as any} render={({ field: formField }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                    Show when
                    {formField.value && (
                      <span className="text-xs font-normal text-muted-foreground">(trigger question)</span>
                    )}
                  </FormLabel>
                  <div className="flex items-center gap-2">
                    <Select onValueChange={formField.onChange} value={formField.value || undefined}>
                      <FormControl>
                        <SelectTrigger onPointerDown={stopPropagation} className={cn(
                          "transition-colors",
                          formField.value && "border-primary"
                        )}>
                          <SelectValue placeholder="Select a question..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-72">
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                          Available Questions
                        </div>
                        {availableConditionalFields.length === 0 ? (
                          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                            No questions available for conditions.
                            <br />
                            <span className="text-xs">Add select, radio, or checkbox questions first.</span>
                          </div>
                        ) : (
                          availableConditionalFields.map(f => (
                            <SelectItem key={f.value} value={f.value} className="cursor-pointer">
                              {f.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {formField.value && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onPointerDown={stopPropagation}
                        onClick={clearConditionalLogic}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              {conditionalFieldId && (
                <FormField control={control} name={`${fieldPath}.conditionValue` as any} render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      Has the value
                      <span className="text-xs font-normal text-muted-foreground">(condition)</span>
                    </FormLabel>
                    <FormControl>
                      {conditionalFieldType === 'boolean-checkbox' || conditionalFieldType === 'boolean-row' ? (
                        <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                          <Switch
                            checked={formField.value === 'true'}
                            onCheckedChange={(checked: boolean) => formField.onChange(String(checked))}
                          />
                          <span className="text-sm">
                            {formField.value === 'true' ? 'Checked (true)' : 'Unchecked (false)'}
                          </span>
                        </div>
                      ) : (
                        <Input
                          {...formField}
                          value={formField.value ?? ''}
                          onPointerDown={stopPropagation}
                          placeholder="Enter the required value"
                          className="font-mono text-sm"
                        />
                      )}
                    </FormControl>
                    <FormDescription className="text-xs bg-background/50 p-2 rounded border border-border/50">
                      {conditionalFieldType === 'checkbox' ? (
                        <span>
                          <strong>Multi-select:</strong> Enter one value (e.g., <code className="px-1 py-0.5 bg-muted rounded text-xs">outpatient</code>).
                          Shows when that value is selected.
                        </span>
                      ) : conditionalFieldType === 'boolean-checkbox' ? (
                        <span>
                          <strong>Yes/No:</strong> Toggle to set the required state.
                        </span>
                      ) : conditionalFieldType === 'radio' || conditionalFieldType === 'select' ? (
                        <span>
                          <strong>Single choice:</strong> Enter the exact option value (e.g., <code className="px-1 py-0.5 bg-muted rounded text-xs">option-1</code>).
                        </span>
                      ) : (
                        <span>
                          Enter the exact value. For Yes/No, use <code className="px-1 py-0.5 bg-muted rounded text-xs">true</code> or <code className="px-1 py-0.5 bg-muted rounded text-xs">false</code>.
                        </span>
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {conditionalFieldId && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <GitBranch className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="text-xs space-y-1">
                      <div className="font-medium text-primary">Preview Logic</div>
                      <div className="text-muted-foreground">
                        This question will <strong className="text-foreground">only show</strong> when{' '}
                        <strong className="text-primary">
                          {availableConditionalFields.find(f => f.value === conditionalFieldId)?.label || 'selected question'}
                        </strong>{' '}
                        {conditionalFieldType === 'boolean-checkbox' ? (
                          watch(`${fieldPath}.conditionValue` as any) === 'true' ? 'is checked' : 'is unchecked'
                        ) : conditionalFieldType === 'checkbox' ? (
                          <>includes <code className="px-1 py-0.5 bg-background rounded">{watch(`${fieldPath}.conditionValue` as any) || '...'}</code></>
                        ) : (
                          <>equals <code className="px-1 py-0.5 bg-background rounded">{watch(`${fieldPath}.conditionValue` as any) || '...'}</code></>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function GroupChildrenEditor({ parentFieldPath }: { parentFieldPath: FieldTypePath }) {
  const { control } = useFormContext<SurveyFormData>();
  const { fields, append, remove, move } = useFieldArray({ control, name: `${parentFieldPath}.fields` });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Group Items</Label>
        <Button type="button" variant="outline" size="sm" onPointerDown={stopPropagation} onClick={() => append({ id: nanoid(), label: 'New Item', type: 'text' } as any)}>Add Item</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((child, idx) => (
          <div key={child.id} className="rounded-md border p-3">
            <FieldEditor fieldPath={`${parentFieldPath}.fields.${idx}` as any} fieldIndex={idx} remove={remove} move={move} totalFields={fields.length} listeners={{}} />
          </div>
        ))}
      </div>
    </div>
  );
}

const SortableSection = ({ section, sectionIndex, removeSection, registerMoveField, overId }: { section: any; sectionIndex: number; removeSection: (index: number) => void; registerMoveField: (index: number, moveFn: (from: number, to: number) => void) => void; overId?: string | null; }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id, data: { type: 'section' } });
  const { control } = useFormContext<SurveyFormData>();
  const { fields, append, remove, move } = useFieldArray({ control, name: `sections.${sectionIndex}.fields` });
  useEffect(() => { registerMoveField(sectionIndex, move); }, [registerMoveField, sectionIndex, move]);

  const isOver = overId === section.id;

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} className={cn(isOver && "ring-1 ring-primary/30 ring-offset-1 ring-offset-background", "rounded-lg")}>
      <AccordionItem value={`section-${sectionIndex}`} className="border rounded-lg bg-card/80">
        <AccordionTrigger className="p-6 hover:no-underline gap-3">
          <div {...attributes} {...listeners} className="cursor-grab p-2" onPointerDown={stopPropagation}><GripVertical /></div>
          <div className="flex-1 min-w-0">
            <FormField control={control} name={`sections.${sectionIndex}.title`} render={({ field }) => (
              <Input
                {...field}
                value={field.value ?? ''}
                onPointerDown={stopPropagation}
                className="w-full text-lg md:text-xl font-semibold tracking-tight text-primary border-0 bg-transparent px-2 py-1 h-auto focus-visible:ring-0 focus-visible:outline-none"
              />
            )} />
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-6 space-y-6 border-t">
          <div className="flex items-center justify-end mb-4">
            <FormField control={control} name={`sections.${sectionIndex}.allRequired`} render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormLabel className="text-xs">Require all</FormLabel>
                <FormControl>
                  <Switch checked={!!field.value} onCheckedChange={field.onChange} onPointerDown={stopPropagation} />
                </FormControl>
              </FormItem>
            )} />
          </div>
          <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {fields.map((field, fieldIndex) => (<SortableField key={field.id} {...{ field, sectionIndex, fieldIndex, remove, move, totalFields: fields.length, overId }} />))}
            </div>
          </SortableContext>
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="outline" onPointerDown={stopPropagation} onClick={() => append({ id: nanoid(), label: 'New Question', type: 'text' })}><PlusCircle className="mr-2" /> Add Question</Button>
              <QuestionBankSelector onSelectQuestion={(question) => append(question)} />
              <BlockTemplateSelector onSelectBlock={(block) => append(block)} />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button type="button" variant="destructive" onPointerDown={stopPropagation}><Trash2 className="mr-2" /> Delete Section</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will delete the section and all its questions.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => removeSection(sectionIndex)}>Delete</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};

const SortableField = ({ field, sectionIndex, fieldIndex, remove, move, totalFields, overId }: { field: any; sectionIndex: number; fieldIndex: number; remove: (index: number) => void; move: (from: number, to: number) => void; totalFields: number; overId?: string | null; }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id, data: { type: 'field', sectionIndex } });
  const isOver = overId === field.id;
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} className={cn(isOver && "bg-primary/10 dark:bg-primary/15", "rounded-lg")} {...attributes}>
      <FieldEditor {...{ fieldPath: `sections.${sectionIndex}.fields.${fieldIndex}`, fieldIndex, remove, move, totalFields, listeners }} />
    </div>
  );
};

interface EmailLogEntry {
  id: string;
  submissionId: string | null;
  recipients: string[];
  subject: string;
  success: boolean;
  error: string | null;
  skipped: boolean;
  sentAt: string | null;
}

function EmailNotificationLog({ surveyId }: { surveyId: string }) {
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/email-logs?surveyId=${encodeURIComponent(surveyId)}`);
      const data = await response.json();
      if (response.ok) {
        setLogs(data.logs || []);
      } else {
        setError(data.error || 'Failed to load email logs');
      }
    } catch {
      setError('Network error loading email logs');
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [surveyId]);

  const successCount = logs.filter((l) => l.success).length;
  const failedCount = logs.filter((l) => !l.success && !l.skipped).length;

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Notification History
        </h4>
        <Button type="button" variant="ghost" size="sm" onClick={fetchLogs} disabled={isLoading} className="h-7 px-2 text-xs">
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          <span className="ml-1">{hasLoaded ? 'Refresh' : 'Load'}</span>
        </Button>
      </div>

      {!hasLoaded && !isLoading && (
        <p className="text-xs text-muted-foreground">Click Load to view recent email notification history for this survey.</p>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {hasLoaded && !error && (
        <>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No email notifications have been sent for this survey yet.</p>
          ) : (
            <>
              <div className="flex gap-3 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700">
                  <CheckCircle2 className="h-3 w-3" /> {successCount} sent
                </span>
                {failedCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">
                    <AlertTriangle className="h-3 w-3" /> {failedCount} failed
                  </span>
                )}
                <span className="text-muted-foreground">{logs.length} total</span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-3 rounded-md border px-3 py-2 text-xs ${log.success
                      ? 'border-green-200 bg-green-50/50'
                      : log.skipped
                        ? 'border-gray-200 bg-gray-50'
                        : 'border-red-200 bg-red-50/50'
                      }`}
                  >
                    <div className="pt-0.5 shrink-0">
                      {log.success ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">
                          {log.recipients.join(', ') || 'No recipients'}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          {log.sentAt ? new Date(log.sentAt).toLocaleString() : '—'}
                        </span>
                      </div>
                      {log.error && (
                        <p className="mt-0.5 text-red-600 truncate">{log.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function TestEmailButton({ recipients }: { recipients: string[] }) {
  const [testEmail, setTestEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const handleSendTest = async () => {
    const email = testEmail.trim() || (recipients.length > 0 ? recipients[0] : '');
    if (!email) {
      toast({ title: 'No email address', description: 'Enter an email address or add recipients above.', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResult({ success: true, message: `Test email sent to ${email}` });
        toast({ title: 'Test email sent', description: `Check ${email} for the test message.` });
      } else {
        setTestResult({ success: false, message: data.error || 'Failed to send test email' });
        toast({ title: 'Test email failed', description: data.error || 'Failed to send. Check your SMTP configuration.', variant: 'destructive' });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Network error. Could not reach the server.' });
      toast({ title: 'Test email failed', description: 'Network error. Please try again.', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder={recipients.length > 0 ? recipients[0] : 'Enter email address'}
          type="email"
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={handleSendTest} disabled={isSending} size="sm" className="shrink-0">
          {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
          {isSending ? 'Sending...' : 'Send Test'}
        </Button>
      </div>
      {testResult && (
        <div className={`flex items-center gap-1.5 text-xs ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
          {testResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {testResult.message}
        </div>
      )}
    </div>
  );
}

/**
 * Generate test data based on field type
 */
function generateTestDataForField(field: any): any {
  const type = field.type;

  switch (type) {
    case 'text':
      if (field.label?.toLowerCase().includes('name') || field.label?.toLowerCase().includes('first')) {
        return 'Test User';
      }
      if (field.label?.toLowerCase().includes('last')) {
        return 'McTestface';
      }
      return `Test ${field.label || 'value'}`;

    case 'email':
      return 'test@example.com';

    case 'phone':
      return '(416) 555-1234';

    case 'textarea':
      return `This is test feedback for the field "${field.label}". Generated automatically for testing purposes.`;

    case 'number':
      return field.min ?? 42;

    case 'date':
      return new Date().toISOString().split('T')[0];

    case 'time':
      return '10:30';

    case 'datetime':
      return new Date().toISOString();

    case 'select':
    case 'radio':
      return field.options?.[0]?.value || 'option1';

    case 'checkbox':
      return field.options?.slice(0, 2).map((o: any) => o.value) || ['option1'];

    case 'boolean-checkbox':
      return true;

    case 'rating':
    case 'nps':
      return 8;

    case 'slider':
      return field.max ? Math.floor(((field.min ?? 0) + field.max) / 2) : 50;

    case 'province-ca':
      return 'ON';

    case 'city-on':
      return 'Toronto';

    case 'hospital-on':
      return 'Toronto General Hospital';

    case 'department-on':
      return 'Emergency';

    case 'duration-hm':
      return { hours: 2, minutes: 30 };

    case 'duration-dh':
      return { days: 1, hours: 4 };

    case 'percentage':
      return 75;

    case 'currency':
      return 100.00;

    case 'likert-scale':
    case 'pain-scale':
      return 3;

    case 'ranking':
      return field.options?.map((o: any) => o.value) || [];

    case 'matrix-single':
    case 'matrix-multiple':
    case 'matrix-text':
      const matrixData: Record<string, any> = {};
      field.rows?.forEach((row: any) => {
        matrixData[row.value] = field.columns?.[0]?.value || 'column1';
      });
      return matrixData;

    case 'multi-text':
      return ['Test item 1', 'Test item 2'];

    case 'anonymous-toggle':
      return false;

    case 'url':
      return 'https://example.com';

    case 'color':
      return '#C8262A';

    case 'range':
      return { min: 25, max: 75 };

    case 'group':
      // Recursively generate data for nested fields
      const groupData: Record<string, any> = {};
      field.fields?.forEach((subField: any) => {
        groupData[subField.id] = generateTestDataForField(subField);
      });
      return groupData;

    default:
      return `Test ${type}`;
  }
}

function TestFormSubmissionButton({ surveyId, sections }: { surveyId: string; sections: any[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const handleTestSubmission = async () => {
    setIsSubmitting(true);
    setResult(null);

    try {
      // Generate test data based on form fields
      const testData: Record<string, any> = {};

      sections.forEach(section => {
        section.fields?.forEach((field: any) => {
          if (field.type === 'group' && field.fields) {
            // Handle group fields
            field.fields.forEach((subField: any) => {
              testData[subField.id] = generateTestDataForField(subField);
            });
          } else if (field.type !== 'logo' && field.type !== 'text-block' && field.type !== 'calculated') {
            testData[field.id] = generateTestDataForField(field);
          }
        });
      });

      // Add some common test fields if not present
      if (!Object.keys(testData).some(k => k.toLowerCase().includes('name'))) {
        testData['_testName'] = 'Test User';
      }

      console.log('[TestFormSubmission] Generated test data:', testData);

      // Import and call submitFeedback
      const { submitFeedback } = await import('@/app/actions');
      const submitResult = await submitFeedback(surveyId, testData);

      if (submitResult.error) {
        setResult({ success: false, message: submitResult.error });
        toast({
          title: 'Test Submission Failed',
          description: submitResult.error,
          variant: 'destructive',
        });
      } else {
        setResult({ success: true, message: 'Test submission sent! Check your email and server logs.' });
        toast({
          title: 'Test Submission Sent',
          description: 'Check your email inbox and server logs to verify the full flow.',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setResult({ success: false, message });
      toast({
        title: 'Test Submission Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleTestSubmission}
          disabled={isSubmitting}
          className="shrink-0"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          {isSubmitting ? 'Submitting...' : 'Send Test Submission'}
        </Button>
        <p className="text-xs text-muted-foreground pt-2">
          Generates realistic test data for all form fields and submits it, triggering webhooks, email notifications, and PDF generation.
        </p>
      </div>
      {result && (
        <div className={`flex items-center gap-1.5 text-xs ${result.success ? 'text-green-700' : 'text-red-700'}`}>
          {result.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {result.message}
        </div>
      )}
    </div>
  );
}


export default function SurveyEditor({ survey }: { survey: Record<string, any> }) {
  const [isMounted, setIsMounted] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const { toast } = useToast();
  const defaulted: SurveyFormData = {
    resumeSettings: {
      showResumeModal: true,
      resumeTitle: 'Resume your saved progress?',
      resumeDescription: 'We found a saved draft. Continue where you left off or start over.',
      continueLabel: 'Continue',
      startOverLabel: 'Start over',
      showContinue: true,
      showStartOver: true,
    },
    thankYouSettings: {
      icon: 'checkmark',
      title: 'Thank You!',
      description: 'Your submission has been received successfully.',
      showButton: true,
      buttonText: 'Submit Another',
      buttonLink: '',
      themeColor: '#22c55e',
    },
    ...survey,
  } as any;
  const form = useForm<SurveyFormData>({ resolver: zodResolver(surveySchema), defaultValues: defaulted, shouldUnregister: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const { fields: sections, append, remove, move: moveSection } = useFieldArray({ control: form.control, name: 'sections' });
  const moveFieldFns = useRef<Record<number, (from: number, to: number) => void>>({});

  const registerMoveField = useCallback((index: number, moveFn: (from: number, to: number) => void) => { moveFieldFns.current[index] = moveFn; }, []);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(CustomKeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  useEffect(() => { setIsMounted(true); }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = sections.find(s => s.id === active.id);
    if (item) { setActiveItem({ ...item, type: 'section' }); return; }
    for (const [sectionIndex, section] of sections.entries()) {
      const field = section.fields.find(f => f.id === active.id);
      if (field) { setActiveItem({ ...field, type: 'field', sectionIndex }); return; }
    }
  };

  const handleDragOver = (event: DragOverEvent) => setOverId(event.over ? String(event.over.id) : null);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null); setOverId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (active.data.current?.type === 'section') {
      moveSection(sections.findIndex(s => s.id === active.id), sections.findIndex(s => s.id === over.id));
    } else if (active.data.current?.type === 'field') {
      const { sectionIndex } = active.data.current;
      const moveField = moveFieldFns.current[sectionIndex];
      if (moveField) {
        const fields = form.getValues(`sections.${sectionIndex}.fields`);
        moveField(fields.findIndex(f => f.id === active.id), fields.findIndex(f => f.id === over.id));
      }
    }
  };

  const handleDragCancel = () => { setActiveItem(null); setOverId(null); };

  async function onSubmit(values: SurveyFormData) {
    console.log('Form submitted with values:', values);
    setIsSubmitting(true);
    try {
      const result = await updateSurvey(survey.id, values);
      console.log('Update result:', result);
      setIsSubmitting(false);
      if (result.error) {
        toast({
          title: 'Save Failed',
          description: result.error,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Survey Saved',
          description: 'Your changes have been saved successfully.',
        });
      }
    } catch (error) {
      setIsSubmitting(false);
      console.error('Save error:', error);
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive'
      });
    }
  }

  function onInvalid(errors: any) {
    console.error('Form validation errors:', errors);

    // Collect all validation errors with details
    const errorDetails: Array<{ section: string; field: string; message: string; path: string }> = [];

    if (errors.sections) {
      errors.sections.forEach((section: any, sectionIndex: number) => {
        if (!section) return;

        const sectionTitle = form.getValues(`sections.${sectionIndex}.title`) || `Section ${sectionIndex + 1}`;

        // Check section-level errors
        if (section.title) {
          errorDetails.push({
            section: sectionTitle,
            field: 'Section Title',
            message: section.title.message || 'Required field',
            path: `sections.${sectionIndex}.title`
          });
        }

        // Check field errors
        if (section.fields) {
          section.fields.forEach((field: any, fieldIndex: number) => {
            if (!field) return;

            const fieldLabel = form.getValues(`sections.${sectionIndex}.fields.${fieldIndex}.label`) || `Field ${fieldIndex + 1}`;

            if (field.label) {
              errorDetails.push({
                section: sectionTitle,
                field: fieldLabel,
                message: field.label.message || 'Required field',
                path: `sections.${sectionIndex}.fields.${fieldIndex}.label`
              });
            }

            if (field.type) {
              errorDetails.push({
                section: sectionTitle,
                field: fieldLabel,
                message: field.type.message || 'Invalid field type',
                path: `sections.${sectionIndex}.fields.${fieldIndex}.type`
              });
            }

            // Check nested fields in groups
            if (field.fields) {
              field.fields.forEach((nestedField: any, nestedIndex: number) => {
                if (!nestedField) return;

                const nestedPath = `sections.${sectionIndex}.fields.${fieldIndex}.fields.${nestedIndex}.label` as any;
                const nestedLabel = form.getValues(nestedPath) || `Nested Field ${nestedIndex + 1}`;

                if (nestedField.label) {
                  errorDetails.push({
                    section: sectionTitle,
                    field: `${fieldLabel} → ${nestedLabel}`,
                    message: nestedField.label.message || 'Required field',
                    path: `sections.${sectionIndex}.fields.${fieldIndex}.fields.${nestedIndex}.label`
                  });
                }
              });
            }
          });
        }
      });
    }

    // Check top-level errors
    if (errors.title) {
      errorDetails.push({
        section: 'Survey Details',
        field: 'Survey Title',
        message: errors.title.message || 'Required field',
        path: 'title'
      });
    }

    if (errorDetails.length === 0) {
      // Fallback for unknown errors
      const unknownErrors = Object.entries(errors)
        .map(([field, error]: [string, any]) => ({
          section: 'Unknown',
          field,
          message: error?.message || 'Validation error',
          path: field
        }));
      errorDetails.push(...unknownErrors);
    }

    // Auto-scroll to first error
    if (errorDetails.length > 0) {
      const firstErrorPath = errorDetails[0].path;
      const firstErrorElement = document.querySelector(`[name="${firstErrorPath}"]`);
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Focus the element after a short delay
        setTimeout(() => {
          if (firstErrorElement instanceof HTMLElement) {
            firstErrorElement.focus();
          }
        }, 300);
      }
    }

    // Create error message summary
    const errorCount = errorDetails.length;
    const errorSummary = errorDetails
      .slice(0, 5)
      .map(e => `• ${e.section}: ${e.field} - ${e.message}`)
      .join('\n');

    const moreErrors = errorCount > 5 ? `\n... and ${errorCount - 5} more errors` : '';

    toast({
      title: `${errorCount} Validation Error${errorCount !== 1 ? 's' : ''} Found`,
      description: `Please fix the following:\n${errorSummary}${moreErrors}`,
      variant: 'destructive',
      duration: 10000, // Show for 10 seconds
    });
  }

  if (!isMounted) return <Skeleton className="w-full h-96" />;

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
          <Tabs defaultValue="sections" className="w-full">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="sections">Sections</TabsTrigger>
                <TabsTrigger value="thank-you">Thank You Page</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <Button type="submit" size="sm" disabled={isSubmitting} className="shadow-2xl md:hidden">{isSubmitting && <Loader2 className="mr-2 animate-spin" />} Save</Button>
            </div>
            <TabsContent value="thank-you" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Thank You Page Customization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="thankYouSettings.icon" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Success Icon</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? 'checkmark'}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select Icon" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="checkmark">Checkmark</SelectItem>
                            <SelectItem value="party">Party Popper</SelectItem>
                            <SelectItem value="star">Star</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="thankYouSettings.themeColor" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Icon/Accent Color</FormLabel>
                        <FormControl><Input type="color" {...field} value={field.value ?? '#22c55e'} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="thankYouSettings.title" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Success Title</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="thankYouSettings.description" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Success Message</FormLabel>
                        <FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="thankYouSettings.showButton" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm md:col-span-2">
                        <div className="space-y-0.5">
                          <FormLabel>Show Final Button</FormLabel>
                          <FormDescription>Display a button after submission (e.g., to return to home or submit another).</FormDescription>
                        </div>
                        <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                    {form.watch('thankYouSettings.showButton') && (
                      <>
                        <FormField control={form.control} name="thankYouSettings.buttonText" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Button Text</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="thankYouSettings.buttonLink" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Button Link (Optional)</FormLabel>
                            <FormDescription>Leave empty to just refresh/reset the form.</FormDescription>
                            <FormControl><Input {...field} value={field.value ?? ''} placeholder="https://..." /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Resume Later Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="saveProgressEnabled" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5"><FormLabel>Enable Resume Later</FormLabel><FormDescription>Save progress locally in the browser.</FormDescription></div>
                      <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="resumeSettings.showResumeModal" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5"><FormLabel>Show Resume Modal</FormLabel><FormDescription>Ask users whether to continue or start over when a draft is found.</FormDescription></div>
                      <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="resumeSettings.resumeTitle" render={({ field }) => <FormItem><FormLabel>Modal Title</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="resumeSettings.resumeDescription" render={({ field }) => <FormItem><FormLabel>Modal Description</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="resumeSettings.continueLabel" render={({ field }) => <FormItem><FormLabel>Continue Button Label</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="resumeSettings.startOverLabel" render={({ field }) => <FormItem><FormLabel>Start Over Button Label</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="resumeSettings.showContinue" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>Show Continue</FormLabel></div>
                        <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="resumeSettings.showStartOver" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>Show Start Over</FormLabel></div>
                        <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Webhook Integration</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="webhookUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook URL</FormLabel>
                      <FormDescription>When a submission is made, the form data will be sent to this URL via POST request.</FormDescription>
                      <FormControl><Input {...field} value={field.value ?? ''} placeholder="https://your-webhook-endpoint.com/submissions" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="webhookSecret" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook Secret (Optional)</FormLabel>
                      <FormDescription>Optional secret key sent in the X-Webhook-Secret header for authentication.</FormDescription>
                      <FormControl><Input type="password" {...field} value={field.value ?? ''} placeholder="Your secret key" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="webhookEnabled" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Enable Survey Webhook</FormLabel>
                        <FormDescription>When enabled, submissions for this specific survey will be sent to the URL above.</FormDescription>
                      </div>
                      <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isTestingWebhook || !form.watch('webhookUrl')}
                      onClick={async () => {
                        const url = form.getValues('webhookUrl');
                        if (!url) return;

                        setIsTestingWebhook(true);
                        try {
                          const response = await fetch('/api/webhooks/test', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              url,
                              secret: form.getValues('webhookSecret'),
                              payload: {
                                event: 'survey.test',
                                surveyId: survey.id,
                                surveyTitle: form.getValues('title'),
                                timestamp: new Date().toISOString(),
                                data: { message: 'This is a test notification from the survey editor.' }
                              }
                            }),
                          });

                          if (response.ok) {
                            toast({ title: 'Test Sent', description: 'Webhook test notification sent successfully.' });
                          } else {
                            const err = await response.json();
                            toast({ title: 'Test Failed', description: err.error || 'Failed to send test.', variant: 'destructive' });
                          }
                        } catch (err) {
                          toast({ title: 'Test Failed', description: 'Network error or invalid URL.', variant: 'destructive' });
                        } finally {
                          setIsTestingWebhook(false);
                        }
                      }}
                    >
                      {isTestingWebhook ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                      Test Webhook
                    </Button>
                  </div>
                  <div className="p-3 bg-muted rounded-md border border-border mt-4">
                    <h4 className="text-xs font-semibold mb-2 uppercase tracking-tight text-muted-foreground">Payload Preview</h4>
                    <pre className="text-[10px] overflow-x-auto text-muted-foreground">
                      {`{
  "event": "survey.submission.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "submissionId": "...",
    "surveyId": "${survey.id}",
    "submittedAt": "2024-01-15T10:30:00Z",
    "fields": { ... }
  }
}`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-blue-500" />
                      <CardTitle>Email Notifications</CardTitle>
                    </div>
                    {form.watch('emailNotifications.enabled') && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="emailNotifications.enabled" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable Email Notifications</FormLabel>
                        <FormDescription>Automatically send an email with submission details (and optional PDF) each time someone submits a response.</FormDescription>
                      </div>
                      <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                  {form.watch('emailNotifications.enabled') && (
                    <div className="space-y-4 rounded-lg border border-blue-100 bg-blue-50/30 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                        <AlertTriangle className="h-4 w-4" />
                        Requires SMTP credentials (SMTP_USER and SMTP_PASSWORD) to be configured in your environment variables.
                      </div>

                      <FormField control={form.control} name="emailNotifications.recipients" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">Recipient Emails <span className="text-destructive">*</span></FormLabel>
                          <FormDescription>Comma-separated list of email addresses that will receive notifications.</FormDescription>
                          <FormControl>
                            <Input
                              {...field}
                              value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                              onChange={(e) => {
                                const emails = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                field.onChange(emails);
                              }}
                              placeholder="admin@example.com, manager@example.com"
                            />
                          </FormControl>
                          {Array.isArray(field.value) && field.value.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {field.value.map((email: string, i: number) => (
                                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                                  <Mail className="h-3 w-3" />
                                  {email}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = (field.value || []).filter((_: string, idx: number) => idx !== i);
                                      field.onChange(updated);
                                    }}
                                    className="ml-0.5 hover:text-red-600"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="emailNotifications.subject" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Subject (Optional)</FormLabel>
                          <FormDescription>Supports placeholders: {'{{surveyTitle}}'} and {'{{submissionDate}}'}.</FormDescription>
                          <FormControl><Input {...field} value={field.value ?? ''} placeholder="New Submission: {{surveyTitle}}" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="emailNotifications.bodyTemplate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Body (Optional)</FormLabel>
                          <FormDescription>Custom message included in the notification email body.</FormDescription>
                          <FormControl><Textarea {...field} value={field.value ?? ''} placeholder="A new response has been submitted. Please see the attached PDF for details." rows={3} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="emailNotifications.attachPdf" render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-white p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Attach PDF</FormLabel>
                              <FormDescription>Include a PDF summary of the submission.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value !== false} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="emailNotifications.senderName" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sender Name (Optional)</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} placeholder="Form Notifications" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="rounded-lg border bg-white p-4 shadow-sm">
                        <h4 className="text-sm font-semibold mb-2">Test Email Delivery</h4>
                        <p className="text-xs text-muted-foreground mb-3">Send a test email to verify your SMTP configuration is working. Enter a recipient and click Send Test.</p>
                        <TestEmailButton recipients={form.watch('emailNotifications.recipients') || []} />
                      </div>

                      <div className="rounded-lg border bg-amber-50 border-amber-200 p-4 shadow-sm">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-amber-600" />
                          Test Full Submission Flow
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Submit test data to trigger the complete flow: form submission → webhook → email notification with PDF attachment.
                        </p>
                        <TestFormSubmissionButton surveyId={survey.id} sections={form.watch('sections') || []} />
                      </div>

                      <EmailNotificationLog surveyId={survey.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Survey Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="title" render={({ field }) => <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="submitButtonLabel" render={({ field }) => <FormItem><FormLabel>Submit Button Label</FormLabel><FormControl><Input {...field} value={field.value ?? 'Submit'} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="saveProgressEnabled" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>Enable Save Progress</FormLabel><FormDescription>Allow respondents to save progress in their browser.</FormDescription></div>
                        <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="shareButtonEnabled" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>Show Share Button</FormLabel><FormDescription>Display a share button on the survey page.</FormDescription></div>
                        <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="shareTitle" render={({ field }) => <FormItem><FormLabel>Share Dialog Title</FormLabel><FormControl><Input {...field} value={field.value ?? 'Share this survey'} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="shareText" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Share Text</FormLabel><FormControl><Textarea {...field} value={field.value ?? "I’d like your feedback—please fill out this survey."} /></FormControl><FormMessage /></FormItem>} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="appearance.themeColor" render={({ field }) => <FormItem><FormLabel>Theme Color</FormLabel><FormControl><Input type="color" {...field} value={field.value ?? '#C8262A'} /></FormControl><FormDescription>Applies to titles, buttons, and focus ring.</FormDescription><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="appearance.cardShadow" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Shadow</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? 'sm'}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="sm">Subtle</SelectItem>
                          <SelectItem value="md">Medium</SelectItem>
                          <SelectItem value="lg">Large</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="appearance.cardTitleSize" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Title Size</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? 'lg'}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="sm">Small</SelectItem>
                          <SelectItem value="md">Medium</SelectItem>
                          <SelectItem value="lg">Large</SelectItem>
                          <SelectItem value="xl">XL</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="appearance.sectionTitleSize" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section Title Size</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? 'lg'}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="sm">Small</SelectItem>
                          <SelectItem value="md">Medium</SelectItem>
                          <SelectItem value="lg">Large</SelectItem>
                          <SelectItem value="xl">XL</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="appearance.labelSize" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label Size</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? 'sm'}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="xs">XS</SelectItem>
                          <SelectItem value="sm">SM</SelectItem>
                          <SelectItem value="md">MD</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="appearance.gradient" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5"><FormLabel>Background Gradient</FormLabel><FormDescription>Enable/disable page background gradient glow.</FormDescription></div>
                      <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sections" className="space-y-6">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Sections</h2>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => append({ id: nanoid(), title: 'New Section', fields: [] })}><PlusCircle className="mr-2" /> Add Section</Button>
                      <SectionTemplateSelector onSelectTemplate={(template) => append(template)} />
                    </div>
                  </div>
                  <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    <Accordion type="multiple" className="space-y-4" defaultValue={[`section-0`]}>
                      {sections.map((section, index) => (<SortableSection key={section.id} {...{ section, sectionIndex: index, removeSection: remove, registerMoveField, overId }} />))}
                    </Accordion>
                  </SortableContext>
                </div>
                <DragOverlay>
                  <div className="shadow-xl shadow-primary/25 rounded-lg">
                    {activeItem?.type === 'section' && <SortableSection section={activeItem} sectionIndex={-1} removeSection={() => { }} registerMoveField={() => { }} />}
                    {activeItem?.type === 'field' && <SortableField field={activeItem} sectionIndex={activeItem.sectionIndex} fieldIndex={-1} remove={() => { }} move={() => { }} totalFields={0} />}
                  </div>
                </DragOverlay>
              </DndContext>
            </TabsContent>
          </Tabs>

          <div className="sticky bottom-4 z-10 hidden md:flex justify-end"><Button type="submit" size="lg" disabled={isSubmitting} className="shadow-2xl">{isSubmitting && <Loader2 className="mr-2 animate-spin" />} Save</Button></div>
        </form>
      </Form>
    </FormProvider>
  );
}
