import { describe, it, expect } from 'vitest';

import { nextCaseStep } from './case-management';

const config = {
  enabled: true,
  statuses: [
    { value: 'new', label: 'Awaiting contact' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'consultation-booked', label: 'Consultation booked' },
    { value: 'referred', label: 'Referred elsewhere' },
    { value: 'closed', label: 'Closed' },
  ],
  initialStatus: 'new',
  closedStatuses: ['closed', 'referred'],
} as any;

describe('nextCaseStep', () => {
  it('suggests Contacted for a new request', () => {
    expect(nextCaseStep('new', config)).toBe('contacted');
  });
  it('suggests closing a request that is being worked', () => {
    expect(nextCaseStep('contacted', config)).toBe('closed');
    expect(nextCaseStep('consultation-booked', config)).toBe('closed');
  });
  it('offers no one-click step for closed or referred requests', () => {
    expect(nextCaseStep('closed', config)).toBeNull();
    expect(nextCaseStep('referred', config)).toBeNull();
  });
});
