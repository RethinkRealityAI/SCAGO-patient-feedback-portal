"use server";

import { analyzePatientFeedbackSentiment, type AnalyzePatientFeedbackSentimentOutput } from '@/ai/flows/analyze-patient-feedback-sentiment';
import { z } from 'zod';
import { toast } from '@/hooks/use-toast';

const feedbackActionSchema = z.object({
  feedbackText: z.string(),
});

export async function submitFeedback(
  data: z.infer<typeof feedbackActionSchema>
): Promise<(AnalyzePatientFeedbackSentimentOutput & { error?: never }) | { error: string }> {
  const validatedData = feedbackActionSchema.safeParse(data);

  if (!validatedData.success) {
    return { error: 'Invalid input.' };
  }

  try {
    // In a real app, we would also save the full feedback (data) to a database here.
    const analysis = await analyzePatientFeedbackSentiment({
      feedbackText: validatedData.data.feedbackText,
    });
    return analysis;
  } catch (e) {
    console.error(e);
    return { error: 'Failed to analyze feedback. Please try again later.' };
  }
}
