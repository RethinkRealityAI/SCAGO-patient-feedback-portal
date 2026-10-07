import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CASE_FILTERS,
  UNASSIGNED,
  activeFilterCount,
  applyCaseFilters,
  assigneesOf,
  filterOptionsFor,
  matchesSearch,
  repeatRequestCounts,
  toCsv,
  type CaseFilterState,
} from './case-filters';

const NOW = new Date('2026-10-07T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const subs = [
  {
    id: 'a', firstName: 'Denise', lastName: 'Rivière', email: 'd@example.com', primaryPhone: '+1 (647) 864-8395',
    city: { selection: 'brampton' }, counsellingType: ['Grief and Loss', 'Personal or Family Support'],
    seekingServicesFor: 'Myself', caseStatus: 'new', submittedAt: daysAgo(2),
  },
  {
    id: 'b', firstName: 'Natalie', lastName: 'Berghuis', email: 'n@example.com', primaryPhone: '+15145500611',
    city: { selection: 'other', other: 'Montreal' }, counsellingType: ['Personal or Family Support'],
    seekingServicesFor: 'A family member', caseStatus: 'contacted', assignedTo: 'Amina', submittedAt: daysAgo(40),
    importedFrom: 'tally', caseNotes: [{ text: 'Left a voicemail about the wound clinic', author: 'x', at: '' }],
  },
  {
    id: 'c', firstName: 'Denise', lastName: 'Riviere', email: 'D@Example.com ', primaryPhone: '6478648395',
    city: { selection: 'brampton' }, counsellingType: ['Food, housing, or income security'],
    seekingServicesFor: 'Myself', caseStatus: 'closed', assignedTo: 'amina', submittedAt: daysAgo(400),
  },
];

const ctx = {
  statusOf: (s: any) => s.caseStatus,
  deadlineOf: (s: any) => (s.caseStatus === 'new' ? s.submittedAt.getTime() : Infinity),
  now: NOW,
};
const run = (patch: Partial<CaseFilterState>) =>
  applyCaseFilters(subs, { ...DEFAULT_CASE_FILTERS, ...patch }, ctx).map(s => s.id);

describe('matchesSearch', () => {
  it('ignores accents and case', () => {
    expect(matchesSearch(subs[0], 'riviere')).toBe(true);
    expect(matchesSearch(subs[2], 'RIVIÈRE')).toBe(true);
  });
  it('requires every word', () => {
    expect(matchesSearch(subs[0], 'denise grief')).toBe(true);
    expect(matchesSearch(subs[0], 'denise montreal')).toBe(false);
  });
  it('matches phone numbers by digits', () => {
    expect(matchesSearch(subs[0], '647-864')).toBe(true);
    expect(matchesSearch(subs[1], '514 550')).toBe(true);
  });
  it('finds city labels, free-text cities and case notes', () => {
    expect(matchesSearch(subs[0], 'Brampton')).toBe(true);
    expect(matchesSearch(subs[1], 'montreal')).toBe(true);
    expect(matchesSearch(subs[1], 'wound clinic')).toBe(true);
  });
});

describe('applyCaseFilters', () => {
  it('sorts newest first by default', () => {
    expect(run({})).toEqual(['a', 'b', 'c']);
    expect(run({ sort: 'oldest' })).toEqual(['c', 'b', 'a']);
  });
  it('filters by status, assignee and unassigned', () => {
    expect(run({ status: 'contacted' })).toEqual(['b']);
    expect(run({ assignee: 'AMINA' })).toEqual(['b', 'c']);
    expect(run({ assignee: UNASSIGNED })).toEqual(['a']);
  });
  it('filters by date received and source', () => {
    expect(run({ received: '30d' })).toEqual(['a']);
    expect(run({ received: '365d' })).toEqual(['a', 'b']);
    expect(run({ source: 'imported' })).toEqual(['b']);
    expect(run({ source: 'portal' })).toEqual(['a', 'c']);
  });
  it('filters by a multi-select answer and a city', () => {
    expect(run({ fields: { counsellingType: 'Personal or Family Support' } })).toEqual(['a', 'b']);
    expect(run({ fields: { city: 'brampton' } })).toEqual(['a', 'c']);
    expect(run({ fields: { city: 'other:montreal' } })).toEqual(['b']);
  });
  it('puts the nearest deadline first when sorting by deadline', () => {
    expect(run({ sort: 'deadline' })[0]).toBe('a');
  });
  it('counts active filters, not search', () => {
    expect(activeFilterCount({ ...DEFAULT_CASE_FILTERS, search: 'x', status: 'new', fields: { a: 'b', c: 'all' } })).toBe(2);
  });
});

describe('filterOptionsFor', () => {
  it('lists the form options in order with counts, then other values found', () => {
    const field = { type: 'checkbox', options: [{ value: 'Grief and Loss', label: 'Grief and Loss' }, { value: 'Personal or Family Support', label: 'Personal or Family Support' }] };
    expect(filterOptionsFor(field, subs, 'counsellingType')).toEqual([
      { value: 'Grief and Loss', label: 'Grief and Loss', count: 1 },
      { value: 'Personal or Family Support', label: 'Personal or Family Support', count: 2 },
      { value: 'Food, housing, or income security', label: 'Food, housing, or income security', count: 1 },
    ]);
  });
  it('labels city slugs and free-text cities', () => {
    const options = filterOptionsFor({ type: 'city-on' }, subs, 'city');
    expect(options).toContainEqual({ value: 'brampton', label: 'Brampton', count: 2 });
    expect(options).toContainEqual({ value: 'other:montreal', label: 'Montreal', count: 1 });
  });
});

describe('repeatRequestCounts and assigneesOf', () => {
  it('links requests sharing an email or phone number', () => {
    const counts = repeatRequestCounts(subs);
    expect(counts.get('a')).toBe(1);
    expect(counts.get('c')).toBe(1);
    expect(counts.has('b')).toBe(false);
  });
  it('merges assignee names that differ only by case', () => {
    expect(assigneesOf(subs, ['Bola'])).toEqual(['Amina', 'Bola']);
  });
});

describe('toCsv', () => {
  it('quotes, escapes and neutralises formulas', () => {
    expect(toCsv([['a,b', 'say "hi"', '=SUM(A1)', '+16478648395']])).toBe('﻿"a,b","say ""hi""",\'=SUM(A1),+16478648395');
  });
});
