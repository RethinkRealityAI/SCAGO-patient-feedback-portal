'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFormContext } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, Star, PartyPopper } from "lucide-react"
import { submitFeedback } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useState, useEffect } from "react"
import { provinces, ontarioCities } from "@/lib/location-data"
import { ontarioHospitals } from "@/lib/hospital-names"

// Define a more specific type for your field configuration
type FieldDef = {
    id: string;
    type: string;
    label: string;
    options?: { label: string; value: string }[];
    validation?: {
        required?: boolean;
        pattern?: string;
    };
    conditionField?: string;
    conditionValue?: string;
    fields?: FieldDef[];
};


function buildZodSchema(fields: FieldDef[]) {
    const schema: Record<string, z.ZodTypeAny> = {};
    fields.forEach((field) => {
      let fieldSchema: z.ZodTypeAny;

      // Helper to safely create a RegExp
      const createRegExp = (pattern: string) => {
        try {
          return new RegExp(pattern);
        } catch (e) {
          try {
            return new RegExp(JSON.parse(`"${pattern}"`));
          } catch (e2) {
            console.error("Invalid regex pattern:", pattern);
            return new RegExp('(?!)');
          }
        }
      }

      switch (field.type) {
        case 'text':
        case 'textarea': {
          let stringSchema = z.string();
          if (field.validation?.pattern) {
            stringSchema = stringSchema.regex(createRegExp(field.validation.pattern), 'Invalid format.');
          }
          fieldSchema = stringSchema;
          break;
        }
        case 'email': {
          let emailSchema = z.string().email('Invalid email address.');
          if (field.validation?.pattern) {
            emailSchema = emailSchema.regex(createRegExp(field.validation.pattern), 'Invalid format.');
          }
          fieldSchema = emailSchema;
          break;
        }
        case 'phone': {
            let phoneSchema = z.string();
            const phoneRegex = field.validation?.pattern
              ? createRegExp(field.validation.pattern)
              : /^\d{10}$/;
            phoneSchema = phoneSchema.regex(phoneRegex, 'Invalid phone number format.');
            fieldSchema = phoneSchema;
            break;
        }
        case 'date':
            fieldSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD).');
            break;
        case 'number':
            fieldSchema = z.coerce.number();
            break;
        case 'select':
        case 'province-ca':
          fieldSchema = z.string();
          break;
        case 'city-on':
        case 'hospital-on':
            fieldSchema = z.object({
                selection: z.string(),
                other: z.string().optional(),
            }).refine(data => {
                if (data.selection === 'other') {
                    return !!data.other;
                }
                return true;
            }, {
                message: 'Please specify',
                path: ['other'],
            });
            break;
        case 'duration-hm':
            fieldSchema = z.object({
                hours: z.coerce.number().min(0),
                minutes: z.coerce.number().min(0).max(59),
            });
            break;
        case 'duration-dh':
            fieldSchema = z.object({
                days: z.coerce.number().min(0),
                hours: z.coerce.number().min(0).max(23),
            });
            break;
        case 'radio':
          fieldSchema = z.string();
          break;
        case 'checkbox':
          fieldSchema = z.array(z.string());
          break;
        case 'boolean-checkbox':
            fieldSchema = z.boolean().default(false);
            break;
        case 'rating':
        case 'nps':
          fieldSchema = z.number().min(1, 'A rating is required.');
          break;
        default:
          fieldSchema = z.any();
      }

      if (field.validation?.required && !['city-on', 'hospital-on'].includes(field.type)) {
        if (fieldSchema instanceof z.ZodString) {
            fieldSchema = fieldSchema.min(1, 'This field is required.');
        } else if (fieldSchema instanceof z.ZodArray) {
            fieldSchema = fieldSchema.nonempty('Please select at least one option.');
        }
      } else {
        fieldSchema = fieldSchema.optional();
      }

      schema[field.id] = fieldSchema;
    });
    return z.object(schema);
  }

