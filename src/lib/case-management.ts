/**
 * Case tracking for forms whose submissions need follow-up (e.g. counselling
 * intake: "we will contact you within 14 business days").
 *
 * Configured per survey as `caseConfig`; the status lives on each submission
 * as `caseStatus`, alongside `assignedTo` and `caseNotes`.
 */

export interface CaseStatusOption {
  value: string;
  label: string;
}

export interface CaseConfig {
  enabled: boolean;
  statuses: CaseStatusOption[];
  /** Status a new submission starts in; the response clock runs while in it. */
  initialStatus: string;
  /** Statuses that count as finished (excluded from "open" views). */
  closedStatuses?: string[];
  /** Business days allowed before an initial-status case is overdue. */
  slaBusinessDays?: number;
  /** Suggested counsellors/staff for the "Assigned to" field. */
  assignees?: string[];
  /** Weekly email listing overdue and soon-due cases. */
  digest?: { enabled: boolean; recipients: string[] };
}

export interface CaseNote {
  text: string;
  author: string;
  at: string; // ISO timestamp
}

/** Status of a submission, falling back to the initial status for new/legacy ones. */
export function caseStatusOf(submission: { caseStatus?: string } | null | undefined, config: CaseConfig): string {
  const status = submission?.caseStatus;
  return status && config.statuses.some(s => s.value === status) ? status : config.initialStatus;
}

export function caseStatusLabel(status: string, config: CaseConfig): string {
  return config.statuses.find(s => s.value === status)?.label ?? status;
}

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

/**
 * Add business days (Mon–Fri) to a date. Statutory holidays are not excluded,
 * so a due date can land a day or two earlier than a strict count — erring
 * toward contacting people sooner, never later.
 */
export function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) added++;
  }
  return result;
}

/** Whole business days from `from` to `to` (negative when `to` is earlier). */
export function businessDaysBetween(from: Date, to: Date): number {
  const startDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const endDay = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const sign = endDay >= startDay ? 1 : -1;
  const [a, b] = sign === 1 ? [startDay, endDay] : [endDay, startDay];
  let count = 0;
  const cursor = new Date(a);
  while (cursor < b) {
    cursor.setDate(cursor.getDate() + 1);
    if (!isWeekend(cursor)) count++;
  }
  return count * sign;
}

export type SlaState =
  | { kind: 'none' }
  | { kind: 'due'; businessDaysLeft: number; dueDate: Date }
  | { kind: 'due-soon'; businessDaysLeft: number; dueDate: Date }
  | { kind: 'overdue'; businessDaysOver: number; dueDate: Date };

/** Business days left at or below which a case is flagged as due soon. */
export const DUE_SOON_THRESHOLD = 3;

/**
 * Where a case stands against its response deadline. Only cases still in the
 * initial status are on the clock; once someone has acted, there is no badge.
 */
export function slaState(
  submittedAt: Date,
  status: string,
  config: CaseConfig,
  now: Date = new Date()
): SlaState {
  if (!config.slaBusinessDays || status !== config.initialStatus) return { kind: 'none' };
  if (isNaN(submittedAt.getTime())) return { kind: 'none' };

  const dueDate = addBusinessDays(submittedAt, config.slaBusinessDays);
  const left = businessDaysBetween(now, dueDate);
  if (left < 0) return { kind: 'overdue', businessDaysOver: -left, dueDate };
  if (left <= DUE_SOON_THRESHOLD) return { kind: 'due-soon', businessDaysLeft: left, dueDate };
  return { kind: 'due', businessDaysLeft: left, dueDate };
}
