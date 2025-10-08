'use client';

import { updateSurvey as serverUpdateSurvey } from '@/app/editor/actions';
import { createSurvey as serverCreateSurvey } from '@/app/editor/actions';
import { deleteSurvey as serverDeleteSurvey } from '@/app/editor/actions';

/**
 * Client-side wrapper for server actions
 * This prevents server/client boundary violations
 */

export async function updateSurvey(surveyId: string, data: any) {
  try {
    return await serverUpdateSurvey(surveyId, data);
  } catch (error) {
    console.error('Error updating survey:', error);
    return { error: 'Failed to update survey' };
  }
}

export async function createSurvey(data: any) {
  try {
    return await serverCreateSurvey(data);
  } catch (error) {
    console.error('Error creating survey:', error);
    return { error: 'Failed to create survey' };
  }
}

export async function deleteSurvey(surveyId: string) {
  try {
    return await serverDeleteSurvey(surveyId);
  } catch (error) {
    console.error('Error deleting survey:', error);
    return { error: 'Failed to delete survey' };
  }
}
