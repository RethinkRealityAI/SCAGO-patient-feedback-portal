'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, FormProvider, useFormContext, FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { updateSurvey } from '@/app/editor/actions';
import { useToast } from '@/hooks/use-toast';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, PlusCircle, GripVertical, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

// Schemas
const optionSchema = z.object({ id: z.string(), label: z.string().min(1, 'Label is required'), value: z.string().min(1, 'Value is required') });
const fieldSchema: z.ZodType<FormFieldConfig> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string().min(1, 'Label is required'),
    type: z.enum(['text', 'textarea', 'email', 'select', 'radio', 'checkbox', 'rating', 'conditional', 'group', 'boolean-checkbox']),
    description: z.string().optional(),
    placeholder: z.string().optional(),
    required: z.boolean().optional(),
    options: z.array(optionSchema).optional(),
    fields: z.array(fieldSchema).optional(),
  })
);
const sectionSchema = z.object({ id: z.string(), title: z.string().min(1, 'Title is required'), description: z.string().optional(), fields: z.array(fieldSchema) });
const surveySchema = z.object({ title: z.string().min(1, 'Survey title is required'), description: z.string().optional(), sections: z.array(sectionSchema) });

// Types
type SurveyFormData = z.infer<typeof surveySchema>;
type FieldTypePath = `sections.${number}.fields.${number}`;
interface FormFieldConfig { id: string; label: string; type: any; options?: any[]; description?: string; placeholder?: string; required?: boolean; fields?: FormFieldConfig[]; }

const generateSlug = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');

