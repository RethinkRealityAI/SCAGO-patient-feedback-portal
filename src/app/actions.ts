'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

export async function getSurveys() {
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

export async function submitFeedback(
  surveyId: string,
  formData: Record<string, any>
): Promise<{ error?: string }> {
  try {
    if (!surveyId) {
      return { error: 'Survey ID is missing.' };
    }
    const submissionData = {
      ...formData,
      surveyId,
      submittedAt: serverTimestamp(),
    };
    await addDoc(collection(db, 'submissions'), submissionData);
    return {};
  } catch (e) {
    console.error('Error submitting feedback:', e);
    if (e instanceof Error && e.message.includes('permission-denied')) {
      return {
        error: 'Could not submit feedback due to a permission error.',
      };
    }
    return {
      error:
        'An unexpected error occurred while submitting your feedback.',
    };
  }
}
