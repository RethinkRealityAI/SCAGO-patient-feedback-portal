'use server';

import { getAdminFirestore } from '@/lib/firebase-admin';
import { enforceAdminInAction } from '@/lib/server-auth';

export interface AdminActivityItem {
  type: 'login' | 'meeting' | 'message' | 'form_submission';
  description: string;
  timestamp: Date;
  actor?: string;
}

export async function getAdminActivityFeed(limitCount = 100): Promise<{
  success: boolean;
  items?: AdminActivityItem[];
  error?: string;
}> {
  try {
    await enforceAdminInAction();
    const firestore = getAdminFirestore();

    const items: AdminActivityItem[] = [];

    // Messages
    try {
      const q = await firestore
        .collection('yep_messages')
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();
      q.docs.forEach((doc) => {
        const d = doc.data() as any;
        items.push({
          type: 'message',
          description: `Message from ${d.senderName} to ${d.recipientName}: ${d.subject}`,
          timestamp: d.createdAt?.toDate?.() || new Date(d.createdAt),
          actor: d.senderName,
        });
      });
    } catch {
      const q = await firestore.collection('yep_messages').get();
      q.docs
        .map((doc) => doc.data() as any)
        .forEach((d) => {
          items.push({
            type: 'message',
            description: `Message from ${d.senderName} to ${d.recipientName}: ${d.subject}`,
            timestamp: d.createdAt?.toDate?.() || new Date(d.createdAt || Date.now()),
            actor: d.senderName,
          });
        });
    }

    // Meetings
    try {
      const q = await firestore
        .collection('yep_meetings')
        .orderBy('updatedAt', 'desc')
        .limit(limitCount)
        .get();
      q.docs.forEach((doc) => {
        const d = doc.data() as any;
        const action = d.status === 'approved' ? 'approved' : d.status === 'rejected' ? 'rejected' : 'requested';
        items.push({
          type: 'meeting',
          description: `Meeting ${action}: ${d.title} (${d.participantName} ↔ ${d.mentorName})`,
          timestamp: d.updatedAt?.toDate?.() || new Date(d.updatedAt || d.createdAt || Date.now()),
          actor: d.requestedBy === 'participant' ? d.participantName : d.mentorName,
        });
      });
    } catch {
      const q = await firestore.collection('yep_meetings').get();
      q.docs.forEach((doc) => {
        const d = doc.data() as any;
        const action = d.status === 'approved' ? 'approved' : d.status === 'rejected' ? 'rejected' : 'requested';
        items.push({
          type: 'meeting',
          description: `Meeting ${action}: ${d.title} (${d.participantName} ↔ ${d.mentorName})`,
          timestamp: d.updatedAt?.toDate?.() || new Date(d.updatedAt || d.createdAt || Date.now()),
          actor: d.requestedBy === 'participant' ? d.participantName : d.mentorName,
        });
      });
    }

    // Logins (participants)
    try {
      const q = await firestore
        .collection('yep_participants')
        .where('lastLoginAt', '!=', null)
        .orderBy('lastLoginAt', 'desc')
        .limit(Math.floor(limitCount / 2))
        .get();
      q.docs.forEach((doc) => {
        const d = doc.data() as any;
        items.push({
          type: 'login',
          description: `Participant ${d.youthParticipant} signed in`,
          timestamp: d.lastLoginAt?.toDate?.() || new Date(d.lastLoginAt),
          actor: d.youthParticipant,
        });
      });
    } catch {
      const q = await firestore.collection('yep_participants').get();
      q.docs.forEach((doc) => {
        const d = doc.data() as any;
        if (d.lastLoginAt) {
          items.push({
            type: 'login',
            description: `Participant ${d.youthParticipant} signed in`,
            timestamp: d.lastLoginAt?.toDate?.() || new Date(d.lastLoginAt),
            actor: d.youthParticipant,
          });
        }
      });
    }

    // Logins (mentors)
    try {
      const q = await firestore
        .collection('yep_mentors')
        .where('lastLoginAt', '!=', null)
        .orderBy('lastLoginAt', 'desc')
        .limit(Math.floor(limitCount / 2))
        .get();
      q.docs.forEach((doc) => {
        const d = doc.data() as any;
        items.push({
          type: 'login',
          description: `Mentor ${d.name} signed in`,
          timestamp: d.lastLoginAt?.toDate?.() || new Date(d.lastLoginAt),
          actor: d.name,
        });
      });
    } catch {
      const q = await firestore.collection('yep_mentors').get();
      q.docs.forEach((doc) => {
        const d = doc.data() as any;
        if (d.lastLoginAt) {
          items.push({
            type: 'login',
            description: `Mentor ${d.name} signed in`,
            timestamp: d.lastLoginAt?.toDate?.() || new Date(d.lastLoginAt),
            actor: d.name,
          });
        }
      });
    }

    // Form submissions
    try {
      const q = await firestore
        .collection('yep-form-submissions')
        .orderBy('submittedAt', 'desc')
        .limit(limitCount)
        .get();
      q.docs.forEach((doc) => {
        const d = doc.data() as any;
        items.push({
          type: 'form_submission',
          description: `Form submitted: ${d.formTemplateId}`,
          timestamp: d.submittedAt?.toDate?.() || new Date(d.submittedAt || Date.now()),
          actor: d.submittedBy,
        });
      });
    } catch {
      const q = await firestore.collection('yep-form-submissions').get();
      q.docs.forEach((doc) => {
        const d = doc.data() as any;
        items.push({
          type: 'form_submission',
          description: `Form submitted: ${d.formTemplateId}`,
          timestamp: d.submittedAt?.toDate?.() || new Date(d.submittedAt || Date.now()),
          actor: d.submittedBy,
        });
      });
    }

    // Sort final items by timestamp desc and cap
    const sorted = items
      .filter((i) => !!i.timestamp)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limitCount);

    return { success: true, items: sorted };
  } catch (error) {
    console.error('Error building admin activity feed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load activity feed' };
  }
}