function Rating({ field }: { field: any }) {
    const [hover, setHover] = useState(0);
    return (
        <div className="flex items-center space-x-1">
        {[...Array(5)].map((_, index) => {
            const ratingValue = index + 1;
            return (
            <Star
                key={ratingValue}
                className={`h-8 w-8 cursor-pointer transition-colors ${
                ratingValue <= (hover || field.value || 0)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                }`}
                onClick={() => field.onChange(ratingValue)}
                onMouseEnter={() => setHover(ratingValue)}
                onMouseLeave={() => setHover(0)}
            />
            );
        })}
        </div>
    );
}

function NpsScale({ field }: { field: any }) {
    return (
        <div className="flex flex-wrap gap-2">
            {[...Array(10)].map((_, index) => {
                const value = index + 1;
                return (
                    <Button
                        key={value}
                        type="button"
                        variant={field.value === value ? "default" : "outline"}
                        onClick={() => field.onChange(value)}
                        className="w-10 h-10 rounded-full"
                    >
                        {value}
                    </Button>
                );
            })}
        </div>
    );
}

function SelectWithOtherField({ field, options, label }: { field: any; options: { label: string; value: string }[]; label: string; }) {
    const { control, watch } = useFormContext();
    const selection = watch(`${field.name}.selection`);

    return (
        <div className="space-y-4">
            <FormField
                control={control}
                name={`${field.name}.selection`}
                render={({ field: selectionField }) => (
                    <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <Select onValueChange={selectionField.onChange} defaultValue={selectionField.value ?? ''}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={`Select a ${label.toLowerCase()}`} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {options.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            {selection === 'other' && (
                <FormField
                    control={control}
                    name={`${field.name}.other`}
                    render={({ field: otherField }) => (
                        <FormItem>
                            <FormLabel>Please specify the {label.toLowerCase()}</FormLabel>
                            <FormControl>
                                <Input {...otherField} value={otherField.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </div>
    );
}

function OntarioCityField({ field }: { field: any }) {
    return <SelectWithOtherField field={field} options={ontarioCities} label="City" />;
}

function OntarioHospitalField({ field }: { field: any }) {
    return <SelectWithOtherField field={field} options={ontarioHospitals} label="Hospital" />;
}

function DurationHmField({ field }: { field: any }) {
    const { control } = useFormContext();
    return (
        <div className="flex items-center gap-4">
            <FormField
                control={control}
                name={`${field.name}.hours`}
                render={({ field: hoursField }) => (
                    <FormItem>
                        <FormLabel>Hours</FormLabel>
                        <FormControl>
                            <Input type="number" min="0" {...hoursField} value={hoursField.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name={`${field.name}.minutes`}
                render={({ field: minutesField }) => (
                    <FormItem>
                        <FormLabel>Minutes</FormLabel>
                        <FormControl>
                            <Input type="number" min="0" max="59" {...minutesField} value={minutesField.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
}

function DurationDhField({ field }: { field: any }) {
    const { control } = useFormContext();
    return (
        <div className="flex items-center gap-4">
            <FormField
                control={control}
                name={`${field.name}.days`}
                render={({ field: daysField }) => (
                    <FormItem>
                        <FormLabel>Days</FormLabel>
                        <FormControl>
                            <Input type="number" min="0" {...daysField} value={daysField.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name={`${field.name}.hours`}
                render={({ field: hoursField }) => (
                    <FormItem>
                        <FormLabel>Hours</FormLabel>
                        <FormControl>
                            <Input type="number" min="0" max="23" {...hoursField} value={hoursField.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
}


function renderField(fieldConfig: FieldDef, form: any) {
  const { control } = form;

  return (
    <FormField
      key={fieldConfig.id}
      control={control}
      name={fieldConfig.id}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{fieldConfig.label}</FormLabel>
          <FormControl>
            {(() => {
                const fieldWithValue = { ...field, value: field.value ?? '' };
                switch (fieldConfig.type) {
                case 'text':
                case 'email':
                case 'phone':
                case 'date':
                case 'number':
                  return <Input type={fieldConfig.type} {...fieldWithValue} />;
                case 'textarea':
                  return <Textarea {...fieldWithValue} />;
                case 'select':
                case 'province-ca':
                    const options = fieldConfig.type === 'province-ca' ? provinces : fieldConfig.options || [];
                    return (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                            <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                            {options.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                {option.label}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                    );
                case 'city-on':
                    return <OntarioCityField field={field} />;
                case 'hospital-on':
                    return <OntarioHospitalField field={field} />;
                case 'duration-hm':
                    return <DurationHmField field={field} />;
                case 'duration-dh':
                    return <DurationDhField field={field} />;
                case 'radio':
                  return (
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                      {fieldConfig.options?.map((option) => (
                        <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={option.value} />
                          </FormControl>
                          <FormLabel className="font-normal">{option.label}</FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  );
                case 'checkbox':
                    return (
                        <div className="space-y-2">
                          {fieldConfig.options?.map((option) => (
                            <FormItem key={option.value} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(option.value)}
                                        onCheckedChange={(checked) => {
                                            const currentValue = field.value || [];
                                            if (checked) {
                                                field.onChange([...currentValue, option.value]);
                                            } else {
                                                field.onChange(currentValue.filter((v: string) => v !== option.value));
                                            }
                                        }}
                                    />
                                </FormControl>
                                <FormLabel className="font-normal">{option.label}</FormLabel>
                            </FormItem>
                          ))}
                        </div>
                      );
                case 'boolean-checkbox':
                    return <Checkbox checked={field.value} onCheckedChange={field.onChange} />;
                case 'rating':
                    return <Rating field={field} />;
                case 'nps':
                    return <NpsScale field={field} />;
                default:
                  return <Input {...fieldWithValue} />;
              }
            })()}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default function FeedbackForm({ survey }: { survey: any }) {
    const { toast } = useToast();
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Flatten all fields from all sections
    const allFields: FieldDef[] = survey.sections.flatMap((section: any) => section.fields);

    const formSchema = buildZodSchema(allFields);
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
    });
    const { formState, watch } = form;
    const { isSubmitting } = formState;

    // A map to quickly look up field definitions
    const fieldMap = new Map(allFields.map((f) => [f.id, f]));

    // Watch all form values to evaluate conditional logic
    const watchedValues = watch();

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const result = await submitFeedback(survey.id, values);
        if (result.error) {
            toast({
                title: "Submission Failed",
                description: result.error,
                variant: "destructive",
            });
        } else {
            setIsSubmitted(true);
        }
    }

    if (isSubmitted) {
        return (
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader className="text-center">
                    <PartyPopper className="w-16 h-16 mx-auto text-green-500" />
                    <CardTitle className="text-2xl mt-4">Thank You!</CardTitle>
                    <CardDescription>Your feedback has been successfully submitted.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const shouldShowField = (fieldDef: FieldDef) => {
        if (!fieldDef.conditionField) {
            return true;
        }
    
        const conditionFieldId = fieldDef.conditionField;
        const expectedValue = fieldDef.conditionValue;
        const actualValue = watchedValues[conditionFieldId];
    
        const conditionField = fieldMap.get(conditionFieldId);
        if (!conditionField) {
            return true; 
        }
    
        if (conditionField.type === 'boolean-checkbox') {
            const expectedBoolean = expectedValue === 'true';
            return actualValue === expectedBoolean;
        }
    
        return actualValue === expectedValue;
    };

    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{survey.title}</CardTitle>
          <CardDescription>{survey.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {survey.sections.map((section: any) => (
                    <div key={section.id} className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold">{section.title}</h3>
                            {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
                        </div>

                        {section.fields.map((field: FieldDef) => {
                            if (field.type === 'group') {
                                return (
                                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {field.fields?.map((subField) => {
                                             const subFieldDef = fieldMap.get(subField.id);
                                             if (!subFieldDef || !shouldShowField(subFieldDef)) {
                                                return null;
                                            }
                                            return renderField(subFieldDef, form);
                                        })}
                                    </div>
                                )
                            }
                            const fieldDef = fieldMap.get(field.id);
                            if (!fieldDef || !shouldShowField(fieldDef)) {
                                return null;
                            }

                            return renderField(fieldDef, form);
                        })}
                    </div>
                ))}

              <CardFooter className="px-0">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }
