import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

interface WebhookConfig {
  url: string;
  enabled: boolean;
  secret?: string;
}

interface SubmissionData {
  submissionId: string;
  surveyId: string;
  sessionId?: string;
  submittedAt: Date | string;
  fields: Record<string, any>;
}

/**
 * Send a webhook notification for a new survey submission
 */
export async function sendWebhook(
  submissionData: SubmissionData,
  customConfig?: { url?: string; secret?: string; enabled?: boolean }
): Promise<void> {
  try {
    let url = customConfig?.url;
    let secret = customConfig?.secret;
    let enabled = customConfig?.enabled;

    // If no custom config or custom config is not enabled, try global config
    if (!url || enabled === false) {
      // Get global webhook configuration
      const configDoc = await getDoc(doc(db, 'config', 'webhooks'));
      if (configDoc.exists()) {
        const globalConfig = configDoc.data() as WebhookConfig;

        // Only use global if not overridden by custom (or if custom is missing)
        if (!url) url = globalConfig.url;
        if (!secret) secret = globalConfig.secret;
        if (enabled === undefined) enabled = globalConfig.enabled;
      }
    }

    if (!enabled || !url) {
      // Webhook not enabled or no URL configured
      return;
    }

    // Prepare webhook payload
    const payload = {
      event: 'survey.submission.created',
      timestamp: new Date().toISOString(),
      data: {
        submissionId: submissionData.submissionId,
        surveyId: submissionData.surveyId,
        submittedAt: submissionData.submittedAt instanceof Date
          ? submissionData.submittedAt.toISOString()
          : submissionData.submittedAt,
        fields: submissionData.fields,
      },
    };

    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'User-Agent': 'SCAGO-Portal/1.0',
    };

    if (secret) {
      headers['X-Webhook-Secret'] = secret;
    }

    // Send webhook (fire and forget - don't block submission)
    fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    }).catch((error) => {
      console.error('Webhook delivery failed:', error);
    });
  } catch (error) {
    console.error('Error sending webhook:', error);
  }
}
