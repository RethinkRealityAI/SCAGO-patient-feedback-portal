'use server';

import { getAdminFirestore } from '@/lib/firebase-admin';
import { z } from 'zod';

const claimProfileSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  inviteCode: z.string().optional(),
});

interface ClaimResult {
  success: boolean;
  role?: 'participant' | 'mentor';
  recordId?: string;
  error?: string;
}

/**
 * Claim a participant or mentor profile after first login
 * Links Firebase Auth user to existing YEP record
 */
export async function claimYEPProfile(
  userId: string,
  email: string,
  inviteCode?: string
): Promise<ClaimResult> {
  try {
    const validated = claimProfileSchema.parse({ userId, email, inviteCode });
    const firestore = getAdminFirestore();

    // Try to find participant by email or userId first
    const participantByEmail = await firestore
      .collection('yep_participants')
      .where('email', '==', validated.email)
      .limit(1)
      .get();

    if (!participantByEmail.empty) {
      const doc = participantByEmail.docs[0];
      const data = doc.data();

      // Check if already claimed by someone else
      if (data.userId && data.userId !== validated.userId) {
        return {
          success: false,
          error: 'This profile has already been claimed by another user',
        };
      }

      // Claim the profile
      await doc.ref.update({
        userId: validated.userId,
        authEmail: validated.email,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        role: 'participant',
        recordId: doc.id,
      };
    }

    // Try to find mentor by email
    const mentorByEmail = await firestore
      .collection('yep_mentors')
      .where('email', '==', validated.email)
      .limit(1)
      .get();

    if (!mentorByEmail.empty) {
      const doc = mentorByEmail.docs[0];
      const data = doc.data();

      // Check if already claimed by someone else
      if (data.userId && data.userId !== validated.userId) {
        return {
          success: false,
          error: 'This profile has already been claimed by another user',
        };
      }

      // Claim the profile
      await doc.ref.update({
        userId: validated.userId,
        authEmail: validated.email,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        role: 'mentor',
        recordId: doc.id,
      };
    }

    // If we have an invite code, try to find by code
    if (validated.inviteCode) {
      // Try participant
      const participantByCode = await firestore
        .collection('yep_participants')
        .where('inviteCode', '==', validated.inviteCode)
        .limit(1)
        .get();

      if (!participantByCode.empty) {
        const doc = participantByCode.docs[0];
        const data = doc.data();

        // Check if already claimed by someone else
        if (data.userId && data.userId !== validated.userId) {
          return {
            success: false,
            error: 'This invite code has already been used',
          };
        }

        // Claim the profile
        await doc.ref.update({
          userId: validated.userId,
          authEmail: validated.email,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        });

        return {
          success: true,
          role: 'participant',
          recordId: doc.id,
        };
      }

      // Try mentor
      const mentorByCode = await firestore
        .collection('yep_mentors')
        .where('inviteCode', '==', validated.inviteCode)
        .limit(1)
        .get();

      if (!mentorByCode.empty) {
        const doc = mentorByCode.docs[0];
        const data = doc.data();

        // Check if already claimed by someone else
        if (data.userId && data.userId !== validated.userId) {
          return {
            success: false,
            error: 'This invite code has already been used',
          };
        }

        // Claim the profile
        await doc.ref.update({
          userId: validated.userId,
          authEmail: validated.email,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        });

        return {
          success: true,
          role: 'mentor',
          recordId: doc.id,
        };
      }
    }

    return {
      success: false,
      error: 'No profile found for this email or invite code',
    };
  } catch (error) {
    console.error('Error claiming profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to claim profile',
    };
  }
}

/**
 * Helper function to serialize Firestore data for client components
 */
function serializeFirestoreData(data: any): any {
  const serialized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && '_seconds' in (value as any)) {
      // Firestore Timestamp - convert to ISO string
      const ts = value as { _seconds: number };
      serialized[key] = new Date(ts._seconds * 1000).toISOString();
    } else if (value instanceof Date) {
      // Regular Date object
      serialized[key] = value.toISOString();
    } else if (Array.isArray(value)) {
      // Array - recursively serialize
      serialized[key] = value.map(item => 
        typeof item === 'object' ? serializeFirestoreData(item) : item
      );
    } else if (value && typeof value === 'object') {
      // Nested object - recursively serialize
      serialized[key] = serializeFirestoreData(value);
    } else {
      // Primitive value
      serialized[key] = value;
    }
  }
  
  return serialized;
}

/**
 * Get YEP profile by userId
 */
export async function getYEPProfileByUserId(userId: string): Promise<{
  success: boolean;
  role?: 'participant' | 'mentor';
  profile?: any;
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();

    // Try participant
    const participantQuery = await firestore
      .collection('yep_participants')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!participantQuery.empty) {
      const doc = participantQuery.docs[0];
      const data = doc.data();
      const serializedData = serializeFirestoreData(data);
      
      return {
        success: true,
        role: 'participant',
        profile: { id: doc.id, ...serializedData },
      };
    }

    // Try mentor
    const mentorQuery = await firestore
      .collection('yep_mentors')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!mentorQuery.empty) {
      const doc = mentorQuery.docs[0];
      const data = doc.data();
      const serializedData = serializeFirestoreData(data);
      
      return {
        success: true,
        role: 'mentor',
        profile: { id: doc.id, ...serializedData },
      };
    }

    return {
      success: false,
      error: 'No profile found for this user',
    };
  } catch (error) {
    console.error('Error getting profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get profile',
    };
  }
}

/**
 * Update last login timestamp
 */
export async function updateYEPLastLogin(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = getAdminFirestore();

    // Update participant if exists
    const participantQuery = await firestore
      .collection('yep_participants')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!participantQuery.empty) {
      await participantQuery.docs[0].ref.update({
        lastLoginAt: new Date(),
      });
      return { success: true };
    }

    // Update mentor if exists
    const mentorQuery = await firestore
      .collection('yep_mentors')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!mentorQuery.empty) {
      await mentorQuery.docs[0].ref.update({
        lastLoginAt: new Date(),
      });
      return { success: true };
    }

    return { success: false, error: 'No profile found' };
  } catch (error) {
    console.error('Error updating last login:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update last login',
    };
  }
}

