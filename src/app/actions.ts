"use server";

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

// We just need a Zod schema to represent the data object coming from the form.
// We aren't doing any strict validation here as the form has its own client-side validation.
const feedbackActionSchema = z.record(z.any());

export async function submitFeedback(
  data: z.infer<typeof feedbackActionSchema>
): Promise<{ error?: string }> {
  
  try {
    // Save the full feedback to Firestore
    await addDoc(collection(db, "feedback"), {
      ...data,
      submittedAt: new Date(),
    });

    // Return an empty object on success
    return {};
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
