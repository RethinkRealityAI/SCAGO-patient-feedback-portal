'use server';

import { getAdminFirestore } from '@/lib/firebase-admin';
import { looksLikeFirestoreId } from '@/lib/youth-empowerment';


/**
 * Get mentor by ID
 */
export async function getMentorById(mentorId: string): Promise<{
  success: boolean;
  mentor?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    availability?: string;
  };
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();
    
    const mentorDoc = await firestore.collection('yep_mentors').doc(mentorId).get();

    if (!mentorDoc.exists) {
      return {
        success: false,
        error: 'Mentor not found',
      };
    }

    const mentorData = mentorDoc.data()!;

    return {
      success: true,
      mentor: {
        id: mentorDoc.id,
        name: mentorData.name,
        email: mentorData.email,
        phone: mentorData.phone,
        availability: mentorData.availability,
      },
    };
  } catch (error) {
    console.error('Error fetching mentor by ID:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch mentor by ID',
    };
  }
}

/**
 * Get mentor by name or ID (handles both formats for backward compatibility)
 */
export async function getMentorByNameOrId(mentorNameOrId: string): Promise<{
  success: boolean;
  mentor?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    availability?: string;
  };
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();
    
    // First try by ID (if it looks like a Firestore document ID)
    if (looksLikeFirestoreId(mentorNameOrId)) {
      const mentorDoc = await firestore.collection('yep_mentors').doc(mentorNameOrId).get();
      if (mentorDoc.exists) {
        const mentorData = mentorDoc.data()!;
        return {
          success: true,
          mentor: {
            id: mentorDoc.id,
            name: mentorData.name,
            email: mentorData.email,
            phone: mentorData.phone,
            availability: mentorData.availability,
          },
        };
      }
    }
    
    // Then try by name (check for duplicates)
    const mentorQuery = await firestore
      .collection('yep_mentors')
      .where('name', '==', mentorNameOrId)
      .get();

    if (mentorQuery.empty) {
      return {
        success: false,
        error: 'Mentor not found',
      };
    }

    // Warn if multiple mentors with same name found
    if (mentorQuery.docs.length > 1) {
      console.warn(`Multiple mentors found with name "${mentorNameOrId}". Using first match.`);
    }

    const mentorDoc = mentorQuery.docs[0];
    const mentorData = mentorDoc.data();

    return {
      success: true,
      mentor: {
        id: mentorDoc.id,
        name: mentorData.name,
        email: mentorData.email,
        phone: mentorData.phone,
        availability: mentorData.availability,
      },
    };
  } catch (error) {
    console.error('Error fetching mentor by name or ID:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch mentor',
    };
  }
}

/**
 * Get mentor details including contact info (enhanced to handle both ID and name)
 */
export async function getMentorDetails(mentorNameOrId: string): Promise<{
  success: boolean;
  mentor?: {
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    availability?: string;
  };
  error?: string;
}> {
  const result = await getMentorByNameOrId(mentorNameOrId);
  if (!result.success) {
    return result;
  }
  
  return {
    success: true,
    mentor: {
      id: result.mentor?.id,
      name: result.mentor?.name || '',
      email: result.mentor?.email,
      phone: result.mentor?.phone,
      availability: result.mentor?.availability,
    },
  };
}

/**
 * Get participant details including contact info
 */
export async function getParticipantDetails(participantName: string): Promise<{
  success: boolean;
  participant?: {
    name: string;
    email?: string;
    phoneNumber?: string;
    region?: string;
  };
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();
    
    // Find participant by name
    const participantQuery = await firestore
      .collection('yep_participants')
      .where('youthParticipant', '==', participantName)
      .limit(1)
      .get();

    if (participantQuery.empty) {
      return {
        success: false,
        error: 'Participant not found',
      };
    }

    const participantDoc = participantQuery.docs[0];
    const participantData = participantDoc.data();

    return {
      success: true,
      participant: {
        name: participantData.youthParticipant,
        email: participantData.email,
        phoneNumber: participantData.phoneNumber,
        region: participantData.region,
      },
    };
  } catch (error) {
    console.error('Error fetching participant details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch participant details',
    };
  }
}

/**
 * Validate mentor-participant relationship consistency
 */
