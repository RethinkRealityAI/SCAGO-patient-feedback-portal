"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { cn } from "@/lib/utils"
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

const formSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal("")),
    isAnonymous: z.boolean().default(false),
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
    },
  })

  const isAnonymous = form.watch("isAnonymous")

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
