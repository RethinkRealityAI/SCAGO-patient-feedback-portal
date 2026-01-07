/**
 * Utility functions for fetching submissions from Firestore
 * Handles both new organized structure and legacy collection for backward compatibility
 * 
 * ⚠️ SERVER-ONLY MODULE - Uses Firebase Admin SDK
 * 
 * NOTE: This file does NOT use 'use server' because it exports utility functions,
 * not Server Actions. Server Actions must be async functions called from client.
 */

import { collection, collectionGroup, getDocs, query, orderBy, QueryDocumentSnapshot, DocumentData, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
// NOTE: firebase-admin is loaded dynamically to prevent client bundling issues
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
 * Fetch all survey IDs from the surveys collection
 * Used to ensure we fetch submissions from all surveys, not just hardcoded ones
 */
async function getAllSurveyIds(): Promise<string[]> {
  try {
    const surveysCol = collection(db, 'surveys');
    const snapshot = await getDocs(surveysCol);
    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error("Error fetching survey IDs:", error);
    return [];
  }
}

/**
 * Fetch all submissions from new organized structure and legacy collection
 * Uses collection group query for new structure: surveys/{surveyId}/submissions
 * Falls back to fetching from each survey individually if collectionGroup fails
 * Also fetches from legacy feedback collection for backward compatibility
 */
export async function fetchAllSubmissions(): Promise<FeedbackSubmission[]> {
  const submissions: FeedbackSubmission[] = [];
  let collectionGroupSucceeded = false;

  try {
    // Note: collectionGroup queries with orderBy require a composite index.
    // We fetch unsorted and sort in memory to avoid index requirements.
    const submissionsCol = collectionGroup(db, 'submissions');
    const snapshot = await getDocs(submissionsCol);
    const newSubmissions = snapshot.docs.map(docToSubmission);
    submissions.push(...newSubmissions);
    collectionGroupSucceeded = true;
  } catch (error) {
    console.warn("Warning: collectionGroup query failed (likely permissions). Falling back to survey-specific fetch.", error);
  }

  // If collectionGroup failed or returned no results, fetch from all individual surveys
  // This bypasses collectionGroup permission issues and ensures we get all submissions
  if (!collectionGroupSucceeded || submissions.length === 0) {
    try {
      // Get all survey IDs from the surveys collection
      const surveyIds = await getAllSurveyIds();

      // Fetch submissions from each survey's submissions subcollection
      for (const surveyId of surveyIds) {
        try {
          const surveySubmissionsCol = collection(db, 'surveys', surveyId, 'submissions');
          const snapshot = await getDocs(surveySubmissionsCol);
          const surveySubmissions = snapshot.docs.map(docToSubmission);

          const seenIds = new Set(submissions.map(s => s.id));
          const unique = surveySubmissions.filter(s => !seenIds.has(s.id));
          submissions.push(...unique);
        } catch (surveyError) {
          console.error(`Error fetching submissions for survey ${surveyId}:`, surveyError);
        }
      }
    } catch (error) {
      console.error("Error fetching submissions from all surveys:", error);
    }
  }

  try {
    const feedbackCol = collection(db, 'feedback');
    const legacyQ = query(feedbackCol, orderBy('submittedAt', 'desc'));
    const legacySnapshot = await getDocs(legacyQ);
    const legacySubmissions = legacySnapshot.docs.map(docToSubmission);

    const seenIds = new Set(submissions.map(s => s.id));
    const uniqueLegacy = legacySubmissions.filter(s => !seenIds.has(s.id));
    submissions.push(...uniqueLegacy);
  } catch (error) {
    console.error("Error fetching legacy feedback:", error);
  }

  // Sort all submissions by date descending
  return submissions.sort((a, b) => {
    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  });
}

/**
 * Fetch submissions using Admin SDK (for server-side use)
 * Returns submissions with document IDs properly set
 * Falls back to fetching from each survey individually if collectionGroup fails
 */
export async function fetchAllSubmissionsAdmin(): Promise<FeedbackSubmission[]> {
  const { getAdminFirestore } = await import('@/lib/firebase-admin');
  const firestore = getAdminFirestore();
  const submissions: FeedbackSubmission[] = [];
  let collectionGroupSucceeded = false;

  try {
    const submissionsSnapshot = await firestore.collectionGroup('submissions').get();
    const newSubmissions = submissionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        rating: Number(data.rating || 0),
        submittedAt: parseFirestoreDate(data.submittedAt),
        surveyId: data.surveyId || '',
      } as FeedbackSubmission;
    });
    submissions.push(...newSubmissions);
    collectionGroupSucceeded = true;
  } catch (error) {
    console.warn("Warning: Admin collectionGroup query failed. Falling back to survey-specific fetch.", error);
  }

  // If collectionGroup failed or returned no results, fetch from all individual surveys
  if (!collectionGroupSucceeded || submissions.length === 0) {
    try {
      // Get all survey IDs from the surveys collection
      const surveysSnapshot = await firestore.collection('surveys').get();
      const surveyIds = surveysSnapshot.docs.map(doc => doc.id);

      // Fetch submissions from each survey's submissions subcollection
      for (const surveyId of surveyIds) {
        try {
          const surveySubmissionsSnapshot = await firestore
            .collection('surveys')
            .doc(surveyId)
            .collection('submissions')
            .get();

          const surveySubmissions = surveySubmissionsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              rating: Number(data.rating || 0),
              submittedAt: parseFirestoreDate(data.submittedAt),
              surveyId: data.surveyId || surveyId,
            } as FeedbackSubmission;
          });

          const seenIds = new Set(submissions.map(s => s.id));
          const unique = surveySubmissions.filter(s => !seenIds.has(s.id));
          submissions.push(...unique);
        } catch (surveyError) {
          console.error(`Error fetching admin submissions for survey ${surveyId}:`, surveyError);
        }
      }
    } catch (error) {
      console.error("Error fetching admin submissions from all surveys:", error);
    }
  }

  try {
    const legacySnapshot = await firestore.collection('feedback').get();
    const legacySubmissions = legacySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        rating: Number(data.rating || 0),
        submittedAt: parseFirestoreDate(data.submittedAt),
        surveyId: data.surveyId || '',
      } as FeedbackSubmission;
    });

    const seenIds = new Set(submissions.map(s => s.id));
    const uniqueLegacy = legacySubmissions.filter(s => !seenIds.has(s.id));
    submissions.push(...uniqueLegacy);
  } catch (error) {
    console.error("Error fetching legacy feedback with Admin SDK:", error);
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
  const { getAdminFirestore } = await import('@/lib/firebase-admin');
  const firestore = getAdminFirestore();
  const submissions: FeedbackSubmission[] = [];

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
        surveyId: data.surveyId || '',
      } as FeedbackSubmission;
    }));
  } catch (error) {
  }

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
        surveyId: data.surveyId || '',
      } as FeedbackSubmission;
    });

    const seenIds = new Set(submissions.map(s => s.id));
    const uniqueFromGroup = collectionGroupSubmissions.filter(s => !seenIds.has(s.id));
    submissions.push(...uniqueFromGroup);
  } catch (error) {
  }

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
        surveyId: data.surveyId || '',
      } as FeedbackSubmission;
    });

    const seenIds = new Set(submissions.map(s => s.id));
    const uniqueLegacy = legacySubmissions.filter(s => !seenIds.has(s.id));
    submissions.push(...uniqueLegacy);
  } catch (error) {
  }

  return submissions;
}

/**
 * Delete a submission from Firestore
 * Attempts to delete from both new and legacy paths since we can't be sure where it lives
 */
export async function deleteSubmission(id: string, surveyId: string): Promise<void> {
  // 1. Try deleting from the specific survey subcollection
  // Use the provided surveyId, or fallback to main hospital survey ID if generic
  // Note: Firestore delete is idempotent (succeeds even if doc doesn't exist)
  const targetSurveyId = surveyId || 'QDl3z7vLa0IQ4JgHBZ2s';

  const p1 = deleteDoc(doc(db, 'surveys', targetSurveyId, 'submissions', id));

  // 2. Try deleting from legacy feedback collection
  const p2 = deleteDoc(doc(db, 'feedback', id));

  await Promise.all([p1, p2]);
}

