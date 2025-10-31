'use server';

import { getAdminFirestore } from '@/lib/firebase-admin';
import { z } from 'zod';
import { YEPMeeting } from '@/lib/youth-empowerment';
import {
  sendMeetingRequestEmail,
  sendMeetingApprovedEmail,
  sendMeetingRejectedEmail,
  sendMeetingCancelledEmail,
} from '@/lib/email-templates';
import { getMessagingContacts } from './messaging-actions';

// EST timezone utility functions
function createESTDate(year: number, month: number, day: number, hours: number, minutes: number): Date {
  // Create date in EST timezone
  const date = new Date();
  date.setFullYear(year, month - 1, day);
  date.setHours(hours, minutes, 0, 0);
  
  // Convert to UTC for storage (EST is UTC-5, EDT is UTC-4)
  // We'll use EST (UTC-5) as the base timezone
  const estOffset = -5 * 60; // EST is UTC-5
  const utcTime = date.getTime() - (estOffset * 60 * 1000);
  
  return new Date(utcTime);
}

function parseESTDate(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return createESTDate(year, month, day, hours, minutes);
}

const createMeetingRequestSchema = z.object({
  participantId: z.string().min(1),
  participantUserId: z.string().min(1),
  participantName: z.string().min(1),
  participantEmail: z.union([z.string().email(), z.literal('')]),
  mentorId: z.string().min(1),
  mentorUserId: z.string().min(1),
  mentorName: z.string().min(1),
  mentorEmail: z.union([z.string().email(), z.literal('')]),
  requestedBy: z.enum(['participant', 'mentor']),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  proposedDate: z.string().min(1, 'Date is required'),
  proposedTime: z.string().min(1, 'Time is required'),
  duration: z.number().min(15).max(480), // 15 minutes to 8 hours
  location: z.string().max(200).optional(),
  meetingLink: z.string().url().optional().or(z.literal('')),
});

/**
 * Create a meeting request
 */
