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
import { defaultSurvey, surveyV2, consentSurvey } from '@/lib/survey-template';

const surveyActionSchema = z.record(z.any());

export async function createSurvey() {
  const newSurveyRef = doc(collection(db, 'surveys'));
  const newSurvey = {
    ...defaultSurvey,
    title: 'Untitled Survey',
  };

  await setDoc(newSurveyRef, newSurvey);

  revalidatePath('/editor');
  return { id: newSurveyRef.id };
}

export async function createSurveyV2() {
  const newSurveyRef = doc(collection(db, 'surveys'));
  const newSurvey = {
    ...surveyV2,
    title: 'Untitled Survey (V2)',
  } as any;

  await setDoc(newSurveyRef, newSurvey);

  revalidatePath('/editor');
  return { id: newSurveyRef.id };
}

export async function createConsentSurvey() {
  const newSurveyRef = doc(collection(db, 'surveys'));
  const newSurvey = {
    ...consentSurvey,
  } as any;

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
    return snapshot.docs.map((doc) => {
      const data = doc.data() as any;
      const sections = data.sections || [];
      const questionCount = sections.reduce((total: number, section: any) => {
        const fields = section.fields || [];
        const sectionCount = fields.reduce((count: number, field: any) => {
          if (field?.type === 'group') {
            return count + (field.fields?.length || 0);
          }
          return count + 1;
        }, 0);
        return total + sectionCount;
      }, 0);

      return {
        id: doc.id,
        title: data.title || 'Untitled Survey',
        description: data.description || 'No description.',
        sections,
        questionCount,
      };
    });
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