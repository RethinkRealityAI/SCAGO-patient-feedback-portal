'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { defaultSurvey } from '@/lib/survey-template';

// We just need a Zod schema to represent the data object coming from the form.
const surveyActionSchema = z.record(z.any());

export async function listSurveys() {
  try {
    const surveysCollection = collection(db, 'surveys');
    const snapshot = await getDocs(surveysCollection);
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      title: doc.data().title || 'Untitled Survey',
      description: doc.data().description || 'No description.',
    }));
  } catch (e) {
    console.error('Error listing surveys:', e);
    return [];
  }
}

export async function getSurvey(id: string) {
  try {
    const docRef = doc(db, 'surveys', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      // If survey doesn't exist, return our default template with the requested ID.
      // This allows the editor to create the survey from the template on first save.
      const newSurvey = JSON.parse(JSON.stringify(defaultSurvey));
      newSurvey.id = id;
      return newSurvey;
    }
  } catch (e) {
    console.error('Error getting survey:', e);
    if (e instanceof Error && e.message.includes('permission-denied')) {
      return {
        error:
          'Could not fetch the survey due to a permission error. Please check your Firestore security rules.',
      };
    }
    return { error: 'An unexpected error occurred while fetching the survey.' };
  }
}

export async function updateSurvey(
  id: string,
  data: z.infer<typeof surveyActionSchema>
): Promise<{ error?: string }> {
  try {
    // Firestore requires a non-empty ID
    if (!id) {
      return { error: 'The survey ID is missing. Cannot save.' };
    }

    // Make a copy to avoid mutating the original form values
    const dataToSave = { ...data };

    // The survey ID is the document's name and should not be a field within the document.
    // This defensively removes it in case it was accidentally included in the form data.
    delete dataToSave.id;

    const surveyRef = doc(db, 'surveys', id);
    await setDoc(surveyRef, dataToSave, { merge: true });

    // Revalidate the path to ensure the survey page shows the updated form
    revalidatePath(`/survey/${id}`);
    revalidatePath(`/editor/${id}`);
    revalidatePath('/editor');
    revalidatePath('/');

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

export async function deleteSurvey(id: string): Promise<{ error?: string }> {
  try {
    if (!id) {
      return { error: 'The survey ID is missing. Cannot delete.' };
    }

    const surveyRef = doc(db, 'surveys', id);
    await deleteDoc(surveyRef);

    // Revalidate paths to reflect the deletion
    revalidatePath('/editor');
    revalidatePath('/');

    return {};
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message.includes('permission-denied')) {
      return {
        error:
          'Deletion failed due to a permission error. Please check your Firestore security rules.',
      };
    }
    return {
      error:
        'An unexpected error occurred while deleting the survey. Please try again later.',
    };
  }
}
