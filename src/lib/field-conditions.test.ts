import { describe, it, expect } from 'vitest';
import { isConditionMet } from './field-conditions';

describe('isConditionMet', () => {
  it('always shows an unconditional field', () => {
    expect(isConditionMet({}, undefined, undefined)).toBe(true);
  });

  it('matches a single conditionValue (existing behaviour)', () => {
    const field = { conditionField: 'q', conditionValue: 'yes' };
    expect(isConditionMet(field, 'yes', 'radio')).toBe(true);
    expect(isConditionMet(field, 'no', 'radio')).toBe(false);
  });

  it('matches any of conditionValues', () => {
    const field = { conditionField: 'q', conditionValues: ['A family member', 'Someone else'] };
    expect(isConditionMet(field, 'A family member', 'radio')).toBe(true);
    expect(isConditionMet(field, 'Someone else', 'radio')).toBe(true);
    expect(isConditionMet(field, 'You', 'radio')).toBe(false);
    expect(isConditionMet(field, undefined, 'radio')).toBe(false);
  });

  it('prefers conditionValues over the single-value fallback', () => {
    const field = { conditionField: 'q', conditionValue: 'Someone else', conditionValues: ['A family member', 'Someone else'] };
    expect(isConditionMet(field, 'A family member', 'radio')).toBe(true);
  });

  it('handles multi-select (checkbox) answers', () => {
    const field = { conditionField: 'q', conditionValue: 'emergency' };
    expect(isConditionMet(field, ['outpatient', 'emergency'], 'checkbox')).toBe(true);
    expect(isConditionMet(field, ['outpatient'], 'checkbox')).toBe(false);
  });

  it('compares boolean controllers as strings', () => {
    const field = { conditionField: 'q', conditionValue: 'true' };
    expect(isConditionMet(field, true, 'boolean-checkbox')).toBe(true);
    expect(isConditionMet(field, false, 'boolean-checkbox')).toBe(false);
  });

  it('shows the field if its controller was deleted', () => {
    expect(isConditionMet({ conditionField: 'gone', conditionValue: 'x' }, undefined, undefined)).toBe(true);
  });
});
