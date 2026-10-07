/**
 * Submission notification email — pure rendering helpers.
 *
 * Kept out of email-templates.ts because that module is 'use server', where
 * Next.js only permits async exports; these are synchronous and are also
 * unit-tested directly.
 */

/** Escape text for safe interpolation into email HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Base URL for links in notification emails.
 *
 * Prefers the explicit app URL, then Netlify's own `URL` (set automatically on
 * deployed functions), then the production domain — never a localhost default,
 * which would ship dead links to staff inboxes.
 */
export function getPortalUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.URL || 'https://scago-portal.netlify.app';
  return url.replace(/\/+$/, '');
}

/**
 * Submission time in the organisation's time zone. `toLocaleString()` on the
 * server used the host's zone (UTC on Netlify), so times were hours off.
 */
export function formatSubmissionDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date) + ' ET';
}

/** Readable, filesystem-safe PDF name: `Counselling_Intake_Form_Jane_Doe.pdf`. */
export function buildPdfFilename(surveyTitle: string, submitterName?: string): string {
  const clean = (s: string, max: number) =>
    s.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').substring(0, max).replace(/_+$/, '');
  const title = clean(surveyTitle, 40) || 'Submission';
  const who = submitterName ? clean(submitterName, 30) : new Date().toISOString().split('T')[0];
  return `${title}_${who || 'Submission'}.pdf`;
}

/**
 * Generate HTML email template for form submission notification.
 *
 * Built for email clients, not browsers: a table layout with every style
 * inline. Gmail and Outlook strip or ignore <style> classes, which is why the
 * previous version rendered its buttons as blue underlined links on red.
 */
