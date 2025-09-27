'use server';
import { createAI, getMutableAIState, streamUI } from '@/lib/ai/rsc';
import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { ReactNode } from 'react';
import { nanoid } from 'nanoid';
import { BotMessage } from '@/components/bot-message';
import { collection, getDocs, addDoc, DocumentData } from 'firebase/firestore';
import { db as clientDb } from '@/lib/firebase';

// Note: We intentionally use the Web Firestore client on the server for writes
// to respect Firestore security rules and avoid admin credential requirements
// in local/dev and serverless environments.

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
    await addDoc(collection(clientDb, 'feedback'), submissionData);
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

  const ui = await streamUI({
    model: google('gemini-1.5-flash'),
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
