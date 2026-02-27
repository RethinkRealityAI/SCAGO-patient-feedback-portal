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
import { verifyPayPalCapture } from '@/lib/paypal-verification';
import { MEMBERSHIP_PLAN_BY_ID } from '@/lib/membership-plans';

// Note: We intentionally use the Web Firestore client on the server for writes
// to respect Firestore security rules and avoid admin credential requirements
// in local/dev and serverless environments.

type SurveyFieldLite = {
  id: string;
  type: string;
  label?: string;
  validation?: {
    required?: boolean;
  };
  fields?: SurveyFieldLite[];
};

function flattenSurveyFields(surveyData: any): SurveyFieldLite[] {
  const out: SurveyFieldLite[] = [];
  const visit = (field: SurveyFieldLite) => {
    if (!field?.id || !field?.type) return;
    if (field.type === 'group' && Array.isArray(field.fields)) {
      field.fields.forEach(visit);
      return;
    }
    out.push(field);
  };

  const sections = Array.isArray(surveyData?.sections) ? surveyData.sections : [];
  for (const section of sections) {
    const fields = Array.isArray(section?.fields) ? section.fields : [];
    fields.forEach(visit);
  }
  return out;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function approximatelyEqualAmount(a: number, b: number): boolean {
  return Math.abs(a - b) <= 0.01;
}

async function verifyPayPalPaymentsForSubmission(
  surveyData: any,
  formData: Record<string, any>,
): Promise<{ ok: true; verification: Array<Record<string, any>> } | { ok: false; error: string }> {
  const paypalFields = flattenSurveyFields(surveyData).filter(
    (field) => field.type === 'paypal-membership' || field.type === 'paypal-payment',
  );

  if (paypalFields.length === 0) {
    return { ok: true, verification: [] };
  }

  const verification: Array<Record<string, any>> = [];

  for (const field of paypalFields) {
    const fieldValue = formData[field.id];
    const isRequired = !!field.validation?.required;
    const fieldName = field.label || field.id;

    if (!fieldValue) {
      if (isRequired) {
        return { ok: false, error: `Missing required payment for "${fieldName}".` };
      }
      continue;
    }

    if (typeof fieldValue !== 'object' || fieldValue.status !== 'paid') {
      return { ok: false, error: `Invalid payment payload for "${fieldName}".` };
    }

    const captureId = typeof fieldValue.transactionId === 'string' ? fieldValue.transactionId.trim() : '';
    if (!captureId) {
      return { ok: false, error: `Missing PayPal capture ID for "${fieldName}".` };
    }

    const currency =
      typeof fieldValue.currency === 'string' && fieldValue.currency.trim()
        ? fieldValue.currency.trim().toUpperCase()
        : 'CAD';

    const submittedAmount = Number(fieldValue.amount ?? fieldValue.total);
    const expectedAmount = Number.isFinite(submittedAmount) ? submittedAmount : undefined;
    if (!isFiniteNumber(expectedAmount)) {
      return { ok: false, error: `Missing payment amount for "${fieldName}".` };
    }

    if (field.type === 'paypal-membership' && typeof fieldValue.planId === 'string') {
      const plan = MEMBERSHIP_PLAN_BY_ID[fieldValue.planId];
      if (!plan) {
        return { ok: false, error: `Unknown membership plan "${fieldValue.planId}" for "${fieldName}".` };
      }

      if (!approximatelyEqualAmount(plan.amount, expectedAmount)) {
        return {
          ok: false,
          error: `Membership amount mismatch for "${fieldName}". Expected ${plan.amount.toFixed(2)} ${plan.currency}.`,
        };
      }
    }

    const captureCheck = await verifyPayPalCapture({
      captureId,
      expectedAmount,
      expectedCurrency: currency,
    });

    if (!captureCheck.ok) {
      return {
        ok: false,
        error: `PayPal verification failed for "${fieldName}": ${captureCheck.error}`,
      };
    }

    verification.push({
      fieldId: field.id,
      captureId,
      status: captureCheck.capture.status,
      amount:
        captureCheck.capture.amount?.value ||
        captureCheck.capture.seller_receivable_breakdown?.gross_amount?.value ||
        null,
      currency:
        captureCheck.capture.amount?.currency_code ||
        captureCheck.capture.seller_receivable_breakdown?.gross_amount?.currency_code ||
        null,
      verifiedAt: new Date().toISOString(),
    });
  }

  return { ok: true, verification };
}

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
      // Extract field label mapping and order from sections for use in dashboard
      const fieldLabels: Record<string, string> = {};
      const fieldOrder: string[] = [];
      if (data.sections) {
        for (const section of data.sections) {
          for (const field of section.fields || []) {
            if (field.id) {
              fieldOrder.push(field.id);
              if (field.label) {
                fieldLabels[field.id] = field.label;
              }
            }
            // Handle grouped fields
            if (field.type === 'group' && field.fields) {
              for (const subField of field.fields) {
                if (subField.id) {
                  fieldOrder.push(subField.id);
                  if (subField.label) {
                    fieldLabels[subField.id] = subField.label;
                  }
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
        fieldOrder,
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

    // Fetch survey first so we can validate payment fields against survey definition
    const surveyDoc = await getDoc(doc(clientDb, 'surveys', surveyId));
    if (!surveyDoc.exists()) {
      return { error: 'Survey not found.' };
    }
    const surveyData = surveyDoc.data();

    // For PayPal fields, verify capture details server-side before persisting submission.
    const paymentVerification = await verifyPayPalPaymentsForSubmission(surveyData, formData);
    if (!paymentVerification.ok) {
      return { error: paymentVerification.error };
    }

    const submissionData = {
      ...formData,
      surveyId,
      sessionId: finalSessionId,
      submittedAt: new Date(),
      ...(paymentVerification.verification.length > 0
        ? { paymentVerification: paymentVerification.verification }
        : {}),
    };

    // Save to organized structure: surveys/{surveyId}/submissions/{submissionId}
    const docRef = await addDoc(
      collection(clientDb, 'surveys', surveyId, 'submissions'),
      submissionData
    );

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
        const { generateSubmissionPdf, extractFieldLabels, extractFieldOrder } = await import('@/lib/pdf-generator');
        const { extractName } = await import('@/lib/submission-utils');

        // Build field labels and order from survey definition
        const fieldLabels = await extractFieldLabels(surveyData);
        const fieldOrder = await extractFieldOrder(surveyData);

        // Reorder form data to match survey field order
        const orderedData: Record<string, any> = {};
        for (const key of fieldOrder) {
          if (formData[key] !== undefined) {
            orderedData[key] = formData[key];
          }
        }
        // Add any fields not in the order to the end
        for (const [key, value] of Object.entries(formData)) {
          if (!fieldOrder.includes(key) && !orderedData.hasOwnProperty(key)) {
            orderedData[key] = value;
          }
        }

        // Generate PDF (don't let PDF failure block email)
        let pdfBuffer: Uint8Array | null = null;
        try {
          // Create a descriptive PDF title
          const submitterName = extractName(formData);
          const title = surveyData.title
            ? `${surveyData.title}${submitterName ? ` - ${submitterName}` : ''}`
            : `Form Submission${submitterName ? ` - ${submitterName}` : ''}`;

          console.log(`[submitFeedback] Generating PDF with title: "${title}"`);
          console.log(`[submitFeedback] orderedData keys: ${Object.keys(orderedData).length}`);

          pdfBuffer = await generateSubmissionPdf({
            title,
            surveyId,
            submittedAt: submissionData.submittedAt,
            data: orderedData,
            fieldLabels,
          });

          if (pdfBuffer) {
            console.log(`[submitFeedback] PDF generated successfully: ${pdfBuffer.length} bytes`);
          } else {
            console.warn('[submitFeedback] PDF generation returned null - check pdf-generator.ts for errors');
          }
        } catch (pdfError) {
          console.error('[submitFeedback] PDF generation failed with exception:', pdfError);
        }

        // Send email with submission ID for direct view link
        const emailConfig = surveyData.emailNotifications as SubmissionEmailConfig;
        const emailResult = await sendSubmissionEmail({
          config: emailConfig,
          surveyTitle: surveyData.title || 'Form Submission',
          surveyId,
          submissionId: docRef.id,
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
