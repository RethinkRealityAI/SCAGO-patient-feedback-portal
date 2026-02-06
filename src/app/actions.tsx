'use server';
import { createAI, getMutableAIState } from '@/lib/ai/rsc';
import { z } from 'zod';
import { ReactNode } from 'react';
import { nanoid } from 'nanoid';
import { BotMessage } from '@/components/bot-message';
import { collection, getDocs, addDoc, doc, getDoc, DocumentData } from 'firebase/firestore';
import { db as clientDb } from '@/lib/firebase';
import { unstable_noStore as noStore } from 'next/cache';
import { sendWebhook } from '@/lib/webhook-sender';
import type { SubmissionEmailConfig } from '@/lib/email-templates';

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
    return snapshot.docs.map((doc: DocumentData) => {
      const data = doc.data();
      // Extract field label mapping from sections for use in dashboard
      const fieldLabels: Record<string, string> = {};
      if (data.sections) {
        for (const section of data.sections) {
          for (const field of section.fields || []) {
            if (field.id && field.label) {
              fieldLabels[field.id] = field.label;
            }
            // Handle grouped fields
            if (field.type === 'group' && field.fields) {
              for (const subField of field.fields) {
                if (subField.id && subField.label) {
                  fieldLabels[subField.id] = subField.label;
                }
              }
            }
          }
        }
      }
      return {
        id: doc.id,
        title: data.title || 'Untitled Survey',
        description: data.description || 'No description.',
        fieldLabels,
      };
    });
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

    // Fetch survey for webhook and email notification config
    const surveyDoc = await getDoc(doc(clientDb, 'surveys', surveyId));
    const surveyData = surveyDoc.exists() ? surveyDoc.data() : null;

    // Send webhook notification (await on server to ensure it completes)
    try {
      if (surveyData) {
        console.log(`[submitFeedback] Triggering webhook for survey: ${surveyId}, enabled: ${surveyData.webhookEnabled}`);
        await sendWebhook({
          submissionId: docRef.id,
          surveyId,
          sessionId: finalSessionId,
          submittedAt: submissionData.submittedAt,
          fields: formData,
        }, {
          url: surveyData.webhookUrl,
          secret: surveyData.webhookSecret,
          enabled: surveyData.webhookEnabled,
        });
      } else {
        await sendWebhook({
          submissionId: docRef.id,
          surveyId,
          sessionId: finalSessionId,
          submittedAt: submissionData.submittedAt,
          fields: formData,
        });
      }
    } catch (error) {
      console.error('Webhook notification failed:', error);
    }

    // Send email notification if configured
    if (surveyData?.emailNotifications?.enabled) {
      try {
        const { sendSubmissionEmail } = await import('@/lib/email-templates');
        const { generateSubmissionPdf, extractFieldLabels } = await import('@/lib/pdf-generator');

        // Build field labels map from survey definition
        const fieldLabels = await extractFieldLabels(surveyData);

        // Generate PDF (don't let PDF failure block email)
        let pdfBuffer: Uint8Array | null = null;
        try {
          pdfBuffer = await generateSubmissionPdf({
            title: surveyData.title || 'Form Submission',
            surveyId,
            submittedAt: submissionData.submittedAt,
            data: formData,
            fieldLabels,
          });
        } catch (pdfError) {
          console.error('[submitFeedback] PDF generation failed, sending email without attachment:', pdfError);
        }

        // Send email
        const emailConfig = surveyData.emailNotifications as SubmissionEmailConfig;
        const emailResult = await sendSubmissionEmail({
          config: emailConfig,
          surveyTitle: surveyData.title || 'Form Submission',
          surveyId,
          submissionData: formData,
          pdfBuffer,
        });

        // Log the email notification result to Firestore for admin visibility
        try {
          await addDoc(
            collection(clientDb, 'surveys', surveyId, 'emailLogs'),
            {
              submissionId: docRef.id,
              recipients: emailConfig.recipients || [],
              subject: emailConfig.subject || `New Submission: ${surveyData.title}`,
              success: emailResult.success,
              error: emailResult.error || null,
              skipped: emailResult.skipped || false,
              sentAt: new Date(),
            }
          );
        } catch (logError) {
          console.error('[submitFeedback] Failed to log email result:', logError);
        }

        if (emailResult.success) {
          console.log(`[submitFeedback] Email notification sent for survey: ${surveyId}`);
        } else {
          console.error(`[submitFeedback] Email notification failed for survey: ${surveyId}:`, emailResult.error);
        }
      } catch (emailError) {
        console.error('[submitFeedback] Email notification error:', emailError);
        // Log the failure to Firestore
        try {
          await addDoc(
            collection(clientDb, 'surveys', surveyId, 'emailLogs'),
            {
              submissionId: docRef.id,
              recipients: (surveyData.emailNotifications as SubmissionEmailConfig).recipients || [],
              subject: (surveyData.emailNotifications as SubmissionEmailConfig).subject || `New Submission: ${surveyData.title}`,
              success: false,
              error: emailError instanceof Error ? emailError.message : 'Email notification failed',
              skipped: false,
              sentAt: new Date(),
            }
          );
        } catch (logError) {
          console.error('[submitFeedback] Failed to log email error:', logError);
        }
      }
    }

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
