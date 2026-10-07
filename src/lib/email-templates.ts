'use server';

import nodemailer from 'nodemailer';
import { formTextFr } from '@/lib/form-text-fr';
import {
  buildPdfFilename,
  confirmationLabels,
  formatSubmissionDate,
  generateCaseDigestTemplate,
  generateConfirmationEmailTemplate,
  generateSubmissionEmailTemplate,
  getPortalUrl,
  type ConfirmationEmailContent,
  type DigestCase,
} from '@/lib/submission-email-template';

/**
 * Get configured email transporter
 */
function getTransporter() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  const smtpHost = process.env.SMTP_HOST || 'smtp.ionos.com';
  const smtpPort = Number(process.env.SMTP_PORT || 587);

  console.log(`[getTransporter] SMTP_USER defined: ${!!smtpUser}, SMTP_PASSWORD defined: ${!!smtpPass}, host: ${smtpHost}, port: ${smtpPort}`);

  if (!smtpUser || !smtpPass) {
    throw new Error(
      `SMTP credentials are not configured. SMTP_USER=${smtpUser ? 'set' : 'MISSING'}, SMTP_PASSWORD=${smtpPass ? 'set' : 'MISSING'}. ` +
      `Add SMTP_USER and SMTP_PASSWORD in Netlify Environment Variables.`
    );
  }
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

/**
 * Generate email HTML template with SCAGO branding
 */
