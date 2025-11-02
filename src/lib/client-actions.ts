'use client';

import { updateSurvey as serverUpdateSurvey } from '@/app/editor/actions';
import { db, auth } from '@/lib/firebase';
import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { defaultSurvey, surveyV2, consentSurvey } from '@/lib/survey-template';

/**
 * ⚠️ CRITICAL: CLIENT-SIDE ACTIONS WITH AUTHENTICATION CONTEXT
 * 
 * These functions run in the BROWSER and have access to Firebase Auth context.
 * They are used for Firestore WRITE operations that require admin authentication.
 * 
 * 🔐 AUTHENTICATION FLOW:
 * 1. Functions run in browser with authenticated user
 * 2. Firebase Auth automatically includes user's token in requests
 * 3. Firestore security rules check request.auth.token custom claims
 * 4. If user has 'admin' role in custom claims, operation succeeds
 * 
 * ⚠️ DO NOT MOVE THESE TO SERVER ACTIONS!
 * Server actions have NO auth context and will get PERMISSION_DENIED errors.
 * 
 * ✅ USE THESE FUNCTIONS FROM:
 * - Client components ('use client')
 * - React event handlers
 * - Browser-side operations
 * 
 * ❌ DO NOT USE SERVER ACTIONS FOR WRITES:
 * - src/app/editor/actions.ts functions have NO auth context
 * - They will fail with PERMISSION_DENIED errors
 * - Only use server actions for READ operations
 * 
 * 📋 REQUIRED PATTERNS:
 * - Always check auth.currentUser before operations
 * - Log authentication state for debugging
 * - Provide helpful error messages with user email
 * - Return { error: string } on failure, {} on success
 * 
 * 🔍 DEBUGGING:
 * - Open browser console to see authentication logs
 * - Look for: "[functionName] Authenticated as: user@email.com"
 * - If "NOT AUTHENTICATED" appears, user needs to login
 * - If permission denied, check user's role in Firebase Auth custom claims
 */

// Remove all undefined properties recursively. Firestore rejects `undefined` anywhere in the payload.
function sanitizeFirestoreData<T>(value: T): T {
  if (value === undefined) return undefined as unknown as T;
  if (value === null) return value;
  if (Array.isArray(value)) {
    const cleaned = (value as unknown as any[])
      .map((v) => sanitizeFirestoreData(v))
      .filter((v) => v !== undefined);
    return cleaned as unknown as T;
  }
  if (typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      const cleaned = sanitizeFirestoreData(v);
      if (cleaned !== undefined) result[k] = cleaned;
    }
    return result as unknown as T;
  }
  return value;
}

export async function updateSurvey(surveyId: string, data: any) {
  try {
    if (!surveyId) return { error: 'Missing survey ID' };
    
    // Debug: Check auth state
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('[updateSurvey] No authenticated user found');
      return { error: 'You must be logged in to update surveys. Please refresh the page and try again.' };
    }
    console.log('[updateSurvey] Authenticated as:', currentUser.email);
    
    const { id, ...dataToSave } = data || {};
    // Prefer client-side write so Firestore uses the current user's auth context
    const cleaned = sanitizeFirestoreData(dataToSave);
    await setDoc(doc(db, 'surveys', String(surveyId)), cleaned, { merge: true });
    return {};
  } catch (error) {
    // Surface the client error directly (server writes are unauthenticated and will fail rules)
    const err = error as any;
    const msg = err?.message || String(err);
    console.error('Client updateSurvey failed:', err);
    console.error('Current user:', auth.currentUser?.email || 'NOT AUTHENTICATED');
    if (msg?.toLowerCase().includes('permission') || err?.code === 'permission-denied') {
      return { error: `Permission denied. Your email (${auth.currentUser?.email}) must have 'admin' role in Firebase Auth custom claims. Please contact your administrator.` };
    }
    return { error: msg || 'Failed to update survey' };
  }
}

