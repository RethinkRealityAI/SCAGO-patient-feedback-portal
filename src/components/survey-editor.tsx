'use client';

import {
  useForm,
  useFieldArray,
  Controller,
  FormProvider,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { updateSurvey } from '@/app/editor/actions';
import { useToast } from '@/hooks/use-toast';
import {
  Trash2,
  PlusCircle,
  ArrowDown,
  ArrowUp,
  GripVertical,
  Loader2,
} from 'lucide-react';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

const optionSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  value: z.string().min(1, 'Value is required'),
});

const fieldSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  label: z.string().min(1, 'Label is required'),
  type: z.enum([
    'text',
    'textarea',
    'email',
    'select',
    'radio',
    'checkbox',
    'rating',
    'conditional',
    'group',
    'boolean-checkbox',
  ]),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(optionSchema).optional(),
  conditionField: z.string().optional(),
  conditionValue: z.string().optional(),
  fields: z.lazy(() => z.array(fieldSchema)).optional(), // For grouped fields
});

const sectionSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  fields: z.array(fieldSchema),
});

const surveySchema = z.object({
  title: z.string().min(1, 'Survey title is required'),
  description: z.string().optional(),
  sections: z.array(sectionSchema),
});

type SurveyFormData = z.infer<typeof surveySchema>;

function FieldEditor({
  sectionIndex,
  fieldIndex,
  remove,
  move,
  totalFields,
}: {
  sectionIndex: number;
  fieldIndex: number;
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
  totalFields: number;
}) {
  const { control, watch } = useFormContext();
  const fieldType = watch(`sections.${sectionIndex}.fields.${fieldIndex}.type`);

  const {
    fields: options,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({
    control,
    name: `sections.${sectionIndex}.fields.${fieldIndex}.options`,
  });

  const hasOptions = ['select', 'radio', 'checkbox'].includes(fieldType);

  return (
    <Card className="bg-muted/30 relative">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <GripVertical className="mr-2 text-muted-foreground cursor-grab" />
            Question Editor
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => move(fieldIndex, fieldIndex - 1)}
              disabled={fieldIndex === 0}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => move(fieldIndex, fieldIndex + 1)}
              disabled={fieldIndex === totalFields - 1}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => remove(fieldIndex)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name={`sections.${sectionIndex}.fields.${fieldIndex}.label`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Question Label</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., What is your name?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`sections.${sectionIndex}.fields.${fieldIndex}.id`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Field ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., 'userName' (unique, no spaces)"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={control}
          name={`sections.${sectionIndex}.fields.${fieldIndex}.type`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a question type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="text">Text Input</SelectItem>
                  <SelectItem value="textarea">Text Area</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="select">Select Dropdown</SelectItem>
                  <SelectItem value="radio">Radio Group</SelectItem>
                  <SelectItem value="checkbox">Checkboxes</SelectItem>
                  <SelectItem value="rating">Rating (1-5 Stars)</SelectItem>
                  <SelectItem value="boolean-checkbox">
                    Single Checkbox (Boolean)
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {hasOptions && (
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-md">Options</CardTitle>
              <CardDescription>
                Add options for this question. The value is stored in the
                database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {options.map((option, optionIndex) => (
                <div
                  key={option.id}
                  className="flex items-end gap-2 p-2 rounded-md border"
                >
                  <FormField
                    control={control}
                    name={`sections.${sectionIndex}.fields.${fieldIndex}.options.${optionIndex}.label`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Label</FormLabel>
                        <FormControl>
                          <Input placeholder="Display text" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name={`sections.${sectionIndex}.fields.${fieldIndex}.options.${optionIndex}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Value</FormLabel>
                        <FormControl>
                          <Input placeholder="database_value" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeOption(optionIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => appendOption({ label: '', value: '' })}
              >
                <PlusCircle className="mr-2" /> Add Option
              </Button>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

export default function SurveyEditor({
  survey,
}: {
  survey: Record<string, any>;
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      title: survey.title || '',
      description: survey.description || '',
      sections: survey.sections || [],
    },
  });

  const { fields: sections, append, remove } = useFieldArray({
    control: form.control,
    name: 'sections',
  });

  async function onSubmit(values: SurveyFormData) {
    setIsSubmitting(true);
    const result = await updateSurvey(survey.id, values);
    setIsSubmitting(false);

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: result.error,
      });
    } else {
      toast({
        title: 'Survey Saved',
        description: 'Your changes have been saved successfully.',
      });
    }
  }

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Survey Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Survey Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Patient Feedback Form" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Survey Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A brief description of the survey's purpose."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Sections</h2>
            <Accordion type="multiple" defaultValue={['section-0']} className="space-y-4">
              {sections.map((section, sectionIndex) => {
                const {
                  fields: sectionFields,
                  append: appendField,
                  remove: removeField,
                  move: moveField,
                } = useFieldArray({
                  control: form.control,
                  name: `sections.${sectionIndex}.fields`,
                });

                return (
                  <AccordionItem
                    value={`section-${sectionIndex}`}
                    key={section.id}
                    className="border rounded-lg bg-card/80"
                  >
                    <AccordionTrigger className="p-6 text-xl">
                      <FormField
                        control={form.control}
                        name={`sections.${sectionIndex}.title`}
                        render={({ field }) => (
                          <FormItem className="flex-1 mr-4">
                            <Input
                              {...field}
                              className="text-xl font-semibold tracking-tight text-primary border-0"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </FormItem>
                        )}
                      />
                    </AccordionTrigger>
                    <AccordionContent className="p-6 space-y-6">
                      <div className="space-y-4">
                        {sectionFields.map((field, fieldIndex) => (
                          <FieldEditor
                            key={field.id}
                            sectionIndex={sectionIndex}
                            fieldIndex={fieldIndex}
                            remove={removeField}
                            move={moveField}
                            totalFields={sectionFields.length}
                          />
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          appendField({
                            id: `new_field_${Date.now()}`,
                            label: 'New Question',
                            type: 'text',
                          })
                        }
                      >
                        <PlusCircle className="mr-2" /> Add Question
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>

          <div className="flex justify-end sticky bottom-4 z-10">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="shadow-2xl"
            >
              {isSubmitting && <Loader2 className="mr-2 animate-spin" />}
              Save Survey Changes
            </Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}
