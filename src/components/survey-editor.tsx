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
import { updateSurvey } from '@/app/editor/actions';
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

// Schemas & Types
const optionSchema = z.object({ id: z.string(), label: z.string().min(1, 'Option label is required.'), value: z.string().min(1, 'Option value is required.') });
const fieldSchema: z.ZodType<FormFieldConfig> = z.lazy(() => z.object({
  id: z.string(),
  label: z.string().min(1, 'Question label is required.'),
  type: z.enum(['text', 'textarea', 'email', 'phone', 'date', 'time-amount', 'number', 'select', 'radio', 'checkbox', 'rating', 'nps', 'group', 'boolean-checkbox', 'anonymous-toggle', 'province-ca', 'city-on', 'hospital-on', 'duration-hm', 'duration-dh']),
  options: z.array(optionSchema).optional(),
  fields: z.array(fieldSchema).optional(),
  conditionField: z.string().optional(),
  conditionValue: z.string().optional(),
  validation: z.object({
    required: z.boolean().optional(),
    pattern: z.string().optional(),
  }).optional(),
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
  const { fields: options, append: appendOption, remove: removeOption } = useFieldArray({ control, name: `${fieldPath}.options` });
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
    const allFields: { label: string; value: string }[] = [];
    const sections = getValues('sections');
    sections.forEach(section => {
        section.fields.forEach(f => {
            if (f.id === field.id) return;
            if (['radio', 'select', 'boolean-checkbox', 'province-ca', 'city-on'].includes(f.type)) {
                allFields.push({ label: `${f.label} (ID: ${f.id})`, value: f.id });
            }
        })
    })
    return allFields;
  }, [getValues, field.id]);

  const conditionalFieldId = watch(`${fieldPath}.conditionField`);
  const conditionalFieldType = useMemo(() => {
    const sections = getValues('sections');
    for (const section of sections) {
        for (const f of section.fields) {
            if (f.id === conditionalFieldId) {
                return f.type;
            }
        }
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
            <div {...listeners} className="cursor-grab p-2"><GripVertical /></div>
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
        <FormField control={control} name={`${fieldPath}.label`} render={({ field: formField }) => (<FormItem><FormLabel>Label</FormLabel><FormControl><Input {...formField} value={formField.value ?? ''} onPointerDown={stopPropagation} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={control} name={`${fieldPath}.type`} render={({ field: formField }) => (
          <FormItem>
            <FormLabel>Type</FormLabel>
            <Select onValueChange={handleTypeChange} defaultValue={formField.value}>
              <FormControl><SelectTrigger onPointerDown={stopPropagation}><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="textarea">Text Area</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="rating">Rating (1-5 Stars)</SelectItem>
                <SelectItem value="nps">NPS Scale (1-10)</SelectItem>
                <SelectItem value="select">Select</SelectItem>
                <SelectItem value="radio">Radio</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
                <SelectItem value="boolean-checkbox">Yes/No</SelectItem>
                <SelectItem value="anonymous-toggle">Anonymous Toggle</SelectItem>
                <SelectItem value="group">Group (Side-by-side fields)</SelectItem>
                <SelectItem value="province-ca">Province (Canada)</SelectItem>
                <SelectItem value="city-on">City (Ontario)</SelectItem>
                <SelectItem value="hospital-on">Hospital (Ontario)</SelectItem>
                <SelectItem value="duration-hm">Duration (Hours/Minutes)</SelectItem>
                <SelectItem value="duration-dh">Duration (Days/Hours)</SelectItem>
                <SelectItem value="time-amount">Time Amount (Days/Hours)</SelectItem>
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
                <FormField control={control} name={`${fieldPath}.options.${optionIndex}.label`} render={({ field: formField }) => (<FormItem className="w-full"><FormLabel className="md:sr-only">Label</FormLabel><FormControl><Input {...formField} value={formField.value ?? ''} onPointerDown={stopPropagation} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name={`${fieldPath}.options.${optionIndex}.value`} render={({ field: formField }) => (<FormItem className="w-full"><FormLabel className="md:sr-only">Value</FormLabel><FormControl><Input {...formField} value={formField.value ?? ''} onPointerDown={stopPropagation} /></FormControl><FormMessage /></FormItem>)} />
                <Button type="button" variant="ghost" size="icon" onPointerDown={stopPropagation} onClick={() => removeOption(optionIndex)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onPointerDown={stopPropagation} onClick={() => appendOption({ id: nanoid(), label: '', value: '' })}>Add Option</Button>
          </div>
        )}
        {!(field?.type === 'group' || field?.type === 'anonymous-toggle') && (
          <div className="flex items-center justify-between">
            <FormField control={control} name={`${fieldPath}.validation.required`} render={({ field: formField }) => (
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
                    <FormField control={control} name={`${fieldPath}.conditionField`} render={({ field: formField }) => (
                        <FormItem><FormLabel>Show when</FormLabel>
                            <div className="flex items-center gap-2">
                                <Select onValueChange={formField.onChange} value={formField.value ?? ''}>
                                    <FormControl><SelectTrigger onPointerDown={stopPropagation}><SelectValue placeholder="Select a question..." /></SelectTrigger></FormControl>
                                    <SelectContent>{availableConditionalFields.map(f => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}</SelectContent>
                                </Select>
                                {formField.value && <Button variant="ghost" size="icon" onPointerDown={stopPropagation} onClick={clearConditionalLogic}><X className="h-4 w-4" /></Button>}
                            </div>
                        <FormMessage /></FormItem>
                    )} />
                    {conditionalFieldId && (
                         <FormField control={control} name={`${fieldPath}.conditionValue`} render={({ field: formField }) => (
                            <FormItem><FormLabel>Has the value</FormLabel>
                                <FormControl>
                                    {conditionalFieldType === 'boolean-checkbox' ? (<Switch checked={formField.value === 'true'} onCheckedChange={(checked: boolean) => formField.onChange(String(checked))} />) : (<Input {...formField} value={formField.value ?? ''} onPointerDown={stopPropagation} placeholder="Enter the required value" />)}
                                </FormControl>
                                <FormDescription>For Yes/No questions, the value is 'true' or 'false'. For others, use the option's value (e.g., 'option-1').</FormDescription>
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
            <Button type="button" variant="outline" onPointerDown={stopPropagation} onClick={() => append({ id: nanoid(), label: 'New Question', type: 'text' })}><PlusCircle className="mr-2" /> Add Question</Button>
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
    setIsSubmitting(true);
    const result = await updateSurvey(survey.id, values);
    setIsSubmitting(false);
    toast({ title: result.error ? 'Save Failed' : 'Survey Saved', description: result.error ? result.error : 'Your changes have been saved.' });
  }

  if (!isMounted) return <Skeleton className="w-full h-96" />;

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Sections</h2><Button type="button" variant="outline" onClick={() => append({ id: nanoid(), title: 'New Section', fields: [] })}><PlusCircle className="mr-2" /> Add Section</Button></div>
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
