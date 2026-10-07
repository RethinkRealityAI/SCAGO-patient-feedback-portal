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
import { buildSurveySchema } from '@/lib/submission-metrics';

// Note: survey reads use the Web Firestore client. Submission writes use the
// Admin SDK (see submitFeedback) so the security rules can deny public writes.

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
      // Flatten the field definitions so the dashboard can interpret submissions
      // without knowing any survey's field ids up front. `fieldTypes` in
      // particular is what lets the dashboard find the rating/narrative answers
      // in surveys whose fields carry editor-generated ids.
      const { fieldTypes, fieldLabels, fieldOrder } = buildSurveySchema(data);
      return {
        id: doc.id,
        title: data.title || 'Untitled Survey',
        description: data.description || 'No description.',
        slug: typeof data.slug === 'string' && data.slug.length > 0 ? data.slug : undefined,
        reviewConfig: data.reviewConfig ?? null,
        fieldTypes,
        fieldLabels,
        fieldOrder,
      };
    });
  } catch (e) {
    console.error('Error listing surveys:', e);
    return [];
  }
}

/** Signals the form collects alongside the answers. Never stored as answers. */
export interface SubmissionMeta {
  /** Value of the off-screen honeypot input; only bots fill it. */
  honeypot?: string;
  /** Time from form load to submit. */
  elapsedMs?: number;
  /** Language the form was completed in, so replies can match it. */
  language?: 'en' | 'fr';
}

// Per connection, per form. Generous for real people (who submit once) while
// stopping a script from flooding a form's notification inbox.
const SUBMISSION_RATE_LIMIT = { maxRequests: 5, windowMs: 10 * 60 * 1000 };

async function getClientIp(): Promise<string> {
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    return (
      h.get('x-nf-client-connection-ip') ||
      h.get('x-forwarded-for')?.split(',')[0].trim() ||
      h.get('x-real-ip') ||
      'unknown'
    );
  } catch {
    return 'unknown';
  }
}

/**
 * Record an email outcome under surveys/{id}/emailLogs.
 *
 * Written with the Admin SDK: the client SDK write this replaced was refused by
 * the security rules (there is no emailLogs rule, so it is default-deny), so
 * no email had ever been logged for any form.
 */
async function logEmailResult(
  surveyId: string,
  entry: {
    type: 'staff-notification' | 'respondent-confirmation';
    submissionId: string;
    recipients: string[];
    subject: string;
    success: boolean;
    error?: string | null;
    skipped?: boolean;
  }
): Promise<void> {
  try {
    const { getAdminFirestore } = await import('@/lib/firebase-admin');
    await getAdminFirestore()
      .collection('surveys')
      .doc(surveyId)
      .collection('emailLogs')
      .add({ ...entry, error: entry.error || null, skipped: entry.skipped || false, sentAt: new Date() });
  } catch (logError) {
    console.error('[submitFeedback] Failed to log email result:', logError);
  }
}

/** Answers listed in the staff email body, per emailNotifications.summaryFieldIds. */
async function buildEmailSummary(
  fieldIds: string[] | undefined,
  formData: Record<string, any>,
  fieldLabels: Record<string, string>
): Promise<Array<{ label: string; value: string }>> {
  if (!fieldIds || fieldIds.length === 0) return [];
  const { formatAnswerValue } = await import('@/lib/question-mapping');
  const rows: Array<{ label: string; value: string }> = [];
  for (const id of fieldIds) {
    const raw = formData[id];
    if (raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0)) continue;
    const formatted = formatAnswerValue(raw);
    let value = Array.isArray(formatted) ? formatted.join(', ') : String(formatted);
    const otherText = formData[`${id}_otherValue`];
    if (typeof otherText === 'string' && otherText.trim()) value += ` (Other: ${otherText.trim()})`;
    rows.push({ label: fieldLabels[id] || id, value });
  }
  return rows;
}

