'use server';

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { nanoid } from 'nanoid';

/**
 * Migration helper to update an existing survey with correct labels for translation
 * This fixes surveys created before translation mappings were added
 */
export async function migrateSurveyLabels(surveyId: string) {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { error: 'You must be logged in to migrate surveys' };
    }

    const surveyRef = doc(db, 'surveys', surveyId);
    const surveySnap = await getDoc(surveyRef);
    
    if (!surveySnap.exists()) {
      return { error: 'Survey not found' };
    }

    const survey = surveySnap.data();
    
    // Update submitButtonLabel to undefined so translation system takes over
    survey.submitButtonLabel = undefined;
    
    // Update saveProgressEnabled to false for public surveys
    survey.saveProgressEnabled = false;
    
    // Save back to database
    await updateDoc(surveyRef, survey);
    
    return { success: true, message: 'Survey labels migrated successfully' };
  } catch (error) {
    console.error('Error migrating survey labels:', error);
    return { error: 'Failed to migrate survey labels' };
  }
}

