'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

interface BackfillResult {
  success: boolean;
  participantsUpdated: number;
  mentorsUpdated: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * One-time backfill to add authEmail and profileCompleted fields to existing records
 * This should be run once after deploying the new auth system
 */
export async function backfillAuthFields(): Promise<BackfillResult> {
  const result: BackfillResult = {
    success: true,
    participantsUpdated: 0,
    mentorsUpdated: 0,
    errors: [],
  };

  try {
    // Backfill participants
    const participantsSnapshot = await getDocs(collection(db, 'yep_participants'));
    
    for (const participantDoc of participantsSnapshot.docs) {
      try {
        const data = participantDoc.data();
        const updates: any = {};

        // Add authEmail if email exists and authEmail is not set
        if (data.email && !data.authEmail) {
          updates.authEmail = data.email;
        }

        // Add profileCompleted if not set
        if (data.profileCompleted === undefined) {
          updates.profileCompleted = false;
        }

        // Only update if there are changes
        if (Object.keys(updates).length > 0) {
          updates.updatedAt = new Date();
          await updateDoc(doc(db, 'yep_participants', participantDoc.id), updates);
          result.participantsUpdated++;
        }
      } catch (error) {
        console.error(`Error updating participant ${participantDoc.id}:`, error);
        result.errors.push({
          id: participantDoc.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Backfill mentors
    const mentorsSnapshot = await getDocs(collection(db, 'yep_mentors'));
    
    for (const mentorDoc of mentorsSnapshot.docs) {
      try {
        const data = mentorDoc.data();
        const updates: any = {};

        // Add authEmail if email exists and authEmail is not set
        if (data.email && !data.authEmail) {
          updates.authEmail = data.email;
        }

        // Add profileCompleted if not set
        if (data.profileCompleted === undefined) {
          updates.profileCompleted = false;
        }

        // Only update if there are changes
        if (Object.keys(updates).length > 0) {
          updates.updatedAt = new Date();
          await updateDoc(doc(db, 'yep_mentors', mentorDoc.id), updates);
          result.mentorsUpdated++;
        }
      } catch (error) {
        console.error(`Error updating mentor ${mentorDoc.id}:`, error);
        result.errors.push({
          id: mentorDoc.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  } catch (error) {
    console.error('Error during backfill:', error);
    return {
      success: false,
      participantsUpdated: result.participantsUpdated,
      mentorsUpdated: result.mentorsUpdated,
      errors: [
        ...result.errors,
        { id: 'backfill', error: error instanceof Error ? error.message : 'Unknown error' },
      ],
    };
  }
}

/**
 * Generate invite codes for existing records without them
 */
export async function generateInviteCodes(): Promise<{
  success: boolean;
  participantsUpdated: number;
  mentorsUpdated: number;
  error?: string;
}> {
  try {
    const { nanoid } = await import('nanoid');
    let participantsUpdated = 0;
    let mentorsUpdated = 0;

    // Generate codes for participants without them
    const participantsSnapshot = await getDocs(collection(db, 'yep_participants'));
    
    for (const participantDoc of participantsSnapshot.docs) {
      const data = participantDoc.data();
      if (!data.inviteCode && !data.userId) {
        await updateDoc(doc(db, 'yep_participants', participantDoc.id), {
          inviteCode: nanoid(10),
          updatedAt: new Date(),
        });
        participantsUpdated++;
      }
    }

    // Generate codes for mentors without them
    const mentorsSnapshot = await getDocs(collection(db, 'yep_mentors'));
    
    for (const mentorDoc of mentorsSnapshot.docs) {
      const data = mentorDoc.data();
      if (!data.inviteCode && !data.userId) {
        await updateDoc(doc(db, 'yep_mentors', mentorDoc.id), {
          inviteCode: nanoid(10),
          updatedAt: new Date(),
        });
        mentorsUpdated++;
      }
    }

    return {
      success: true,
      participantsUpdated,
      mentorsUpdated,
    };
  } catch (error) {
    console.error('Error generating invite codes:', error);
    return {
      success: false,
      participantsUpdated: 0,
      mentorsUpdated: 0,
      error: error instanceof Error ? error.message : 'Failed to generate invite codes',
    };
  }
}