export async function createMeetingRequest(data: z.infer<typeof createMeetingRequestSchema>): Promise<{
  success: boolean;
  meetingId?: string;
  error?: string;
}> {
  try {
    const validated = createMeetingRequestSchema.parse(data);
    const firestore = getAdminFirestore();

    // Parse proposed date and time in EST timezone
    const proposedDate = parseESTDate(validated.proposedDate, validated.proposedTime);

    // Validate meeting is in the future
    const now = new Date();
    if (proposedDate <= now) {
      return {
        success: false,
        error: 'Meeting must be scheduled for a future date and time',
      };
    }

    // Check for meeting conflicts (optional - can be enhanced later)
    const endTime = new Date(proposedDate.getTime() + (validated.duration * 60 * 1000));
    
    // Create meeting document
    const meetingData = {
      participantId: validated.participantId,
      participantUserId: validated.participantUserId,
      participantName: validated.participantName,
      mentorId: validated.mentorId,
      mentorUserId: validated.mentorUserId,
      mentorName: validated.mentorName,
      requestedBy: validated.requestedBy,
      title: validated.title,
      description: validated.description || '',
      proposedDate: proposedDate,
      proposedTime: validated.proposedTime,
      duration: validated.duration,
      location: validated.location || '',
      meetingLink: validated.meetingLink || '',
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await firestore.collection('yep_meetings').add(meetingData);

    // Send email notification to the recipient (only if email is provided)
    const recipientEmail = validated.requestedBy === 'participant' 
      ? validated.mentorEmail 
      : validated.participantEmail;
    const recipientName = validated.requestedBy === 'participant'
      ? validated.mentorName
      : validated.participantName;
    const requesterName = validated.requestedBy === 'participant'
      ? validated.participantName
      : validated.mentorName;
    const isMentor = validated.requestedBy === 'participant';

    if (recipientEmail && recipientEmail.trim() !== '') {
      // Format date for email
      const dateStr = proposedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      sendMeetingRequestEmail({
        to: recipientEmail,
        recipientName,
        requesterName,
        meetingTitle: validated.title,
        proposedDate: dateStr,
        proposedTime: validated.proposedTime,
        isMentor,
      }).catch((error) => {
        console.error('Error sending email notification:', error);
      });
    }

    return {
      success: true,
      meetingId: docRef.id,
    };
  } catch (error) {
    console.error('Error creating meeting request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create meeting request',
    };
  }
}

/**
 * Approve a meeting request
 */
export async function approveMeeting(
  meetingId: string,
  userId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();
    const meetingDoc = await firestore.collection('yep_meetings').doc(meetingId).get();

    if (!meetingDoc.exists) {
      return {
        success: false,
        error: 'Meeting not found',
      };
    }

    const meetingData = meetingDoc.data()!;
    
    // Verify user is the mentor
    if (meetingData.mentorUserId !== userId) {
      return {
        success: false,
        error: 'Unauthorized - only mentors can approve meetings',
      };
    }

    if (meetingData.status !== 'pending') {
      return {
        success: false,
        error: `Meeting is already ${meetingData.status}`,
      };
    }

    await meetingDoc.ref.update({
      status: 'approved',
      approvedAt: new Date(),
      updatedAt: new Date(),
    });

    // Get participant email for notification
    const participantDoc = await firestore.collection('yep_participants').doc(meetingData.participantId).get();
    const participantData = participantDoc.exists ? participantDoc.data() : null;
    const participantEmail = participantData?.email || participantData?.authEmail || '';

    if (participantEmail) {
      const meetingDate = meetingData.proposedDate?.toDate?.() || new Date(meetingData.proposedDate);
      const dateStr = meetingDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      sendMeetingApprovedEmail({
        to: participantEmail,
        recipientName: meetingData.participantName,
        meetingTitle: meetingData.title,
        meetingDate: dateStr,
        meetingTime: meetingData.proposedTime,
        meetingLink: meetingData.meetingLink,
      }).catch((error) => {
        console.error('Error sending email notification:', error);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error approving meeting:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve meeting',
    };
  }
}

/**
 * Reject a meeting request
 */
export async function rejectMeeting(
  meetingId: string,
  userId: string,
  rejectionReason?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();
    const meetingDoc = await firestore.collection('yep_meetings').doc(meetingId).get();

    if (!meetingDoc.exists) {
      return {
        success: false,
        error: 'Meeting not found',
      };
    }

    const meetingData = meetingDoc.data()!;
    
    // Verify user is the mentor
    if (meetingData.mentorUserId !== userId) {
      return {
        success: false,
        error: 'Unauthorized - only mentors can reject meetings',
      };
    }

    if (meetingData.status !== 'pending') {
      return {
        success: false,
        error: `Meeting is already ${meetingData.status}`,
      };
    }

    await meetingDoc.ref.update({
      status: 'rejected',
      rejectionReason: rejectionReason || '',
      rejectedAt: new Date(),
      updatedAt: new Date(),
    });

    // Get participant email for notification
    const participantDoc = await firestore.collection('yep_participants').doc(meetingData.participantId).get();
    const participantData = participantDoc.exists ? participantDoc.data() : null;
    const participantEmail = participantData?.email || participantData?.authEmail || '';

    if (participantEmail) {
      const meetingDate = meetingData.proposedDate?.toDate?.() || new Date(meetingData.proposedDate);
      const dateStr = meetingDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      sendMeetingRejectedEmail({
        to: participantEmail,
        recipientName: meetingData.participantName,
        meetingTitle: meetingData.title,
        proposedDate: dateStr,
        proposedTime: meetingData.proposedTime,
        rejectionReason,
      }).catch((error) => {
        console.error('Error sending email notification:', error);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error rejecting meeting:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject meeting',
    };
  }
}

/**
 * Cancel a meeting
 */
export async function cancelMeeting(
  meetingId: string,
  userId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();
    const meetingDoc = await firestore.collection('yep_meetings').doc(meetingId).get();

    if (!meetingDoc.exists) {
      return {
        success: false,
        error: 'Meeting not found',
      };
    }

    const meetingData = meetingDoc.data()!;
    
    // Verify user is either participant or mentor
    if (meetingData.participantUserId !== userId && meetingData.mentorUserId !== userId) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    if (meetingData.status === 'cancelled') {
      return {
        success: false,
        error: 'Meeting is already cancelled',
      };
    }

    const cancelledByName = meetingData.participantUserId === userId
      ? meetingData.participantName
      : meetingData.mentorName;

    await meetingDoc.ref.update({
      status: 'cancelled',
      updatedAt: new Date(),
    });

    // Get recipient email for notification
    let recipientEmail = '';
    let recipientName = '';
    
    if (meetingData.participantUserId === userId) {
      // Participant cancelled - notify mentor
      const mentorDoc = await firestore.collection('yep_mentors').doc(meetingData.mentorId).get();
      const mentorData = mentorDoc.exists ? mentorDoc.data() : null;
      recipientEmail = mentorData?.email || mentorData?.authEmail || '';
      recipientName = meetingData.mentorName;
    } else {
      // Mentor cancelled - notify participant
      const participantDoc = await firestore.collection('yep_participants').doc(meetingData.participantId).get();
      const participantData = participantDoc.exists ? participantDoc.data() : null;
      recipientEmail = participantData?.email || participantData?.authEmail || '';
      recipientName = meetingData.participantName;
    }

    if (recipientEmail) {
      const meetingDate = meetingData.proposedDate?.toDate?.() || new Date(meetingData.proposedDate);
      const dateStr = meetingDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      sendMeetingCancelledEmail({
        to: recipientEmail,
        recipientName,
        cancelledByName,
        meetingTitle: meetingData.title,
        meetingDate: dateStr,
        meetingTime: meetingData.proposedTime,
      }).catch((error) => {
        console.error('Error sending email notification:', error);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error cancelling meeting:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel meeting',
    };
  }
}

/**
 * Get all meetings for a user
 */
export async function getUserMeetings(userId: string): Promise<{
  success: boolean;
  meetings?: YEPMeeting[];
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();

    // Get meetings where user is participant or mentor
    const participantMeetings = await firestore
      .collection('yep_meetings')
      .where('participantUserId', '==', userId)
      .orderBy('proposedDate', 'desc')
      .get();

    const mentorMeetings = await firestore
      .collection('yep_meetings')
      .where('mentorUserId', '==', userId)
      .orderBy('proposedDate', 'desc')
      .get();

    const allMeetings = [...participantMeetings.docs, ...mentorMeetings.docs]
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          proposedDate: data.proposedDate?.toDate?.() || new Date(data.proposedDate),
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
          approvedAt: data.approvedAt?.toDate?.() || undefined,
          rejectedAt: data.rejectedAt?.toDate?.() || undefined,
        } as YEPMeeting;
      })
      .sort((a, b) => b.proposedDate.getTime() - a.proposedDate.getTime());

    return {
      success: true,
      meetings: allMeetings,
    };
  } catch (error) {
    console.error('Error getting user meetings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get meetings',
    };
  }
}

/**
 * Get pending meeting requests for approval (for mentors)
 */
export async function getPendingMeetingRequests(mentorUserId: string): Promise<{
  success: boolean;
  meetings?: YEPMeeting[];
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();

    const pendingMeetings = await firestore
      .collection('yep_meetings')
      .where('mentorUserId', '==', mentorUserId)
      .where('status', '==', 'pending')
      .orderBy('proposedDate', 'asc')
      .get();

    const meetings = pendingMeetings.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        proposedDate: data.proposedDate?.toDate?.() || new Date(data.proposedDate),
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      } as YEPMeeting;
    });

    return {
      success: true,
      meetings,
    };
  } catch (error) {
    console.error('Error getting pending meeting requests:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get pending meetings',
    };
  }
}

/**
 * Get available contacts for meeting requests (reuses messaging contacts)
 */
export async function getMeetingContacts(
  userId: string,
  role: 'participant' | 'mentor',
  profileId: string
): Promise<{
  success: boolean;
  contacts?: Array<{
    id: string;
    userId?: string;
    name: string;
    email?: string;
    role: 'participant' | 'mentor';
  }>;
  error?: string;
}> {
  return getMessagingContacts(userId, role, profileId);
}

