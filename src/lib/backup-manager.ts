'use server';

import { getAdminFirestore } from '@/lib/firebase-admin';
import { enforceAdminInAction } from '@/lib/server-auth';

export interface BackupMetadata {
  id: string;
  timestamp: Date;
  type: 'full' | 'surveys' | 'submissions';
  count: number;
  size: number;
}

/**
 * Create a full backup of all data
 */
export async function createFullBackup(): Promise<{ success: boolean; error?: string; metadata?: BackupMetadata }> {
  try {
    await enforceAdminInAction();
    const timestamp = new Date();
    const backupId = `backup-${timestamp.getTime()}`;

    // Backup surveys
    const firestore = getAdminFirestore();
    const surveysSnapshot = await firestore.collection('surveys').get();
    const surveys = surveysSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Backup submissions from both new structure and legacy collection
    const { fetchAllSubmissionsAdmin } = await import('@/lib/submission-utils');
    const submissionsArray = await fetchAllSubmissionsAdmin();
    const submissions = submissionsArray.map(sub => ({
      id: sub.id,
      ...sub,
      submittedAt: sub.submittedAt instanceof Date ? sub.submittedAt.toISOString() : sub.submittedAt,
    }));

    const backupData = {
      surveys,
      submissions,
      metadata: {
        backupId,
        timestamp,
        surveyCount: surveys.length,
        submissionCount: submissions.length,
      },
    };

    // Store backup in Firestore
    await firestore.collection('backups').doc(backupId).set(backupData);

    const metadata: BackupMetadata = {
      id: backupId,
      timestamp,
      type: 'full',
      count: surveys.length + submissions.length,
      size: new Blob([JSON.stringify(backupData)]).size,
    };

    return { success: true, metadata };
  } catch (error) {
    console.error('Backup creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Export data as JSON for external backup
 */
export async function exportDataAsJSON(): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    await enforceAdminInAction();
    const firestore = getAdminFirestore();
    // Get all surveys
    const surveysSnapshot = await firestore.collection('surveys').get();
    const surveys = surveysSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get all submissions from both new structure and legacy collection
    const { fetchAllSubmissionsAdmin } = await import('@/lib/submission-utils');
    const submissionsArray = await fetchAllSubmissionsAdmin();
    const submissions = submissionsArray.map(sub => ({
      id: sub.id,
      ...sub,
      submittedAt: sub.submittedAt instanceof Date ? sub.submittedAt.toISOString() : sub.submittedAt,
    }));

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      surveys,
      submissions,
    };

    return {
      success: true,
      data: JSON.stringify(exportData, null, 2),
    };
  } catch (error) {
    console.error('Data export failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List available backups
 */
export async function listBackups(): Promise<{ success: boolean; backups?: BackupMetadata[]; error?: string }> {
  try {
    await enforceAdminInAction();
    const firestore = getAdminFirestore();
    const backupsSnapshot = await firestore.collection('backups').get();
    const backups: BackupMetadata[] = backupsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        timestamp: (data as any).metadata?.timestamp?.toDate ? (data as any).metadata.timestamp.toDate() : new Date((data as any).metadata?.timestamp),
        type: 'full',
        count: (data as any).metadata?.surveyCount + (data as any).metadata?.submissionCount,
        size: new Blob([JSON.stringify(data)]).size,
      };
    });

    return { success: true, backups };
  } catch (error) {
    console.error('Failed to list backups:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Restore from a backup
 */
export async function restoreFromBackup(backupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await enforceAdminInAction();
    // This is a dangerous operation and should require admin authentication
    // For now, just return a message
    console.warn('Restore operation requested for backup:', backupId);
    
    // TODO: Implement restore logic with proper safeguards
    // 1. Verify admin authentication
    // 2. Create a backup of current data before restoring
    // 3. Restore the data
    // 4. Verify data integrity
    
    return {
      success: false,
      error: 'Restore functionality not yet implemented. Please contact administrator.',
    };
  } catch (error) {
    console.error('Restore failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

