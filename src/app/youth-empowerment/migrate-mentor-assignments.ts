'use server';

import { getAdminFirestore } from '@/lib/firebase-admin';
import { getMentorByNameOrId } from './relationship-actions';
import { looksLikeFirestoreId } from '@/lib/youth-empowerment';
import { enforceAdminInAction } from '@/lib/server-auth';

/**
 * Migration function to convert existing mentor IDs to names in assignedMentor fields
 * This should be run once after deployment to fix existing data
 */
export async function migrateMentorAssignmentsToNames(): Promise<{
  success: boolean;
  migrated: number;
  failed: number;
  errors?: Array<{ participantId: string; participantName: string; error: string }>;
}> {
  const firestore = getAdminFirestore();
  const errors: Array<{ participantId: string; participantName: string; error: string }> = [];
  let migrated = 0;
  let failed = 0;

  try {
    // Get all participants with assigned mentors
    const participantsSnapshot = await firestore
      .collection('yep_participants')
      .where('assignedMentor', '!=', '')
      .get();

    for (const participantDoc of participantsSnapshot.docs) {
      const participantData = participantDoc.data();
      const assignedMentor = participantData.assignedMentor;

      if (!assignedMentor) continue;

      // Check if it looks like a Firestore ID (20 chars alphanumeric)
      if (looksLikeFirestoreId(assignedMentor)) {
        try {
          // Resolve ID to name
          const mentorResult = await getMentorByNameOrId(assignedMentor);
          
          if (mentorResult.success && mentorResult.mentor) {
            // Update participant with mentor name
            await participantDoc.ref.update({
              assignedMentor: mentorResult.mentor.name,
              updatedAt: new Date(),
            });
            migrated++;
          } else {
            // Mentor not found - mark as failed
            errors.push({
              participantId: participantDoc.id,
              participantName: participantData.youthParticipant || 'Unknown',
              error: `Mentor with ID "${assignedMentor}" not found`,
            });
            failed++;
          }
        } catch (error) {
          errors.push({
            participantId: participantDoc.id,
            participantName: participantData.youthParticipant || 'Unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          failed++;
        }
      }
      // If it's already a name, skip (no migration needed)
    }

    return {
      success: true,
      migrated,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('Error during migration:', error);
    return {
      success: false,
      migrated,
      failed,
      errors: [{
        participantId: 'system',
        participantName: 'Migration',
        error: error instanceof Error ? error.message : 'Unknown error',
      }],
    };
  }
}

/**
 * Migration function to standardize mentor linkage to IDs while preserving display names.
 */
export async function migrateMentorAssignmentsToIds(): Promise<{
  success: boolean;
  updatedParticipants: number;
  updatedMentors: number;
  skipped: number;
  errors?: Array<{ participantId: string; participantName: string; error: string }>;
}> {
  await enforceAdminInAction();
  const firestore = getAdminFirestore();
  const errors: Array<{ participantId: string; participantName: string; error: string }> = [];
  let updatedParticipants = 0;
  let updatedMentors = 0;
  let skipped = 0;

  try {
    const participantsSnapshot = await firestore.collection('yep_participants').get();

    for (const participantDoc of participantsSnapshot.docs) {
      const data = participantDoc.data() as any;
      const participantId = participantDoc.id;
      const participantName = data.youthParticipant || 'Unknown';

      try {
        let mentorId: string | undefined = data.assignedMentorId || data.mentorId;
        const mentorName: string | undefined = data.assignedMentor;

        // Resolve mentor by name if id missing
        if (!mentorId && mentorName) {
          const result = await getMentorByNameOrId(mentorName);
          if (result.success && result.mentor?.id) {
            mentorId = result.mentor.id;
            await participantDoc.ref.update({
              assignedMentorId: mentorId,
              assignedMentor: result.mentor.name,
              updatedAt: new Date(),
            });
            updatedParticipants++;
          } else {
            skipped++;
            continue;
          }
        }

        // If mentorId exists, normalize display name and mentor list
        if (mentorId) {
          const mentorDoc = await firestore.collection('yep_mentors').doc(mentorId).get();
          if (mentorDoc.exists) {
            const md = mentorDoc.data() as any;
            const normalizedName = md.name || mentorName;
            const updates: any = {};
            if (data.assignedMentorId !== mentorId) updates.assignedMentorId = mentorId;
            if (!data.assignedMentor || data.assignedMentor !== normalizedName) updates.assignedMentor = normalizedName;
            if (Object.keys(updates).length > 0) {
              updates.updatedAt = new Date();
              await participantDoc.ref.update(updates);
              updatedParticipants++;
            }

            const assignedStudents: string[] = Array.isArray(md.assignedStudents) ? md.assignedStudents : [];
            if (!assignedStudents.includes(participantId)) {
              await mentorDoc.ref.update({
                assignedStudents: [...assignedStudents, participantId],
                updatedAt: new Date(),
              });
              updatedMentors++;
            }
          } else {
            errors.push({ participantId, participantName, error: `Mentor id "${mentorId}" not found` });
          }
        } else {
          // No mentor linkage present
          skipped++;
        }
      } catch (err: any) {
        errors.push({ participantId, participantName, error: err?.message || 'Unknown error' });
      }
    }

    return {
      success: true,
      updatedParticipants,
      updatedMentors,
      skipped,
      errors: errors.length ? errors : undefined,
    };
  } catch (error) {
    console.error('Error during ID migration:', error);
    return {
      success: false,
      updatedParticipants,
      updatedMentors,
      skipped,
      errors: [{ participantId: 'system', participantName: 'Migration', error: error instanceof Error ? error.message : 'Unknown error' }],
    };
  }
}