export function generateSubmissionEmailTemplate(data: {
  surveyTitle: string;
  submissionDate: string;
  submitterName?: string;
  dashboardLink: string;
  bodyText?: string;
  attachmentName?: string;
  /**
   * Selected answers shown in the email body so staff can triage from their
   * inbox. Opt-in per form (emailNotifications.summaryFieldIds) because it puts
   * personal information in the message itself, not just the attachment.
   */
  summary?: Array<{ label: string; value: string }>;
}): string {
  const brand = '#C8262A';
  const ink = '#111827'; // 17:1 on white
  const muted = '#4B5563'; // 7.6:1 on white
  const subtle = '#6B7280'; // 4.8:1 on white
  const line = '#E5E7EB';
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const title = escapeHtml(data.surveyTitle);
  const who = data.submitterName ? escapeHtml(data.submitterName) : '';
  const when = escapeHtml(data.submissionDate);
  const message = data.bodyText
    ? escapeHtml(data.bodyText)
    : 'A new response has been submitted. The complete set of answers is attached as a PDF.';
  const preheader = who ? `New submission from ${who} — ${title}` : `New submission — ${title}`;

  const detailRow = (label: string, value: string, last = false) => `
              <tr>
                <td style="padding:14px 0;${last ? '' : `border-bottom:1px solid ${line};`}font-family:${font};font-size:12px;line-height:22px;letter-spacing:0.06em;text-transform:uppercase;color:${subtle};width:132px;vertical-align:top;">${label}</td>
                <td style="padding:14px 0;${last ? '' : `border-bottom:1px solid ${line};`}font-family:${font};font-size:15px;line-height:22px;color:${ink};font-weight:600;vertical-align:top;">${value}</td>
              </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>New submission — ${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F3F4F6;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F3F4F6;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#FFFFFF;border:1px solid ${line};border-radius:12px;overflow:hidden;">
          <tr><td style="height:4px;line-height:4px;font-size:0;background-color:${brand};">&nbsp;</td></tr>

          <tr>
            <td style="padding:36px 40px 8px 40px;">
              <p style="margin:0 0 16px 0;font-family:${font};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${brand};">SCAGO Portal</p>
              <h1 style="margin:0;font-family:${font};font-size:26px;line-height:32px;font-weight:700;color:${ink};">New submission received</h1>
              <p style="margin:8px 0 0 0;font-family:${font};font-size:16px;line-height:24px;color:${muted};">${title}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${line};">${who ? detailRow('Submitted by', who) : ''}${detailRow('Form', title)}${detailRow('Received', when, true)}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px 0 40px;font-family:${font};font-size:15px;line-height:24px;color:${muted};">${message}</td>
          </tr>
${data.summary && data.summary.length > 0 ? `
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <p style="margin:0 0 4px 0;font-family:${font};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${subtle};">Key details</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${data.summary
                .map((row, i, all) => `
                <tr>
                  <td style="padding:10px 16px 10px 0;${i < all.length - 1 ? `border-bottom:1px solid ${line};` : ''}font-family:${font};font-size:14px;line-height:20px;color:${muted};width:42%;vertical-align:top;">${escapeHtml(row.label)}</td>
                  <td style="padding:10px 0;${i < all.length - 1 ? `border-bottom:1px solid ${line};` : ''}font-family:${font};font-size:14px;line-height:20px;color:${ink};font-weight:600;vertical-align:top;">${escapeHtml(row.value)}</td>
                </tr>`)
                .join('')}
              </table>
            </td>
          </tr>` : ''}
${data.attachmentName ? `
          <tr>
            <td style="padding:20px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F9FAFB;border:1px solid ${line};border-radius:8px;">
                <tr>
                  <td style="padding:14px 0 14px 16px;width:44px;vertical-align:middle;">
                    <div style="width:40px;height:40px;line-height:40px;border-radius:6px;background-color:${brand};color:#FFFFFF;font-family:${font};font-size:11px;font-weight:700;letter-spacing:0.04em;text-align:center;">PDF</div>
                  </td>
                  <td style="padding:14px 16px;vertical-align:middle;font-family:${font};">
                    <div style="font-size:14px;line-height:20px;font-weight:600;color:${ink};word-break:break-all;">${escapeHtml(data.attachmentName)}</div>
                    <div style="font-size:13px;line-height:18px;color:${subtle};">Attached &middot; complete responses</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ''}

          <tr>
            <td style="padding:28px 40px 36px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="${brand}" style="border-radius:8px;background-color:${brand};">
                    <a href="${data.dashboardLink}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${font};font-size:15px;line-height:20px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;"><span style="color:#FFFFFF;text-decoration:none;">View submissions</span></a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
          <tr>
            <td style="padding:24px 40px 0 40px;font-family:${font};font-size:12px;line-height:18px;color:${subtle};text-align:center;">
              This email may contain personal information submitted to the Sickle Cell Awareness Group of Ontario. Please handle it confidentially and do not forward it.
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 0 40px;font-family:${font};font-size:12px;line-height:18px;color:${subtle};text-align:center;">
              Automated notification from the SCAGO Portal &middot; Manage recipients in the form settings
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface ConfirmationEmailContent {
  /** Respondent's first name, for the greeting. Omitted when unknown. */
  firstName?: string;
  formTitle: string;
  heading: string;
  message: string;
  /** Short ordered list of what happens next. */
  nextSteps?: string[];
  /** Safety text shown in a red callout, e.g. crisis lines. First line is the title. */
  urgentNotice?: string;
  /** Where to direct questions; rendered as a mailto link. */
  contactEmail?: string;
  /** Language for the template's own wording (greeting, headings, footer). */
  language?: 'en' | 'fr';
}

const CONFIRMATION_LABELS = {
  en: {
    org: 'Sickle Cell Awareness Group of Ontario',
    greeting: (name?: string) => (name ? `Hi ${name},` : 'Hello,'),
    nextSteps: 'What happens next',
    questions: 'Questions? Email us at',
    footer: "You are receiving this email because this address was entered on a SCAGO form. If that wasn't you, you can ignore this message.",
  },
  fr: {
    org: "Association d'anémie falciforme de l'Ontario (SCAGO)",
    greeting: (name?: string) => (name ? `Bonjour ${name},` : 'Bonjour,'),
    nextSteps: 'Prochaines étapes',
    questions: 'Des questions? Écrivez-nous à',
    footer: "Vous recevez ce courriel parce que cette adresse a été saisie dans un formulaire de SCAGO. Si ce n'était pas vous, vous pouvez ignorer ce message.",
  },
} as const;

/** The template's built-in wording in the requested language (used by the plain-text version too). */
export function confirmationLabels(language: 'en' | 'fr' = 'en') {
  return CONFIRMATION_LABELS[language] ?? CONFIRMATION_LABELS.en;
}