export async function createBlankSurvey() {
  try {
    // Debug: Check auth state
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('[createBlankSurvey] No authenticated user found');
      return { error: 'You must be logged in to create surveys. Please refresh the page and try again.' };
    }
    console.log('[createBlankSurvey] Authenticated as:', currentUser.email);
    
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
        { id: 'section-1', title: 'Section 1', fields: [] },
      ],
    } as const;
    await setDoc(newSurveyRef, sanitizeFirestoreData(newSurvey));
    return { id: newSurveyRef.id };
  } catch (error) {
    console.error('Error creating blank survey:', error);
    console.error('Current user:', auth.currentUser?.email || 'NOT AUTHENTICATED');
    const err = error as any;
    if (err?.code === 'permission-denied') {
      return { error: `Permission denied. Your email (${auth.currentUser?.email}) must have 'admin' role in Firebase Auth custom claims.` };
    }
    return { error: 'Failed to create blank survey' };
  }
}

export async function createSurvey() {
  try {
    // Debug: Check auth state
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('[createSurvey] No authenticated user found');
      return { error: 'You must be logged in to create surveys. Please refresh the page and try again.' };
    }
    console.log('[createSurvey] Authenticated as:', currentUser.email);
    
    const newSurveyRef = doc(collection(db, 'surveys'));
    const newSurvey = { ...defaultSurvey, title: 'Untitled Survey' } as any;
    await setDoc(newSurveyRef, sanitizeFirestoreData(newSurvey));
    return { id: newSurveyRef.id };
  } catch (error) {
    console.error('Error creating survey:', error);
    console.error('Current user:', auth.currentUser?.email || 'NOT AUTHENTICATED');
    const err = error as any;
    if (err?.code === 'permission-denied') {
      return { error: `Permission denied. Your email (${auth.currentUser?.email}) must have 'admin' role in Firebase Auth custom claims.` };
    }
    return { error: 'Failed to create survey' };
  }
}

export async function createSurveyV2() {
  try {
    // Debug: Check auth state
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('[createSurveyV2] No authenticated user found');
      return { error: 'You must be logged in to create surveys. Please refresh the page and try again.' };
    }
    console.log('[createSurveyV2] Authenticated as:', currentUser.email);
    
    const newSurveyRef = doc(collection(db, 'surveys'));
    const newSurvey = { ...surveyV2, title: 'Untitled Survey (V2)' } as any;
    await setDoc(newSurveyRef, sanitizeFirestoreData(newSurvey));
    return { id: newSurveyRef.id };
  } catch (error) {
    console.error('Error creating survey (V2):', error);
    console.error('Current user:', auth.currentUser?.email || 'NOT AUTHENTICATED');
    const err = error as any;
    if (err?.code === 'permission-denied') {
      return { error: `Permission denied. Your email (${auth.currentUser?.email}) must have 'admin' role in Firebase Auth custom claims.` };
    }
    return { error: 'Failed to create survey (V2)' };
  }
}

export async function createConsentSurvey() {
  try {
    // Debug: Check auth state
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('[createConsentSurvey] No authenticated user found');
      return { error: 'You must be logged in to create surveys. Please refresh the page and try again.' };
    }
    console.log('[createConsentSurvey] Authenticated as:', currentUser.email);
    
    const newSurveyRef = doc(collection(db, 'surveys'));
    await setDoc(newSurveyRef, sanitizeFirestoreData(consentSurvey as any));
    return { id: newSurveyRef.id };
  } catch (error) {
    console.error('Error creating consent survey:', error);
    console.error('Current user:', auth.currentUser?.email || 'NOT AUTHENTICATED');
    const err = error as any;
    if (err?.code === 'permission-denied') {
      return { error: `Permission denied. Your email (${auth.currentUser?.email}) must have 'admin' role in Firebase Auth custom claims.` };
    }
    return { error: 'Failed to create consent survey' };
  }
}

export async function deleteSurvey(surveyId: string) {
  try {
    if (!surveyId) return { error: 'Missing survey ID' };
    await deleteDoc(doc(db, 'surveys', String(surveyId)));
    return {};
  } catch (error) {
    const err = error as any;
    console.error('Error deleting survey:', err);
    const msg = err?.message || 'Failed to delete survey';
    return { error: msg };
  }
}
