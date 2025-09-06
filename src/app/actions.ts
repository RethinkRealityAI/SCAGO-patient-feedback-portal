"use server";

import { analyzePatientFeedbackSentiment, type AnalyzePatientFeedbackSentimentOutput } from '@/ai/flows/analyze-patient-feedback-sentiment';
import { z } from 'zod';
import { toast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

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
    
    // Save the full feedback to Firestore
    await addDoc(collection(db, "feedback"), {
      ...data,
      analysis,
      submittedAt: new Date(),
    });

    return analysis;
  } catch (e) {
    console.error(e);
    // This is a generic error message. In a real app, you might want to
    // provide more specific error messages based on the error type.
    if (e instanceof Error && e.message.includes('permission-denied')) {
        return { error: 'Permission denied. Make sure your Firestore security rules are set up correctly.' };
    }
    return { error: 'Failed to analyze and save feedback. Please try again later.' };
  }
}
