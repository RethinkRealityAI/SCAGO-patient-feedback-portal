'use server'

import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import { db } from '@/lib/firebase';
import type { FeedbackSubmission } from './types';

export async function getSubmissions(): Promise<FeedbackSubmission[] | { error: string }> {
  noStore();
  try {
    const feedbackCol = collection(db, 'feedback');
    const q = query(feedbackCol, orderBy('submittedAt', 'desc'));
    const feedbackSnapshot = await getDocs(q);
    const feedbackList = feedbackSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        rating: Number(data.rating),
        submittedAt: data.submittedAt.toDate(),
      } as FeedbackSubmission;
    });
    return feedbackList;
  } catch (e) {
    console.error("Error fetching submissions:", e);
    if (e instanceof Error && e.message.includes('permission-denied')) {
        return { error: 'Could not fetch submissions due to a permission error. Please check Firestore security rules for the feedback collection.' };
    }
    return { error: 'An unexpected error occurred while fetching submissions.' };
  }
}
