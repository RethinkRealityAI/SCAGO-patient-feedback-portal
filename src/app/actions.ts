"use server";

import { analyzePatientFeedbackSentiment, type AnalyzePatientFeedbackSentimentOutput } from '@/ai/flows/analyze-patient-feedback-sentiment';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

// We just need a Zod schema to represent the data object coming from the form.
// We aren't doing any strict validation here as the form has its own client-side validation.
const feedbackActionSchema = z.record(z.any());

export async function submitFeedback(
  data: z.infer<typeof feedbackActionSchema>
): Promise<(Partial<AnalyzePatientFeedbackSentimentOutput> & { error?: never }) | { error: string }> {
  
  try {
    // The AI analysis part is temporarily disabled.
    // When enabled, it would perform sentiment analysis on the feedback text.
    // const analysis = await analyzePatientFeedbackSentiment({
    //   feedbackText: data.feedbackText || '',
    // });
    
    // For now, we'll use a placeholder analysis object to ensure the
    // data structure returned to the client is consistent.
    const analysis: Partial<AnalyzePatientFeedbackSentimentOutput> = {
        sentiment: 'N/A',
        summary: 'AI analysis is currently disabled.'
    };

    // Save the full feedback to Firestore
    await addDoc(collection(db, "feedback"), {
      ...data,
      analysis,
      submittedAt: new Date(),
    });

    // Return the placeholder analysis object on success.
    return analysis;
  } catch (e) {
    console.error(e);
    // Provide a more specific error message if it's a Firestore permission issue.
    if (e instanceof Error && e.message.includes('permission-denied')) {
        return { error: 'Submission failed due to a permission error. Please check your Firestore security rules.' };
    }
    // Return a generic error for other issues.
    return { error: 'An unexpected error occurred while saving your feedback. Please try again later.' };
  }
}
