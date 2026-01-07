'use server';

// Dynamic imports for server-only modules
import { z } from 'zod';
import { YEPMessage } from '@/lib/youth-empowerment';
import { sendMessageNotificationEmail } from '@/lib/email-templates';

const sendMessageSchema = z.object({
  senderId: z.string().min(1),
  senderRole: z.enum(['participant', 'mentor']),
  senderName: z.string().min(1),
  recipientId: z.string().min(1),
  recipientRole: z.enum(['participant', 'mentor']),
  recipientName: z.string().min(1),
  recipientEmail: z.union([z.string().email(), z.literal('')]),
  subject: z.string().min(1, 'Subject is required').max(200),
  content: z.string().min(1, 'Message content is required').max(5000),
});

/**
 * Send a message between participant and mentor
 */
export async function sendMessage(data: z.infer<typeof sendMessageSchema>): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const validated = sendMessageSchema.parse(data);
    const { getAdminFirestore } = await import('@/lib/firebase-admin');
    const firestore = getAdminFirestore();

    // Create message document
    const messageData = {
      senderId: validated.senderId,
      senderRole: validated.senderRole,
      senderName: validated.senderName,
      recipientId: validated.recipientId,
      recipientRole: validated.recipientRole,
      recipientName: validated.recipientName,
      subject: validated.subject,
      content: validated.content,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await firestore.collection('yep_messages').add(messageData);

    // Send email notification only if email is provided (don't await to avoid blocking)
    if (validated.recipientEmail && validated.recipientEmail.trim() !== '') {
      sendMessageNotificationEmail({
        to: validated.recipientEmail,
        recipientName: validated.recipientName,
        senderName: validated.senderName,
        subject: validated.subject,
        messagePreview: validated.content,
      }).catch((error) => {
        console.error('Error sending email notification:', error);
        // Don't fail the message send if email fails
      });
    }

    return {
      success: true,
      messageId: docRef.id,
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message',
    };
  }
}

/**
 * Get conversation between two users
 */
export async function getConversation(
  userId1: string,
  userId2: string
): Promise<{
  success: boolean;
  messages?: YEPMessage[];
  error?: string;
}> {
  try {
    const { getAdminFirestore } = await import('@/lib/firebase-admin');
    const firestore = getAdminFirestore();

    // Get messages where user1 is sender and user2 is recipient, or vice versa
    let messages1, messages2;
    try {
      messages1 = await firestore
        .collection('yep_messages')
        .where('senderId', '==', userId1)
        .where('recipientId', '==', userId2)
        .orderBy('createdAt', 'desc')
        .get();
    } catch {
      messages1 = await firestore
        .collection('yep_messages')
        .where('senderId', '==', userId1)
        .where('recipientId', '==', userId2)
        .get();
    }

    try {
      messages2 = await firestore
        .collection('yep_messages')
        .where('senderId', '==', userId2)
        .where('recipientId', '==', userId1)
        .orderBy('createdAt', 'desc')
        .get();
    } catch {
      messages2 = await firestore
        .collection('yep_messages')
        .where('senderId', '==', userId2)
        .where('recipientId', '==', userId1)
        .get();
    }

    const allMessages = [...messages1.docs, ...messages2.docs]
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
          readAt: data.readAt?.toDate?.() || undefined,
        } as YEPMessage;
      })
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return {
      success: true,
      messages: allMessages,
    };
  } catch (error) {
    console.error('Error getting conversation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get conversation',
    };
  }
}

/**
 * Get inbox (all conversations) for a user
 */
