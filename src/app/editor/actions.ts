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

const surveyActionSchema = z.record(z.any());

export async function createSurvey() {
  const newSurveyRef = doc(collection(db, 'surveys'));
  const newSurvey = {
    ...defaultSurvey,
    name: 'Untitled Survey',
  };

  await setDoc(newSurveyRef, newSurvey);

  revalidatePath('/editor');
  return { id: newSurveyRef.id };
}

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
    if (!id) {
      return { error: 'The survey ID is missing. Cannot save.' };
    }

    const dataToSave = { ...data };
    delete dataToSave.id;

    const surveyRef = doc(db, 'surveys', id);
    await setDoc(surveyRef, dataToSave, { merge: true });

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