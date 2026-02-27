/**
 * seed-surveys.ts
 *
 * Server-side utility to ensure platform-required surveys exist in Firestore.
 * Uses Firebase Admin SDK so it works without client auth context.
 *
 * Called from page.tsx server components on load — idempotent, safe to call many times.
 */

import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  MEMBERSHIP_SURVEY_ID,
  MEMBERSHIP_SURVEY_TEMPLATE_VERSION,
  createSeededMembershipSurvey,
} from '@/lib/survey-template';

/**
 * Ensures the SCAGO Membership Registration survey exists in Firestore.
 * Creates it with a fixed well-known ID if missing. No-op if already present.
 */
export async function ensureMembershipSurvey(): Promise<void> {
  try {
    const firestore = getAdminFirestore();
    const ref = firestore.collection('surveys').doc(MEMBERSHIP_SURVEY_ID);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set(createSeededMembershipSurvey());
      console.log('[seed-surveys] Membership survey created:', MEMBERSHIP_SURVEY_ID);
      return;
    }

    const currentVersion = Number((snap.data() as any)?.templateVersion || 0);
    if (currentVersion !== MEMBERSHIP_SURVEY_TEMPLATE_VERSION) {
      await ref.set(createSeededMembershipSurvey());
      console.log(
        `[seed-surveys] Membership survey updated to template version ${MEMBERSHIP_SURVEY_TEMPLATE_VERSION}`,
      );
    }
  } catch (err) {
    // Non-fatal: log and continue so the rest of the page still loads
    console.error('[seed-surveys] Could not seed membership survey:', err);
  }
}