function generateEmailTemplate(data: {
  title: string;
  greeting: string;
  content: string;
  buttonText?: string;
  buttonLink?: string;
  footerNote?: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${data.title}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0070f3; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px 20px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background-color: #0070f3; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .button:hover { background-color: #0051cc; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎓 SCAGO YEP</h1>
        <p>Youth Empowerment Program</p>
      </div>
      
      <div class="content">
        <p>${data.greeting},</p>
        
        ${data.content}
        
        ${data.buttonText && data.buttonLink ? `
          <div style="text-align: center;">
            <a href="${data.buttonLink}" class="button">${data.buttonText}</a>
          </div>
        ` : ''}
        
        ${data.footerNote ? `<p style="font-size: 14px; color: #666; margin-top: 20px;">${data.footerNote}</p>` : ''}
      </div>
      
      <div class="footer">
        <p>This email was sent by SCAGO Youth Empowerment Program</p>
        <p>Access your profile portal at <a href="${appUrl}/profile">${appUrl}/profile</a></p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send message notification email
 */
export async function sendMessageNotificationEmail(data: {
  to: string;
  recipientName: string;
  senderName: string;
  subject: string;
  messagePreview: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
    const profileLink = `${appUrl}/profile?tab=messages`;

    const htmlContent = generateEmailTemplate({
      title: 'New Message - SCAGO YEP',
      greeting: `Hello ${data.recipientName}`,
      content: `
        <p>You've received a new message from <strong>${data.senderName}</strong>:</p>
        
        <div style="background-color: #fff; padding: 15px; border-left: 4px solid #0070f3; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #0070f3;">${data.subject}</p>
          <p style="margin: 10px 0 0 0; color: #666;">${data.messagePreview.substring(0, 200)}${data.messagePreview.length > 200 ? '...' : ''}</p>
        </div>
        
        <p>Click the button below to view and reply to this message in your profile portal.</p>
      `,
      buttonText: 'View Message',
      buttonLink: profileLink,
      footerNote: 'You can reply to this message directly from your profile portal.',
    });

    const textContent = `
New Message - SCAGO YEP

Hello ${data.recipientName},

You've received a new message from ${data.senderName}:

Subject: ${data.subject}
${data.messagePreview.substring(0, 200)}${data.messagePreview.length > 200 ? '...' : ''}

View and reply to this message at: ${profileLink}

---
This email was sent by SCAGO Youth Empowerment Program
    `;

    await transporter.sendMail({
      from: `"SCAGO Youth Empowerment Program" <${process.env.SMTP_USER}>`,
      to: data.to,
      subject: `New Message from ${data.senderName} - SCAGO YEP`,
      text: textContent,
      html: htmlContent,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending message notification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Send meeting request notification email
 */
export async function sendMeetingRequestEmail(data: {
  to: string;
  recipientName: string;
  requesterName: string;
  meetingTitle: string;
  proposedDate: string;
  proposedTime: string;
  isMentor: boolean; // true if recipient is mentor (needs to approve)
}): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
    const profileLink = `${appUrl}/profile?tab=meetings`;

    const htmlContent = generateEmailTemplate({
      title: 'Meeting Request - SCAGO YEP',
      greeting: `Hello ${data.recipientName}`,
      content: `
        <p><strong>${data.requesterName}</strong> has requested a meeting with you:</p>
        
        <div style="background-color: #fff; padding: 20px; border-left: 4px solid #0070f3; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #0070f3; font-size: 18px;">${data.meetingTitle}</p>
          <p style="margin: 10px 0 0 0;">
            <strong>Date:</strong> ${data.proposedDate}<br>
            <strong>Time:</strong> ${data.proposedTime}
          </p>
        </div>
        
        ${data.isMentor ? `
          <p>Please review and approve or reject this meeting request in your profile portal.</p>
        ` : `
          <p>Your mentor will review this request and notify you once it's been approved or rejected.</p>
        `}
      `,
      buttonText: data.isMentor ? 'Review Meeting Request' : 'View Meeting Details',
      buttonLink: profileLink,
      footerNote: data.isMentor ? 'You can approve or reject this meeting request from your profile portal.' : 'You will be notified once your mentor responds to this request.',
    });

    const textContent = `
Meeting Request - SCAGO YEP

Hello ${data.recipientName},

${data.requesterName} has requested a meeting with you:

Title: ${data.meetingTitle}
Date: ${data.proposedDate}
Time: ${data.proposedTime}

${data.isMentor ? 'Please review and approve or reject this meeting request in your profile portal.' : 'Your mentor will review this request and notify you once it\'s been approved or rejected.'}

View meeting details at: ${profileLink}

---
This email was sent by SCAGO Youth Empowerment Program
    `;

    await transporter.sendMail({
      from: `"SCAGO Youth Empowerment Program" <${process.env.SMTP_USER}>`,
      to: data.to,
      subject: `Meeting Request from ${data.requesterName} - SCAGO YEP`,
      text: textContent,
      html: htmlContent,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending meeting request email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Send meeting approved notification email
 */
export async function sendMeetingApprovedEmail(data: {
  to: string;
  recipientName: string;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  meetingLink?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
    const profileLink = `${appUrl}/profile?tab=meetings`;

    const htmlContent = generateEmailTemplate({
      title: 'Meeting Approved - SCAGO YEP',
      greeting: `Hello ${data.recipientName}`,
      content: `
        <p>Great news! Your meeting request has been <strong style="color: #22c55e;">approved</strong>:</p>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-left: 4px solid #22c55e; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #15803d; font-size: 18px;">${data.meetingTitle}</p>
          <p style="margin: 10px 0 0 0;">
            <strong>Date:</strong> ${data.meetingDate}<br>
            <strong>Time:</strong> ${data.meetingTime}
            ${data.meetingLink ? `<br><strong>Meeting Link:</strong> <a href="${data.meetingLink}">${data.meetingLink}</a>` : ''}
          </p>
        </div>
        
        <p>You can add this meeting to your calendar from your profile portal.</p>
      `,
      buttonText: 'View Meeting Details',
      buttonLink: profileLink,
      footerNote: 'You can add this meeting to your calendar and view all meeting details from your profile portal.',
    });

    const textContent = `
Meeting Approved - SCAGO YEP

Hello ${data.recipientName},

Great news! Your meeting request has been approved:

Title: ${data.meetingTitle}
Date: ${data.meetingDate}
Time: ${data.meetingTime}
${data.meetingLink ? `Meeting Link: ${data.meetingLink}` : ''}

You can add this meeting to your calendar from your profile portal.

View meeting details at: ${profileLink}

---
This email was sent by SCAGO Youth Empowerment Program
    `;

    await transporter.sendMail({
      from: `"SCAGO Youth Empowerment Program" <${process.env.SMTP_USER}>`,
      to: data.to,
      subject: `Meeting Approved: ${data.meetingTitle} - SCAGO YEP`,
      text: textContent,
      html: htmlContent,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending meeting approved email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Send meeting rejected notification email
 */
export async function sendMeetingRejectedEmail(data: {
  to: string;
  recipientName: string;
  meetingTitle: string;
  proposedDate: string;
  proposedTime: string;
  rejectionReason?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
    const profileLink = `${appUrl}/profile?tab=meetings`;

    const htmlContent = generateEmailTemplate({
      title: 'Meeting Request - SCAGO YEP',
      greeting: `Hello ${data.recipientName}`,
      content: `
        <p>Your meeting request has been <strong style="color: #ef4444;">rejected</strong>:</p>
        
        <div style="background-color: #fef2f2; padding: 20px; border-left: 4px solid #ef4444; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #991b1b; font-size: 18px;">${data.meetingTitle}</p>
          <p style="margin: 10px 0 0 0;">
            <strong>Date:</strong> ${data.proposedDate}<br>
            <strong>Time:</strong> ${data.proposedTime}
          </p>
          ${data.rejectionReason ? `
            <p style="margin: 10px 0 0 0; padding-top: 10px; border-top: 1px solid #fecaca;">
              <strong>Reason:</strong> ${data.rejectionReason}
            </p>
          ` : ''}
        </div>
        
        <p>You can request a new meeting from your profile portal.</p>
      `,
      buttonText: 'View Meeting Details',
      buttonLink: profileLink,
      footerNote: 'You can request a new meeting at a different time from your profile portal.',
    });

    const textContent = `
Meeting Request Rejected - SCAGO YEP

Hello ${data.recipientName},

Your meeting request has been rejected:

Title: ${data.meetingTitle}
Date: ${data.proposedDate}
Time: ${data.proposedTime}
${data.rejectionReason ? `Reason: ${data.rejectionReason}` : ''}

You can request a new meeting from your profile portal.

View meeting details at: ${profileLink}

---
This email was sent by SCAGO Youth Empowerment Program
    `;

    await transporter.sendMail({
      from: `"SCAGO Youth Empowerment Program" <${process.env.SMTP_USER}>`,
      to: data.to,
      subject: `Meeting Request Rejected: ${data.meetingTitle} - SCAGO YEP`,
      text: textContent,
      html: htmlContent,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending meeting rejected email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Send meeting cancelled notification email
 */
export async function sendMeetingCancelledEmail(data: {
  to: string;
  recipientName: string;
  cancelledByName: string;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
    const profileLink = `${appUrl}/profile?tab=meetings`;

    const htmlContent = generateEmailTemplate({
      title: 'Meeting Cancelled - SCAGO YEP',
      greeting: `Hello ${data.recipientName}`,
      content: `
        <p>The following meeting has been <strong style="color: #f59e0b;">cancelled</strong>:</p>
        
        <div style="background-color: #fffbeb; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #92400e; font-size: 18px;">${data.meetingTitle}</p>
          <p style="margin: 10px 0 0 0;">
            <strong>Date:</strong> ${data.meetingDate}<br>
            <strong>Time:</strong> ${data.meetingTime}<br>
            <strong>Cancelled by:</strong> ${data.cancelledByName}
          </p>
        </div>
        
        <p>You can request a new meeting from your profile portal.</p>
      `,
      buttonText: 'View Meetings',
      buttonLink: profileLink,
      footerNote: 'You can request a new meeting at a different time from your profile portal.',
    });

    const textContent = `
Meeting Cancelled - SCAGO YEP

Hello ${data.recipientName},

The following meeting has been cancelled:

Title: ${data.meetingTitle}
Date: ${data.meetingDate}
Time: ${data.meetingTime}
Cancelled by: ${data.cancelledByName}

You can request a new meeting from your profile portal.

View meetings at: ${profileLink}

---
This email was sent by SCAGO Youth Empowerment Program
    `;

    await transporter.sendMail({
      from: `"SCAGO Youth Empowerment Program" <${process.env.SMTP_USER || 'tech@sicklecellanemia.ca'}>`,
      to: data.to,
      subject: `Meeting Cancelled: ${data.meetingTitle} - SCAGO YEP`,
      text: textContent,
      html: htmlContent,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending meeting cancelled email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Email notification configuration for a survey
 */
export interface SubmissionEmailConfig {
  enabled: boolean;
  recipients: string[]; // Array of email addresses
  subject?: string; // Optional custom subject, supports {{surveyTitle}} {{submissionDate}} placeholders
  bodyTemplate?: string; // Optional custom body text
  attachPdf?: boolean; // Whether to attach the PDF (default: true)
  senderName?: string; // Custom sender name
  /** Field ids whose answers are listed in the email body (opt-in: puts personal info in the message). */
  summaryFieldIds?: string[];
}

/**
 * Replace template placeholders in subject or body
 */
function replacePlaceholders(template: string, data: { surveyTitle: string; submissionDate: string }): string {
  return template
    .replace(/\{\{surveyTitle\}\}/g, data.surveyTitle)
    .replace(/\{\{submissionDate\}\}/g, data.submissionDate);
}

/**
 * Send submission notification email with optional PDF attachment
 */
export async function sendSubmissionEmail(data: {
  config: SubmissionEmailConfig;
  surveyTitle: string;
  surveyId: string;
  submissionId?: string;
  submissionData: Record<string, any>;
  pdfBuffer?: Uint8Array | null;
  /** Pre-formatted key answers for the email body; see SubmissionEmailConfig.summaryFieldIds. */
  summary?: Array<{ label: string; value: string }>;
}): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  // Validate configuration
  if (!data.config.enabled) {
    return { success: false, skipped: true, error: 'Email notifications are not enabled for this survey.' };
  }

  if (!data.config.recipients || data.config.recipients.length === 0) {
    return { success: false, error: 'No recipient email addresses configured.' };
  }

  // Validate SMTP credentials are available
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    const errMsg = `Email service is not configured. SMTP_USER=${process.env.SMTP_USER ? 'set' : 'MISSING'}, SMTP_PASSWORD=${process.env.SMTP_PASSWORD ? 'set' : 'MISSING'}. Add them in Netlify Environment Variables and redeploy.`;
    console.error(`[sendSubmissionEmail] ${errMsg}`);
    return { success: false, error: errMsg };
  }

  try {
    const transporter = getTransporter();
    const submissionDate = formatSubmissionDate(new Date());

    // Extract submitter name for display
    const { extractName } = await import('@/lib/submission-utils');
    const submitterName = extractName(data.submissionData);
    console.log(`[sendSubmissionEmail] Submitter name: ${submitterName || 'Anonymous'}`);

    // The form's own dashboard. A `?submission=` deep link was used before,
    // but nothing reads that parameter, so it just opened the generic page.
    const dashboardLink = `${getPortalUrl()}/dashboard/${encodeURIComponent(data.surveyId)}`;

    // Prepare subject - include submitter name if available
    const defaultSubject = submitterName
      ? `New Submission: {{surveyTitle}} from ${submitterName}`
      : `New Submission: {{surveyTitle}} - {{submissionDate}}`;
    const subject = replacePlaceholders(
      data.config.subject || defaultSubject,
      { surveyTitle: data.surveyTitle, submissionDate }
    );

    // Prepare body
    const bodyText = data.config.bodyTemplate
      ? replacePlaceholders(data.config.bodyTemplate, { surveyTitle: data.surveyTitle, submissionDate })
      : undefined;

    // Generate HTML with submitter name and dashboard link. The attachment is
    // named once here so the email shows the file that is actually attached
    // (it used to always say "Submission_Details.pdf").
    const hasPdfAttachment = data.pdfBuffer && data.config.attachPdf !== false;
    const pdfFilename = buildPdfFilename(data.surveyTitle, submitterName || undefined);

    const htmlContent = generateSubmissionEmailTemplate({
      surveyTitle: data.surveyTitle,
      submissionDate,
      submitterName: submitterName || undefined,
      dashboardLink,
      bodyText,
      attachmentName: hasPdfAttachment ? pdfFilename : undefined,
      summary: data.summary,
    });

    // Plain text version
    const textContent = [
      'New submission received',
      data.surveyTitle,
      '',
      ...(submitterName ? [`Submitted by: ${submitterName}`] : []),
      `Form: ${data.surveyTitle}`,
      `Received: ${submissionDate}`,
      '',
      bodyText || 'A new response has been submitted. The complete set of answers is attached as a PDF.',
      ...(data.summary && data.summary.length > 0 ? ['', 'Key details:', ...data.summary.map(r => `  ${r.label}: ${r.value}`)] : []),
      ...(hasPdfAttachment ? ['', `Attachment: ${pdfFilename}`] : []),
      '',
      `View submissions: ${dashboardLink}`,
      '',
      '---',
      'This email may contain personal information submitted to the Sickle Cell Awareness Group of Ontario. Please handle it confidentially and do not forward it.',
    ].join('\n');

    // Build email options
    const mailOptions: any = {
      from: `"${data.config.senderName || 'SCAGO Portal'}" <${process.env.SMTP_USER}>`,
      to: data.config.recipients.join(', '),
      subject,
      text: textContent,
      html: htmlContent,
    };

    // Add PDF attachment if available and enabled
    if (hasPdfAttachment) {
      console.log(`[sendSubmissionEmail] Attaching PDF: ${pdfFilename} (${data.pdfBuffer!.length} bytes)`);

      mailOptions.attachments = [
        {
          filename: pdfFilename,
          content: Buffer.from(data.pdfBuffer!),
          contentType: 'application/pdf',
        },
      ];
    } else {
      console.log(`[sendSubmissionEmail] No PDF attachment - pdfBuffer: ${!!data.pdfBuffer}, attachPdf config: ${data.config.attachPdf}`);
    }

    console.log(`[sendSubmissionEmail] Sending email to: ${data.config.recipients.join(', ')} for survey: ${data.surveyId}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[sendSubmissionEmail] Email sent successfully. MessageId: ${info.messageId}`);

    return { success: true };
  } catch (error) {
    console.error('[sendSubmissionEmail] Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send notification email',
    };
  }
}

/**
 * Settings for the acknowledgement emailed to whoever submitted a form.
 * Stored on the survey document as `respondentConfirmation`.
 */
export interface RespondentConfirmationConfig {
  enabled: boolean;
  /** Id of the form field holding the respondent's email address. */
  emailFieldId: string;
  /** Id of the field holding their first name, for the greeting. */
  firstNameFieldId?: string;
  subject?: string;
  heading?: string;
  message?: string;
  nextSteps?: string[];
  urgentNotice?: string;
  /** Shown as the contact address and used as Reply-To. */
  replyTo?: string;
  senderName?: string;
  /** Wording for respondents who completed the form in French. */
  translations?: {
    fr?: Partial<Pick<RespondentConfirmationConfig, 'subject' | 'heading' | 'message' | 'nextSteps' | 'urgentNotice' | 'senderName'>>;
  };
}

/**
 * Email the respondent an acknowledgement of their submission.
 * Never throws: a failed acknowledgement must not fail the submission itself.
 */
export async function sendRespondentConfirmationEmail(data: {
  config: RespondentConfirmationConfig;
  surveyTitle: string;
  submissionData: Record<string, any>;
  /** Language the respondent used; French uses `config.translations.fr` where provided. */
  language?: 'en' | 'fr';
}): Promise<{ success: boolean; error?: string; skipped?: boolean; recipient?: string }> {
  if (!data.config?.enabled) return { success: false, skipped: true, error: 'Respondent confirmation is not enabled.' };
  const language = data.language === 'fr' ? 'fr' : 'en';
  // Overlay the French wording, field by field, so an untranslated field falls back to English.
  const config: RespondentConfirmationConfig =
    language === 'fr' ? { ...data.config, ...(data.config.translations?.fr || {}) } : data.config;
  const labels = confirmationLabels(language);
  const formTitle = (language === 'fr' && formTextFr(data.surveyTitle)) || data.surveyTitle;

  const raw = data.submissionData[config.emailFieldId];
  const to = typeof raw === 'string' ? raw.trim() : '';
  // Basic shape check only; the form already validated the address.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { success: false, skipped: true, error: 'No valid respondent email address on the submission.' };
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return { success: false, error: 'Email service is not configured (SMTP_USER / SMTP_PASSWORD).', recipient: to };
  }

  const firstNameRaw = config.firstNameFieldId ? data.submissionData[config.firstNameFieldId] : undefined;
  const firstName =
    typeof firstNameRaw === 'string' && firstNameRaw.trim() ? firstNameRaw.trim().slice(0, 60) : undefined;

  const content: ConfirmationEmailContent = {
    firstName,
    formTitle,
    heading: config.heading || 'We received your submission',
    message: config.message || 'Thank you. Your submission has been received.',
    nextSteps: config.nextSteps,
    urgentNotice: config.urgentNotice,
    contactEmail: config.replyTo,
    language,
  };

  const text = [
    labels.greeting(firstName),
    '',
    content.message,
    ...(content.nextSteps && content.nextSteps.length > 0
      ? ['', `${labels.nextSteps}:`, ...content.nextSteps.map((step, i) => `${i + 1}. ${step}`)]
      : []),
    ...(content.urgentNotice ? ['', content.urgentNotice.replace(/\n/g, ' ')] : []),
    ...(config.replyTo ? ['', `${labels.questions} ${config.replyTo}.`] : []),
    '',
    '---',
    labels.org,
  ].join('\n');

  try {
    const info = await getTransporter().sendMail({
      from: `"${config.senderName || 'SCAGO'}" <${process.env.SMTP_USER}>`,
      to,
      ...(config.replyTo ? { replyTo: config.replyTo } : {}),
      subject: config.subject || `We received your submission – ${formTitle}`,
      text,
      html: generateConfirmationEmailTemplate(content),
    });
    console.log(`[sendRespondentConfirmationEmail] Sent for "${data.surveyTitle}". MessageId: ${info.messageId}`);
    return { success: true, recipient: to };
  } catch (error) {
    console.error('[sendRespondentConfirmationEmail] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send confirmation',
      recipient: to,
    };
  }
}

/**
 * Send a weekly case digest (see generateCaseDigestTemplate).
 */
export async function sendCaseDigestEmail(data: {
  recipients: string[];
  formTitle: string;
  weekOf: string;
  overdue: DigestCase[];
  dueSoon: DigestCase[];
  awaitingTotal: number;
  heldForReview: number;
  dashboardLink: string;
}): Promise<{ success: boolean; error?: string }> {
  if (data.recipients.length === 0) return { success: false, error: 'No digest recipients configured.' };
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return { success: false, error: 'Email service is not configured (SMTP_USER / SMTP_PASSWORD).' };
  }

  const line = (c: DigestCase) => `- ${c.name} (received ${c.receivedLabel}; ${c.deadlineLabel}; ${c.assignedTo || 'unassigned'})`;
  const text = [
    `Cases needing attention — ${data.formTitle} (week of ${data.weekOf})`,
    '',
    `Overdue: ${data.overdue.length}   Due within 3 days: ${data.dueSoon.length}   Awaiting contact: ${data.awaitingTotal}`,
    ...(data.overdue.length ? ['', 'Overdue:', ...data.overdue.map(line)] : []),
    ...(data.dueSoon.length ? ['', 'Due soon:', ...data.dueSoon.map(line)] : []),
    ...(data.heldForReview ? ['', `${data.heldForReview} submission(s) held this week as possible spam.`] : []),
    '',
    `Open the dashboard: ${data.dashboardLink}`,
  ].join('\n');

  try {
    const info = await getTransporter().sendMail({
      from: `"SCAGO Portal" <${process.env.SMTP_USER}>`,
      to: data.recipients.join(', '),
      subject: `${data.overdue.length > 0 ? `${data.overdue.length} overdue — ` : ''}Weekly case summary: ${data.formTitle}`,
      text,
      html: generateCaseDigestTemplate(data),
    });
    console.log(`[sendCaseDigestEmail] Sent for "${data.formTitle}". MessageId: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error('[sendCaseDigestEmail] Failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send digest' };
  }
}

/**
 * Send a test email to verify SMTP configuration works
 */
export async function sendTestEmail(recipientEmail: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[sendTestEmail] Starting test email to: ${recipientEmail}`);
  console.log(`[sendTestEmail] SMTP_USER defined: ${!!process.env.SMTP_USER}, SMTP_PASSWORD defined: ${!!process.env.SMTP_PASSWORD}`);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    const errMsg = `SMTP credentials are not configured. SMTP_USER=${process.env.SMTP_USER ? 'set' : 'MISSING'}, SMTP_PASSWORD=${process.env.SMTP_PASSWORD ? 'set' : 'MISSING'}. Add them in Netlify Environment Variables and redeploy.`;
    console.error(`[sendTestEmail] ${errMsg}`);
    return { success: false, error: errMsg };
  }

  if (!recipientEmail) {
    return { success: false, error: 'Recipient email address is required.' };
  }

  try {
    const transporter = getTransporter();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';

    const htmlContent = generateEmailTemplate({
      title: 'Test Email - SCAGO Portal',
      greeting: 'Hello',
      content: `
        <p>This is a test email to verify that your email notification settings are working correctly.</p>
        <div style="background-color: #f0fdf4; padding: 20px; border-left: 4px solid #22c55e; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #15803d;">Email Configuration Verified</p>
          <p style="margin: 10px 0 0 0;">Your SMTP settings are working correctly. Submission notification emails will be delivered to this address.</p>
        </div>
      `,
      buttonText: 'Go to Dashboard',
      buttonLink: `${appUrl}/dashboard`,
      footerNote: 'This test email was sent from your SCAGO Portal email notification settings.',
    });

    const textContent = `
Test Email - SCAGO Portal

Hello,

This is a test email to verify that your email notification settings are working correctly.

Your SMTP settings are working correctly. Submission notification emails will be delivered to this address.

Go to Dashboard: ${appUrl}/dashboard

---
This test email was sent from your SCAGO Portal email notification settings.
    `;

    await transporter.sendMail({
      from: `"SCAGO Portal Notifications" <${process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject: 'Test Email - SCAGO Portal Notifications',
      text: textContent,
      html: htmlContent,
    });

    return { success: true };
  } catch (error) {
    console.error('[sendTestEmail] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send test email',
    };
  }
}
