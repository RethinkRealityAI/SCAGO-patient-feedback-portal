'use server';

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createAI, getMutableAIState, streamUI } from '@/lib/ai/rsc';
import { z } from 'zod';
import { ai as virtualAssistant } from '../ai/genkit';
import { ReactNode } from 'react';
import { nanoid } from 'nanoid';
import { BotMessage } from '@/components/bot-message';
import { collection, getDocs, DocumentData } from 'firebase/firestore';
import { db as clientDb } from '@/lib/firebase';

// Helper function to initialize Firebase Admin SDK.
// It ensures that the SDK is initialized only once.
function initializeFirebaseAdmin(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0] as App;
  }
  return initializeApp();
}

// Initialize Firebase and Firestore.
const app = initializeFirebaseAdmin();
const db = getFirestore(app);

// Existing functions
export async function getSurveys() {
  try {
    const surveysCollection = collection(clientDb, 'surveys');
    const snapshot = await getDocs(surveysCollection);
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map((doc: DocumentData) => ({
      id: doc.id,
      title: doc.data().title || 'Untitled Survey',
      description: doc.data().description || 'No description.',
    }));
  } catch (e) {
    console.error('Error listing surveys:', e);
    return [];
  }
}

export async function submitFeedback(
  surveyId: string,
  formData: Record<string, any>
): Promise<{ error?: string }> {
  try {
    if (!surveyId) {
      return { error: 'Survey ID is missing.' };
    }
    const submissionData = {
      ...formData,
      surveyId,
      submittedAt: new Date(),
    };
    await db.collection('feedback').add(submissionData);
    return {};
  } catch (e) {
    console.error('Error submitting feedback:', e);
    return {
      error: 'An unexpected error occurred while submitting your feedback.',
    };
  }
}

// --- New AI-related functions ---

// Define the AI state and UI state types
export interface ServerMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClientMessage {
  id: string;
  role: 'user' | 'assistant';
  display: ReactNode;
}


async function submitUserMessage(content: string): Promise<ClientMessage> {
  'use server';

  const aiState = getMutableAIState<typeof AI>();
  aiState.update([
    ...aiState.get(),
    {
      role: 'user',
      content,
    },
  ]);

  const ui = streamUI({
    model: virtualAssistant,
    prompt: content,
    text: ({ content, done }: { content: string; done: boolean; }) => {
      if (done) {
        aiState.done([
          ...aiState.get(),
          {
            role: 'assistant',
            content,
          },
        ]);
      }
      return <BotMessage>{content}</BotMessage>;
    },
  });

  return {
    id: nanoid(),
    role: 'assistant',
    display: ui.value,
  };
}

export const AI = createAI<ServerMessage[], ClientMessage[]>({
  actions: {
    submitUserMessage,
  },
  initialUIState: [],
  initialAIState: [],
});
