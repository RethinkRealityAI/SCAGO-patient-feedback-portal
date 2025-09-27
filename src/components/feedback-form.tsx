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
import { Slider as UiSlider } from "@/components/ui/slider"
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
import { Loader2, Star, PartyPopper, Check, ChevronsUpDown, Share2 } from "lucide-react"
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
import { hospitalDepartments } from "@/lib/hospital-departments"
import { ontarioHospitals } from "@/lib/hospital-names"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
// removed top-of-form alert; now we show a card under the submit area

// Define a more specific type for your field configuration
type FieldDef = {
    id: string;
    type: string;
    label: string;
    options?: { label: string; value: string }[];
    min?: number;
    max?: number;
    step?: number;
    validation?: {
        required?: boolean;
        pattern?: string;
    };
    conditionField?: string;
    conditionValue?: string;
    fields?: FieldDef[];
};


function buildZodSchema(fields: FieldDef[], requiredOverrides: Set<string>) {
    const schema: Record<string, z.ZodTypeAny> = {};
    const fieldMapById = new Map(fields.map((f) => [f.id, f]));
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
        case 'url': {
          let stringSchema = z.string();
          if (field.type === 'url') {
            stringSchema = stringSchema.url('Invalid URL.');
          }
          if (field.validation?.pattern) {
            stringSchema = stringSchema.regex(createRegExp(field.validation.pattern), 'Invalid format.');
          }
          fieldSchema = stringSchema;
          break;
        }
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
        case 'time':
            fieldSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM).');
            break;
        case 'time-amount':
            fieldSchema = z.object({
                value: z.coerce.number().min(0),
                unit: z.enum(['days', 'hours'])
            });
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
        case 'department-on':
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
        case 'slider':
          fieldSchema = z.coerce.number();
          break;
        case 'boolean-checkbox':
            fieldSchema = z.boolean().default(false);
            break;
        case 'anonymous-toggle':
            fieldSchema = z.boolean().default(false);
            break;
        case 'rating':
        case 'nps':
          fieldSchema = z.number().min(1, 'A rating is required.');
          break;
        default:
          fieldSchema = z.any();
      }

      // Make base fields optional; we'll enforce conditional required in superRefine
      schema[field.id] = fieldSchema.optional();
    });
    const base = z.object(schema);
    return base.superRefine((values: Record<string, any>, ctx) => {
        const isEmpty = (f: FieldDef, v: any): boolean => {
            switch (f.type) {
                case 'checkbox':
                    return !Array.isArray(v) || v.length === 0;
                case 'city-on':
                case 'hospital-on':
                case 'department-on':
                    return !v || !v.selection || (v.selection === 'other' && !v.other);
                case 'duration-hm':
                case 'duration-dh':
                case 'time-amount':
                    return v == null;
                case 'boolean-checkbox':
                case 'anonymous-toggle':
                    return v == null;
                default:
                    return v == null || (typeof v === 'string' && v.trim() === '');
            }
        };

        const isVisible = (f: FieldDef): boolean => {
            if (!f.conditionField) return true;
            const controlling = fieldMapById.get(f.conditionField);
            const actual = values[f.conditionField];
            const expected = f.conditionValue;
            if (controlling && (controlling.type === 'boolean-checkbox' || controlling.type === 'anonymous-toggle')) {
                return String(actual) === String(expected);
            }
            return actual === expected;
        };

        for (const f of fields) {
            const must = (f.validation?.required || requiredOverrides.has(f.id)) && f.type !== 'anonymous-toggle';
            if (!must) continue;
            if (!isVisible(f)) continue; // skip hidden questions
            const v = values[f.id];
            if (isEmpty(f, v)) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'This field is required.', path: [f.id] });
            }
        }
    });
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

function DateField({ field }: { field: any }) {
    const selected = field.value ? new Date(field.value) : undefined;
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-[240px] justify-start text-left font-normal">
                    {selected ? format(selected, 'yyyy-MM-dd') : 'Pick a date'}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
}

