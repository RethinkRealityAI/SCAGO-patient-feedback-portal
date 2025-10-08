'use server';

import { db } from './firebase';
import { collection, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';

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
    const timestamp = new Date();
    const backupId = `backup-${timestamp.getTime()}`;

    // Backup surveys
    const surveysSnapshot = await getDocs(collection(db, 'surveys'));
    const surveys = surveysSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Backup submissions
    const submissionsSnapshot = await getDocs(collection(db, 'feedback'));
    const submissions = submissionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const backupData = {
      surveys,
      submissions,
      metadata: {
        backupId,
        timestamp: Timestamp.fromDate(timestamp),
        surveyCount: surveys.length,
        submissionCount: submissions.length,
      },
    };

    // Store backup in Firestore
    await setDoc(doc(db, 'backups', backupId), backupData);

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
    // Get all surveys
    const surveysSnapshot = await getDocs(collection(db, 'surveys'));
    const surveys = surveysSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get all submissions
    const submissionsSnapshot = await getDocs(collection(db, 'feedback'));
    const submissions = submissionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
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
    const backupsSnapshot = await getDocs(collection(db, 'backups'));
    const backups: BackupMetadata[] = backupsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        timestamp: data.metadata.timestamp.toDate(),
        type: 'full',
        count: data.metadata.surveyCount + data.metadata.submissionCount,
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

