'use server';

import nodemailer from 'nodemailer';

/**
 * Get configured email transporter
 */
function getTransporter() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP credentials are not configured. Set SMTP_USER and SMTP_PASSWORD.');
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ionos.com',
    port: Number(process.env.SMTP_PORT || 587),
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
}

/**
 * Generate HTML email template for form submission notification
 */
function generateSubmissionEmailTemplate(data: {
  surveyTitle: string;
  submissionDate: string;
  bodyText?: string;
  attachmentNote?: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Submission - ${data.surveyTitle}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0070f3; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px 20px; border-radius: 0 0 8px 8px; }
        .info-box { background-color: #fff; padding: 20px; border-left: 4px solid #0070f3; margin: 20px 0; }
        .button { display: inline-block; background-color: #0070f3; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        .attachment-note { background-color: #e8f4fd; padding: 15px; border-radius: 6px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 New Form Submission</h1>
        <p>${data.surveyTitle}</p>
      </div>
      
      <div class="content">
        <div class="info-box">
          <p style="margin: 0;"><strong>Survey:</strong> ${data.surveyTitle}</p>
          <p style="margin: 10px 0 0 0;"><strong>Submitted:</strong> ${data.submissionDate}</p>
        </div>
        
        ${data.bodyText ? `<p>${data.bodyText}</p>` : '<p>A new form submission has been received. Please see the attached PDF for details.</p>'}
        
        ${data.attachmentNote ? `
          <div class="attachment-note">
            <p style="margin: 0;"><strong>📎 Attachment:</strong> ${data.attachmentNote}</p>
          </div>
        ` : ''}
        
        <div style="text-align: center;">
          <a href="${appUrl}/dashboard" class="button">View Dashboard</a>
        </div>
      </div>
      
      <div class="footer">
        <p>This is an automated notification from your feedback portal.</p>
        <p>Manage notifications in the Survey Settings.</p>
      </div>
    </body>
    </html>
  `;
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
  submissionData: Record<string, any>;
  pdfBuffer?: Uint8Array | null;
}): Promise<{ success: boolean; error?: string }> {
  if (!data.config.enabled || !data.config.recipients || data.config.recipients.length === 0) {
    return { success: true }; // No notification configured
  }

  try {
    const transporter = getTransporter();
    const submissionDate = new Date().toLocaleString();

    // Prepare subject
    const defaultSubject = `New Submission: {{surveyTitle}} - {{submissionDate}}`;
    const subject = replacePlaceholders(
      data.config.subject || defaultSubject,
      { surveyTitle: data.surveyTitle, submissionDate }
    );

    // Prepare body
    const bodyText = data.config.bodyTemplate
      ? replacePlaceholders(data.config.bodyTemplate, { surveyTitle: data.surveyTitle, submissionDate })
      : undefined;

    // Generate HTML
    const attachmentNote = data.pdfBuffer && data.config.attachPdf !== false
      ? 'Submission_Details.pdf'
      : undefined;

    const htmlContent = generateSubmissionEmailTemplate({
      surveyTitle: data.surveyTitle,
      submissionDate,
      bodyText,
      attachmentNote,
    });

    // Plain text version
    const textContent = `
New Form Submission

Survey: ${data.surveyTitle}
Submitted: ${submissionDate}

${bodyText || 'A new form submission has been received. Please see the attached PDF for details.'}

${attachmentNote ? `Attachment: ${attachmentNote}` : ''}

---
This is an automated notification from your feedback portal.
    `;

    // Build email options
    const mailOptions: any = {
      from: `"${data.config.senderName || 'Form Notifications'}" <${process.env.SMTP_USER}>`,
      to: data.config.recipients.join(', '),
      subject,
      text: textContent,
      html: htmlContent,
    };

    // Add PDF attachment if available and enabled
    if (data.pdfBuffer && data.config.attachPdf !== false) {
      mailOptions.attachments = [
        {
          filename: `Submission_${data.surveyId}_${Date.now()}.pdf`,
          content: Buffer.from(data.pdfBuffer),
          contentType: 'application/pdf',
        },
      ];
    }

    await transporter.sendMail(mailOptions);

    return { success: true };
  } catch (error) {
    console.error('Error sending submission notification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send notification email',
    };
  }
}