function TimeAmountField({ field }: { field: any }) {
    const value = field.value?.value ?? '';
    const unit = field.value?.unit ?? 'hours';
    return (
        <div className="flex items-center gap-3">
            <Input
                type="number"
                min="0"
                value={value}
                onChange={(e) => field.onChange({ value: Number(e.target.value || 0), unit })}
                className="w-28"
            />
            <Select onValueChange={(u) => field.onChange({ value: Number(value || 0), unit: u })} defaultValue={unit}>
                <SelectTrigger className="w-36">
                    <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                </SelectContent>
            </Select>
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
                  return <Input {...fieldWithValue} className="max-w-md" />;
                case 'url':
                  return <Input type="url" {...fieldWithValue} className="max-w-md" placeholder="https://example.com" />;
                case 'email':
                  return <Input type="email" {...fieldWithValue} className="max-w-md" />;
                case 'phone':
                  return <Input type="tel" {...fieldWithValue} className="max-w-md" />;
                case 'date':
                  return <DateField field={field} />;
                case 'time':
                  return <Input type="time" {...fieldWithValue} className="max-w-md" />;
                case 'number':
                  return <Input type="number" {...fieldWithValue} className="max-w-md" />;
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
                case 'department-on':
                    return <SelectWithOtherField field={field} options={hospitalDepartments} label="Department" />;
                case 'city-on':
                    return <OntarioCityField field={field} />;
                case 'hospital-on':
                    return <OntarioHospitalField field={field} />;
                case 'duration-hm':
                    return <DurationHmField field={field} />;
                case 'duration-dh':
                    return <DurationDhField field={field} />;
                case 'time-amount':
                    return <TimeAmountField field={field} />;
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
                case 'slider': {
                    const min = fieldConfig.min ?? 0;
                    const max = fieldConfig.max ?? 100;
                    const step = fieldConfig.step ?? 1;
                    const value = typeof field.value === 'number' ? field.value : (min + max) / 2;
                    return (
                        <div className="space-y-2 max-w-lg">
                            <UiSlider
                                value={[value]}
                                min={min}
                                max={max}
                                step={step}
                                onValueChange={(vals) => field.onChange(vals[0])}
                            />
                            <div className="text-sm text-muted-foreground">{value}</div>
                        </div>
                    );
                }
                case 'boolean-checkbox':
                    return <Checkbox checked={field.value} onCheckedChange={field.onChange} />;
                case 'anonymous-toggle':
                    return (
                        <div className="flex items-center gap-3">
                            <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
                            <span className="text-sm">Submit anonymously</span>
                        </div>
                    );
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
    const [resumeOpen, setResumeOpen] = useState(false);
    const [pendingDraft, setPendingDraft] = useState<any | null>(null);
    const [submitErrors, setSubmitErrors] = useState<{ id: string; label: string }[]>([]);
    const [showAllMissing, setShowAllMissing] = useState(false);
    const appearance = survey.appearance || {};

    // Flatten all fields (including groups) from all sections for schema
    const allFields: FieldDef[] = survey.sections.flatMap((section: any) =>
      section.fields.flatMap((f: FieldDef) => (f.type === 'group' ? (f.fields || []) : [f]))
    );

    // Section-level required overrides (allRequired)
    const requiredOverrides = useMemo(() => {
        const ids = new Set<string>();
        (survey.sections || []).forEach((section: any) => {
            if (section.allRequired) {
                (section.fields || []).forEach((f: any) => {
                    if (f.type === 'group') {
                        (f.fields || []).forEach((sf: any) => ids.add(sf.id));
                    } else {
                        ids.add(f.id);
                    }
                });
            }
        });
        return ids;
    }, [survey.sections]);

    const formSchema = useMemo(() => buildZodSchema(allFields, requiredOverrides), [allFields, requiredOverrides]);
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {},
      shouldUnregister: true,
    });
    const { formState, watch } = form;
    const { isSubmitting } = formState;

    // A map to quickly look up field definitions
    const fieldMap = new Map(allFields.map((f) => [f.id, f]));

    // Watch all form values to evaluate conditional logic
    const watchedValues = watch();

    // Local draft save/restore
    const draftKey = useMemo(() => `survey-draft:${survey.id}`, [survey.id]);

    useEffect(() => {
        if (!survey.saveProgressEnabled) return;
        try {
            const saved = localStorage.getItem(draftKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                const showModal = survey.resumeSettings?.showResumeModal !== false; // default true
                if (showModal) {
                    setPendingDraft(parsed);
                    setResumeOpen(true);
                } else {
                    form.reset(parsed);
                    toast({ title: 'Resume where you left off?', description: 'We restored your saved progress. You can continue or clear to start over.' });
                }
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftKey, survey.saveProgressEnabled, survey.resumeSettings]);

    useEffect(() => {
        if (!survey.saveProgressEnabled) return;
        const subscription = form.watch((value) => {
            try {
                localStorage.setItem(draftKey, JSON.stringify(value));
            } catch {}
        });
        return () => subscription.unsubscribe();
    }, [draftKey, form, survey.saveProgressEnabled]);

    const clearDraft = () => {
        try { localStorage.removeItem(draftKey); } catch {}
        try { form.reset({} as any); } catch {}
        toast({ title: 'Cleared saved progress', description: 'You can start fresh now.' })
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setSubmitErrors([]);
        const result = await submitFeedback(survey.id, values);
        if (result.error) {
            toast({
                title: "Submission Failed",
                description: result.error,
                variant: "destructive",
            });
        } else {
            setIsSubmitted(true);
            clearDraft();
        }
    }

    function onInvalid(errors: any) {
        try {
            const ids = Object.keys(errors || {});
            if (ids.length > 0) {
                const items = ids.map((id) => ({ id, label: (fieldMap.get(id) as any)?.label || id }));
                setSubmitErrors(items);
                const firstId = ids[0];
                const el = document.getElementById(`field-${firstId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                toast({
                    title: 'Please complete required fields',
                    description: `${ids.length} field${ids.length > 1 ? 's' : ''} need${ids.length > 1 ? '' : 's'} your attention.`,
                    variant: 'destructive'
                });
            }
        } catch {}
    }

    if (isSubmitted) {
        return (
            <Card className="w-full max-w-4xl mx-auto shadow-lg">
                <CardHeader className="text-center py-12">
                    <PartyPopper className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <CardTitle className="text-2xl lg:text-3xl">Thank You!</CardTitle>
                    <CardDescription className="text-base lg:text-lg mt-2">Your feedback has been successfully submitted.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-8">
                    <Button
                        type="button"
                        onClick={() => {
                            clearDraft();
                            setIsSubmitted(false);
                            try { (form as any)?.reset({}); } catch {}
                        }}
                        size="lg"
                    >
                        Submit another response
                    </Button>
                </CardContent>
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
    
        if (conditionField.type === 'boolean-checkbox' || conditionField.type === 'anonymous-toggle') {
            const expectedBoolean = expectedValue === 'true';
            return actualValue === expectedBoolean;
        }
    
        return actualValue === expectedValue;
    };

    const cardShadowClass = appearance.cardShadow === 'none' ? '' : appearance.cardShadow === 'lg' ? 'shadow-2xl' : appearance.cardShadow === 'md' ? 'shadow-xl' : 'shadow-lg';
    const titleSizeClass = appearance.cardTitleSize === 'xl' ? 'text-3xl' : appearance.cardTitleSize === 'md' ? 'text-xl' : appearance.cardTitleSize === 'sm' ? 'text-lg' : 'text-2xl';
    const sectionTitleSizeClass = appearance.sectionTitleSize === 'xl' ? 'text-2xl' : appearance.sectionTitleSize === 'md' ? 'text-lg' : appearance.sectionTitleSize === 'sm' ? 'text-base' : 'text-xl';
    const labelSizeClass = appearance.labelSize === 'xs' ? 'text-xs' : appearance.labelSize === 'md' ? 'text-sm' : 'text-xs';

    return (
      <Card className={`w-full max-w-5xl mx-auto rounded-lg border p-6 shadow-sm ${cardShadowClass}`} style={{ ['--ring' as any]: appearance.themeColor ? appearance.themeColor : undefined }}>
        <CardHeader className="p-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              {appearance.showTitle && (
                <CardTitle className={`${titleSizeClass} text-primary`}>{survey.title}</CardTitle>
              )}
              <CardDescription className={appearance.showTitle ? "mt-1" : ""}>{survey.description}</CardDescription>
            </div>
            {survey.shareButtonEnabled && (
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
                    const title = survey.shareTitle || 'Share this survey';
                    const text = survey.shareText || "I’d like your feedback—please fill out this survey.";
                    try {
                        if (navigator.share) {
                            await navigator.share({ title, text, url: shareUrl });
                        } else if (navigator.clipboard) {
                            await navigator.clipboard.writeText(shareUrl);
                            toast({ title: 'Link Copied', description: 'Survey link copied to clipboard.' });
                        }
                    } catch {}
                }}
                className="shrink-0"
                title={survey.shareTitle || 'Share this survey'}
              >
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 lg:px-8 mt-6">
          {survey.saveProgressEnabled && (
            <div className="mb-6 text-sm text-muted-foreground">
              Your progress is saved locally and will resume automatically on return.
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-10">
                {survey.sections.map((section: any) => {
                  const anonField = (section.fields || []).find((f: any) => f.type === 'anonymous-toggle');
                  const isAnonymous = anonField ? !!(watchedValues as any)[anonField.id] : false;
                  // Engagement gating: if this is the V2 engagement section, hide all except visitType until selected
                  const isEngagementSection = section.id === 'v2-hospital-engagement-section';
                  const hideUntilVisitType = isEngagementSection && !(watchedValues as any)['visitType'];
                  return (
                    <Card key={section.id} className="rounded-lg border p-5 shadow-sm">
                      <CardHeader className="p-0">
                        <CardTitle className={`${sectionTitleSizeClass} font-semibold text-primary`}>{section.title}</CardTitle>
                        {section.description && (
                          <CardDescription className="mt-2">{section.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="px-4 sm:px-6 lg:px-8 mt-6">
                        <div className="space-y-8">
                          {hideUntilVisitType && (
                            <div className="text-sm text-muted-foreground">
                              Please select your hospital encounter type to continue.
                            </div>
                          )}
                          {(section.fields || []).map((field: FieldDef) => {
                            // In engagement section: only show visitType until a selection is made
                            if (isEngagementSection && hideUntilVisitType && field.id !== 'visitType') {
                              return null;
                            }
                            // Always show the anonymous toggle itself
                            if (field.type === 'anonymous-toggle') {
                              const fieldDef = fieldMap.get(field.id);
                              return fieldDef ? (
                                <div key={fieldDef.id} id={`field-${fieldDef.id}`} className={labelSizeClass}>{renderField(fieldDef, form)}</div>
                              ) : null;
                            }
                            if (isAnonymous) {
                              return null;
                            }
                            if (field.type === 'group') {
                              return (
                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                  {field.fields?.map((subField) => {
                                    const subFieldDef = fieldMap.get(subField.id);
                                    if (!subFieldDef || !shouldShowField(subFieldDef)) return null;
                                    return (
                                      <div key={subFieldDef.id} id={`field-${subFieldDef.id}`} className={labelSizeClass}>
                                        {renderField(subFieldDef, form)}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }
                            const fieldDef = fieldMap.get(field.id);
                            if (!fieldDef || !shouldShowField(fieldDef)) return null;
                            return (
                              <div key={fieldDef.id} id={`field-${fieldDef.id}`} className={labelSizeClass}>{renderField(fieldDef, form)}</div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

              <CardFooter className="px-4 sm:px-6 lg:px-8 pt-8 flex justify-center">
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={isSubmitting} size="lg" className="min-w-32">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {survey.submitButtonLabel || 'Submit'}
                  </Button>
                  {survey.saveProgressEnabled && (
                    <Button type="button" variant="secondary" onClick={clearDraft}>Clear Saved Progress</Button>
                  )}
                </div>
              </CardFooter>

              {submitErrors.length > 0 && (
                <div className="px-4 sm:px-6 lg:px-8">
                  <Card className="mt-4 border-destructive/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-destructive">Missing information</CardTitle>
                      <CardDescription>Please complete the following field{submitErrors.length > 1 ? 's' : ''}.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(showAllMissing ? submitErrors : submitErrors.slice(0, 10)).map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => {
                            const el = document.getElementById(`field-${e.id}`);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }}
                          className="block text-left underline underline-offset-2"
                          aria-label={`Scroll to ${e.label}`}
                        >
                          {e.label}
                        </button>
                      ))}
                      {submitErrors.length > 10 && (
                        <div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setShowAllMissing((v) => !v)}>
                            {showAllMissing ? 'Show less' : `Show all (${submitErrors.length})`}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
        <Dialog open={resumeOpen} onOpenChange={setResumeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{survey.resumeSettings?.resumeTitle || 'Resume your saved progress?'}</DialogTitle>
              <DialogDescription>
                {survey.resumeSettings?.resumeDescription || 'We found a saved draft. Continue where you left off or start over.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              {survey.resumeSettings?.showStartOver !== false && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setResumeOpen(false);
                    clearDraft();
                    setPendingDraft(null);
                    toast({ title: survey.resumeSettings?.startOverLabel || 'Start over', description: 'Saved draft cleared.' });
                  }}
                >
                  {survey.resumeSettings?.startOverLabel || 'Start over'}
                </Button>
              )}
              {survey.resumeSettings?.showContinue !== false && (
                <Button
                  type="button"
                  onClick={() => {
                    setResumeOpen(false);
                    if (pendingDraft) {
                      form.reset(pendingDraft);
                      setPendingDraft(null);
                    }
                    toast({ title: survey.resumeSettings?.continueLabel || 'Continue', description: 'Your progress has been restored.' });
                  }}
                >
                  {survey.resumeSettings?.continueLabel || 'Continue'}
                </Button>
              )}
              {survey.resumeSettings?.showStartOver === false && survey.resumeSettings?.showContinue === false && (
                <Button
                  type="button"
                  onClick={() => {
                    setResumeOpen(false);
                    if (pendingDraft) {
                      form.reset(pendingDraft);
                      setPendingDraft(null);
                    }
                    toast({ title: 'Continue', description: 'Your progress has been restored.' });
                  }}
                >
                  Continue
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }
