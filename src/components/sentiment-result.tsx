"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Frown, Meh, Smile, PartyPopper } from "lucide-react"

type Sentiment = "positive" | "negative" | "neutral"

type SentimentResultProps = {
  analysis: {
    sentiment: string
    summary: string
  }
  onReset: () => void
}

const sentimentDetails: Record<
  Sentiment,
  {
    icon: React.ReactNode
    title: string
    className: string
  }
> = {
  positive: {
    icon: <Smile className="h-12 w-12" />,
    title: "Positive Feedback",
    className: "text-green-600",
  },
  negative: {
    icon: <Frown className="h-12 w-12" />,
    title: "Negative Feedback",
    className: "text-primary",
  },
  neutral: {
    icon: <Meh className="h-12 w-12" />,
    title: "Neutral Feedback",
    className: "text-yellow-600",
  },
}

export default function SentimentResult({ analysis, onReset }: SentimentResultProps) {
  const sentiment = analysis.sentiment.toLowerCase() as Sentiment
  const details = sentimentDetails[sentiment] || sentimentDetails.neutral

  return (
    <Card className="w-full max-w-4xl mx-auto border-border/50 bg-card/60 p-6 shadow-lg backdrop-blur-lg sm:p-8">
      <CardHeader className="items-center text-center">
        <div className={`mb-4 ${details.className}`}>{details.icon}</div>
        <CardTitle className="text-2xl">{details.title}</CardTitle>
        <CardDescription>
          Thank you for your valuable input. Here's a summary of your feedback.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="text-muted-foreground">{analysis.summary}</p>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-center gap-4 pt-6">
        <div className="flex items-center text-sm text-muted-foreground">
            <PartyPopper className="mr-2 h-4 w-4" />
            <span>Your feedback helps us improve.</span>
        </div>
        <Button onClick={onReset} variant="outline">
          Submit Another Feedback
        </Button>
      </CardFooter>
    </Card>
  )
}
