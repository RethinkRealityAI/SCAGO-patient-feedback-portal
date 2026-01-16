/**
 * Utility functions for fetching submissions from Firestore
 * Handles both new organized structure and legacy collection for backward compatibility
 * 
 * This module is designed to be used on both client and server.
 * For server-side operations requiring higher privileges, it uses dynamic imports
 * of the Firebase Admin SDK.
 */

import { collection, collectionGroup, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FeedbackSubmission } from '@/app/dashboard/types';

/**
 * Parse Firestore timestamp to Date object
 */
export function parseFirestoreDate(raw: any): Date {
  if (!raw) return new Date();
  if (typeof raw.toDate === 'function') return raw.toDate();
  if (raw instanceof Date) return raw;
  if (typeof raw === 'object' && '_seconds' in raw) {
    return new Date(raw._seconds * 1000);
  }
  if (typeof raw === 'string' || typeof raw === 'number') return new Date(raw);
  return new Date();
}

/**
 * Convert Firestore document snapshot to FeedbackSubmission
 */
function docToSubmission(doc: any): FeedbackSubmission {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    rating: Number(data.rating || 0),
    submittedAt: parseFirestoreDate(data.submittedAt),
    surveyId: data.surveyId || '',
  } as FeedbackSubmission;
}

/**
 * Fetch all survey IDs from the surveys collection (Client-safe)
 */
async function getAllSurveyIds(): Promise<string[]> {
  try {
    const snapshot = await getDocs(collection(db, 'surveys'));
    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error("Error fetching survey IDs:", error);
    return [];
  }
}

/**
 * Fetch all submissions (Client-safe, subject to security rules)
 */
export async function fetchAllSubmissions(): Promise<FeedbackSubmission[]> {
  const submissions: FeedbackSubmission[] = [];
  let collectionGroupSucceeded = false;

  try {
    const snapshot = await getDocs(collectionGroup(db, 'submissions'));
    submissions.push(...snapshot.docs.map(docToSubmission));
    collectionGroupSucceeded = true;
  } catch (error) {
    console.warn("Client collectionGroup fetch failed, falling back to survey-specific fetch.", error);
  }

  if (!collectionGroupSucceeded || submissions.length === 0) {
    const surveyIds = await getAllSurveyIds();
    for (const surveyId of surveyIds) {
      try {
        const snapshot = await getDocs(collection(db, 'surveys', surveyId, 'submissions'));
        const surveySubmissions = snapshot.docs.map(docToSubmission);
        const seenIds = new Set(submissions.map(s => s.id));
        submissions.push(...surveySubmissions.filter(s => !seenIds.has(s.id)));
      } catch (e) { }
    }
  }

  try {
    const legacySnapshot = await getDocs(query(collection(db, 'feedback'), orderBy('submittedAt', 'desc')));
    const legacySubmissions = legacySnapshot.docs.map(docToSubmission);
    const seenIds = new Set(submissions.map(s => s.id));
    submissions.push(...legacySubmissions.filter(s => !seenIds.has(s.id)));
  } catch (e) { }

  return submissions.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

/**
 * Fetch all submissions using Admin SDK (Server-only)
 */
export async function fetchAllSubmissionsAdmin(): Promise<FeedbackSubmission[]> {
  const { getAdminFirestore } = await import('@/lib/firebase-admin');
  const firestore = getAdminFirestore();
  const submissions: FeedbackSubmission[] = [];
  let collectionGroupSucceeded = false;

  try {
    const snapshot = await firestore.collectionGroup('submissions').get();
    submissions.push(...snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        rating: Number(data.rating || 0),
        submittedAt: parseFirestoreDate(data.submittedAt),
        surveyId: data.surveyId || '',
      } as FeedbackSubmission;
    }));
    collectionGroupSucceeded = true;
  } catch (error) {
    console.warn("Admin collectionGroup query failed, falling back to individual fetch.", error);
  }

  if (!collectionGroupSucceeded || submissions.length === 0) {
    try {
      const surveysSnapshot = await firestore.collection('surveys').get();
      for (const surveyDoc of surveysSnapshot.docs) {
        const snapshot = await surveyDoc.ref.collection('submissions').get();
        const surveySubmissions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          rating: Number(doc.data().rating || 0),
          submittedAt: parseFirestoreDate(doc.data().submittedAt),
          surveyId: doc.data().surveyId || surveyDoc.id,
        } as FeedbackSubmission));
        const seenIds = new Set(submissions.map(s => s.id));
        submissions.push(...surveySubmissions.filter(s => !seenIds.has(s.id)));
      }
    } catch (e) { }
  }

  try {
    const legacySnapshot = await firestore.collection('feedback').get();
    const legacySubmissions = legacySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      rating: Number(doc.data().rating || 0),
      submittedAt: parseFirestoreDate(doc.data().submittedAt),
      surveyId: doc.data().surveyId || '',
    } as FeedbackSubmission));
    const seenIds = new Set(submissions.map(s => s.id));
    submissions.push(...legacySubmissions.filter(s => !seenIds.has(s.id)));
  } catch (e) { }

  return submissions.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

/**
 * Fetch submissions for a specific survey (Client-safe)
 */
export async function fetchSubmissionsForSurvey(surveyId: string): Promise<FeedbackSubmission[]> {
  const all = await fetchAllSubmissions();
  return all.filter(s => s.surveyId === surveyId);
}

/**
 * Fetch submissions for a specific survey using Admin SDK (Server-only)
 */
export async function fetchSubmissionsForSurveyAdmin(surveyId: string): Promise<FeedbackSubmission[]> {
  const { getAdminFirestore } = await import('@/lib/firebase-admin');
  const firestore = getAdminFirestore();
  const submissions: FeedbackSubmission[] = [];

  try {
    const snapshot = await firestore.collection('surveys').doc(surveyId).collection('submissions').get();
    submissions.push(...snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      rating: Number(doc.data().rating || 0),
      submittedAt: parseFirestoreDate(doc.data().submittedAt),
      surveyId: doc.data().surveyId || surveyId,
    } as FeedbackSubmission)));

    const groupSnapshot = await firestore.collectionGroup('submissions').where('surveyId', '==', surveyId).get();
    const groupSubs = groupSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      rating: Number(doc.data().rating || 0),
      submittedAt: parseFirestoreDate(doc.data().submittedAt),
      surveyId: doc.data().surveyId || surveyId,
    } as FeedbackSubmission));
    const seenIds = new Set(submissions.map(s => s.id));
    submissions.push(...groupSubs.filter(s => !seenIds.has(s.id)));

    const legacySnapshot = await firestore.collection('feedback').where('surveyId', '==', surveyId).get();
    const legacySubs = legacySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      rating: Number(doc.data().rating || 0),
      submittedAt: parseFirestoreDate(doc.data().submittedAt),
      surveyId: doc.data().surveyId || surveyId,
    } as FeedbackSubmission));
    const seenIds2 = new Set(submissions.map(s => s.id));
    submissions.push(...legacySubs.filter(s => !seenIds2.has(s.id)));
  } catch (e) { }

  return submissions.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

/**
 * Delete a submission (Client-safe version)
 */
export async function deleteSubmission(id: string, surveyId: string): Promise<void> {
  const targetSurveyId = surveyId || 'QDl3z7vLa0IQ4JgHBZ2s';
  const p1 = deleteDoc(doc(db, 'surveys', targetSurveyId, 'submissions', id));
  const p2 = deleteDoc(doc(db, 'feedback', id));
  await Promise.all([p1, p2]);
}
