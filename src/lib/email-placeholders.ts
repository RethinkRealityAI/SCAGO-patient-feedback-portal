/**
 * Placeholder filling and Reply-To selection for form notification emails.
 * Kept out of email-templates.ts, which is a 'use server' module and so may
 * only export async server actions.
 */

/** An answer as one line of plain text, for subjects and bodies. */
function answerAsText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.map(v => answerAsText(v)).filter(Boolean).join(', ');
  if (typeof value === 'object') return '';
  return String(value).replace(/[\r\n]+/g, ' ').trim().slice(0, 80);
}

/**
 * Replace template placeholders in subject or body.
 * `{{answer:<fieldId>}}` inserts that field's answer (empty when unanswered).
 */
export function replacePlaceholders(
  template: string,
  data: { surveyTitle: string; submissionDate: string; region?: string; answers?: Record<string, unknown> }
): string {
  return template
    .replace(/\{\{surveyTitle\}\}/g, data.surveyTitle)
    .replace(/\{\{submissionDate\}\}/g, data.submissionDate)
    .replace(/\{\{region\}\}/g, data.region || '')
    .replace(/\{\{answer:([A-Za-z0-9_-]+)\}\}/g, (_m, id: string) => answerAsText(data.answers?.[id]))
    // Tidy separators left behind by an unanswered placeholder ("A –  – B").
    .replace(/\s+([–-])\s+(?=[–-]|$)/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** The respondent's email for Reply-To, when the form names a field and the answer is valid. */
export function replyToFromSubmission(fieldId: string | undefined, answers: Record<string, unknown>): string | undefined {
  if (!fieldId) return undefined;
  const raw = answers[fieldId];
  const email = typeof raw === 'string' ? raw.trim() : '';
  return /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email) ? email : undefined;
}
