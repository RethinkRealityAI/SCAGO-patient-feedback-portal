'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { defaultSurvey, surveyV2, consentSurvey } from '@/lib/survey-template';

/**
 * ⚠️ CRITICAL: SERVER-SIDE ACTIONS WITHOUT AUTHENTICATION CONTEXT
 * 
 * These functions run on the SERVER and DO NOT have Firebase Auth context.
 * 
 * ❌ WARNING: WRITE OPERATIONS WILL FAIL WITH PERMISSION_DENIED
 * Server-side operations using Firebase client SDK have NO auth context.
 * Firestore security rules check request.auth, which is NULL on the server.
 * Result: PERMISSION_DENIED errors for any admin-protected operations.
 * 
 * ✅ USE THESE FUNCTIONS FOR:
 * - READ operations (listSurveys, getSurvey) - don't require auth
 * - Server-side rendering data fetching
 * - Operations that don't need user authentication
 * 
 * ❌ DO NOT USE THESE FOR:
 * - Creating surveys (use client-actions.ts)
 * - Updating surveys (use client-actions.ts)
 * - Deleting surveys (use client-actions.ts)
 * - Any operation requiring admin authentication
 * 
 * 🔄 FOR AUTHENTICATED WRITES, USE:
 * Import from: '@/lib/client-actions'
 * Functions: createSurvey, updateSurvey, deleteSurvey, etc.
 * 
 * 📖 WHY THIS SEPARATION EXISTS:
 * - Client actions run in browser → Has auth context → Rules pass
 * - Server actions run on server → No auth context → Rules fail
 * - Firebase client SDK requires browser auth for security rules
 * 
 * 💡 ARCHITECTURE:
 * [Browser Client] → Client Actions → Firebase (with auth token) → ✅ Success
 * [Next.js Server] → Server Actions → Firebase (no auth token) → ❌ PERMISSION_DENIED
 * 
 * Note: CREATE operations below are LEGACY and should NOT be imported by client components.
 * They are kept for backwards compatibility but will fail due to no auth context.
 * Use '@/lib/client-actions' instead.
 */

const surveyActionSchema = z.record(z.any());

/**
 * ⚠️ DEPRECATED - DO NOT USE FROM CLIENT COMPONENTS
 * This function will fail with PERMISSION_DENIED because it runs on the server
 * without authentication context. Use the version in @/lib/client-actions instead.
 * 
 * @deprecated Use createBlankSurvey from '@/lib/client-actions' instead
 */
export async function createBlankSurvey() {
  const newSurveyRef = doc(collection(db, 'surveys'));
  const newSurvey = {
    appearance: {
      themeColor: '#C8262A',
      cardShadow: 'sm',
      cardTitleSize: 'lg',
      sectionTitleSize: 'lg',
      labelSize: 'sm',
      gradient: true,
      showTitle: true,
    },
    title: 'Untitled Survey',
    description: '',
    submitButtonLabel: 'Submit',
    saveProgressEnabled: true,
    shareButtonEnabled: true,
    shareTitle: 'Share this survey',
    shareText: "I'd like your feedback—please fill out this survey.",
    resumeSettings: {
      showResumeModal: true,
      resumeTitle: 'Resume your saved progress?',
      resumeDescription: 'We found a saved draft. Continue where you left off or start over.',
      continueLabel: 'Continue',
      startOverLabel: 'Start over',
      showContinue: true,
      showStartOver: true,
    },
    sections: [
      {
        id: 'section-1',
        title: 'Section 1',
        fields: []
      }
    ],
  };

  await setDoc(newSurveyRef, newSurvey);

  revalidatePath('/editor');
  return { id: newSurveyRef.id };
}

/**
 * ⚠️ DEPRECATED - DO NOT USE FROM CLIENT COMPONENTS
 * This function will fail with PERMISSION_DENIED because it runs on the server
 * without authentication context. Use the version in @/lib/client-actions instead.
 * 
 * @deprecated Use createSurvey from '@/lib/client-actions' instead
 */
export async function createSurvey() {
  const newSurveyRef = doc(collection(db, 'surveys'));
  const newSurvey = {
    ...defaultSurvey,
    title: 'Untitled Survey',
  };

  await setDoc(newSurveyRef, newSurvey);

  revalidatePath('/editor');
  return { id: newSurveyRef.id };
}

/**
 * ⚠️ DEPRECATED - DO NOT USE FROM CLIENT COMPONENTS
 * This function will fail with PERMISSION_DENIED because it runs on the server
 * without authentication context. Use the version in @/lib/client-actions instead.
 * 
 * @deprecated Use createSurveyV2 from '@/lib/client-actions' instead
 */
export async function createSurveyV2() {
  const newSurveyRef = doc(collection(db, 'surveys'));
  const newSurvey = {
    ...surveyV2,
    title: 'Untitled Survey (V2)',
  } as any;

  await setDoc(newSurveyRef, newSurvey);

  revalidatePath('/editor');
  return { id: newSurveyRef.id };
}

