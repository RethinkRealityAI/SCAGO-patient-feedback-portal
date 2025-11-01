'use server';

import { getAdminFirestore } from '@/lib/firebase-admin';
import { nanoid } from 'nanoid';

/**
 * Migration helper to update an existing survey with correct labels for translation
 * This fixes surveys created before translation mappings were added
 */
export async function migrateSurveyLabels(surveyId: string) {
  try {
    const firestore = getAdminFirestore();
    const surveyRef = firestore.collection('surveys').doc(surveyId);
    const surveySnap = await surveyRef.get();
    
    if (!surveySnap.exists()) {
      return { error: 'Survey not found' };
    }

    const survey = surveySnap.data();
    
    // Update submitButtonLabel to undefined so translation system takes over
    survey.submitButtonLabel = undefined;
    
    // Update saveProgressEnabled to false for public surveys
    survey.saveProgressEnabled = false;
    
    // Save back to database
    await surveyRef.set(survey as any, { merge: true });
    
    return { success: true, message: 'Survey labels migrated successfully' };
  } catch (error) {
    console.error('Error migrating survey labels:', error);
    return { error: 'Failed to migrate survey labels' };
  }
}