export async function validateMentorParticipantRelationship(): Promise<{
  success: boolean;
  issues?: Array<{
    type: 'orphaned_assignment' | 'missing_assignment' | 'invalid_mentor';
    participantId?: string;
    participantName?: string;
    mentorName?: string;
    mentorId?: string;
    message: string;
  }>;
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();
    const issues: Array<{
      type: 'orphaned_assignment' | 'missing_assignment' | 'invalid_mentor';
      participantId?: string;
      participantName?: string;
      mentorName?: string;
      mentorId?: string;
      message: string;
    }> = [];

    // Get all participants with assigned mentors
    const participantsSnapshot = await firestore
      .collection('yep_participants')
      .where('assignedMentor', '!=', '')
      .get();

    // Get all mentors
    const mentorsSnapshot = await firestore.collection('yep_mentors').get();
    const mentorsMap = new Map<string, any>();
    mentorsSnapshot.docs.forEach(doc => {
      mentorsMap.set(doc.id, { id: doc.id, ...doc.data() });
      mentorsMap.set(doc.data().name, { id: doc.id, ...doc.data() });
    });

    // Check each participant's assigned mentor
    for (const participantDoc of participantsSnapshot.docs) {
      const participantData = participantDoc.data();
      const assignedMentor = participantData.assignedMentor;

      if (!assignedMentor) continue;

      // Check if mentor exists (by name or ID)
      const mentorFound = mentorsMap.has(assignedMentor);
      if (!mentorFound) {
        // Check if it's an ID format
        if (looksLikeFirestoreId(assignedMentor)) {
          const mentorDoc = await firestore.collection('yep_mentors').doc(assignedMentor).get();
          if (!mentorDoc.exists) {
            issues.push({
              type: 'invalid_mentor',
              participantId: participantDoc.id,
              participantName: participantData.youthParticipant,
              mentorName: assignedMentor,
              message: `Participant "${participantData.youthParticipant}" has invalid mentor assignment: "${assignedMentor}"`,
            });
          }
        } else {
          issues.push({
            type: 'orphaned_assignment',
            participantId: participantDoc.id,
            participantName: participantData.youthParticipant,
            mentorName: assignedMentor,
            message: `Participant "${participantData.youthParticipant}" assigned to non-existent mentor: "${assignedMentor}"`,
          });
        }
      }
    }

    // Check all mentors' assignedStudents arrays
    for (const mentorDoc of mentorsSnapshot.docs) {
      const mentorData = mentorDoc.data();
      const assignedStudents = mentorData.assignedStudents || [];

      for (const studentId of assignedStudents) {
        const studentDoc = await firestore.collection('yep_participants').doc(studentId).get();
        if (!studentDoc.exists) {
          issues.push({
            type: 'invalid_mentor',
            mentorId: mentorDoc.id,
            mentorName: mentorData.name,
            participantId: studentId,
            message: `Mentor "${mentorData.name}" has invalid participant ID in assignedStudents: "${studentId}"`,
          });
        } else {
          const studentData = studentDoc.data()!;
          const studentMentor = (studentData as any).assignedMentor;
          // Check if participant's assignedMentor matches mentor's name or ID
          if (studentMentor !== mentorData.name && studentMentor !== mentorDoc.id) {
            issues.push({
              type: 'missing_assignment',
              mentorId: mentorDoc.id,
              mentorName: mentorData.name,
              participantId: studentDoc.id,
              participantName: (studentData as any).youthParticipant,
              message: `Mentor "${mentorData.name}" has participant "${(studentData as any).youthParticipant}" in assignedStudents, but participant's assignedMentor is "${studentMentor}"`,
            });
          }
        }
      }
    }

    return {
      success: true,
      issues,
    };
  } catch (error) {
    console.error('Error validating relationships:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate relationships',
    };
  }
}

/**
 * Sync mentor-participant relationship bidirectionally
 * Updates both participant's assignedMentor and mentor's assignedStudents array
 */
