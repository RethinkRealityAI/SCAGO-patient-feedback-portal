'use server';
import { createAI, getMutableAIState } from '@/lib/ai/rsc';
import { z } from 'zod';
import { ReactNode } from 'react';
import { nanoid } from 'nanoid';
import { BotMessage } from '@/components/bot-message';
import { collection, getDocs, addDoc, DocumentData } from 'firebase/firestore';
import { db as clientDb } from '@/lib/firebase';
import { unstable_noStore as noStore } from 'next/cache';

// Note: We intentionally use the Web Firestore client on the server for writes
// to respect Firestore security rules and avoid admin credential requirements
// in local/dev and serverless environments.

// Existing functions
export async function getSurveys() {
  noStore(); // Disable caching for this function
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
  formData: Record<string, any>,
  sessionId?: string
): Promise<{ error?: string; sessionId?: string }> {
  try {
    if (!surveyId) {
      return { error: 'Survey ID is missing.' };
    }
    
    // Generate session ID if not provided (server-side generation)
    const finalSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    const submissionData = {
      ...formData,
      surveyId,
      sessionId: finalSessionId,
      submittedAt: new Date(),
    };
    
    // Save to organized structure: surveys/{surveyId}/submissions/{submissionId}
    const docRef = await addDoc(
      collection(clientDb, 'surveys', surveyId, 'submissions'), 
      submissionData
    );
    
    // Send webhook notification (fire and forget)
    import('@/lib/webhook-sender').then(({ sendWebhook }) => {
      sendWebhook({
        submissionId: docRef.id,
        surveyId,
        sessionId: finalSessionId,
        submittedAt: submissionData.submittedAt,
        fields: formData,
      }).catch((error) => {
        // Log but don't fail submission if webhook fails
        console.error('Webhook notification failed:', error);
      });
    });
    
    return { sessionId: finalSessionId };
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

  try {
    await import('@/ai/genkit');
    const { rscChat } = await import('@/ai/flows/rsc-chat-flow');
    const response = await rscChat(content);

    aiState.done([
      ...aiState.get(),
      {
        role: 'assistant',
        content: response,
      },
    ]);

    return {
      id: nanoid(),
      role: 'assistant',
      display: <BotMessage>{response}</BotMessage>,
    };
  } catch (error) {
    const fallback = 'Sorry, I could not process that right now.';
    aiState.done([
      ...aiState.get(),
      {
        role: 'assistant',
        content: fallback,
      },
    ]);
    return {
      id: nanoid(),
      role: 'assistant',
      display: <BotMessage>{fallback}</BotMessage>,
    };
  }
}

export const AI = createAI<ServerMessage[], ClientMessage[]>({
  actions: {
    submitUserMessage,
  },
  initialUIState: [],
  initialAIState: [],
});
