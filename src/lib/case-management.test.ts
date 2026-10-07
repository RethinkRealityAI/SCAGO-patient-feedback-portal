import { describe, it, expect } from 'vitest';
import {
  addBusinessDays,
  businessDaysBetween,
  caseStatusOf,
  slaState,
  type CaseConfig,
} from './case-management';

const config: CaseConfig = {
  enabled: true,
  statuses: [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'closed', label: 'Closed' },
  ],
  initialStatus: 'new',
  closedStatuses: ['closed'],
  slaBusinessDays: 14,
};

// Local-time constructors so weekday maths is independent of the test machine's zone.
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10, 0, 0);

describe('addBusinessDays', () => {
  it('skips weekends', () => {
    // Friday + 1 business day = Monday
    expect(addBusinessDays(day(2026, 10, 9), 1).getDate()).toBe(12);
  });

  it('counts 14 business days as nearly three calendar weeks', () => {
    // Wed Oct 7 + 14 business days = Tue Oct 27
    const due = addBusinessDays(day(2026, 10, 7), 14);
    expect([due.getMonth() + 1, due.getDate()]).toEqual([10, 27]);
  });
});

describe('businessDaysBetween', () => {
  it('is zero on the same day', () => {
    expect(businessDaysBetween(day(2026, 10, 7), day(2026, 10, 7))).toBe(0);
  });

  it('ignores weekend days', () => {
    // Fri -> Mon is one business day
    expect(businessDaysBetween(day(2026, 10, 9), day(2026, 10, 12))).toBe(1);
  });

  it('is negative when the end is earlier', () => {
    expect(businessDaysBetween(day(2026, 10, 12), day(2026, 10, 9))).toBe(-1);
  });
});

describe('caseStatusOf', () => {
  it('defaults new and legacy submissions to the initial status', () => {
    expect(caseStatusOf({}, config)).toBe('new');
    expect(caseStatusOf({ caseStatus: 'not-a-status' }, config)).toBe('new');
  });

  it('returns a valid stored status', () => {
    expect(caseStatusOf({ caseStatus: 'contacted' }, config)).toBe('contacted');
  });
});

describe('slaState', () => {
  const submitted = day(2026, 10, 7); // due Tue Oct 27

  it('reports days left while comfortably in time', () => {
    expect(slaState(submitted, 'new', config, day(2026, 10, 8))).toMatchObject({ kind: 'due', businessDaysLeft: 13 });
  });

  it('flags a case due within three business days', () => {
    expect(slaState(submitted, 'new', config, day(2026, 10, 23))).toMatchObject({ kind: 'due-soon', businessDaysLeft: 2 });
  });

  it('flags an overdue case with the business days over', () => {
    expect(slaState(submitted, 'new', config, day(2026, 10, 29))).toMatchObject({ kind: 'overdue', businessDaysOver: 2 });
  });

  it('stops the clock once the case has moved on', () => {
    expect(slaState(submitted, 'contacted', config, day(2026, 11, 30))).toEqual({ kind: 'none' });
  });

  it('shows nothing when the form has no deadline', () => {
    expect(slaState(submitted, 'new', { ...config, slaBusinessDays: undefined })).toEqual({ kind: 'none' });
  });
});
