'use server';

import { getAdminFirestore } from '@/lib/firebase-admin';
import { getMentorByNameOrId } from './relationship-actions';
import { looksLikeFirestoreId } from '@/lib/youth-empowerment';

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

