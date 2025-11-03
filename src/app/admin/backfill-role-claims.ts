'use server';

import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { enforceSuperAdminInAction } from '@/lib/server-auth';
import type { AppRole } from './user-actions';

interface BackfillResult {
  success: boolean;
  usersProcessed: number;
  rolesSet: number;
  errors: Array<{ email: string; uid: string; error: string }>;
  summary: {
    superAdmin: number;
    admin: number;
    participant: number;
    mentor: number;
    skipped: number;
  };
}

/**
 * One-time backfill to set Firebase Auth custom claims for existing users
 * This syncs roles from Firestore collections (yep_participants, yep_mentors) to Firebase Auth custom claims
 * 
 * Run this if existing users are getting "no role assigned" errors on login
 */
export async function backfillRoleClaims(): Promise<BackfillResult> {
  await enforceSuperAdminInAction(); // Only super-admin can run this

  const result: BackfillResult = {
    success: true,
    usersProcessed: 0,
    rolesSet: 0,
    errors: [],
    summary: {
      superAdmin: 0,
      admin: 0,
      participant: 0,
      mentor: 0,
      skipped: 0,
    },
  };

  try {
    const auth = getAdminAuth();
    const firestore = getAdminFirestore();

    // Get all users from Firebase Auth
    console.log('[Backfill] Fetching all users from Firebase Auth...');
    const listUsersResult = await auth.listUsers(1000);
    const users = listUsersResult.users;

    console.log(`[Backfill] Found ${users.length} users to process`);

    // Build email-to-role maps from Firestore
    const emailToParticipantRole = new Map<string, string>();
    const emailToMentorRole = new Map<string, string>();

    // Get all participants
    console.log('[Backfill] Loading participants from Firestore...');
    const participantsSnapshot = await firestore.collection('yep_participants').get();
    for (const doc of participantsSnapshot.docs) {
      const data = doc.data();
      const email = (data.email || data.authEmail || '').toLowerCase().trim();
      if (email) {
        emailToParticipantRole.set(email, doc.id);
        // Also check userId if available
        if (data.userId) {
          emailToParticipantRole.set(data.userId, doc.id);
        }
      }
    }
    console.log(`[Backfill] Found ${emailToParticipantRole.size} participant email mappings`);

    // Get all mentors
    console.log('[Backfill] Loading mentors from Firestore...');
    const mentorsSnapshot = await firestore.collection('yep_mentors').get();
    for (const doc of mentorsSnapshot.docs) {
      const data = doc.data();
      const email = (data.email || data.authEmail || '').toLowerCase().trim();
      if (email) {
        emailToMentorRole.set(email, doc.id);
        // Also check userId if available
        if (data.userId) {
          emailToMentorRole.set(data.userId, doc.id);
        }
      }
    }
    console.log(`[Backfill] Found ${emailToMentorRole.size} mentor email mappings`);

    // Process each user
    for (const user of users) {
      try {
        result.usersProcessed++;
        const email = (user.email || '').toLowerCase().trim();
        const existingClaims = user.customClaims || {};
        const existingRole = (existingClaims.role as AppRole) || null;

        // Skip if user already has a role set
        if (existingRole && ['super-admin', 'admin', 'mentor', 'participant'].includes(existingRole)) {
          console.log(`[Backfill] User ${email} already has role: ${existingRole}, skipping`);
          result.summary[existingRole as keyof typeof result.summary]++;
          result.summary.skipped++;
          continue;
        }

        // Determine role based on Firestore data
        let newRole: AppRole | null = null;

        // Check if user is a mentor
        if (emailToMentorRole.has(email) || emailToMentorRole.has(user.uid)) {
          newRole = 'mentor';
        }
        // Check if user is a participant
        else if (emailToParticipantRole.has(email) || emailToParticipantRole.has(user.uid)) {
          newRole = 'participant';
        }
        // Default to participant if no match (existing users without Firestore records)
        else {
          newRole = 'participant';
          console.log(`[Backfill] No Firestore match for ${email}, defaulting to participant`);
        }

        // Set the custom claim
        if (newRole) {
          console.log(`[Backfill] Setting role "${newRole}" for ${email} (was: ${existingRole || 'none'})`);
          await auth.setCustomUserClaims(user.uid, {
            ...existingClaims,
            role: newRole,
          });

          result.rolesSet++;
          result.summary[newRole]++;

          console.log(`[Backfill] ✅ Successfully set role "${newRole}" for ${email}`);
        }

      } catch (error) {
        console.error(`[Backfill] Error processing user ${user.email}:`, error);
        result.errors.push({
          email: user.email || 'unknown',
          uid: user.uid,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        result.success = false;
      }
    }

    console.log(`[Backfill] Complete! Processed ${result.usersProcessed} users, set ${result.rolesSet} roles`);
    console.log('[Backfill] Summary:', result.summary);

    return result;
  } catch (error) {
    console.error('[Backfill] Fatal error during backfill:', error);
    return {
      ...result,
      success: false,
      errors: [
        ...result.errors,
        {
          email: 'backfill',
          uid: 'system',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    };
  }
}

