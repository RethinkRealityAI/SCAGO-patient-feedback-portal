"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CalendarIcon, Loader2, Star } from "lucide-react"
import { format } from "date-fns"
import { submitFeedback } from "@/app/actions"
import SentimentResult from "./sentiment-result"
import { useToast } from "@/hooks/use-toast"
import type { AnalyzePatientFeedbackSentimentOutput } from "@/ai/flows/analyze-patient-feedback-sentiment"

const experiences = [
  {
    id: "stigmatization",
    label: "Stigmatization or stereotyping",
  },
  {
    id: "anxiety",
    label: "Anxiety",
  },
  {
    id: "helplessness",
    label: "Helplessness or Isolation",
  },
  {
    id: "other",
    label: "Other",
  },
] as const

const formSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal("")),
    isAnonymous: z.boolean().default(false),
    patientOrCaregiver: z.string({ required_error: "Please select one." }),
    physicianName: z.string().optional(),
    triageNurseName: z.string().optional(),
    firstReception: z.string().optional(),
    visitReason: z.string().optional(),
    inPainCrisis: z.string({ required_error: "Please select one." }),
    analgesiaTime: z.string().optional(),
    admittedToWard: z.string({ required_error: "Please select one." }),
    timelyMedications: z.string({ required_error: "Please select one." }),
    hospitalStayLength: z.string().optional(),
    hcpFamiliarity: z.string({
      required_error: "Please select an option.",
    }),
    hcpRespectfulness: z.string().optional(),
    experienced: z.array(z.string()).optional(),
    experiencedOther: z.string().optional(),
    experienceDate: z.date({
      required_error: "Please select the date of your experience.",
    }),
    location: z
      .string()
      .min(2, { message: "Location must be at least 2 characters." }),
    rating: z.string({ required_error: "Please select a rating." }),
    feedbackText: z
      .string()
      .min(20, { message: "Feedback must be at least 20 characters long." })
      .max(5000, { message: "Feedback cannot exceed 5000 characters." }),
  })
  .refine(
    (data) => {
      if (!data.isAnonymous) {
        return !!data.name && data.name.length > 0
      }
      return true
    },
    {
      message: "Name is required for non-anonymous submissions.",
      path: ["name"],
    }
  )
  .refine(
    (data) => {
      if (!data.isAnonymous) {
        return !!data.email && data.email.length > 0
      }
      return true
    },
    {
      message: "Email is required for non-anonymous submissions.",
      path: ["email"],
    }
  )

type AnalysisResult = (AnalyzePatientFeedbackSentimentOutput & { error?: never }) | { error: string };

export default function FeedbackForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isAnonymous: false,
      name: "",
      email: "",
      location: "",
      feedbackText: "",
      physicianName: "",
      triageNurseName: "",
      firstReception: "",
      visitReason: "",
      analgesiaTime: "",
      hospitalStayLength: "",
      hcpRespectfulness: "",
      experienced: [],
      experiencedOther: "",
    },
  })

  const isAnonymous = form.watch("isAnonymous")
  const inPainCrisis = form.watch("inPainCrisis")
  const experienced = form.watch("experienced")

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    const result = await submitFeedback({ feedbackText: values.feedbackText })
    setIsSubmitting(false)

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: result.error,
      })
    } else {
      setAnalysisResult(result)
      toast({
        title: "Feedback Submitted",
        description: "Thank you for sharing your experience.",
      })
      form.reset()
    }
  }

  if (analysisResult && !analysisResult.error) {
    return <SentimentResult analysis={analysisResult} onReset={() => setAnalysisResult(null)} />
  }

  return (
    <Card className="border-border/50 bg-card/60 p-6 shadow-lg backdrop-blur-lg sm:p-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="isAnonymous"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Submit Anonymously</FormLabel>
                    <FormDescription>
                      Your personal information will not be submitted.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            {!isAnonymous && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          <div className="space-y-8 border-t border-border/50 pt-8">
            <div className="text-center">
              <h3 className="text-xl font-semibold tracking-tight text-primary">Section 1: Perception Around Quality of Care</h3>
              <p className="mt-1 text-sm text-muted-foreground">The following information will help us understand the scope of the situation. Kindly provide as much information as you can.</p>
            </div>

            <FormField
              control={form.control}
              name="patientOrCaregiver"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Are you a patient or a caregiver?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex items-center gap-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="patient" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Patient
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="caregiver" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Caregiver
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="physicianName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name of Physician</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="triageNurseName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name of Triage Nurse</FormLabel>
                    <FormControl>
                      <Input placeholder="Nurse Jackie" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="firstReception"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How was the reception with the FIRST person encountered? (Such as triage RN?)</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="visitReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for this visit? (e.g., pain, fever, surgery, regular visit)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="inPainCrisis"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Were you in the hospital for pain crisis?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex items-center gap-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="yes" />
                          </FormControl>
                          <FormLabel className="font-normal">Yes</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="no" />
                          </FormControl>
                          <FormLabel className="font-normal">No</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {inPainCrisis === 'yes' && (
                <FormField
                  control={form.control}
                  name="analgesiaTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>If for pain crisis, how long before the first analgesia was administered?</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 30 minutes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="admittedToWard"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Were you admitted to inpatient ward?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex items-center gap-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="yes" />
                        </FormControl>
                        <FormLabel className="font-normal">Yes</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="no" />
                        </FormControl>
                        <FormLabel className="font-normal">No</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="timelyMedications"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Did you receive timely medications while in the hospital?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex items-center gap-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="yes" />
                        </FormControl>
                        <FormLabel className="font-normal">Yes</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="no" />
                        </FormControl>
                        <FormLabel className="font-normal">No</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hospitalStayLength"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How long was your hospital stay? (e.g., 5 hours, 2 days):</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hcpFamiliarity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How familiar were the health care providers (HCP) with your condition?</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="very-familiar">Very Familiar</SelectItem>
                      <SelectItem value="somewhat-familiar">Somewhat Familiar</SelectItem>
                      <SelectItem value="not-at-all-familiar">Not at all Familiar</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hcpRespectfulness"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How respectful were the HCPs of your needs and concerns?</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="experienced"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Did you experience any of the following AS A RESULT of you seeking treatment during this interaction?</FormLabel>
                  </div>
                  {experiences.map((item) => (
                    <FormField
                      key={item.id}
                      control={form.control}
                      name="experienced"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={item.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), item.id])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== item.id
                                        )
                                      )
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {item.label}
                            </FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />

            {experienced?.includes("other") && (
               <FormField
                  control={form.control}
                  name="experiencedOther"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Please specify</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            )}

          </div>


          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hospital / Clinic Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Toronto General Hospital" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="experienceDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date of Experience</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Overall Experience Rating</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-wrap items-center gap-4"
                  >
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <FormItem
                        key={rating}
                        className="flex items-center space-x-2 space-y-0"
                      >
                        <FormControl>
                          <RadioGroupItem value={String(rating)} />
                        </FormControl>
                        <FormLabel className="font-normal flex items-center">
                          {rating} <Star className="ml-1 h-4 w-4 text-yellow-400 fill-yellow-400" />
                        </FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="feedbackText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Detailed Feedback</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell us about your experience..."
                    className="min-h-[150px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Please share as much detail as you feel comfortable with.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

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

// A wrapper card for styling purposes
function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card text-card-foreground",
        className
      )}
      {...props}
    />
  )
}