/**
 * Acknowledgement sent to the person who submitted a form.
 *
 * Deliberately contains none of their answers: the address they typed could be
 * shared or mistyped, so the email confirms receipt and sets expectations
 * without repeating anything personal beyond a first-name greeting.
 */
export function generateConfirmationEmailTemplate(data: ConfirmationEmailContent): string {
  const brand = '#C8262A';
  const ink = '#111827';
  const muted = '#4B5563';
  const subtle = '#6B7280';
  const line = '#E5E7EB';
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const labels = confirmationLabels(data.language);
  const greeting = labels.greeting(data.firstName ? escapeHtml(data.firstName) : undefined);
  const [noticeTitle, ...noticeRest] = (data.urgentNotice || '').split('\n');
  const noticeBody = noticeRest.join(' ').trim();
  const contact = data.contactEmail ? escapeHtml(data.contactEmail) : '';

  return `<!DOCTYPE html>
<html lang="${data.language === 'fr' ? 'fr' : 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(data.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F3F4F6;">${escapeHtml(data.heading)} — ${escapeHtml(data.formTitle)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F3F4F6;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#FFFFFF;border:1px solid ${line};border-radius:12px;overflow:hidden;">
          <tr><td style="height:4px;line-height:4px;font-size:0;background-color:${brand};">&nbsp;</td></tr>
          <tr>
            <td style="padding:36px 40px 0 40px;">
              <p style="margin:0 0 16px 0;font-family:${font};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${brand};">${labels.org}</p>
              <h1 style="margin:0;font-family:${font};font-size:26px;line-height:32px;font-weight:700;color:${ink};">${escapeHtml(data.heading)}</h1>
              <p style="margin:8px 0 0 0;font-family:${font};font-size:16px;line-height:24px;color:${muted};">${escapeHtml(data.formTitle)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 0 40px;font-family:${font};font-size:15px;line-height:24px;color:${ink};">
              <p style="margin:0 0 12px 0;">${greeting}</p>
              <p style="margin:0;color:${muted};">${escapeHtml(data.message)}</p>
            </td>
          </tr>
${data.nextSteps && data.nextSteps.length > 0 ? `
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <p style="margin:0 0 8px 0;font-family:${font};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${subtle};">${labels.nextSteps}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${data.nextSteps
                .map((step, i) => `
                <tr>
                  <td style="padding:8px 12px 8px 0;width:28px;vertical-align:top;">
                    <div style="width:24px;height:24px;line-height:24px;border-radius:12px;background-color:#FDECEC;color:${brand};font-family:${font};font-size:12px;font-weight:700;text-align:center;">${i + 1}</div>
                  </td>
                  <td style="padding:8px 0;font-family:${font};font-size:15px;line-height:24px;color:${ink};vertical-align:top;">${escapeHtml(step)}</td>
                </tr>`)
                .join('')}
              </table>
            </td>
          </tr>` : ''}
${data.urgentNotice ? `
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FEF2F2;border:1px solid #FECACA;border-radius:8px;">
                <tr>
                  <td style="padding:16px 18px;font-family:${font};font-size:14px;line-height:21px;color:#7F1D1D;">
                    <p style="margin:0;font-weight:700;color:#7F1D1D;">${escapeHtml(noticeTitle)}</p>
                    ${noticeBody ? `<p style="margin:4px 0 0 0;color:#7F1D1D;">${escapeHtml(noticeBody)}</p>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding:28px 40px 36px 40px;font-family:${font};font-size:14px;line-height:22px;color:${muted};">
              ${contact ? `${labels.questions} <a href="mailto:${contact}" style="color:${brand};font-weight:600;text-decoration:none;">${contact}</a>.` : ''}
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
          <tr>
            <td style="padding:24px 40px 0 40px;font-family:${font};font-size:12px;line-height:18px;color:${subtle};text-align:center;">
              ${labels.footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface DigestCase {
  name: string;
  receivedLabel: string;
  /** e.g. "Overdue 2 business days" / "Due in 1 business day". */
  deadlineLabel: string;
  assignedTo?: string;
}

/**
 * Weekly summary of cases needing attention for one form: overdue first, then
 * those due within a few business days. Names are included because staff need
 * them to act; nothing else from the submission is.
 */
export function generateCaseDigestTemplate(data: {
  formTitle: string;
  weekOf: string;
  overdue: DigestCase[];
  dueSoon: DigestCase[];
  awaitingTotal: number;
  heldForReview: number;
  dashboardLink: string;
}): string {
  const brand = '#C8262A';
  const ink = '#111827';
  const muted = '#4B5563';
  const subtle = '#6B7280';
  const line = '#E5E7EB';
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const stat = (value: number, label: string, color: string) => `
                  <td style="padding:16px;border:1px solid ${line};border-radius:8px;text-align:center;width:33%;">
                    <div style="font-family:${font};font-size:28px;line-height:32px;font-weight:700;color:${color};">${value}</div>
                    <div style="font-family:${font};font-size:12px;line-height:16px;color:${subtle};margin-top:4px;">${label}</div>
                  </td>`;

  const caseList = (title: string, cases: DigestCase[], accent: string) =>
    cases.length === 0
      ? ''
      : `
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <p style="margin:0 0 8px 0;font-family:${font};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${accent};">${title}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${cases
                .map(
                  (c, i) => `
                <tr>
                  <td style="padding:12px 0;${i < cases.length - 1 ? `border-bottom:1px solid ${line};` : ''}font-family:${font};vertical-align:top;">
                    <div style="font-size:15px;line-height:22px;font-weight:600;color:${ink};">${escapeHtml(c.name)}</div>
                    <div style="font-size:13px;line-height:18px;color:${subtle};">Received ${escapeHtml(c.receivedLabel)}${c.assignedTo ? ` &middot; ${escapeHtml(c.assignedTo)}` : ' &middot; Unassigned'}</div>
                  </td>
                  <td style="padding:12px 0 12px 12px;${i < cases.length - 1 ? `border-bottom:1px solid ${line};` : ''}font-family:${font};font-size:13px;line-height:18px;font-weight:600;color:${accent};text-align:right;white-space:nowrap;vertical-align:top;">${escapeHtml(c.deadlineLabel)}</td>
                </tr>`
                )
                .join('')}
              </table>
            </td>
          </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Weekly case summary — ${escapeHtml(data.formTitle)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F3F4F6;">${data.overdue.length} overdue, ${data.dueSoon.length} due soon — ${escapeHtml(data.formTitle)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F3F4F6;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#FFFFFF;border:1px solid ${line};border-radius:12px;overflow:hidden;">
          <tr><td style="height:4px;line-height:4px;font-size:0;background-color:${brand};">&nbsp;</td></tr>
          <tr>
            <td style="padding:36px 40px 0 40px;">
              <p style="margin:0 0 16px 0;font-family:${font};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${brand};">SCAGO Portal &middot; Weekly summary</p>
              <h1 style="margin:0;font-family:${font};font-size:26px;line-height:32px;font-weight:700;color:${ink};">Cases needing attention</h1>
              <p style="margin:8px 0 0 0;font-family:${font};font-size:16px;line-height:24px;color:${muted};">${escapeHtml(data.formTitle)} &middot; week of ${escapeHtml(data.weekOf)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="8" border="0" style="border-collapse:separate;">
                <tr>${stat(data.overdue.length, 'Overdue', data.overdue.length ? '#BE123C' : ink)}${stat(data.dueSoon.length, 'Due within 3 days', data.dueSoon.length ? '#B45309' : ink)}${stat(data.awaitingTotal, 'Awaiting contact', ink)}
                </tr>
              </table>
            </td>
          </tr>
${caseList('Overdue', data.overdue, '#BE123C')}
${caseList('Due soon', data.dueSoon, '#B45309')}
${data.heldForReview > 0 ? `
          <tr>
            <td style="padding:24px 40px 0 40px;font-family:${font};font-size:13px;line-height:20px;color:${muted};">
              ${data.heldForReview} submission${data.heldForReview === 1 ? ' was' : 's were'} held this week as possible spam and not added to the dashboard.
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding:28px 40px 36px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="${brand}" style="border-radius:8px;background-color:${brand};">
                    <a href="${data.dashboardLink}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${font};font-size:15px;line-height:20px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;"><span style="color:#FFFFFF;text-decoration:none;">Open the dashboard</span></a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
          <tr>
            <td style="padding:24px 40px 0 40px;font-family:${font};font-size:12px;line-height:18px;color:${subtle};text-align:center;">
              Sent every Monday by the SCAGO Portal when cases need attention. Contains names of people awaiting contact; please do not forward.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
