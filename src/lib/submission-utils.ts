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
    ...(data.rating != null ? { rating: Number(data.rating) } : {}),
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
 * Check if a Firestore document path is a survey submission document.
 * Only matches paths like: surveys/{surveyId}/submissions/{submissionId}
 * This prevents picking up 'submissions' subcollections from non-survey parents
 * (e.g. yep-forms, patient records, etc.).
 */
function isSurveySubmissionDoc(docRef: any): boolean {
  // docRef.ref.path gives e.g. 'surveys/abc123/submissions/xyz789'
  const path = docRef.ref?.path || '';
  const parts = path.split('/');
  // Must be exactly: surveys / {id} / submissions / {id}
  return parts.length === 4 && parts[0] === 'surveys' && parts[2] === 'submissions';
}

/**
 * Extract the parent survey ID from a submission document's path.
 * e.g. 'surveys/abc123/submissions/xyz789' → 'abc123'
 */
function extractSurveyIdFromPath(docRef: any): string {
  const path = docRef.ref?.path || '';
  const parts = path.split('/');
  if (parts.length >= 2 && parts[0] === 'surveys') {
    return parts[1];
  }
  return '';
}

// The main Hospital Experience Reporting Portal survey ID - all legacy submissions map to this
const HOSPITAL_SURVEY_ID = 'QDl3z7vLa0IQ4JgHBZ2s';

export async function fetchAllSubmissions(): Promise<FeedbackSubmission[]> {
  const submissions: FeedbackSubmission[] = [];
  let collectionGroupSucceeded = false;

  try {
    const snapshot = await getDocs(collectionGroup(db, 'submissions'));
    // CRITICAL: Only include docs from surveys/*/submissions paths
    const surveyDocs = snapshot.docs.filter(isSurveySubmissionDoc);
    submissions.push(...surveyDocs.map(d => {
      const sub = docToSubmission(d);
      // Ensure surveyId comes from the document path, not just the field
      if (!sub.surveyId) {
        sub.surveyId = extractSurveyIdFromPath(d);
      }
      return sub;
    }));
    collectionGroupSucceeded = true;
  } catch (error) {
    console.warn("Client collectionGroup fetch failed, falling back to survey-specific fetch.", error);
  }

  if (!collectionGroupSucceeded || submissions.length === 0) {
    const surveyIds = await getAllSurveyIds();
    for (const surveyId of surveyIds) {
      try {
        const snapshot = await getDocs(collection(db, 'surveys', surveyId, 'submissions'));
        const surveySubmissions = snapshot.docs.map(d => {
          const sub = docToSubmission(d);
          // Ensure surveyId is set from the parent path
          if (!sub.surveyId) sub.surveyId = surveyId;
          return sub;
        });
        const seenIds = new Set(submissions.map(s => s.id));
        submissions.push(...surveySubmissions.filter(s => !seenIds.has(s.id)));
      } catch (e) { }
    }
  }

  try {
    const legacySnapshot = await getDocs(query(collection(db, 'feedback'), orderBy('submittedAt', 'desc')));
    const legacySubmissions = legacySnapshot.docs.map(d => {
      const sub = docToSubmission(d);
      if (!sub.surveyId) sub.surveyId = HOSPITAL_SURVEY_ID;
      return sub;
    });
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
    // CRITICAL: Only include docs from surveys/*/submissions paths
    const surveyDocs = snapshot.docs.filter(doc => {
      const path = doc.ref.path;
      const parts = path.split('/');
      return parts.length === 4 && parts[0] === 'surveys' && parts[2] === 'submissions';
    });
    submissions.push(...surveyDocs.map(doc => {
      const data = doc.data();
      // Extract surveyId from the document path (authoritative source)
      const pathParts = doc.ref.path.split('/');
      const pathSurveyId = pathParts.length >= 2 ? pathParts[1] : '';
      return {
        id: doc.id,
        ...data,
        ...(data.rating != null ? { rating: Number(data.rating) } : {}),
        submittedAt: parseFirestoreDate(data.submittedAt),
        // Use path-based surveyId as primary, fall back to field value
        surveyId: pathSurveyId || data.surveyId || '',
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
        const surveySubmissions = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            ...d,
            ...(d.rating != null ? { rating: Number(d.rating) } : {}),
            submittedAt: parseFirestoreDate(d.submittedAt),
            surveyId: surveyDoc.id, // Always use parent doc ID as surveyId
          } as FeedbackSubmission;
        });
        const seenIds = new Set(submissions.map(s => s.id));
        submissions.push(...surveySubmissions.filter(s => !seenIds.has(s.id)));
      }
    } catch (e) { }
  }

  try {
    const legacySnapshot = await firestore.collection('feedback').get();
    const legacySubmissions = legacySnapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        ...d,
        ...(d.rating != null ? { rating: Number(d.rating) } : {}),
        submittedAt: parseFirestoreDate(d.submittedAt),
        surveyId: d.surveyId || HOSPITAL_SURVEY_ID,
      } as FeedbackSubmission;
    });
    const seenIds = new Set(submissions.map(s => s.id));
    submissions.push(...legacySubmissions.filter(s => !seenIds.has(s.id)));
  } catch (e) { }

  return submissions.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