/**
 * ⚠️ DEPRECATED - DO NOT USE FROM CLIENT COMPONENTS
 * This function will fail with PERMISSION_DENIED because it runs on the server
 * without authentication context. Use the version in @/lib/client-actions instead.
 * 
 * @deprecated Use createConsentSurvey from '@/lib/client-actions' instead
 */
export async function createConsentSurvey() {
  const newSurveyRef = doc(collection(db, 'surveys'));
  const newSurvey = {
    ...consentSurvey,
  } as any;

  await setDoc(newSurveyRef, newSurvey);

  revalidatePath('/editor');
  return { id: newSurveyRef.id };
}

export async function listSurveys() {
  try {
    const surveysCollection = collection(db, 'surveys');
    const snapshot = await getDocs(surveysCollection);
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map((doc) => {
      const data = doc.data() as any;
      const sections = data.sections || [];
      const questionCount = sections.reduce((total: number, section: any) => {
        const fields = section.fields || [];
        const sectionCount = fields.reduce((count: number, field: any) => {
          if (field?.type === 'group') {
            return count + (field.fields?.length || 0);
          }
          return count + 1;
        }, 0);
        return total + sectionCount;
      }, 0);

      return {
        id: doc.id,
        title: data.title || 'Untitled Survey',
        description: data.description || 'No description.',
        sections,
        questionCount,
      };
    });
  } catch (e) {
    console.error('Error listing surveys:', e);
    return [];
  }
}

export async function getSurvey(id: string) {
  try {
    const docRef = doc(db, 'surveys', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      const newSurvey = JSON.parse(JSON.stringify(defaultSurvey));
      newSurvey.id = id;
      return newSurvey;
    }
  } catch (e) {
    console.error('Error getting survey:', e);
    if (e instanceof Error && e.message.includes('permission-denied')) {
      return {
        error:
          'Could not fetch the survey due to a permission error. Please check your Firestore security rules.',
      };
    }
    return { error: 'An unexpected error occurred while fetching the survey.' };
  }
}

/**
 * ⚠️ DEPRECATED - DO NOT USE FROM CLIENT COMPONENTS
 * This function will fail with PERMISSION_DENIED because it runs on the server
 * without authentication context. Use the version in @/lib/client-actions instead.
 * 
 * @deprecated Use updateSurvey from '@/lib/client-actions' instead
 */
export async function updateSurvey(
  id: string,
  data: z.infer<typeof surveyActionSchema>
): Promise<{ error?: string }> {
  try {
    if (!id) {
      return { error: 'The survey ID is missing. Cannot save.' };
    }

    const dataToSave = { ...data };
    delete dataToSave.id;

    const surveyRef = doc(db, 'surveys', id);
    // Log approximate payload size to help diagnose Firestore limits (1 MiB per document)
    try {
      const payloadSizeBytes = Buffer.from(JSON.stringify(dataToSave)).length;
      console.log('[updateSurvey] Payload size (bytes):', payloadSizeBytes);
    } catch {}
    await setDoc(surveyRef, dataToSave, { merge: true });

    revalidatePath(`/survey/${id}`);
    revalidatePath(`/editor/${id}`);
    revalidatePath('/editor');
    revalidatePath('/');

    return {};
  } catch (e) {
    console.error('updateSurvey error:', e);
    try { console.error('Error details:', JSON.stringify(e, Object.getOwnPropertyNames(e), 2)); } catch {}
    if (e instanceof Error) {
      console.error('Error message:', e.message);
      if (e.message.includes('permission-denied')) {
        return { error: 'Saving failed due to a permission error. Please check your Firestore security rules.' };
      }
      if (e.message.toLowerCase().includes('maximum') || e.message.toLowerCase().includes('too large') || e.message.toLowerCase().includes('4 invalid_argument') || e.message.toLowerCase().includes('payload')) {
        return { error: 'Survey is too large to save as a single document. Consider reducing options, collapsing templates, or splitting into multiple docs.' };
      }
    }
    return { error: 'An unexpected error occurred while saving the survey. Please try again later.' };
  }
}

/**
 * ⚠️ DEPRECATED - DO NOT USE FROM CLIENT COMPONENTS
 * This function will fail with PERMISSION_DENIED because it runs on the server
 * without authentication context. Use the version in @/lib/client-actions instead.
 * 
 * @deprecated Use deleteSurvey from '@/lib/client-actions' instead
 */
export async function deleteSurvey(id: string): Promise<{ error?: string }> {
  try {
    if (!id) {
      return { error: 'The survey ID is missing. Cannot delete.' };
    }

    const surveyRef = doc(db, 'surveys', id);
    await deleteDoc(surveyRef);

    revalidatePath('/editor');
    revalidatePath('/');

    return {};
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message.includes('permission-denied')) {
      return {
        error:
          'Deletion failed due to a permission error. Please check your Firestore security rules.',
      };
    }
    return {
      error:
        'An unexpected error occurred while deleting the survey. Please try again later.',
    };
  }
}