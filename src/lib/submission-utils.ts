/**
 * Utility functions for fetching submissions from Firestore
 * Handles both new organized structure and legacy collection for backward compatibility
 */

import { collection, collectionGroup, getDocs, query, orderBy, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { FeedbackSubmission } from '@/app/dashboard/types';

/**
 * Parse Firestore timestamp to Date object
 */
export function parseFirestoreDate(raw: any): Date {
  if (!raw) return new Date();
  if (typeof raw.toDate === 'function') return raw.toDate();
  if (raw instanceof Date) return raw;
  if (typeof raw === 'string' || typeof raw === 'number') return new Date(raw);
  return new Date();
}

/**
 * Convert Firestore document to FeedbackSubmission with proper typing
 */
export function docToSubmission(doc: QueryDocumentSnapshot<DocumentData> | { id: string; data(): DocumentData }): FeedbackSubmission {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    rating: Number(data.rating || 0),
    submittedAt: parseFirestoreDate(data.submittedAt),
    surveyId: data.surveyId || '', // Ensure surveyId exists even if missing in legacy data
  } as FeedbackSubmission;
}

/**
 * Fetch all submissions from new organized structure and legacy collection
 * Uses collection group query for new structure: surveys/{surveyId}/submissions
 * Falls back to legacy feedback collection for backward compatibility
 */
export async function fetchAllSubmissions(): Promise<FeedbackSubmission[]> {
  const submissions: FeedbackSubmission[] = [];

  // Fetch from new organized structure using collectionGroup
  try {
    const submissionsCol = collectionGroup(db, 'submissions');
    const q = query(submissionsCol, orderBy('submittedAt', 'desc'));
    const snapshot = await getDocs(q);
    const newSubmissions = snapshot.docs.map(docToSubmission);
    submissions.push(...newSubmissions);
  } catch (error) {
    console.warn('Could not fetch from new submissions structure:', error);
  }

  // Fetch from legacy feedback collection for backward compatibility
  try {
    const feedbackCol = collection(db, 'feedback');
    const legacyQ = query(feedbackCol, orderBy('submittedAt', 'desc'));
    const legacySnapshot = await getDocs(legacyQ);
    const legacySubmissions = legacySnapshot.docs.map(docToSubmission);
    
    // Deduplicate: prefer new structure if ID exists in both
    const seenIds = new Set(submissions.map(s => s.id));
    const uniqueLegacy = legacySubmissions.filter(s => !seenIds.has(s.id));
    submissions.push(...uniqueLegacy);
  } catch (error) {
    console.warn('Could not fetch from legacy feedback collection:', error);
  }

  return submissions;
}

/**
 * Fetch submissions using Admin SDK (for server-side use)
 * Returns submissions with document IDs properly set
 */
export async function fetchAllSubmissionsAdmin(): Promise<FeedbackSubmission[]> {
  const firestore = getAdminFirestore();
  const submissions: FeedbackSubmission[] = [];

  // Fetch from new organized structure using collectionGroup
  try {
    const submissionsSnapshot = await firestore.collectionGroup('submissions').get();
    const newSubmissions = submissionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        rating: Number(data.rating || 0),
        submittedAt: parseFirestoreDate(data.submittedAt),
        surveyId: data.surveyId || '', // Ensure surveyId exists even if missing
      } as FeedbackSubmission;
    });
    submissions.push(...newSubmissions);
  } catch (error) {
    console.warn('Could not fetch from new submissions structure (admin):', error);
  }

  // Fetch from legacy feedback collection for backward compatibility
  try {
    const legacySnapshot = await firestore.collection('feedback').get();
    const legacySubmissions = legacySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        rating: Number(data.rating || 0),
        submittedAt: parseFirestoreDate(data.submittedAt),
        surveyId: data.surveyId || '', // Ensure surveyId exists even if missing in legacy data
      } as FeedbackSubmission;
    });
    
    // Deduplicate: prefer new structure if ID exists in both
    const seenIds = new Set(submissions.map(s => s.id));
    const uniqueLegacy = legacySubmissions.filter(s => !seenIds.has(s.id));
    submissions.push(...uniqueLegacy);
  } catch (error) {
    console.warn('Could not fetch from legacy feedback collection (admin):', error);
  }

  return submissions;
}

/**
 * Fetch submissions for a specific survey
 */
export async function fetchSubmissionsForSurvey(surveyId: string): Promise<FeedbackSubmission[]> {
  const allSubmissions = await fetchAllSubmissions();
  // Filter by surveyId, handling cases where surveyId might be missing in legacy data
  return allSubmissions.filter(s => s.surveyId && s.surveyId === surveyId);
}

/**
 * Fetch submissions for a specific survey using Admin SDK
 */
export async function fetchSubmissionsForSurveyAdmin(surveyId: string): Promise<FeedbackSubmission[]> {
  const firestore = getAdminFirestore();
  const submissions: FeedbackSubmission[] = [];

  // Fetch from new organized structure: surveys/{surveyId}/submissions
  try {
    const submissionsSnapshot = await firestore
      .collection('surveys')
      .doc(surveyId)
      .collection('submissions')
      .get();
    submissions.push(...submissionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        rating: Number(data.rating || 0),
        submittedAt: parseFirestoreDate(data.submittedAt),
        surveyId: data.surveyId || '', // Ensure surveyId exists
      } as FeedbackSubmission;
    }));
  } catch (error) {
    console.warn(`Could not fetch submissions from new structure for survey ${surveyId}:`, error);
  }

  // Also fetch from collectionGroup (in case surveyId wasn't set correctly in path)
  try {
    const allSubmissionsSnapshot = await firestore
      .collectionGroup('submissions')
      .where('surveyId', '==', surveyId)
      .get();
    const collectionGroupSubmissions = allSubmissionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        rating: Number(data.rating || 0),
        submittedAt: parseFirestoreDate(data.submittedAt),
        surveyId: data.surveyId || '', // Ensure surveyId exists
      } as FeedbackSubmission;
    });
    
    const seenIds = new Set(submissions.map(s => s.id));
    const uniqueFromGroup = collectionGroupSubmissions.filter(s => !seenIds.has(s.id));
    submissions.push(...uniqueFromGroup);
  } catch (error) {
    console.warn('Could not fetch from collectionGroup:', error);
  }

  // Fetch from legacy feedback collection for backward compatibility
  try {
    const legacySnapshot = await firestore
      .collection('feedback')
      .where('surveyId', '==', surveyId)
      .get();
    const legacySubmissions = legacySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        rating: Number(data.rating || 0),
        submittedAt: parseFirestoreDate(data.submittedAt),
        surveyId: data.surveyId || '', // Ensure surveyId exists even if missing in legacy data
      } as FeedbackSubmission;
    });
    
    const seenIds = new Set(submissions.map(s => s.id));
    const uniqueLegacy = legacySubmissions.filter(s => !seenIds.has(s.id));
    submissions.push(...uniqueLegacy);
  } catch (error) {
    console.warn('Could not fetch from legacy feedback collection:', error);
  }

  return submissions;
}

