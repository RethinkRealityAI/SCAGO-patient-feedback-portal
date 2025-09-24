'use server';

import '@/ai/genkit'; // Initialize Genkit configuration
import { analyzeFeedback as runAnalysisFlow } from '@/ai/flows/analyze-feedback-flow';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FeedbackSubmission } from './types';
import { unstable_noStore as noStore } from 'next/cache';

export async function analyzeFeedback() {
  try {
    const feedbackCol = collection(db, 'feedback');
    const feedbackSnapshot = await getDocs(feedbackCol);
    const feedbackList = feedbackSnapshot.docs.map(doc => doc.data() as FeedbackSubmission);

    if (feedbackList.length === 0) {
      return { summary: 'No feedback submissions yet. Start by sharing the survey link!' };
    }

    const feedbackText = feedbackList
      .map(f => `- Rating: ${f.rating}/10, Experience: ${f.hospitalInteraction}`)
      .join('\\n');

    const averageRating = feedbackList.reduce((acc, f) => acc + f.rating, 0) / feedbackList.length;

    const analysisInput = {
      location: 'Various Hospitals',
      rating: Math.round(averageRating),
      feedbackText: feedbackText,
    };

    const result = await runAnalysisFlow(analysisInput);
    return { summary: result };
  } catch (error) {
    console.error('Error analyzing feedback:', error);
    if (error instanceof Error) {
        return { error: error.message };
    }
    return { error: 'An unknown error occurred during analysis.' };
  }
}

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
        return { error: 'Could not fetch submissions due to a permission error. Please check your Firestore security rules.' };
    }
    return { error: 'An unexpected error occurred while fetching submissions.' };
  }
}
