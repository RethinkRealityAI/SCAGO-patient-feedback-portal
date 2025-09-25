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

// Schemas & Types
const optionSchema = z.object({ id: z.string(), label: z.string().min(1, 'Option label is required.'), value: z.string().min(1, 'Option value is required.') });
const fieldSchema: z.ZodType<FormFieldConfig> = z.lazy(() => z.object({
  id: z.string(),
  label: z.string().min(1, 'Question label is required.'),
  type: z.enum(['text', 'textarea', 'email', 'phone', 'date', 'number', 'select', 'radio', 'checkbox', 'rating', 'nps', 'group', 'boolean-checkbox', 'province-ca', 'city-on', 'hospital-on', 'duration-hm', 'duration-dh']),
  options: z.array(optionSchema).optional(),
  fields: z.array(fieldSchema).optional(),
  conditionField: z.string().optional(),
  conditionValue: z.string().optional(),
  validation: z.object({
    required: z.boolean().optional(),
    pattern: z.string().optional(),
  }).optional(),
}));
const sectionSchema = z.object({ id: z.string(), title: z.string().min(1, 'Section title is required.'), fields: z.array(fieldSchema) });
const surveySchema = z.object({ title: z.string().min(1, 'Survey title is required.'), description: z.string().optional(), sections: z.array(sectionSchema) });
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
                <SelectItem value="province-ca">Province (Canada)</SelectItem>
                <SelectItem value="city-on">City (Ontario)</SelectItem>
                <SelectItem value="hospital-on">Hospital (Ontario)</SelectItem>
                <SelectItem value="duration-hm">Duration (Hours/Minutes)</SelectItem>
                <SelectItem value="duration-dh">Duration (Days/Hours)</SelectItem>
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
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="validation">
                <AccordionTrigger onPointerDown={stopPropagation}>Validation</AccordionTrigger>
                <AccordionContent className="p-4 space-y-4">
                  <FormField control={control} name={`${fieldPath}.validation.required`} render={({ field: formField }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Required</FormLabel><FormDescription>Is this question mandatory?</FormDescription></div><FormControl><Switch checked={formField.value} onCheckedChange={formField.onChange} onPointerDown={stopPropagation} /></FormControl></FormItem>)} />
                  {['text', 'textarea', 'email', 'phone'].includes(field.type) && (
                    <>
                        <FormField control={control} name={`${fieldPath}.validation.pattern`} render={({ field: { onChange, ...formField } }) => (
                            <FormItem>
                            <FormLabel>Pattern (Regex)</FormLabel>
                            <FormControl>
                                <Input
                                {...formField}
                                onChange={onChange}
                                value={formField.value ?? ''}
                                onPointerDown={stopPropagation}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={control} name={`${fieldPath}.validation.pattern`} render={({ field: { onChange, ...formField } }) => (
                            <FormItem>
                            <FormLabel>Regex Presets</FormLabel>
                            <Select onValueChange={(value) => onChange(value)} value={formField.value ?? ''}>
                                <FormControl>
                                <SelectTrigger onPointerDown={stopPropagation}>
                                    <SelectValue placeholder="Select a preset..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {regexPresets.map((preset) => (
                                    <SelectItem key={preset.label} value={preset.value}>
                                    {preset.label}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </>
                  )}
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="conditional-logic">
                <AccordionTrigger onPointerDown={stopPropagation}>Conditional Logic</AccordionTrigger>
                <AccordionContent className="p-4 space-y-4">
                    <FormDescription>Show this question only when another question has a specific answer.</FormDescription>
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
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} className={cn(isOver && "ring-2 ring-blue-500/50 ring-offset-2 ring-offset-background", "rounded-lg")}>
      <AccordionItem value={`section-${sectionIndex}`} className="border rounded-lg bg-card/80">
        <AccordionTrigger className="p-6 text-xl hover:no-underline">
          <div {...attributes} {...listeners} className="cursor-grab p-2" onPointerDown={stopPropagation}><GripVertical /></div>
          <FormField control={control} name={`sections.${sectionIndex}.title`} render={({ field }) => <Input {...field} value={field.value ?? ''} onPointerDown={stopPropagation} className="text-xl font-semibold tracking-tight text-primary border-0 bg-transparent p-0 h-auto focus-visible:ring-0" />} />
        </AccordionTrigger>
        <AccordionContent className="p-6 space-y-6 border-t">
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
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} className={cn(isOver && "bg-blue-100 dark:bg-blue-900/20", "rounded-lg")} {...attributes}>
      <FieldEditor {...{ fieldPath: `sections.${sectionIndex}.fields.${fieldIndex}`, fieldIndex, remove, move, totalFields, listeners }} />
    </div>
  );
};

export default function SurveyEditor({ survey }: { survey: Record<string, any> }) {
  const [isMounted, setIsMounted] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const { toast } = useToast();
  const form = useForm<SurveyFormData>({ resolver: zodResolver(surveySchema), defaultValues: survey, shouldUnregister: false });
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card><CardHeader><CardTitle>Survey Details</CardTitle></CardHeader><CardContent className="space-y-4"><FormField control={form.control} name="title" render={({ field }) => <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} /></CardContent></Card>
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
                <div className="shadow-2xl shadow-blue-500/50 rounded-lg">
                    {activeItem?.type === 'section' && <SortableSection section={activeItem} sectionIndex={-1} removeSection={() => {}} registerMoveField={() => {}} />}
                    {activeItem?.type === 'field' && <SortableField field={activeItem} sectionIndex={activeItem.sectionIndex} fieldIndex={-1} remove={() => {}} move={() => {}} totalFields={0} />}
                </div>
            </DragOverlay>
          </DndContext>
          <div className="sticky bottom-4 z-10 flex justify-end"><Button type="submit" size="lg" disabled={isSubmitting} className="shadow-2xl">{isSubmitting && <Loader2 className="mr-2 animate-spin" />} Save</Button></div>
        </form>
      </Form>
    </FormProvider>
  );
}
