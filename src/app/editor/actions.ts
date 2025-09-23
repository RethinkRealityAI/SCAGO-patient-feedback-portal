'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

// We just need a Zod schema to represent the data object coming from the form.
const surveyActionSchema = z.record(z.any());

export async function getSurvey(id: string) {
  try {
    const docRef = doc(db, 'surveys', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return { error: 'Survey not found.' };
    }
  } catch (e) {
    console.error('Error getting survey:', e);
    return { error: 'An unexpected error occurred while fetching the survey.' };
  }
}

export async function updateSurvey(
  id: string,
  data: z.infer<typeof surveyActionSchema>
): Promise<{ error?: string }> {
  try {
    const surveyRef = doc(db, 'surveys', id);
    await setDoc(surveyRef, data, { merge: true });

    // Revalidate the path to ensure the survey page shows the updated form
    revalidatePath(`/survey/${id}`);
    revalidatePath(`/editor/${id}`);

    return {};
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message.includes('permission-denied')) {
      return {
        error:
          'Saving failed due to a permission error. Please check your Firestore security rules.',
      };
    }
    return {
      error:
        'An unexpected error occurred while saving the survey. Please try again later.',
    };
  }
}
