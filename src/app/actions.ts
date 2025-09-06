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
    // AI analysis is temporarily disabled.
    // const analysis = await analyzePatientFeedbackSentiment({
    //   feedbackText: data.feedbackText || '',
    // });
    
    const analysis = {
        sentiment: 'N/A',
        summary: 'AI analysis disabled.'
    };

    // Save the full feedback to Firestore
    await addDoc(collection(db, "feedback"), {
      ...data,
      analysis,
      submittedAt: new Date(),
    });

    return analysis;
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message.includes('permission-denied')) {
        return { error: 'Permission denied. Make sure your Firestore security rules are set up correctly.' };
    }
    return { error: 'Failed to save feedback. Please try again later.' };
  }
}