export async function syncMentorParticipantRelationship(
  participantId: string,
  oldMentorNameOrId: string | undefined,
  newMentorNameOrId: string | undefined
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();
    
    // Resolve mentor names if IDs provided
    let oldMentorName: string | undefined;
    let newMentorName: string | undefined;
    
    if (oldMentorNameOrId) {
      if (looksLikeFirestoreId(oldMentorNameOrId)) {
        const result = await getMentorByNameOrId(oldMentorNameOrId);
        if (result.success && result.mentor) {
          oldMentorName = result.mentor.name;
        }
      } else {
        oldMentorName = oldMentorNameOrId;
      }
    }
    
    if (newMentorNameOrId) {
      if (looksLikeFirestoreId(newMentorNameOrId)) {
        const result = await getMentorByNameOrId(newMentorNameOrId);
        if (result.success && result.mentor) {
          newMentorName = result.mentor.name;
        } else {
          return {
            success: false,
            error: 'New mentor not found',
          };
        }
      } else {
        // Verify mentor exists by name (check for duplicates)
        const mentorQuery = await firestore
          .collection('yep_mentors')
          .where('name', '==', newMentorNameOrId)
          .get();
        
        if (mentorQuery.empty) {
          return {
            success: false,
            error: 'New mentor not found',
          };
        }

        // Warn if multiple mentors with same name
        if (mentorQuery.docs.length > 1) {
          console.warn(`Multiple mentors found with name "${newMentorNameOrId}". Using first match.`);
        }

        newMentorName = newMentorNameOrId;
      }
    }
    
    // If mentor hasn't changed, no sync needed
    if (oldMentorName === newMentorName) {
      return { success: true };
    }
    
    // Get participant document
    const participantDoc = await firestore.collection('yep_participants').doc(participantId).get();
    if (!participantDoc.exists) {
      return {
        success: false,
        error: 'Participant not found',
      };
    }
    
    // Remove from old mentor's assignedStudents if exists
    if (oldMentorName) {
      const oldMentorQuery = await firestore
        .collection('yep_mentors')
        .where('name', '==', oldMentorName)
        .limit(1)
        .get();
      
      if (!oldMentorQuery.empty) {
        const oldMentorDoc = oldMentorQuery.docs[0];
        const oldMentorData = oldMentorDoc.data();
        const assignedStudents = (oldMentorData.assignedStudents || []).filter(
          (id: string) => id !== participantId
        );
        
        await oldMentorDoc.ref.update({
          assignedStudents,
          updatedAt: new Date(),
        });
      }
    }
    
    // Add to new mentor's assignedStudents if exists
    if (newMentorName) {
      const newMentorQuery = await firestore
        .collection('yep_mentors')
        .where('name', '==', newMentorName)
        .limit(1)
        .get();
      
      if (!newMentorQuery.empty) {
        const newMentorDoc = newMentorQuery.docs[0];
        const newMentorData = newMentorDoc.data();
        const assignedStudents = newMentorData.assignedStudents || [];
        
        if (!assignedStudents.includes(participantId)) {
          await newMentorDoc.ref.update({
            assignedStudents: [...assignedStudents, participantId],
            updatedAt: new Date(),
          });
        }
      }
    }
    
    // Update participant's assignedMentor field
    await participantDoc.ref.update({
      assignedMentor: newMentorName || '',
      updatedAt: new Date(),
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error syncing mentor-participant relationship:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync relationship',
    };
  }
}

/**
 * Get all participants assigned to a mentor with their contact info
 * Enhanced to handle both mentor name and ID
 */
export async function getMentorParticipants(mentorNameOrId: string): Promise<{
  success: boolean;
  participants?: Array<{
    id: string;
    name: string;
    email?: string;
    phoneNumber?: string;
    region?: string;
  }>;
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();
    
    // First resolve mentor name if ID provided
    let mentorName = mentorNameOrId;
    if (looksLikeFirestoreId(mentorNameOrId)) {
      const mentorResult = await getMentorByNameOrId(mentorNameOrId);
      if (mentorResult.success && mentorResult.mentor) {
        mentorName = mentorResult.mentor.name;
      } else {
        return {
          success: false,
          error: 'Mentor not found',
        };
      }
    }
    
    // Find all participants assigned to this mentor
    const participantsQuery = await firestore
      .collection('yep_participants')
      .where('assignedMentor', '==', mentorName)
      .get();

    const participants = participantsQuery.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.youthParticipant,
        email: data.email,
        phoneNumber: data.phoneNumber,
        region: data.region,
      };
    });

    return {
      success: true,
      participants,
    };
  } catch (error) {
    console.error('Error fetching mentor participants:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch participants',
    };
  }
}

/**
 * Get comprehensive participant mentor info
 */
export async function getParticipantMentorInfo(participantId: string): Promise<{
  success: boolean;
  participant?: {
    id: string;
    name: string;
    assignedMentor?: string;
  };
  mentor?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    availability?: string;
  };
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();
    
    const participantDoc = await firestore.collection('yep_participants').doc(participantId).get();
    
    if (!participantDoc.exists) {
      return {
        success: false,
        error: 'Participant not found',
      };
    }

    const participantData = participantDoc.data()!;
    const assignedMentor = participantData.assignedMentor;

    let mentor = undefined;
    if (assignedMentor) {
      const mentorResult = await getMentorByNameOrId(assignedMentor);
      if (mentorResult.success) {
        mentor = mentorResult.mentor;
      }
    }

    return {
      success: true,
      participant: {
        id: participantDoc.id,
        name: participantData.youthParticipant,
        assignedMentor,
      },
      mentor,
    };
  } catch (error) {
    console.error('Error fetching participant mentor info:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch participant mentor info',
    };
  }
}





