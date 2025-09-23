"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, Star, PartyPopper, AlertCircle } from "lucide-react"
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
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

// Define the shape of our form structure from Firestore
interface FormFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'select' | 'radio' | 'checkbox' | 'rating' | 'conditional' | 'group' | 'boolean-checkbox';
  options?: { value: string; label: string }[];
  description?: string;
  placeholder?: string;
  required?: boolean;
  fields?: FormFieldConfig[]; // For grouped fields
  conditionField?: string; // For conditional logic
  conditionValue?: any;
}

interface FormSection {
  id: string;
  title: string;
  description: string;
  fields: FormFieldConfig[];
}

interface FormStructure {
  id: string;
  title: string;
  description: string;
  sections: FormSection[];
}


// A simple Zod schema for any object
const anyObjectSchema = z.record(z.any());

export default function FeedbackForm() {
  const [formStructure, setFormStructure] = useState<FormStructure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    // Using a simple schema for now as the form is dynamic.
    // Complex validation can be built into the editor later.
    resolver: (data, context, options) => ({
        values: data,
        errors: {},
    }),
  });

  useEffect(() => {
    async function fetchFormStructure() {
      try {
        const docRef = doc(db, "surveys", "main-feedback");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setFormStructure(docSnap.data() as FormStructure);
        } else {
          setError("Could not find the survey configuration. Please ensure 'main-feedback' exists in the 'surveys' collection.");
        }
      } catch (e) {
        console.error("Error fetching form structure:", e);
        if (e instanceof Error && e.message.includes('permission-denied')) {
            setError("Could not load the form due to a permission error. Please ensure Firestore security rules allow reads on the 'surveys' collection.");
        } else {
            setError("An error occurred while loading the form. Please try again later.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchFormStructure();
  }, []);

  const watchedValues = form.watch();

  async function onSubmit(values: z.infer<typeof anyObjectSchema>) {
    setIsSubmitting(true);
    // Convert rating to a number if it exists
    const dataToSubmit = {
      ...values,
      rating: values.rating ? Number(values.rating) : undefined,
    };
    const result = await submitFeedback(dataToSubmit);
    setIsSubmitting(false);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: result.error,
      });
    } else {
      setIsSubmitted(true);
      toast({
        title: "Feedback Submitted",
        description: "Thank you for sharing your experience.",
      });
      form.reset();
    }
  }

  const renderField = (fieldConfig: FormFieldConfig) => {
    // Handle conditional fields
    if (fieldConfig.conditionField && watchedValues[fieldConfig.conditionField] !== fieldConfig.conditionValue) {
        return null;
    }
    
    return (
        <FormField
            control={form.control}
            key={fieldConfig.id}
            name={fieldConfig.id}
            render={({ field }) => (
                <FormItem className={cn(fieldConfig.type === 'boolean-checkbox' && "flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-card/60")}>
                    {fieldConfig.type !== 'boolean-checkbox' && <FormLabel>{fieldConfig.label}</FormLabel>}
                    <FormControl>
                        <>
                            {fieldConfig.type === 'text' && <Input placeholder={fieldConfig.placeholder} {...field} />}
                            {fieldConfig.type === 'email' && <Input type="email" placeholder={fieldConfig.placeholder} {...field} />}
                            {fieldConfig.type === 'textarea' && <Textarea placeholder={fieldConfig.placeholder} {...field} className="min-h-[120px]" />}
                            
                            {fieldConfig.type === 'boolean-checkbox' && (
                                <>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>{fieldConfig.label}</FormLabel>
                                        {fieldConfig.description && <FormDescription>{fieldConfig.description}</FormDescription>}
                                    </div>
                                </>
                            )}
                            
                            {fieldConfig.type === 'select' && (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={fieldConfig.placeholder} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fieldConfig.options?.map(option => (
                                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                             {fieldConfig.type === 'radio' && (
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center gap-4">
                                    {fieldConfig.options?.map(option => (
                                        <FormItem key={option.value} className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value={option.value} />
                                            </FormControl>
                                            <FormLabel className="font-normal">{option.label}</FormLabel>
                                        </FormItem>
                                    ))}
                                </RadioGroup>
                            )}

                             {fieldConfig.type === 'rating' && (
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap items-center gap-4">
                                    {[1, 2, 3, 4, 5].map(rating => (
                                        <FormItem key={rating} className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value={String(rating)} /></FormControl>
                                            <FormLabel className="font-normal flex items-center">
                                                {rating} <Star className="ml-1 h-4 w-4 text-yellow-400 fill-yellow-400" />
                                            </FormLabel>
                                        </FormItem>
                                    ))}
                                </RadioGroup>
                            )}

                            {fieldConfig.type === 'checkbox' && (
                                <div className="space-y-2">
                                {fieldConfig.options?.map((item) => (
                                    <FormField
                                    key={item.value}
                                    control={form.control}
                                    name={fieldConfig.id}
                                    render={({ field: checkField }) => (
                                        <FormItem key={item.value} className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                            checked={checkField.value?.includes(item.value)}
                                            onCheckedChange={(checked) => {
                                                const currentValue = checkField.value || [];
                                                return checked
                                                ? checkField.onChange([...currentValue, item.value])
                                                : checkField.onChange(currentValue.filter((v: string) => v !== item.value));
                                            }}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">{item.label}</FormLabel>
                                        </FormItem>
                                    )}
                                    />
                                ))}
                                </div>
                            )}

                        </>
                    </FormControl>
                     {fieldConfig.description && fieldConfig.type !== 'boolean-checkbox' && <FormDescription>{fieldConfig.description}</FormDescription>}
                    <FormMessage />
                </FormItem>
            )}
        />
    )
  }

  if (isLoading) {
    return (
        <Card className="p-6 sm:p-8">
            <div className="space-y-8">
                <Skeleton className="h-8 w-1/4" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
                 <Skeleton className="h-24 w-full" />
                 <Skeleton className="h-10 w-full" />
            </div>
        </Card>
    );
  }

  if (error) {
    return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Form</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
    );
  }
  
  if (isSubmitted) {
    return (
        <Card className="w-full max-w-4xl mx-auto p-6 sm:p-8">
            <CardHeader className="items-center text-center">
                <div className={`mb-4 text-primary`}><PartyPopper className="h-12 w-12" /></div>
                <CardTitle className="text-2xl">Feedback Submitted</CardTitle>
                <CardDescription>
                Thank you for your valuable input. Your feedback has been recorded.
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-muted-foreground">Your feedback helps us improve.</p>
                </div>
            </CardContent>
            <CardFooter className="flex-col items-center gap-4 pt-6">
                <Button onClick={() => setIsSubmitted(false)} variant="outline">
                    Submit Another Feedback
                </Button>
            </CardFooter>
        </Card>
    )
  }


  return (
    <Card className="p-6 smp-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {formStructure?.sections.map((section, index) => (
            <div key={section.id} className={cn(index > 0 && "border-t border-border/50 pt-8", "space-y-8")}>
                <div className="text-center">
                    <h3 className="text-xl font-semibold tracking-tight text-primary">{section.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                </div>
                {section.fields.map(fieldConfig => {
                    if (fieldConfig.type === 'group') {
                        return (
                             <div key={fieldConfig.id} className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
                                {fieldConfig.fields?.map(renderField)}
                            </div>
                        )
                    }
                    return renderField(fieldConfig)
                })}
            </div>
          ))}

          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </form>
      </Form>
    </Card>
  )
}
