'use client';

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export type ActivityType = 
  | 'login'
  | 'logout'
  | 'survey_created'
  | 'survey_updated'
  | 'survey_deleted'
  | 'feedback_submitted'
  | 'admin_added'
  | 'admin_removed'
  | 'backup_created'
  | 'data_exported'
  | 'settings_updated';

export interface ActivityDetails {
  action: ActivityType;
  userEmail?: string;
  userId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Track user activity in the system
 */
export async function trackActivity(activity: ActivityDetails): Promise<void> {
  try {
    await addDoc(collection(db, 'userActivity'), {
      ...activity,
      timestamp: Timestamp.now(),
      userAgent: activity.userAgent || (typeof window !== 'undefined' ? window.navigator.userAgent : ''),
    });
  } catch (error) {
    console.error('Error tracking activity:', error);
    // Don't throw - activity tracking should never break the main flow
  }
}

/**
 * Track survey creation
 */
export async function trackSurveyCreated(surveyId: string, userEmail: string, surveyTitle: string) {
  await trackActivity({
    action: 'survey_created',
    userEmail,
    details: { surveyId, surveyTitle },
  });
}

/**
 * Track survey update
 */
export async function trackSurveyUpdated(surveyId: string, userEmail: string, changes: Record<string, any>) {
  await trackActivity({
    action: 'survey_updated',
    userEmail,
    details: { surveyId, changes },
  });
}

/**
 * Track survey deletion
 */
export async function trackSurveyDeleted(surveyId: string, userEmail: string, surveyTitle: string) {
  await trackActivity({
    action: 'survey_deleted',
    userEmail,
    details: { surveyId, surveyTitle },
  });
}

/**
 * Track feedback submission
 */
export async function trackFeedbackSubmitted(surveyId: string, feedbackId: string) {
  await trackActivity({
    action: 'feedback_submitted',
    details: { surveyId, feedbackId },
  });
}

/**
 * Track admin access granted
 */
export async function trackAdminAdded(newAdminEmail: string, addedBy: string) {
  await trackActivity({
    action: 'admin_added',
    userEmail: addedBy,
    details: { newAdminEmail },
  });
}

/**
 * Track admin access removed
 */
export async function trackAdminRemoved(removedEmail: string, removedBy: string) {
  await trackActivity({
    action: 'admin_removed',
    userEmail: removedBy,
    details: { removedEmail },
  });
}

/**
 * Track data export
 */
export async function trackDataExport(userEmail: string, exportType: string, recordCount: number) {
  await trackActivity({
    action: 'data_exported',
    userEmail,
    details: { exportType, recordCount },
  });
}

/**
 * Track backup creation
 */
export async function trackBackupCreated(userEmail: string, backupId: string, collectionName: string) {
  await trackActivity({
    action: 'backup_created',
    userEmail,
    details: { backupId, collectionName },
  });
}

/**
 * Track settings update
 */
export async function trackSettingsUpdated(userEmail: string, settingName: string, newValue: any) {
  await trackActivity({
    action: 'settings_updated',
    userEmail,
    details: { settingName, newValue },
  });
}







