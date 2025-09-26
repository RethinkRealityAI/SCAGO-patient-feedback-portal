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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, Star, PartyPopper, Check, ChevronsUpDown } from "lucide-react"
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
import { useState, useEffect, useMemo } from "react"
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
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {[...Array(10)].map((_, index) => {
                const value = index + 1;
                return (
                    <Button
                        key={value}
                        type="button"
                        variant={field.value === value ? "default" : "outline"}
                        onClick={() => field.onChange(value)}
                        className="w-10 h-10 rounded-full text-sm"
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
                        {/* label suppressed to avoid redundancy; placeholder covers */}
                        <Select onValueChange={selectionField.onChange} defaultValue={selectionField.value ?? ''}>
                            <FormControl>
                                <SelectTrigger className="max-w-md">
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
                            <FormControl>
                                <Input {...otherField} value={otherField.value ?? ''} placeholder={`Please specify the ${label.toLowerCase()}`} className="max-w-md" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </div>
    );
}

function SearchableSelectWithOtherField({ field, options, label }: { field: any; options: { label: string; value: string }[]; label: string; }) {
    const { control, watch } = useFormContext();
    const selection = watch(`${field.name}.selection`);
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    const filteredOptions = useMemo(() => {
        if (!searchValue) return options;
        return options.filter(option =>
            option.label.toLowerCase().includes(searchValue.toLowerCase())
        );
    }, [options, searchValue]);

    const selectedOption = options.find(option => option.value === selection);

    return (
        <div className="space-y-4">
            <FormField
                control={control}
                name={`${field.name}.selection`}
                render={({ field: selectionField }) => (
                    <FormItem>
                        {/* label suppressed to avoid redundancy; button text covers */}
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={open}
                                        className="w-full max-w-md justify-between font-normal"
                                    >
                                        {selectedOption ? selectedOption.label : `Select a ${label.toLowerCase()}...`}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                                <div className="p-2">
                                    <Input
                                        placeholder={`Search ${label.toLowerCase()}...`}
                                        value={searchValue}
                                        onChange={(e) => setSearchValue(e.target.value)}
                                        className="mb-2"
                                    />
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    {filteredOptions.length === 0 ? (
                                        <div className="p-2 text-sm text-muted-foreground">
                                            No {label.toLowerCase()} found.
                                        </div>
                                    ) : (
                                        filteredOptions.map((option) => (
                                            <div
                                                key={option.value}
                                                className="flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                                onClick={() => {
                                                    selectionField.onChange(option.value);
                                                    setOpen(false);
                                                    setSearchValue('');
                                                }}
                                            >
                                                <Check
                                                    className={`mr-2 h-4 w-4 ${
                                                        selection === option.value ? "opacity-100" : "opacity-0"
                                                    }`}
                                                />
                                                {option.label}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
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
                            <FormControl>
                                <Input {...otherField} value={otherField.value ?? ''} placeholder={`Please specify the ${label.toLowerCase()}`} className="max-w-md" />
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
    return <SearchableSelectWithOtherField field={field} options={ontarioHospitals} label="Hospital" />;
}

function DurationHmField({ field }: { field: any }) {
    const { control } = useFormContext();
    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <FormField
                control={control}
                name={`${field.name}.hours`}
                render={({ field: hoursField }) => (
                    <FormItem className="flex-1">
                        <FormLabel>Hours</FormLabel>
                        <FormControl>
                            <Input type="number" min="0" {...hoursField} value={hoursField.value ?? ''} className="max-w-24" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name={`${field.name}.minutes`}
                render={({ field: minutesField }) => (
                    <FormItem className="flex-1">
                        <FormLabel>Minutes</FormLabel>
                        <FormControl>
                            <Input type="number" min="0" max="59" {...minutesField} value={minutesField.value ?? ''} className="max-w-24" />
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <FormField
                control={control}
                name={`${field.name}.days`}
                render={({ field: daysField }) => (
                    <FormItem className="flex-1">
                        <FormLabel>Days</FormLabel>
                        <FormControl>
                            <Input type="number" min="0" {...daysField} value={daysField.value ?? ''} className="max-w-24" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name={`${field.name}.hours`}
                render={({ field: hoursField }) => (
                    <FormItem className="flex-1">
                        <FormLabel>Hours</FormLabel>
                        <FormControl>
                            <Input type="number" min="0" max="23" {...hoursField} value={hoursField.value ?? ''} className="max-w-24" />
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
                  return <Input type={fieldConfig.type} {...fieldWithValue} className="max-w-md" />;
                case 'textarea':
                  return <Textarea {...fieldWithValue} className="max-w-2xl" />;
                case 'select':
                case 'province-ca':
                    const options = fieldConfig.type === 'province-ca' ? provinces : fieldConfig.options || [];
                    return (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger className="max-w-md">
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
                  return <Input {...fieldWithValue} className="max-w-md" />;
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

    // Flatten all fields (including groups) from all sections for schema
    const allFields: FieldDef[] = survey.sections.flatMap((section: any) =>
      section.fields.flatMap((f: FieldDef) => (f.type === 'group' ? (f.fields || []) : [f]))
    );

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
            <Card className="w-full max-w-4xl mx-auto shadow-lg">
                <CardHeader className="text-center py-12">
                    <PartyPopper className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <CardTitle className="text-2xl lg:text-3xl">Thank You!</CardTitle>
                    <CardDescription className="text-base lg:text-lg mt-2">Your feedback has been successfully submitted.</CardDescription>
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
      <Card className="w-full max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>{survey.title}</CardTitle>
          <CardDescription>{survey.description}</CardDescription>
        </CardHeader>
        <CardContent className="px-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {survey.sections.map((section: any) => (
                  <Card key={section.id} className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base md:text-lg font-semibold">{section.title}</CardTitle>
                      {section.description && (
                        <CardDescription>{section.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {section.fields.map((field: FieldDef) => {
                          if (field.type === 'group') {
                            return (
                              <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                {field.fields?.map((subField) => {
                                  const subFieldDef = fieldMap.get(subField.id);
                                  if (!subFieldDef || !shouldShowField(subFieldDef)) return null;
                                  return renderField(subFieldDef, form);
                                })}
                              </div>
                            );
                          }
                          const fieldDef = fieldMap.get(field.id);
                          if (!fieldDef || !shouldShowField(fieldDef)) return null;
                          return renderField(fieldDef, form);
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}

              <CardFooter className="px-8 pt-8 flex justify-center">
                <Button type="submit" disabled={isSubmitting} size="lg" className="min-w-32">
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