function FieldEditor({ fieldPath, fieldIndex, remove }: { fieldPath: FieldTypePath; fieldIndex: number; remove: (index: number) => void; }) {
  const { control, watch, setValue } = useFormContext<SurveyFormData>();
  const field = watch(fieldPath);
  const fieldLabel = watch(`${fieldPath}.label`);

  useEffect(() => {
    const slug = generateSlug(fieldLabel);
    if (slug) {
      setValue(`${fieldPath}.id`, `${slug}-${nanoid(4)}`, { shouldValidate: false, shouldDirty: true });
    }
  }, [fieldLabel, fieldPath, setValue]);

  const { fields: options, append: appendOption, remove: removeOption } = useFieldArray({ control, name: `${fieldPath}.options` });

  return (
    <Card className="bg-muted/30 relative">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center"><GripVertical className="mr-2 text-muted-foreground cursor-grab" /> Question Editor</CardTitle>
          <Button type="button" variant="destructive" size="icon" onClick={() => remove(fieldIndex)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField control={control} name={`${fieldPath}.label`} render={({ field: formField }) => (
          <FormItem>
            <FormLabel>Question Label</FormLabel>
            <FormControl><Input placeholder="e.g., What is your name?" {...formField} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name={`${fieldPath}.type`} render={({ field: formField }) => (
          <FormItem>
            <FormLabel>Question Type</FormLabel>
            <Select onValueChange={formField.onChange} defaultValue={formField.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select a question type" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="text">Text Input</SelectItem>
                <SelectItem value="textarea">Text Area</SelectItem>
                <SelectItem value="rating">Rating (1-5 Stars)</SelectItem>
                <SelectItem value="select">Select</SelectItem>
                <SelectItem value="radio">Radio</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        {(field.type === 'select' || field.type === 'radio') && (
          <div className="space-y-2">
            <Label>Options</Label>
            {options.map((option, optionIndex) => (
              <div key={option.id} className="flex items-center gap-2">
                <FormField control={control} name={`${fieldPath}.options.${optionIndex}.label`} render={({ field: formField }) => (<FormItem className="flex-grow"><FormControl><Input placeholder="Option Label" {...formField} /></FormControl></FormItem>)} />
                <FormField control={control} name={`${fieldPath}.options.${optionIndex}.value`} render={({ field: formField }) => (<FormItem className="flex-grow"><FormControl><Input placeholder="Option Value" {...formField} /></FormControl></FormItem>)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(optionIndex)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => appendOption({ id: nanoid(), label: '', value: '' })}>Add Option</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const SortableSection = ({ section, sectionIndex, removeSection, moveField }: { section: any; sectionIndex: number; removeSection: (index: number) => void; moveField: (sectionIndex: number, from: number, to: number) => void; }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id, data: { type: 'section' } });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const { control } = useFormContext<SurveyFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: `sections.${sectionIndex}.fields` });

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={`section-${sectionIndex}`} className="border rounded-lg bg-card/80">
        <AccordionTrigger className="p-6 text-xl hover:no-underline" {...attributes} {...listeners}>
          <GripVertical className="text-muted-foreground mr-4" />
          <FormField control={control} name={`sections.${sectionIndex}.title`} render={({ field }) => <Input {...field} onClick={(e) => e.stopPropagation()} className="text-xl font-semibold tracking-tight text-primary border-0 bg-transparent p-0 h-auto focus-visible:ring-0" />} />
        </AccordionTrigger>
        <AccordionContent forceMount className="p-6 space-y-6 border-t">
          <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {fields.map((field, fieldIndex) => (
                <SortableField key={field.id} field={field} sectionIndex={sectionIndex} fieldIndex={fieldIndex} remove={remove} />
              ))}
            </div>
          </SortableContext>
          <div className="flex justify-between items-center pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => append({ id: nanoid(), label: 'New Question', type: 'text' })}><PlusCircle className="mr-2" /> Add Question</Button>
            <Button type="button" variant="destructive" onClick={() => removeSection(sectionIndex)}><Trash2 className="mr-2" /> Delete Section</Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};

const SortableField = ({ field, sectionIndex, fieldIndex, remove }: { field: any; sectionIndex: number; fieldIndex: number; remove: (index: number) => void; }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id, data: { type: 'field', sectionIndex } });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <FieldEditor fieldPath={`sections.${sectionIndex}.fields.${fieldIndex}`} fieldIndex={fieldIndex} remove={remove} />
    </div>
  );
};

export default function SurveyEditor({ survey }: { survey: Record<string, any> }) {
  const { toast } = useToast();
  const form = useForm<SurveyFormData>({ resolver: zodResolver(surveySchema), defaultValues: survey, shouldUnregister: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { fields: sections, append, remove, move: moveSection } = useFieldArray({ control: form.control, name: 'sections' });
  const fieldArrays = sections.map((_, index) => useFieldArray({ control: form.control, name: `sections.${index}.fields` }));

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === 'section' && overType === 'section') {
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);
      moveSection(oldIndex, newIndex);
    } else if (activeType === 'field' && overType === 'field') {
      const sectionIndex = active.data.current?.sectionIndex;
      if (sectionIndex === over.data.current?.sectionIndex) {
        const { move: moveField } = fieldArrays[sectionIndex];
        const fields = form.getValues(`sections.${sectionIndex}.fields`);
        const oldIndex = fields.findIndex(f => f.id === active.id);
        const newIndex = fields.findIndex(f => f.id === over.id);
        moveField(oldIndex, newIndex);
      }
    }
  };

  async function onSubmit(values: SurveyFormData) {
    setIsSubmitting(true);
    const result = await updateSurvey(survey.id, values);
    setIsSubmitting(false);
    toast({ title: result.error ? 'Save Failed' : 'Survey Saved', description: result.error ? result.error : 'Your changes have been saved.' });
  }

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader><CardTitle>Survey Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => <FormItem><FormLabel>Survey Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Survey Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
            </CardContent>
          </Card>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Sections</h2>
                <Button type="button" variant="outline" onClick={() => append({ id: nanoid(), title: 'New Section', fields: [] })}><PlusCircle className="mr-2" /> Add Section</Button>
              </div>
              <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <Accordion type="multiple" className="space-y-4">
                  {sections.map((section, index) => (
                    <SortableSection key={section.id} section={section} sectionIndex={index} removeSection={remove} moveField={() => {}} />
                  ))}
                </Accordion>
              </SortableContext>
            </div>
          </DndContext>
          <div className="sticky bottom-4 z-10 flex justify-end">
            <Button type="submit" size="lg" disabled={isSubmitting} className="shadow-2xl">{isSubmitting && <Loader2 className="mr-2 animate-spin" />} Save Survey Changes</Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}