/**
 * Fetch submissions for a specific survey (Client-safe)
 */
export async function fetchSubmissionsForSurvey(surveyId: string): Promise<FeedbackSubmission[]> {
  if (!surveyId) return [];
  const submissions: FeedbackSubmission[] = [];

  // Primary: fetch directly from the survey's submissions subcollection
  try {
    const snapshot = await getDocs(collection(db, 'surveys', surveyId, 'submissions'));
    submissions.push(...snapshot.docs.map(d => {
      const sub = docToSubmission(d);
      if (!sub.surveyId) sub.surveyId = surveyId;
      return sub;
    }));
  } catch (e) {
    console.warn(`Failed to fetch submissions for survey ${surveyId}:`, e);
  }

  // Fallback: also check legacy 'feedback' collection for matching surveyId
  try {
    const legacySnapshot = await getDocs(query(collection(db, 'feedback'), orderBy('submittedAt', 'desc')));
    const legacySubs = legacySnapshot.docs.map(d => {
      const sub = docToSubmission(d);
      if (!sub.surveyId) sub.surveyId = HOSPITAL_SURVEY_ID;
      return sub;
    }).filter(s => s.surveyId === surveyId);
    
    const seenIds = new Set(submissions.map(s => s.id));
    submissions.push(...legacySubs.filter(s => !seenIds.has(s.id)));
  } catch (e) { }

  return submissions.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
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
    submissions.push(...snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        ...d,
        ...(d.rating != null ? { rating: Number(d.rating) } : {}),
        submittedAt: parseFirestoreDate(d.submittedAt),
        surveyId: d.surveyId || surveyId,
      } as FeedbackSubmission;
    }));

    const groupSnapshot = await firestore.collectionGroup('submissions').where('surveyId', '==', surveyId).get();
    const groupSubs = groupSnapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        ...d,
        ...(d.rating != null ? { rating: Number(d.rating) } : {}),
        submittedAt: parseFirestoreDate(d.submittedAt),
        surveyId: d.surveyId || surveyId,
      } as FeedbackSubmission;
    });
    const seenIds = new Set(submissions.map(s => s.id));
    submissions.push(...groupSubs.filter(s => !seenIds.has(s.id)));

    const legacySnapshot = await firestore.collection('feedback').where('surveyId', '==', surveyId).get();
    const legacySubs = legacySnapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        ...d,
        ...(d.rating != null ? { rating: Number(d.rating) } : {}),
        submittedAt: parseFirestoreDate(d.submittedAt),
        surveyId: d.surveyId || surveyId,
      } as FeedbackSubmission;
    });
    const seenIds2 = new Set(submissions.map(s => s.id));
    submissions.push(...legacySubs.filter(s => !seenIds2.has(s.id)));
  } catch (e) { }

  return submissions.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

/**
 * Delete a submission (Client-safe version)
 */
export async function deleteSubmission(id: string, surveyId: string): Promise<void> {
  if (!surveyId) {
    throw new Error('Cannot delete submission: surveyId is required to locate the document.');
  }
  // Delete from the actual survey's submissions subcollection
  const p1 = deleteDoc(doc(db, 'surveys', surveyId, 'submissions', id));
  // Also attempt to clean up from legacy 'feedback' collection (best-effort)
  const p2 = deleteDoc(doc(db, 'feedback', id)).catch(() => { /* legacy doc may not exist */ });
  await Promise.all([p1, p2]);
}

/**
 * Robustly extract name from various schema formats
 */
export function extractName(sub: any): string {
  if (!sub) return ''
  // Try standard combinations
  const first = sub.firstName || sub.first_name || sub.fname || ''
  const last = sub.lastName || sub.last_name || sub.lname || ''
  if (first || last) return `${first} ${last}`.trim()

  // Try single fields
  if (sub.name) return sub.name
  if (sub.fullName) return sub.fullName
  if (sub.full_name) return sub.full_name

  // Try finding a field with 'Name' in key (risky but needed for custom forms)
  const nameKey = Object.keys(sub).find(k =>
    k.toLowerCase().includes('name') &&
    !['hospital', 'survey', 'file', 'user', 'project'].some(ex => k.toLowerCase().includes(ex)) &&
    typeof sub[k] === 'string'
  )
  return nameKey ? sub[nameKey] : ''
}
