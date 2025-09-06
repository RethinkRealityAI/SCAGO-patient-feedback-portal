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
    location: z
      .string()
      .min(2, { message: "Location must be at least 2 characters." }),
    rating: z.string({ required_error: "Please select a rating." }),
    feedbackText: z.string().optional(),
    // New fields for Section 2
    investigationConducted: z.string().optional(),
    concernsAddressed: z.string().optional(),
    reportedToHospital: z.string().optional(),
    reportOutcome: z.string().optional(),
    reportNotDoneReason: z.string().optional(),
    reportNotDoneReasonOther: z.string().optional(),
    contactForAdvocacy: z.boolean().default(false),
    interactionMonth: z.string().optional(),
    interactionYear: z.string().optional(),
    hospitalUnit: z.string().optional(),
    clinicianNames: z.string().optional(),
    hospitalInteraction: z.string().optional(),
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

export default function FeedbackForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
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
      investigationConducted: "",
      concernsAddressed: "",
      reportedToHospital: "",
      reportOutcome: "",
      reportNotDoneReason: "",
      reportNotDoneReasonOther: "",
      contactForAdvocacy: false,
      interactionMonth: "",
      interactionYear: "",
      hospitalUnit: "",
      clinicianNames: "",
      hospitalInteraction: "",
    },
  })

  const isAnonymous = form.watch("isAnonymous")
  const inPainCrisis = form.watch("inPainCrisis")
  const experienced = form.watch("experienced")
  const reportedToHospital = form.watch("reportedToHospital")
  const reportNotDoneReason = form.watch("reportNotDoneReason")

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    const result = await submitFeedback(values)
    setIsSubmitting(false)

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: result.error,
      })
    } else {
      setIsSubmitted(true);
      toast({
        title: "Feedback Submitted",
        description: "Thank you for sharing your experience.",
      })
      form.reset()
    }
  }

  function prefillForm() {
    form.reset({
      isAnonymous: false,
      name: "Jane Doe",
      email: "jane.doe@example.com",
      patientOrCaregiver: "patient",
      physicianName: "Dr. Welby",
      triageNurseName: "Nurse Carol",
      firstReception: "The reception was quick and efficient.",
      visitReason: "Annual check-up",
      inPainCrisis: "no",
      admittedToWard: "no",
      timelyMedications: "yes",
      hospitalStayLength: "N/A",
      hcpFamiliarity: "somewhat-familiar",
      hcpRespectfulness: "The HCPs were very respectful and listened to my concerns.",
      experienced: ["anxiety"],
      location: "Toronto General Hospital",
      interactionMonth: "may",
      interactionYear: String(new Date().getFullYear()),
      hospitalUnit: "outpatient",
      clinicianNames: "Dr. Welby, Nurse Carol",
      investigationConducted: "yes",
      concernsAddressed: "yes",
      reportedToHospital: "no",
      reportNotDoneReason: "not-aware",
      hospitalInteraction: "Overall a positive experience, but could be improved.",
      feedbackText: "I had a generally positive experience at the hospital. The staff was friendly and the facilities were clean. However, the wait time was a bit long. I hope this feedback helps improve the service.",
      rating: "4",
      contactForAdvocacy: true,
    });
  }

  if (isSubmitted) {
    return (
        <Card className="w-full max-w-4xl mx-auto border-border/50 bg-card/60 p-6 shadow-lg backdrop-blur-lg sm:p-8">
            <CardHeader className="items-center text-center">
                <div className={`mb-4 text-foreground`}><PartyPopper className="h-12 w-12" /></div>
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
    <Card className="border-border/50 bg-card/60 p-6 shadow-lg backdrop-blur-lg sm:p-8">
      <div className="mb-4">
        <Button type="button" onClick={prefillForm} variant="outline">Prefill Form for Testing</Button>
      </div>
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
                  <Select onValueChange={field.onChange} value={field.value}>
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

          <div className="space-y-8 border-t border-border/50 pt-8">
            <div className="text-center">
              <h3 className="text-xl font-semibold tracking-tight text-primary">Section 2: Hospital Experience in Detail</h3>
              <p className="mt-1 text-sm text-muted-foreground">Please provide details about your hospital experience.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
               <FormField
                control={form.control}
                name="interactionMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Month of Interaction</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a month" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(month => (
                          <SelectItem key={month} value={month.toLowerCase()}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="interactionYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year of Interaction</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                           <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hospital Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Toronto General Hospital" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hospitalUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit or Department</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a unit or department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="emergency">Emergency Room</SelectItem>
                      <SelectItem value="outpatient">Outpatient</SelectItem>
                      <SelectItem value="on-admission">On admission</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="clinicianNames"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name of Physician, Nurse and other clinicians providing optimal or sub-optimal care</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="investigationConducted"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Did you feel the right investigation/tests were conducted?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex items-center gap-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="yes" /></FormControl>
                        <FormLabel className="font-normal">Yes</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="no" /></FormControl>
                        <FormLabel className="font-normal">No</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="not-applicable" /></FormControl>
                        <FormLabel className="font-normal">Not Applicable</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="concernsAddressed"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Did you feel your concerns were well addressed?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex items-center gap-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="yes" /></FormControl>
                        <FormLabel className="font-normal">Yes</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="no" /></FormControl>
                        <FormLabel className="font-normal">No</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="not-applicable" /></FormControl>
                        <FormLabel className="font-normal">Not Applicable</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="reportedToHospital"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Did you report this situation to the hospital?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex items-center gap-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="yes" /></FormControl>
                        <FormLabel className="font-normal">Yes</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="no" /></FormControl>
                        <FormLabel className="font-normal">No</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {reportedToHospital === 'yes' && (
              <FormField
                control={form.control}
                name="reportOutcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>If "Yes", what was the outcome of your report?</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {reportedToHospital === 'no' && (
              <>
                <FormField
                  control={form.control}
                  name="reportNotDoneReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>If "No", why not?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="not-aware">Not aware of complaint process</SelectItem>
                          <SelectItem value="not-comfortable">Not comfortable</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {reportNotDoneReason === 'other' && (
                  <FormField
                    control={form.control}
                    name="reportNotDoneReasonOther"
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
              </>
            )}

            <FormField
              control={form.control}
              name="hospitalInteraction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Is there anything else would you like us to know about this hospital interaction?</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
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
                  <FormLabel>Your Hospital Experience in Your Own words.</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Use the space below to provide us with your hospital experience in 1000 words or less."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Note: If you would like us to advocate on your behalf with the hospital, we will need to contact you.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contactForAdvocacy"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>I would like to be contacted back regarding this feedback.</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
          </div>

          <div className="space-y-8 border-t border-border/50 pt-8">
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
          </div>

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
function FormCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
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
