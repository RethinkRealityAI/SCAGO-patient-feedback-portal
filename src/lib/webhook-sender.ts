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
  submittedAt: Date | string;
  fields: Record<string, any>;
}

/**
 * Send a webhook notification for a new survey submission
 */
export async function sendWebhook(submissionData: SubmissionData): Promise<void> {
  try {
    // Get webhook configuration
    const configDoc = await getDoc(doc(db, 'config', 'webhooks'));
    
    if (!configDoc.exists()) {
      // No webhook configured, skip
      return;
    }

    const config = configDoc.data() as WebhookConfig;
    
    if (!config.enabled || !config.url) {
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
      'User-Agent': 'SCAGO-Patient-Feedback-Portal/1.0',
    };

    if (config.secret) {
      headers['X-Webhook-Secret'] = config.secret;
    }

    // Send webhook (fire and forget - don't block submission)
    fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    }).catch((error) => {
      // Log error but don't throw - webhook failures shouldn't block submissions
      console.error('Webhook delivery failed:', error);
      
      // Optionally update webhook config with error (would need admin permissions)
      // For now, just log it
    });
  } catch (error) {
    // Log error but don't throw - webhook failures shouldn't block submissions
    console.error('Error sending webhook:', error);
  }
}
