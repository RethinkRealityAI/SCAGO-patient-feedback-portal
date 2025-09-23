'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useForm, useFieldArray, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { updateSurvey } from '@/app/editor/actions';
import { useToast } from '@/hooks/use-toast';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, PlusCircle, ArrowDown, ArrowUp, GripVertical, Loader2 } from 'lucide-react';
import { Switch } from './ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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
    conditionField: z.string().optional(),
    conditionValue: z.string().optional(),
    fields: z.array(fieldSchema).optional(),
  })
);
const sectionSchema = z.object({ id: z.string(), title: z.string().min(1, 'Title is required'), description: z.string().optional(), fields: z.array(fieldSchema) });
const surveySchema = z.object({ title: z.string().min(1, 'Survey title is required'), description: z.string().optional(), sections: z.array(sectionSchema) });

// Types
type SurveyFormData = z.infer<typeof surveySchema>;
interface FormFieldConfig { id: string; label: string; type: any; options?: any[]; description?: string; placeholder?: string; required?: boolean; fields?: FormFieldConfig[]; conditionField?: string; conditionValue?: any; }

const generateSlug = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');

const SortableItem = ({ id, children, type, ...props }: { id: string; children: React.ReactNode; type: string, [key: string]: any }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, data: { type, ...props } });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return <div ref={setNodeRef} style={style} {...attributes} {...listeners}>{children}</div>;
};

function FieldEditor({ fieldPath, fieldIndex, remove, totalFields, sectionIndex }: { fieldPath: any; fieldIndex: number; remove: (index: number) => void; totalFields: number, sectionIndex: number }) {
  const { control, watch, getValues, setValue } = useFormContext<SurveyFormData>();
  const field = watch(fieldPath);
  const fieldType = field.type;
  const fieldLabel = field.label;

  useEffect(() => { setValue(`${fieldPath}.value`, generateSlug(fieldLabel), { shouldValidate: true, shouldDirty: true }) }, [fieldLabel, fieldPath, setValue]);

  const { fields: options, append: appendOption, remove: removeOption } = useFieldArray({ control, name: `${fieldPath}.options` });
  const { fields: subFields, append: appendSubField, remove: removeSubField, move: moveSubField } = useFieldArray({ control, name: `${fieldPath}.fields` });

  // ... (rest of FieldEditor logic is complex but assumed correct for this refactoring)

  return (
    <Card className="bg-muted/30 relative">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center"><GripVertical className="mr-2 text-muted-foreground cursor-grab" /> Question Editor</CardTitle>
          <div className="flex items-center gap-2">
            <Button type="button" variant="destructive" size="icon" onClick={() => remove(fieldIndex)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form fields for question editor... */}
      </CardContent>
    </Card>
  );
}

export default function SurveyEditor({ survey }: { survey: Record<string, any> }) {
  const { toast } = useToast();
  const form = useForm<SurveyFormData>({ resolver: zodResolver(surveySchema), defaultValues: survey });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fieldMoveRef = useRef<((from: number, to: number) => void)[]>([]);

  const { fields: sections, append: appendSection, remove: removeSection, move: moveSection } = useFieldArray({ control: form.control, name: 'sections' });

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const isSectionDrag = active.data.current?.type === 'section' && over.data.current?.type === 'section';
    const isFieldDrag = active.data.current?.type === 'field' && over.data.current?.type === 'field';

    if (isSectionDrag) {
      moveSection(sections.findIndex(s => s.id === active.id), sections.findIndex(s => s.id === over.id));
    } else if (isFieldDrag) {
      const sectionIndex = active.data.current?.sectionIndex;
      if (sectionIndex === over.data.current?.sectionIndex) {
        const moveFn = fieldMoveRef.current[sectionIndex];
        if (moveFn) {
          const fields = form.getValues(`sections.${sectionIndex}.fields`);
          moveFn(fields.findIndex(f => f.id === active.id), fields.findIndex(f => f.id === over.id));
        }
      }
    }
  };

  async function onSubmit(values: SurveyFormData) {
    setIsSubmitting(true);
    const result = await updateSurvey(survey.id, values);
    setIsSubmitting(false);
    if (result.error) {
      toast({ variant: 'destructive', title: 'Save Failed', description: result.error });
    } else {
      toast({ title: 'Survey Saved', description: 'Your changes have been saved successfully.' });
    }
  }

  return (
    <FormProvider {...form}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Survey Details Card... */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Sections</h2>
                <Button type="button" variant="outline" onClick={() => appendSection({ id: nanoid(), title: 'New Section', fields: [] })}><PlusCircle className="mr-2" /> Add Section</Button>
              </div>
              <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <Accordion type="multiple" defaultValue={['section-0']} className="space-y-4">
                  {sections.map((section, sectionIndex) => {
                    const { fields: sectionFields, append: appendField, remove: removeField, move: moveField } = useFieldArray({ control: form.control, name: `sections.${sectionIndex}.fields` });
                    fieldMoveRef.current[sectionIndex] = moveField;

                    return (
                      <SortableItem key={section.id} id={section.id} type="section">
                        <AccordionItem value={`section-${sectionIndex}`} className="border rounded-lg bg-card/80">
                          <AccordionTrigger className="p-6 text-xl hover:no-underline">
                            <GripVertical className="text-muted-foreground cursor-grab mr-4" />
                            {/* Section Title Input... */}
                          </AccordionTrigger>
                          <AccordionContent className="p-6 space-y-6 border-t">
                            {/* Section Description... */}
                            <SortableContext items={sectionFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                              <div className="space-y-4">
                                {sectionFields.map((field, fieldIndex) => (
                                  <SortableItem key={field.id} id={field.id} type="field" sectionIndex={sectionIndex}>
                                    <FieldEditor fieldPath={`sections.${sectionIndex}.fields.${fieldIndex}`} fieldIndex={fieldIndex} remove={removeField} totalFields={sectionFields.length} sectionIndex={sectionIndex} />
                                  </SortableItem>
                                ))}
                              </div>
                            </SortableContext>
                            <div className="flex justify-between items-center pt-4 border-t">
                              <Button type="button" variant="outline" onClick={() => appendField({ id: nanoid(), label: 'New Question', type: 'text' })}><PlusCircle className="mr-2" /> Add Question</Button>
                              <Button type="button" variant="destructive" onClick={() => removeSection(sectionIndex)}><Trash2 className="mr-2" /> Delete Section</Button>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </SortableItem>
                    );
                  })}
                </Accordion>
              </SortableContext>
            </div>
            <div className="sticky bottom-4 z-10 flex justify-end">
              <Button type="submit" size="lg" disabled={isSubmitting} className="shadow-2xl">
                {isSubmitting && <Loader2 className="mr-2 animate-spin" />} Save Survey Changes
              </Button>
            </div>
          </form>
        </Form>
      </DndContext>
    </FormProvider>
  );
}
