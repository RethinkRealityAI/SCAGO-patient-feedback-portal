import { describe, it, expect } from 'vitest';
import { isReviewedFromState } from './review-utils';

describe('isReviewedFromState', () => {
  describe('when no override exists for the submission', () => {
    it('returns false when persisted value is undefined', () => {
      expect(isReviewedFromState('sub-1', {}, undefined)).toBe(false);
    });

    it('returns false when persisted value is false', () => {
      expect(isReviewedFromState('sub-1', {}, false)).toBe(false);
    });

    it('returns true when persisted value is true', () => {
      expect(isReviewedFromState('sub-1', {}, true)).toBe(true);
    });
  });

  describe('when an override exists for the submission', () => {
    it('returns true when override is true, regardless of persisted value', () => {
      expect(isReviewedFromState('sub-1', { 'sub-1': true }, undefined)).toBe(true);
      expect(isReviewedFromState('sub-1', { 'sub-1': true }, false)).toBe(true);
      expect(isReviewedFromState('sub-1', { 'sub-1': true }, true)).toBe(true);
    });

    it('returns false when override is false, regardless of persisted value', () => {
      expect(isReviewedFromState('sub-1', { 'sub-1': false }, true)).toBe(false);
      expect(isReviewedFromState('sub-1', { 'sub-1': false }, undefined)).toBe(false);
    });
  });

  describe('override isolation', () => {
    it('does not apply another submission\'s override', () => {
      const overrides = { 'sub-2': true };
      expect(isReviewedFromState('sub-1', overrides, false)).toBe(false);
    });

    it('applies only the correct submission override in a map with many entries', () => {
      const overrides = { 'sub-1': false, 'sub-2': true, 'sub-3': true };
      expect(isReviewedFromState('sub-1', overrides, true)).toBe(false);
      expect(isReviewedFromState('sub-2', overrides, false)).toBe(true);
      expect(isReviewedFromState('sub-3', overrides, undefined)).toBe(true);
    });
  });
});