export async function getInbox(userId: string): Promise<{
  success: boolean;
  conversations?: Array<{
    otherUserId: string;
    otherUserName: string;
    otherUserRole: 'participant' | 'mentor';
    lastMessage?: YEPMessage;
    unreadCount: number;
  }>;
  error?: string;
}> {
  try {
    const { getAdminFirestore } = await import('@/lib/firebase-admin');
    const firestore = getAdminFirestore();

    // Get messages where user is sender or recipient
    let sentMessages;
    try {
      sentMessages = await firestore
        .collection('yep_messages')
        .where('senderId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
    } catch {
      sentMessages = await firestore
        .collection('yep_messages')
        .where('senderId', '==', userId)
        .get();
    }

    let receivedMessages;
    try {
      receivedMessages = await firestore
        .collection('yep_messages')
        .where('recipientId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
    } catch {
      receivedMessages = await firestore
        .collection('yep_messages')
        .where('recipientId', '==', userId)
        .get();
    }

    const conversationMap = new Map<string, {
      otherUserId: string;
      otherUserName: string;
      otherUserRole: 'participant' | 'mentor';
      lastMessage?: YEPMessage;
      unreadCount: number;
    }>();

    // Process sent messages
    sentMessages.docs.forEach((doc) => {
      const data = doc.data();
      const otherUserId = data.recipientId;

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          otherUserId,
          otherUserName: data.recipientName,
          otherUserRole: data.recipientRole,
          unreadCount: 0,
        });
      }

      const conversation = conversationMap.get(otherUserId)!;
      if (!conversation.lastMessage) {
        conversation.lastMessage = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
          readAt: data.readAt?.toDate?.() || undefined,
        } as YEPMessage;
      }
    });

    // Process received messages
    receivedMessages.docs.forEach((doc) => {
      const data = doc.data();
      const otherUserId = data.senderId;
      const message: YEPMessage = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
        readAt: data.readAt?.toDate?.() || undefined,
      } as YEPMessage;

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          otherUserId,
          otherUserName: data.senderName,
          otherUserRole: data.senderRole,
          unreadCount: 0, // Will be set correctly below
          lastMessage: message,
        });
      } else {
        const conversation = conversationMap.get(otherUserId)!;
        if (!conversation.lastMessage || message.createdAt > conversation.lastMessage.createdAt) {
          conversation.lastMessage = message;
        }
      }
    });

    // Count unread messages for each conversation (single source of truth)
    const unreadCounts = await firestore
      .collection('yep_messages')
      .where('recipientId', '==', userId)
      .where('read', '==', false)
      .get();

    const unreadMap = new Map<string, number>();
    unreadCounts.docs.forEach((doc) => {
      const data = doc.data();
      const senderId = data.senderId;
      unreadMap.set(senderId, (unreadMap.get(senderId) || 0) + 1);
    });

    // Update unread counts from the accurate count
    unreadMap.forEach((count, senderId) => {
      const conversation = conversationMap.get(senderId);
      if (conversation) {
        conversation.unreadCount = count;
      }
    });

    const conversations = Array.from(conversationMap.values()).sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime();
    });

    return {
      success: true,
      conversations,
    };
  } catch (error) {
    console.error('Error getting inbox:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get inbox',
    };
  }
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(
  messageId: string,
  userId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { getAdminFirestore } = await import('@/lib/firebase-admin');
    const firestore = getAdminFirestore();
    const messageDoc = await firestore.collection('yep_messages').doc(messageId).get();

    if (!messageDoc.exists) {
      return {
        success: false,
        error: 'Message not found',
      };
    }

    const messageData = messageDoc.data()!;
    if (messageData.recipientId !== userId) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    await messageDoc.ref.update({
      read: true,
      readAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking message as read:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark message as read',
    };
  }
}

/**
 * Get unread message count for a user
 */
export async function getUnreadCount(userId: string): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const { getAdminFirestore } = await import('@/lib/firebase-admin');
    const firestore = getAdminFirestore();
    const unreadMessages = await firestore
      .collection('yep_messages')
      .where('recipientId', '==', userId)
      .where('read', '==', false)
      .get();

    return {
      success: true,
      count: unreadMessages.size,
    };
  } catch (error) {
    console.error('Error getting unread count:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get unread count',
    };
  }
}

/**
 * Get available contacts for messaging (participant's mentor or mentor's participants)
 */
export async function getMessagingContacts(
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
  try {
    const { getAdminFirestore } = await import('@/lib/firebase-admin');
    const firestore = getAdminFirestore();
    const contacts: any[] = [];

    if (role === 'participant') {
      // Get participant's assigned mentor
      const participantDoc = await firestore.collection('yep_participants').doc(profileId).get();
      if (!participantDoc.exists) {
        return { success: false, error: 'Participant not found' };
      }

      const participantData = participantDoc.data() as any;
      const mentorId: string | undefined = participantData.assignedMentorId || participantData.mentorId;
      const mentorName: string | undefined = participantData.assignedMentor;

      if (mentorId) {
        const mentorDoc = await firestore.collection('yep_mentors').doc(mentorId).get();
        if (mentorDoc.exists) {
          const mentorData = mentorDoc.data() as any;
          contacts.push({
            id: mentorDoc.id,
            userId: mentorData.userId,
            name: mentorData.name,
            email: mentorData.email || mentorData.authEmail,
            role: 'mentor' as const,
          });
        }
      } else if (mentorName) {
        // Fallback by name (handles legacy data)
        const mentorQuery = await firestore
          .collection('yep_mentors')
          .where('name', '==', mentorName)
          .limit(1)
          .get();

        if (!mentorQuery.empty) {
          const mentorDoc = mentorQuery.docs[0];
          const mentorData = mentorDoc.data() as any;
          contacts.push({
            id: mentorDoc.id,
            userId: mentorData.userId,
            name: mentorData.name,
            email: mentorData.email || mentorData.authEmail,
            role: 'mentor' as const,
          });
        }
      }
    } else if (role === 'mentor') {
      // Get mentor's assigned participants
      const mentorDoc = await firestore.collection('yep_mentors').doc(profileId).get();
      if (!mentorDoc.exists) {
        return { success: false, error: 'Mentor not found' };
      }

      const mentorData = mentorDoc.data()!;
      const assignedStudents = mentorData.assignedStudents || [];

      for (const studentId of assignedStudents) {
        const studentDoc = await firestore.collection('yep_participants').doc(studentId).get();
        if (studentDoc.exists) {
          const studentData = studentDoc.data()!;
          contacts.push({
            id: studentDoc.id,
            userId: studentData.userId,
            name: studentData.youthParticipant,
            email: studentData.email || studentData.authEmail,
            role: 'participant' as const,
          });
        }
      }
    }

    return {
      success: true,
      contacts,
    };
  } catch (error) {
    console.error('Error getting messaging contacts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get contacts',
    };
  }
}

