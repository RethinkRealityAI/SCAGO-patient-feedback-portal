/**
 * Weekly case digest.
 *
 * Called every Monday by the Netlify scheduled function in
 * netlify/functions/case-digest.mjs. For each form with
 * `caseConfig.digest.enabled`, emails the configured recipients a list of
 * overdue and soon-due cases — but only when there is something to act on.
 *
 * Query parameters (all require the cron token):
 *   dryRun=1                 compute and return the digest without emailing
 *   testRecipient=<address>  send to this address instead of the configured list
 *   asOf=<YYYY-MM-DD>        evaluate deadlines as of this date (for previews)
 */
import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';
import {
  DUE_SOON_THRESHOLD,
  caseStatusOf,
  slaState,
  type CaseConfig,
} from '@/lib/case-management';

export const dynamic = 'force-dynamic';

const torontoDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', month: 'short', day: 'numeric' });
const torontoLongDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', dateStyle: 'long' });

function toDate(raw: any): Date {
  if (raw && typeof raw.toDate === 'function') return raw.toDate();
  return new Date(raw);
}

function displayName(data: Record<string, any>): string {
  const name = [data.firstName, data.lastName].filter(v => typeof v === 'string' && v.trim()).join(' ').trim();
  return name || 'Name not provided';
}

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dryRun') === '1';
  const testRecipient = url.searchParams.get('testRecipient')?.trim() || null;
  const asOfParam = url.searchParams.get('asOf');
  const asOf = asOfParam && /^\d{4}-\d{2}-\d{2}$/.test(asOfParam) ? new Date(`${asOfParam}T17:00:00Z`) : null;

  const { getAdminFirestore } = await import('@/lib/firebase-admin');
  const { sendCaseDigestEmail } = await import('@/lib/email-templates');
  const { getPortalUrl } = await import('@/lib/submission-email-template');

  const firestore = getAdminFirestore();
  const surveys = await firestore.collection('surveys').get();
  const now = asOf ?? new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const report: Array<Record<string, unknown>> = [];

  for (const surveyDoc of surveys.docs) {
    const survey = surveyDoc.data();
    const config = survey.caseConfig as CaseConfig | undefined;
    if (!config?.enabled || !config.digest?.enabled) continue;

    const recipients = testRecipient ? [testRecipient] : config.digest.recipients || [];
    const submissions = await surveyDoc.ref.collection('submissions').get();

    const overdue: Array<{ sortKey: number; item: any }> = [];
    const dueSoon: Array<{ sortKey: number; item: any }> = [];
    let awaitingTotal = 0;

    for (const doc of submissions.docs) {
      const data = doc.data();
      const status = caseStatusOf(data, config);
      if (status !== config.initialStatus) continue;
      awaitingTotal++;

      const submittedAt = toDate(data.submittedAt);
      const sla = slaState(submittedAt, status, config, now);
      const base = {
        name: displayName(data),
        receivedLabel: torontoDate.format(submittedAt),
        assignedTo: typeof data.assignedTo === 'string' ? data.assignedTo : undefined,
      };
      if (sla.kind === 'overdue') {
        overdue.push({
          sortKey: -sla.businessDaysOver,
          item: { ...base, deadlineLabel: `Overdue ${sla.businessDaysOver} business day${sla.businessDaysOver === 1 ? '' : 's'}` },
        });
      } else if (sla.kind === 'due-soon') {
        dueSoon.push({
          sortKey: sla.businessDaysLeft,
          item: {
            ...base,
            deadlineLabel: sla.businessDaysLeft === 0 ? 'Due today' : `Due in ${sla.businessDaysLeft} business day${sla.businessDaysLeft === 1 ? '' : 's'}`,
          },
        });
      }
    }

    const held = await surveyDoc.ref.collection('heldSubmissions').where('heldAt', '>=', weekAgo).get();
    const summary = {
      surveyId: surveyDoc.id,
      formTitle: survey.title,
      overdue: overdue.length,
      dueSoon: dueSoon.length,
      awaitingTotal,
      heldForReview: held.size,
      recipients,
      dueSoonThresholdBusinessDays: DUE_SOON_THRESHOLD,
    };

    // Only email when there is something to act on; a weekly "all clear"
    // trains people to ignore the message.
    if (overdue.length === 0 && dueSoon.length === 0 && held.size === 0) {
      report.push({ ...summary, sent: false, reason: 'nothing to report' });
      continue;
    }
    if (dryRun) {
      report.push({ ...summary, sent: false, reason: 'dry run' });
      continue;
    }

    const result = await sendCaseDigestEmail({
      recipients,
      formTitle: survey.title || surveyDoc.id,
      weekOf: torontoLongDate.format(now),
      overdue: overdue.sort((a, b) => a.sortKey - b.sortKey).map(o => o.item),
      dueSoon: dueSoon.sort((a, b) => a.sortKey - b.sortKey).map(o => o.item),
      awaitingTotal,
      heldForReview: held.size,
      dashboardLink: `${getPortalUrl()}/dashboard/${encodeURIComponent(surveyDoc.id)}`,
    });
    report.push({ ...summary, sent: result.success, error: result.error });
  }

  return NextResponse.json({ ranAt: now.toISOString(), dryRun, forms: report });
}
