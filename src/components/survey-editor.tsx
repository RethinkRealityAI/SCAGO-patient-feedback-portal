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
import { updateSurvey } from '@/lib/client-actions';
import { useToast } from '@/hooks/use-toast';
import { DndContext, closestCenter, KeyboardSensor as DndKeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, PlusCircle, GripVertical, Loader2, ArrowUp, ArrowDown, X } from 'lucide-react';
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
const fieldSchema: z.ZodType<FormFieldConfig> = z.lazy(() => z.object({
  id: z.string(),
  label: z.string().min(1, 'Question label is required.'),
  type: z.enum(['text', 'textarea', 'email', 'phone', 'url', 'date', 'time', 'time-amount', 'number', 'digital-signature', 'select', 'radio', 'checkbox', 'slider', 'rating', 'nps', 'group', 'boolean-checkbox', 'anonymous-toggle', 'province-ca', 'city-on', 'hospital-on', 'department-on', 'duration-hm', 'duration-dh', 'file-upload', 'multi-text', 'matrix-single', 'matrix-multiple', 'likert-scale', 'pain-scale', 'calculated', 'ranking', 'datetime', 'color', 'range', 'percentage', 'currency']),
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

const surveySchema = z.object({
  title: z.string().min(1, 'Survey title is required.'),
  description: z.string().optional(),
  appearance: appearanceSchema,
  // New: submission and sharing controls
  submitButtonLabel: z.string().default('Submit').optional(),
  saveProgressEnabled: z.boolean().default(true).optional(),
  shareButtonEnabled: z.boolean().default(true).optional(),
  shareTitle: z.string().default('Share this survey').optional(),
  shareText: z.string().default("I’d like your feedback—please fill out this survey.").optional(),
  resumeSettings: z.object({
    showResumeModal: z.boolean().default(true).optional(),
    resumeTitle: z.string().default('Resume your saved progress?').optional(),
    resumeDescription: z.string().default('We found a saved draft. Continue where you left off or start over.').optional(),
    continueLabel: z.string().default('Continue').optional(),
    startOverLabel: z.string().default('Start over').optional(),
    showContinue: z.boolean().default(true).optional(),
    showStartOver: z.boolean().default(true).optional(),
  }).optional(),
  sections: z.array(sectionSchema),
});
type SurveyFormData = z.infer<typeof surveySchema>;
type FieldTypePath = `sections.${number}.fields.${number}`;
interface FormFieldConfig { id: string; label: string; type: any; options?: any[]; fields?: FormFieldConfig[]; conditionField?: string; conditionValue?: any; validation?: { required?: boolean; pattern?: string; }; }

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
        if (f.id !== field.id && ['radio', 'select', 'checkbox', 'boolean-checkbox', 'province-ca', 'city-on', 'hospital-on'].includes(f.type)) {
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
                <SelectItem value="likert-scale">Likert Scale (Agreement)</SelectItem>
                <SelectItem value="pain-scale">Pain Scale (0-10 Visual)</SelectItem>
                <SelectItem value="calculated">Calculated Field</SelectItem>
                <SelectItem value="ranking">Ranking (Drag to Order)</SelectItem>
                <SelectItem value="datetime">Date & Time Combined</SelectItem>
                <SelectItem value="color">Color Picker</SelectItem>
                <SelectItem value="range">Range Slider</SelectItem>
                <SelectItem value="percentage">Percentage (0-100%)</SelectItem>
                <SelectItem value="currency">Currency (CAD)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        {showOptions && (
          <div className="space-y-2">
            <Label>Options</Label>
            {options.map((option, optionIndex) => (
              <div key={option.id} className="flex flex-col md:flex-row items-center gap-2">
                <FormField control={control} name={`${fieldPath}.options.${optionIndex}.label` as any} render={({ field: formField }) => (<FormItem className="w-full"><FormLabel className="md:sr-only">Label</FormLabel><FormControl><Input {...formField} value={formField.value ?? ''} onPointerDown={stopPropagation} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name={`${fieldPath}.options.${optionIndex}.value` as any} render={({ field: formField }) => (<FormItem className="w-full"><FormLabel className="md:sr-only">Value</FormLabel><FormControl><Input {...formField} value={formField.value ?? ''} onPointerDown={stopPropagation} /></FormControl><FormMessage /></FormItem>)} />
                <Button type="button" variant="ghost" size="icon" onPointerDown={stopPropagation} onClick={() => removeOption(optionIndex)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onPointerDown={stopPropagation} onClick={() => appendOption({ id: nanoid(), label: '', value: '' })}>Add Option</Button>
          </div>
        )}
        {field?.type === 'group' && (
          <GroupChildrenEditor parentFieldPath={fieldPath} />
        )}
        {['matrix-single', 'matrix-multiple'].includes(field?.type) && (
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
            <AccordionItem value="conditional-logic">
                <AccordionTrigger onPointerDown={stopPropagation}>Conditional Logic</AccordionTrigger>
                <AccordionContent className="p-4 space-y-4">
                    <FormDescription>Show this question only when another question has a specific answer.</FormDescription>
                    {field?.conditionField && field?.conditionField === (getValues(fieldPath as any) as any)?.id && (
                      <div className="text-xs text-destructive">A field cannot depend on itself.</div>
                    )}
                    <FormField control={control} name={`${fieldPath}.conditionField` as any} render={({ field: formField }) => (
                        <FormItem><FormLabel>Show when</FormLabel>
                            <div className="flex items-center gap-2">
                                <Select onValueChange={formField.onChange} value={formField.value || undefined}>
                                    <FormControl><SelectTrigger onPointerDown={stopPropagation}><SelectValue placeholder="Select a question..." /></SelectTrigger></FormControl>
                                    <SelectContent>{availableConditionalFields.map(f => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}</SelectContent>
                                </Select>
                                {formField.value && <Button variant="ghost" size="icon" onPointerDown={stopPropagation} onClick={clearConditionalLogic}><X className="h-4 w-4" /></Button>}
                            </div>
                        <FormMessage /></FormItem>
                    )} />
                    {conditionalFieldId && (
                         <FormField control={control} name={`${fieldPath}.conditionValue` as any} render={({ field: formField }) => (
                            <FormItem><FormLabel>Has the value</FormLabel>
                                <FormControl>
                                    {conditionalFieldType === 'boolean-checkbox' ? (<Switch checked={formField.value === 'true'} onCheckedChange={(checked: boolean) => formField.onChange(String(checked))} />) : (<Input {...formField} value={formField.value ?? ''} onPointerDown={stopPropagation} placeholder="Enter the required value" />)}
                                </FormControl>
                                <FormDescription>
                                    {conditionalFieldType === 'checkbox' 
                                        ? 'For checkbox fields (multi-select), enter one value (e.g., "outpatient"). The field will show when that value is selected.'
                                        : 'For Yes/No questions, the value is \'true\' or \'false\'. For others, use the option\'s value (e.g., \'option-1\').'}
                                </FormDescription>
                            <FormMessage /></FormItem>
                        )} />
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
    ...survey,
  } as any;
  const form = useForm<SurveyFormData>({ resolver: zodResolver(surveySchema), defaultValues: defaulted, shouldUnregister: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
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
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <Button type="submit" size="sm" disabled={isSubmitting} className="shadow-2xl md:hidden">{isSubmitting && <Loader2 className="mr-2 animate-spin" />} Save</Button>
            </div>
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
                        {activeItem?.type === 'section' && <SortableSection section={activeItem} sectionIndex={-1} removeSection={() => {}} registerMoveField={() => {}} />}
                        {activeItem?.type === 'field' && <SortableField field={activeItem} sectionIndex={activeItem.sectionIndex} fieldIndex={-1} remove={() => {}} move={() => {}} totalFields={0} />}
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