export async function submitFeedback(
  surveyId: string,
  formData: Record<string, any>,
  sessionId?: string,
  meta?: SubmissionMeta
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

    const { checkRateLimit } = await import('@/lib/rate-limiter');
    const ip = await getClientIp();
    const rate = checkRateLimit(`submit:${surveyId}:${ip}`, SUBMISSION_RATE_LIMIT);
    if (!rate.allowed) {
      console.warn(`[submitFeedback] Rate limit hit for survey ${surveyId}`);
      return { error: 'Too many submissions from this connection. Please wait a few minutes and try again.' };
    }

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
      ...(meta?.language === 'fr' ? { submittedLanguage: 'fr' } : {}),
      ...(paymentVerification.verification.length > 0
        ? { paymentVerification: paymentVerification.verification }
        : {}),
    };

    // Submissions are written with the Admin SDK so the security rules can
    // refuse every direct public write; this action is the only way in, which
    // means the spam checks below cannot be bypassed by posting to Firestore.
    const { getAdminFirestore } = await import('@/lib/firebase-admin');
    const surveyRef = getAdminFirestore().collection('surveys').doc(surveyId);

    const { spamReasons } = await import('@/lib/spam-signals');
    const heldReasons = spamReasons(meta);
    if (heldReasons.length > 0) {
      // Likely automated. Held rather than discarded, so a false positive is
      // never lost, but kept out of the dashboard and nobody is emailed.
      await surveyRef.collection('heldSubmissions').add({ ...submissionData, heldReasons, heldAt: new Date() });
      console.warn(`[submitFeedback] Held submission for survey ${surveyId}: ${heldReasons.join(', ')}`);
      // Report success: telling a bot it was caught only helps it adapt.
      return { sessionId: finalSessionId };
    }

    const docRef = await surveyRef.collection('submissions').add(submissionData);

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
      const emailConfig = surveyData.emailNotifications as SubmissionEmailConfig;
      const subjectForLog = emailConfig.subject || `New Submission: ${surveyData.title}`;
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

          pdfBuffer = await generateSubmissionPdf({
            title,
            surveyId,
            submittedAt: submissionData.submittedAt,
            data: orderedData,
            fieldLabels,
          });

          if (!pdfBuffer) {
            console.warn('[submitFeedback] PDF generation returned null - check pdf-generator.ts for errors');
          }
        } catch (pdfError) {
          console.error('[submitFeedback] PDF generation failed with exception:', pdfError);
        }

        const emailResult = await sendSubmissionEmail({
          config: emailConfig,
          surveyTitle: surveyData.title || 'Form Submission',
          surveyId,
          submissionId: docRef.id,
          submissionData: formData,
          pdfBuffer,
          summary: await buildEmailSummary(emailConfig.summaryFieldIds, formData, fieldLabels),
        });

        await logEmailResult(surveyId, {
          type: 'staff-notification',
          submissionId: docRef.id,
          recipients: emailConfig.recipients || [],
          subject: subjectForLog,
          success: emailResult.success,
          error: emailResult.error,
          skipped: emailResult.skipped,
        });

        if (emailResult.success) {
          console.log(`[submitFeedback] Email notification sent for survey: ${surveyId}`);
        } else {
          console.error(`[submitFeedback] Email notification failed for survey: ${surveyId}:`, emailResult.error);
        }
      } catch (emailError) {
        console.error('[submitFeedback] Email notification error:', emailError);
        await logEmailResult(surveyId, {
          type: 'staff-notification',
          submissionId: docRef.id,
          recipients: emailConfig.recipients || [],
          subject: subjectForLog,
          success: false,
          error: emailError instanceof Error ? emailError.message : 'Email notification failed',
        });
      }
    }

    // Acknowledge the respondent, if this form is set up to.
    if (surveyData?.respondentConfirmation?.enabled) {
      const { sendRespondentConfirmationEmail } = await import('@/lib/email-templates');
      const confirmation = await sendRespondentConfirmationEmail({
        config: surveyData.respondentConfirmation,
        surveyTitle: surveyData.title || 'Form Submission',
        submissionData: formData,
        language: meta?.language === 'fr' ? 'fr' : 'en',
      });
      await logEmailResult(surveyId, {
        type: 'respondent-confirmation',
        submissionId: docRef.id,
        recipients: confirmation.recipient ? [confirmation.recipient] : [],
        subject: surveyData.respondentConfirmation.subject || `We received your submission – ${surveyData.title}`,
        success: confirmation.success,
        error: confirmation.error,
        skipped: confirmation.skipped,
      });
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
